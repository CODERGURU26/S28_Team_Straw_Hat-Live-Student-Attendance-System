import os
from datetime import datetime, timezone
from bson import ObjectId
from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "attendance_system")

_client = MongoClient(MONGO_URI)
_db = _client[DB_NAME]

students_col = _db["students"]
attendance_col = _db["attendance_records"]
teachers_col = _db["teachers"]
schedules_col = _db["schedules"]


def _serialize_student(student: dict) -> dict:
    return {
        "id": str(student["_id"]),
        "name": student["name"],
        "email": student.get("email"),
        "roll_number": student["roll_number"],
        "photo_path": student["photo_path"],
        "registration_photos": student.get("registration_photos", [student["photo_path"]]),
        "photo_count": int(student.get("photo_count", 1)),
        "registered_at": student.get("registered_at"),
    }


def create_student(
    name: str,
    email: str,
    roll_number: str,
    photo_path: str,
    face_encoding: list[float],
    registration_photos: list[str],
    photo_count: int,
    student_id: ObjectId | None = None,
) -> str:
    existing = students_col.find_one({"roll_number": roll_number})
    if existing:
        raise ValueError("Roll number already exists")

    payload = {
        "name": name,
        "email": email,
        "roll_number": roll_number,
        "photo_path": photo_path,
        "face_encoding": face_encoding,
        "registration_photos": registration_photos,
        "photo_count": photo_count,
        "registered_at": datetime.now(timezone.utc),
    }
    if student_id is not None:
        payload["_id"] = student_id

    result = students_col.insert_one(payload)
    return str(result.inserted_id)


def create_teacher(name: str, email: str, password_hash: str) -> str:
    existing = teachers_col.find_one({"email": email})
    if existing:
        raise ValueError("Teacher with this email already exists")
    
    result = teachers_col.insert_one({
        "name": name,
        "email": email,
        "password_hash": password_hash,
        "registered_at": datetime.now(timezone.utc),
    })
    return str(result.inserted_id)

def get_teacher_by_email(email: str) -> dict | None:
    return teachers_col.find_one({"email": email})


def get_students(include_encodings: bool = False) -> list[dict]:
    projection = None if include_encodings else {"face_encoding": 0}
    students = list(students_col.find({}, projection).sort("name", 1))
    if include_encodings:
        for student in students:
            student["id"] = str(student["_id"])
            student.setdefault("registration_photos", [student.get("photo_path")])
            student.setdefault("photo_count", len(student["registration_photos"]))
    else:
        students = [_serialize_student(s) for s in students]
    return students


def get_student_by_id(student_id: str) -> dict | None:
    return students_col.find_one({"_id": ObjectId(student_id)})


def get_student_by_email(email: str) -> dict | None:
    student = students_col.find_one({"email": email})
    if student:
        student["id"] = str(student["_id"])
    return student


def get_student_attendance(student_id: str) -> list[dict]:
    """Return all attendance sessions, annotated with whether this student was present/absent."""
    sessions = list(attendance_col.find({}).sort("timestamp", -1))
    result = []
    for session in sessions:
        present_ids = {
            str(r.get("student_id", ""))
            for r in session.get("results", [])
            if r.get("status") == "present"
        }
        absent_ids = {
            str(s.get("student_id", ""))
            for s in session.get("absent_students", [])
        }
        if student_id in present_ids:
            status = "present"
        elif student_id in absent_ids:
            status = "absent"
        else:
            continue  # student wasn't part of this session at all
        result.append({
            "session_id": session["session_id"],
            "date": session["date"],
            "timestamp": session.get("timestamp"),
            "status": status,
            "total_present": len(present_ids),
            "total_absent": len(absent_ids),
        })
    return result


def update_student_photos(
    student_id: str,
    averaged_encoding: list[float],
    registration_photos: list[str],
    photo_count: int,
) -> bool:
    result = students_col.update_one(
        {"_id": ObjectId(student_id)},
        {
            "$set": {
                "face_encoding": averaged_encoding,
                "registration_photos": registration_photos,
                "photo_count": photo_count,
            }
        },
    )
    return result.modified_count > 0


def delete_student(student_id: str) -> bool:
    result = students_col.delete_one({"_id": ObjectId(student_id)})
    return result.deleted_count > 0


def create_attendance_record(record: dict) -> str:
    result = attendance_col.insert_one(record)
    return str(result.inserted_id)


def get_sessions() -> list[dict]:
    sessions = list(attendance_col.find({}).sort("timestamp", -1))
    for session in sessions:
        session["id"] = str(session["_id"])
    return sessions


def get_session_by_session_id(session_id: str) -> dict | None:
    session = attendance_col.find_one({"session_id": session_id})
    if session:
        session["id"] = str(session["_id"])
    return session


def create_schedule(data: dict) -> str:
    data["created_at"] = datetime.now(timezone.utc)
    result = schedules_col.insert_one(data)
    return str(result.inserted_id)


def get_schedules() -> list[dict]:
    schedules = list(schedules_col.find({}).sort([("day_of_week", 1), ("time", 1)]))
    for schedule in schedules:
        schedule["id"] = str(schedule["_id"])
        del schedule["_id"]
    return schedules


def update_schedule(schedule_id: str, data: dict) -> bool:
    data["updated_at"] = datetime.now(timezone.utc)
    result = schedules_col.update_one(
        {"_id": ObjectId(schedule_id)},
        {"$set": data}
    )
    return result.modified_count > 0


def delete_schedule(schedule_id: str) -> bool:
    result = schedules_col.delete_one({"_id": ObjectId(schedule_id)})
    return result.deleted_count > 0


def get_student_streak(student_id: str) -> int:
    """Calculates consecutive 'present' statuses from newest to oldest."""
    records = get_student_attendance(student_id)
    streak = 0
    # records are already sorted by timestamp desc in get_student_attendance
    for r in records:
        if r["status"] == "present":
            streak += 1
        else:
            break
    return streak


def get_weekly_leaderboard() -> list[dict]:
    """Calculate top 5 students for the current calendar week."""
    from datetime import timedelta
    now = datetime.now(timezone.utc)
    # Start of week (Monday)
    start_of_week = now - timedelta(days=now.weekday())
    start_of_week = start_of_week.replace(hour=0, minute=0, second=0, microsecond=0)

    sessions = list(attendance_col.find({"timestamp": {"$gte": start_of_week}}))
    if not sessions:
        return []

    # Count attendance per student this week
    students = list(students_col.find({}, {"name": 1, "roll_number": 1}))
    student_stats = []

    for s in students:
        sid = str(s["_id"])
        total_week_sessions = 0
        present_week_sessions = 0

        for sess in sessions:
            present_ids = {str(r.get("student_id", "")) for r in sess.get("results", []) if r.get("status") == "present"}
            absent_ids = {str(a.get("student_id", "")) for a in sess.get("absent_students", [])}
            
            if sid in present_ids:
                total_week_sessions += 1
                present_week_sessions += 1
            elif sid in absent_ids:
                total_week_sessions += 1

        if total_week_sessions > 0:
            percentage = round((present_week_sessions / total_week_sessions) * 100, 1)
            student_stats.append({
                "name": s["name"],
                "percentage": percentage,
                "present": present_week_sessions,
                "total": total_week_sessions
            })

    # Sort by percentage desc, then present count desc
    student_stats.sort(key=lambda x: (x["percentage"], x["present"]), reverse=True)
    return student_stats[:5]

