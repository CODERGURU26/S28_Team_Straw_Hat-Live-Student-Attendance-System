import csv
import io
import os
import uuid
from datetime import datetime, timezone
from bson import ObjectId
from dotenv import load_dotenv
from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
from werkzeug.utils import secure_filename

from database import (
    create_attendance_record,
    create_student,
    delete_student,
    get_session_by_session_id,
    get_sessions,
    get_students,
)
from face_utils import detect_faces_and_match, extract_single_face_encoding

load_dotenv()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_FOLDER = os.path.join(BASE_DIR, os.getenv("UPLOAD_FOLDER", "static/uploads"))
STUDENT_PHOTO_FOLDER = os.path.join(BASE_DIR, os.getenv("STUDENT_PHOTO_FOLDER", "static/student_photos"))

for folder in [UPLOAD_FOLDER, STUDENT_PHOTO_FOLDER]:
    os.makedirs(folder, exist_ok=True)

app = Flask(__name__, static_url_path="/static", static_folder="static")
CORS(app, resources={r"/api/*": {"origins": ["http://localhost:5173", "http://127.0.0.1:5173"]}})


@app.route("/api/students/validate", methods=["POST"])
def validate_student_photo():
    photo = request.files.get("photo")
    if not photo:
        return jsonify({"success": False, "message": "Photo is required"}), 400

    filename = secure_filename(f"validate_{uuid.uuid4().hex}_{photo.filename}")
    temp_path = os.path.join(STUDENT_PHOTO_FOLDER, filename)
    photo.save(temp_path)

    try:
        extract_single_face_encoding(temp_path)
        return jsonify({"success": True, "message": "Exactly one face detected"})
    except ValueError as exc:
        return jsonify({"success": False, "message": str(exc)}), 400
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


@app.route("/api/students/register", methods=["POST"])
def register_student():
    name = request.form.get("name", "").strip()
    roll_number = request.form.get("roll_number", "").strip()
    photo = request.files.get("photo")

    if not all([name, roll_number, photo]):
        return jsonify({"success": False, "message": "name, roll_number and photo are required"}), 400

    filename = secure_filename(f"{uuid.uuid4().hex}_{photo.filename}")
    photo_abs_path = os.path.join(STUDENT_PHOTO_FOLDER, filename)
    photo_rel_path = f"student_photos/{filename}"
    photo.save(photo_abs_path)

    try:
        face_encoding = extract_single_face_encoding(photo_abs_path)
        student_id = create_student(name, roll_number, photo_rel_path, face_encoding)
        return jsonify({"success": True, "student_id": student_id, "message": "Student registered successfully"}), 201
    except ValueError as exc:
        if os.path.exists(photo_abs_path):
            os.remove(photo_abs_path)
        return jsonify({"success": False, "message": str(exc)}), 400
    except Exception as exc:
        if os.path.exists(photo_abs_path):
            os.remove(photo_abs_path)
        return jsonify({"success": False, "message": f"Registration failed: {str(exc)}"}), 500


@app.route("/api/students", methods=["GET"])
def list_students():
    return jsonify(get_students(include_encodings=False))


@app.route("/api/students/<student_id>", methods=["DELETE"])
def remove_student(student_id):
    try:
        deleted = delete_student(student_id)
    except Exception:
        return jsonify({"success": False, "message": "Invalid student id"}), 400

    if not deleted:
        return jsonify({"success": False, "message": "Student not found"}), 404
    return jsonify({"success": True, "message": "Student deleted"})


@app.route("/api/attendance/take", methods=["POST"])
def take_attendance():
    group_photo = request.files.get("group_photo")
    if not group_photo:
        return jsonify({"success": False, "message": "group_photo is required"}), 400

    group_name = secure_filename(f"group_{uuid.uuid4().hex}_{group_photo.filename}")
    group_abs_path = os.path.join(UPLOAD_FOLDER, group_name)
    group_photo.save(group_abs_path)

    known_students = get_students(include_encodings=True)
    recognition_results, annotated_path = detect_faces_and_match(group_abs_path, known_students, UPLOAD_FOLDER)

    present_ids = {str(r["student_id"]) for r in recognition_results if r["student_id"] is not None}

    present_students = [
        {"student_id": sid, "name": s["name"], "roll_number": s["roll_number"]}
        for s in known_students
        if (sid := str(s["_id"])) in present_ids
    ]
    absent_students = [
        {"student_id": str(s["_id"]), "name": s["name"], "roll_number": s["roll_number"]}
        for s in known_students
        if str(s["_id"]) not in present_ids
    ]

    session_id = uuid.uuid4().hex
    record = {
        "session_id": session_id,
        "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "timestamp": datetime.now(timezone.utc),
        "annotated_image_path": f"uploads/{os.path.basename(annotated_path)}",
        "results": recognition_results,
        "absent_students": absent_students,
    }
    create_attendance_record(record)

    return jsonify(
        {
            "session_id": session_id,
            "present": present_students,
            "absent": absent_students,
            "unknown_count": sum(1 for r in recognition_results if r["status"] == "unknown"),
            "annotated_image_url": f"/static/{record['annotated_image_path']}",
        }
    )


@app.route("/api/attendance/sessions", methods=["GET"])
def attendance_sessions():
    sessions = get_sessions()
    summaries = []
    for s in sessions:
        present_count = sum(1 for r in s.get("results", []) if r.get("status") == "present")
        unknown_count = sum(1 for r in s.get("results", []) if r.get("status") == "unknown")
        summaries.append(
            {
                "session_id": s["session_id"],
                "date": s["date"],
                "timestamp": s["timestamp"],
                "present_count": present_count,
                "unknown_count": unknown_count,
                "absent_count": len(s.get("absent_students", [])),
            }
        )
    return jsonify(summaries)


@app.route("/api/attendance/session/<session_id>", methods=["GET"])
def attendance_session(session_id):
    session = get_session_by_session_id(session_id)
    if not session:
        return jsonify({"success": False, "message": "Session not found"}), 404

    for result in session.get("results", []):
        if isinstance(result.get("student_id"), ObjectId):
            result["student_id"] = str(result["student_id"])

    return jsonify(
        {
            "session_id": session["session_id"],
            "date": session["date"],
            "timestamp": session["timestamp"],
            "annotated_image_url": f"/static/{session['annotated_image_path']}",
            "results": session.get("results", []),
            "absent_students": session.get("absent_students", []),
        }
    )


@app.route("/api/attendance/export/<session_id>", methods=["GET"])
def export_attendance_csv(session_id):
    session = get_session_by_session_id(session_id)
    if not session:
        return jsonify({"success": False, "message": "Session not found"}), 404

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Name", "Roll Number", "Status", "BBox"])

    present_lookup = {}
    for result in session.get("results", []):
        if result.get("status") == "present":
            present_lookup[result["name"]] = result

    for result in session.get("results", []):
        if result["status"] == "unknown":
            writer.writerow(["Unknown", "-", "unknown", result["bbox"]])

    for student in session.get("absent_students", []):
        writer.writerow([student["name"], student["roll_number"], "absent", "-"])

    for result in session.get("results", []):
        if result["status"] == "present":
            writer.writerow([result["name"], "-", "present", result["bbox"]])

    output.seek(0)
    return send_file(
        io.BytesIO(output.getvalue().encode("utf-8")),
        mimetype="text/csv",
        as_attachment=True,
        download_name=f"attendance_{session_id}.csv",
    )


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
