import os
import requests
import threading
import logging
from datetime import datetime
from pymongo import MongoClient

logger = logging.getLogger(__name__)

# To migrate to WhatsApp in future:
# Replace Telegram Bot API calls with WhatsApp Business API
# (Twilio or Meta's official API). Message content stays identical.
# Only the sending function and chat_id storage needs to change.
# Store field as messaging_chat_id and messaging_platform in DB
# to make future migration easier.

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_BOT_USERNAME = os.getenv("TELEGRAM_BOT_USERNAME")
BACKEND_URL = os.getenv("BACKEND_URL", "http://127.0.0.1:5000")
TELEGRAM_API_URL = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}"

# In-memory dictionary to store users currently linking their accounts
# Format: { chat_id: "WAITING_FOR_ROLL_NUMBER" }
_linking_state = {}

def is_telegram_configured():
    return bool(TELEGRAM_BOT_TOKEN)

def setup_webhook():
    if not is_telegram_configured():
        logger.info("Telegram bot token not configured. Skipping webhook setup.")
        return

    try:
        url = f"{TELEGRAM_API_URL}/setWebhook"
        webhook_url = f"{BACKEND_URL}/api/telegram/webhook"
        response = requests.post(url, json={"url": webhook_url}, timeout=10)
        
        if response.status_code == 200:
            logger.info("Telegram webhook registered successfully.")
        else:
            logger.error(f"Failed to register Telegram webhook: {response.text}")
    except Exception as e:
        logger.error(f"Error setting up Telegram webhook: {e}")

def handle_webhook(data):
    if not is_telegram_configured():
        return
        
    try:
        message = data.get("message", {})
        chat_id = message.get("chat", {}).get("id")
        text = message.get("text", "").strip()

        if not chat_id or not text:
            return

        if text.startswith("/start"):
            _linking_state[chat_id] = "WAITING_FOR_ROLL_NUMBER"
            _send_message(chat_id, "Welcome! Please send your Roll Number to link your account.")
            return

        if _linking_state.get(chat_id) == "WAITING_FOR_ROLL_NUMBER":
            roll_number = text.strip()
            # Link to student
            from database import students_col
            
            student = students_col.find_one({"roll_number": roll_number})
            if student:
                students_col.update_one(
                    {"_id": student["_id"]},
                    {"$set": {"telegram_chat_id": str(chat_id)}}
                )
                _send_message(chat_id, "Linked successfully! You will now receive attendance notifications. ✓")
                del _linking_state[chat_id]
            else:
                _send_message(chat_id, "Roll number not found. Please check and try again.")
            return

    except Exception as e:
        logger.error(f"Error handling Telegram webhook: {e}")

def _send_message(chat_id, text):
    if not is_telegram_configured():
        return
        
    try:
        url = f"{TELEGRAM_API_URL}/sendMessage"
        payload = {
            "chat_id": chat_id,
            "text": text,
            "parse_mode": "HTML"
        }
        requests.post(url, json=payload, timeout=10)
    except Exception as e:
        logger.error(f"Failed to send Telegram message to {chat_id}: {e}")

def send_session_attendance(record):
    """
    Called in a background thread after an attendance session is saved.
    """
    if not is_telegram_configured():
        return

    try:
        from database import get_students, get_email_settings, log_email
        
        settings = get_email_settings()
        if not settings.get("telegram_enabled", True):
            return

        students = get_students(include_encodings=False)
        student_dict = {str(s["id"]): s for s in students}
        
        # Parse session info
        subject = record.get("subject", "Class")
        room = record.get("room", "")
        
        # Format date and time
        try:
            # We want local time formatting. 
            timestamp = record.get("timestamp")
            if not isinstance(timestamp, datetime):
                # Try to parse if string
                from dateutil import parser
                dt = parser.parse(timestamp) if timestamp else datetime.now(timezone.utc)
            else:
                dt = timestamp

            # Convert to IST (+05:30)
            from datetime import timedelta, timezone
            ist = timezone(timedelta(hours=5, minutes=30))
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            dt = dt.astimezone(ist)
                
            date_str = dt.strftime("%d %b %Y")
            time_str = dt.strftime("%I:%M %p")
        except:
            date_str = record.get("session_date", "Today")
            time_str = "Recent"

        notes = record.get("notes", "")

        present_ids = {str(r.get("student_id")) for r in record.get("results", []) if r.get("status") == "present"}
        absent_ids = {str(s.get("student_id")) for s in record.get("absent_students", [])}

        for student_id, student in student_dict.items():
            chat_id = student.get("telegram_chat_id")
            if not chat_id:
                continue
                
            status = None
            if student_id in present_ids:
                status = "Present"
            elif student_id in absent_ids:
                status = "Absent"
                
            if not status:
                continue

            if status == "Present":
                msg = f"✅ Attendance Marked – {subject}\n\n"
                msg += f"📅 Date: {date_str}\n"
                msg += f"⏰ Time: {time_str}\n"
                if room:
                    msg += f"🏫 Room: {room}\n"
                msg += f"📝 Status: Present\n\n"
                if notes:
                    msg += f"📖 Notes: {notes}\n\n"
                msg += "If you were not present, please contact your teacher immediately."
            else:
                msg = f"❌ Attendance Marked – {subject}\n\n"
                msg += f"📅 Date: {date_str}\n"
                msg += f"⏰ Time: {time_str}\n"
                if room:
                    msg += f"🏫 Room: {room}\n"
                msg += f"📝 Status: Absent\n\n"
                if notes:
                    msg += f"📖 Notes: {notes}\n\n"
                msg += "If you were present, please contact your teacher immediately to correct this."

            try:
                _send_message(chat_id, msg)
                # Log success
                log_email(
                    recipient=student.get("email", ""),
                    email_type="telegram",
                    status="sent",
                    local_date=dt.strftime("%Y-%m-%d") if isinstance(dt, datetime) else ""
                )
            except Exception as send_err:
                logger.error(f"Failed to send Telegram msg to {chat_id}: {send_err}")
                log_email(
                    recipient=student.get("email", ""),
                    email_type="telegram",
                    status="failed",
                    error=str(send_err),
                    local_date=dt.strftime("%Y-%m-%d") if isinstance(dt, datetime) else ""
                )
                
    except Exception as e:
        logger.error(f"Error in send_session_attendance (Telegram): {e}")
