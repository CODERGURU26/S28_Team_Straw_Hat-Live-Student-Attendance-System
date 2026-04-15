import os
import uuid
import cv2
import numpy as np
import face_recognition

MATCH_TOLERANCE = 0.5


# ---------------- ENCODING ---------------- #

def encode_face(image_path: str) -> np.ndarray:
    """Return exactly one 128-d face encoding for a photo."""
    image = face_recognition.load_image_file(image_path)
    face_locations = face_recognition.face_locations(image, model="hog")

    if len(face_locations) == 0:
        raise ValueError("No face detected in uploaded image")
    if len(face_locations) > 1:
        raise ValueError("Multiple faces detected. Please upload exactly one face")

    encoding = face_recognition.face_encodings(image, face_locations)[0]
    return encoding


def average_encodings(list_of_encodings: list[np.ndarray]) -> np.ndarray:
    """Average a list of encodings."""
    if not list_of_encodings:
        raise ValueError("No encodings provided")
    return np.mean(list_of_encodings, axis=0)


def extract_single_face_encoding(image_path: str) -> list[float]:
    """Backward-compatible helper."""
    return encode_face(image_path).tolist()


# ---------------- FACE DETECTION + MATCH ---------------- #

def _build_match_result(
    face_encoding: np.ndarray,
    known_encodings: list[np.ndarray],
    known_students: list[dict],
) -> dict:
    if not known_encodings:
        return {
            "student_id": None,
            "name": "Unknown",
            "roll_number": "",
            "confidence": 0,
            "matched": False,
            "status": "unknown",
        }

    face_distances = face_recognition.face_distance(known_encodings, face_encoding)

    if len(face_distances) == 0:
        return {
            "student_id": None,
            "name": "Unknown",
            "roll_number": "",
            "confidence": 0,
            "matched": False,
            "status": "unknown",
        }

    best_idx = int(np.argmin(face_distances))
    distance = float(face_distances[best_idx])
    confidence = round(max(0.0, min(1.0, 1 - distance)) * 100, 1)

    if distance <= MATCH_TOLERANCE:
        matched_student = known_students[best_idx]
        return {
            "student_id": str(matched_student.get("_id")),
            "name": matched_student.get("name", "Unknown"),
            "roll_number": matched_student.get("roll_number", ""),
            "confidence": confidence,
            "matched": True,
            "status": "present",
        }

    return {
        "student_id": None,
        "name": "Unknown",
        "roll_number": "",
        "confidence": 0,
        "matched": False,
        "status": "unknown",
    }


def annotate_image(image: np.ndarray, recognition_results: list[dict]) -> np.ndarray:
    annotated_image = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)
    image_height, image_width = annotated_image.shape[:2]
    font = cv2.FONT_HERSHEY_SIMPLEX
    font_scale = 0.6
    thickness = 2
    text_padding_x = 8
    text_padding_y = 8

    for result in recognition_results:
        top, right, bottom, left = result["bbox"]
        is_matched = bool(result.get("matched"))
        color = (0, 180, 0) if is_matched else (0, 0, 255)
        label = (
            f'{result["name"]} {result["confidence"]:.1f}%'
            if is_matched
            else "Unknown"
        )

        cv2.rectangle(annotated_image, (left, top), (right, bottom), color, 2)

        (text_width, text_height), baseline = cv2.getTextSize(
            label,
            font,
            font_scale,
            thickness,
        )
        label_height = text_height + (text_padding_y * 2) + baseline
        label_width = text_width + (text_padding_x * 2)

        label_left = max(0, min(left, image_width - label_width))
        label_right = min(image_width, label_left + label_width)

        if top >= label_height:
            label_top = top - label_height
            label_bottom = top
        else:
            label_top = top
            label_bottom = min(image_height, top + label_height)

        cv2.rectangle(
            annotated_image,
            (label_left, label_top),
            (label_right, label_bottom),
            color,
            cv2.FILLED,
        )
        cv2.putText(
            annotated_image,
            label,
            (label_left + text_padding_x, label_bottom - text_padding_y - baseline),
            font,
            font_scale,
            (255, 255, 255),
            thickness,
            cv2.LINE_AA,
        )

    return annotated_image

def detect_faces_and_match(
    group_photo_path: str,
    known_students: list[dict],
    output_folder: str
) -> tuple[list[dict], str]:

    image = face_recognition.load_image_file(group_photo_path)
    face_locations = face_recognition.face_locations(image, model="hog")
    face_encodings = face_recognition.face_encodings(image, face_locations)

    # ✅ FILTER VALID STUDENTS
    known_encodings = []
    valid_students = []

    for s in known_students:
        encoding = s.get("face_encoding")

        if encoding is None or len(encoding) == 0:
            print(f"⚠️ Skipping student without encoding: {s.get('name')}")
            continue

        try:
            enc_array = np.array(encoding, dtype=np.float64)

            # ensure it's correct shape (128-d)
            if enc_array.shape != (128,):
                print(f"⚠️ Invalid encoding shape for {s.get('name')}")
                continue

            known_encodings.append(enc_array)
            valid_students.append(s)

        except Exception as e:
            print(f"⚠️ Error processing encoding for {s.get('name')}: {e}")

    # replace list with valid ones
    known_students = valid_students

    recognition_results: list[dict] = []

    for face_encoding, (top, right, bottom, left) in zip(face_encodings, face_locations):
        match_result = _build_match_result(face_encoding, known_encodings, known_students)

        recognition_results.append({
            **match_result,
            "bbox": [int(top), int(right), int(bottom), int(left)],
        })

    # ---------------- DRAW BOXES ---------------- #

    annotated_image = annotate_image(image, recognition_results)

    # ---------------- SAVE IMAGE ---------------- #

    os.makedirs(output_folder, exist_ok=True)

    annotated_name = f"annotated_{uuid.uuid4().hex}.jpg"
    annotated_path = os.path.join(output_folder, annotated_name)

    cv2.imwrite(annotated_path, annotated_image)

    return recognition_results, annotated_path
