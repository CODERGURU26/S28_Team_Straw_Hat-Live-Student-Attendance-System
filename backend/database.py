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


def _serialize_student(student: dict) -> dict:
    return {
        "id": str(student["_id"]),
        "name": student["name"],
        "roll_number": student["roll_number"],
        "photo_path": student["photo_path"],
        "registered_at": student.get("registered_at"),
    }


def create_student(name: str, roll_number: str, photo_path: str, face_encoding: list[float]) -> str:
    existing = students_col.find_one({"roll_number": roll_number})
    if existing:
        raise ValueError("Roll number already exists")

    result = students_col.insert_one(
        {
            "name": name,
            "roll_number": roll_number,
            "photo_path": photo_path,
            "face_encoding": face_encoding,
            "registered_at": datetime.now(timezone.utc),
        }
    )
    return str(result.inserted_id)


def get_students(include_encodings: bool = False) -> list[dict]:
    projection = None if include_encodings else {"face_encoding": 0}
    students = list(students_col.find({}, projection).sort("name", 1))
    if include_encodings:
        for student in students:
            student["id"] = str(student["_id"])
    else:
        students = [_serialize_student(s) for s in students]
    return students


def delete_student(student_id: str) -> bool:
    result = students_col.delete_one({"_id": ObjectId(student_id)})
    return result.deleted_count > 0


def create_attendance_record(record: dict) -> str:
    result = attendance_col.insert_one(record)
    return str(result.inserted_id)


def get_sessions() -> list[dict]:
    sessions = list(
        attendance_col.find({}).sort("timestamp", -1)
    )
    for session in sessions:
        session["id"] = str(session["_id"])
    return sessions


def get_session_by_session_id(session_id: str) -> dict | None:
    session = attendance_col.find_one({"session_id": session_id})
    if session:
        session["id"] = str(session["_id"])
    return session
