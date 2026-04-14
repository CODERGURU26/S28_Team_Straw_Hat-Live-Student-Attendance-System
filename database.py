"""
database.py — MongoDB database setup and query helpers for the
Face Recognition Attendance Monitoring System.
"""

import os
import numpy as np
from datetime import datetime
from pymongo import MongoClient
from bson.objectid import ObjectId
from bson.binary import Binary
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")
if not MONGO_URI:
    raise ValueError("No MONGO_URI found in environment variables. Please check your .env file.")

client = MongoClient(MONGO_URI)
try:
    db = client.get_default_database()
except:
    db = client["attendance_system"]

if db is None:
    db = client["attendance_system"]

# Collections
students_col = db["students"]
attendance_col = db["attendance_records"]


def init_db():
    """
    Ensure the collections exist. 
    MongoDB creates them automatically on first insertion, 
    but we can create indexes here.
    """
    try:
        # Create unique index on student name
        students_col.create_index("name", unique=True)
        print("[*] MongoDB connected and indexes verified.")
    except Exception as e:
        print(f"[!] Error initializing MongoDB: {e}")


# ── Student helpers ──────────────────────────────────────────────

def add_student(name: str, photo_path: str, encoding: np.ndarray) -> str:
    """Insert a new student. Returns the new document id as a string."""
    student_doc = {
        "name": name,
        "photo_path": photo_path,
        "face_encoding": Binary(encoding.tobytes()),
        "created_at": datetime.now()
    }
    result = students_col.insert_one(student_doc)
    return str(result.inserted_id)


def student_name_exists(name: str) -> bool:
    """Check if a student with the given name already exists."""
    student = students_col.find_one({"name": {"$regex": f"^{name}$", "$options": "i"}})
    return student is not None


def get_all_students():
    """Return all students as a list of dicts."""
    students = []
    cursor = students_col.find().sort("name", 1)
    
    for doc in cursor:
        students.append({
            "id": str(doc["_id"]),
            "name": doc["name"],
            "photo_path": doc["photo_path"],
            "face_encoding": np.frombuffer(doc["face_encoding"], dtype=np.float64),
            "created_at": doc["created_at"].strftime("%Y-%m-%d %H:%M:%S") if isinstance(doc["created_at"], datetime) else doc["created_at"],
        })
    return students


def get_student_by_id(student_id: str):
    """Return a single student dict or None."""
    try:
        doc = students_col.find_one({"_id": ObjectId(student_id)})
        if not doc:
            return None
        return {
            "id": str(doc["_id"]),
            "name": doc["name"],
            "photo_path": doc["photo_path"],
            "face_encoding": np.frombuffer(doc["face_encoding"], dtype=np.float64),
            "created_at": doc["created_at"],
        }
    except Exception:
        return None


def delete_student(student_id: str):
    """Delete a student by id string."""
    try:
        students_col.delete_one({"_id": ObjectId(student_id)})
    except Exception as e:
        print(f"[!] Error deleting student: {e}")


# ── Attendance helpers ───────────────────────────────────────────

def save_attendance(records: list[dict]):
    """
    Save a batch of attendance records.
    Each dict: {"student_id": str, "status": "Present"|"Absent"}
    """
    now = datetime.now()
    date_str = now.strftime("%Y-%m-%d")
    timestamp_str = now.strftime("%Y-%m-%d %H:%M:%S")

    docs = []
    for rec in records:
        docs.append({
            "student_id": ObjectId(rec["student_id"]) if ObjectId.is_valid(rec["student_id"]) else rec["student_id"],
            "date": date_str,
            "status": rec["status"],
            "timestamp": timestamp_str
        })

    if docs:
        attendance_col.insert_many(docs)
        
    return timestamp_str


def get_attendance_history(limit: int = 50):
    """Return recent attendance records joined with student names."""
    # Since MongoDB isn't a relational DB, we'll do an aggregation or separate fetches.
    # Aggregation is cleaner.
    pipeline = [
        {
            "$lookup": {
                "from": "students",
                "localField": "student_id",
                "foreignField": "_id",
                "as": "student"
            }
        },
        {"$unwind": "$student"},
        {
            "$project": {
                "id": {"$toString": "$_id"},
                "name": "$student.name",
                "status": 1,
                "date": 1,
                "timestamp": 1
            }
        },
        {"$sort": {"timestamp": -1}},
        {"$limit": limit}
    ]
    
    try:
        records = list(attendance_col.aggregate(pipeline))
        return records
    except Exception as e:
        print(f"[!] Error fetching attendance history: {e}")
        return []
