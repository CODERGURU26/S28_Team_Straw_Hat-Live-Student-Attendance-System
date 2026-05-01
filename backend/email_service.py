"""
email_service.py — Gmail SMTP email engine for the attendance system.

Uses Python's built-in smtplib + email.mime (no extra dependencies).
All sends are logged to the email_logs MongoDB collection.
If MAIL_EMAIL or MAIL_PASSWORD are missing or still set to the placeholder
values, sending is skipped silently.
"""

import logging
import os
import smtplib
from datetime import datetime, timedelta, timezone
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from database import (
    get_students,
    get_sessions_for_date,
    get_scheduled_sessions_for_date,
    get_sessions_for_week,
    get_student_attendance,
    get_email_settings,
    log_email,
)

logger = logging.getLogger(__name__)

PLACEHOLDER_EMAIL = "your_gmail@gmail.com"
PLACEHOLDER_PASS = "your_gmail_app_password"

INSTITUTION_NAME = "SLRTCE Attendance System"
PRIMARY_BLUE = "#1e40af"


# ─────────────────────────────────────────────────────────────
# SMTP helpers
# ─────────────────────────────────────────────────────────────

def _get_credentials():
    """Return (email, password, from_name) or (None, None, None) if not configured."""
    mail_email = os.getenv("MAIL_EMAIL", "").strip()
    mail_pass = os.getenv("MAIL_PASSWORD", "").strip()
    from_name = os.getenv("MAIL_FROM_NAME", "Attendance System").strip()

    if (
        not mail_email
        or not mail_pass
        or mail_email == PLACEHOLDER_EMAIL
        or mail_pass == PLACEHOLDER_PASS
    ):
        return None, None, None

    return mail_email, mail_pass, from_name


def _send_via_smtp(to: str, cc_list: list[str], subject: str, html_body: str) -> None:
    """Send one email. Raises on failure so the caller can log and continue."""
    mail_email, mail_pass, from_name = _get_credentials()
    if not mail_email:
        raise RuntimeError("SMTP credentials not configured")

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{from_name} <{mail_email}>"
    msg["To"] = to
    if cc_list:
        msg["Cc"] = ", ".join(cc_list)

    msg.attach(MIMEText(html_body, "html"))

    all_recipients = [to] + cc_list

    with smtplib.SMTP("smtp.gmail.com", 587, timeout=15) as server:
        server.ehlo()
        server.starttls()
        server.ehlo()
        server.login(mail_email, mail_pass)
        server.sendmail(mail_email, all_recipients, msg.as_string())


def send_email(to: str, cc_list: list[str], subject: str, html_body: str, email_type: str, local_date: str = "") -> bool:
    """
    Send one email, log the result.
    Returns True on success, False on failure.
    Silently returns False if credentials are not configured.
    """
    mail_email, _, _ = _get_credentials()
    if not mail_email:
        logger.warning("Email credentials not configured — skipping send to %s", to)
        return False

    try:
        _send_via_smtp(to, cc_list, subject, html_body)
        log_email(to, email_type, "sent", local_date=local_date)
        logger.info("Email sent: type=%s to=%s date=%s", email_type, to, local_date)
        return True
    except Exception as exc:
        log_email(to, email_type, "failed", error=str(exc), local_date=local_date)
        logger.error("Failed to send %s email to %s: %s", email_type, to, exc)
        return False


# ─────────────────────────────────────────────────────────────
# HTML template helpers
# ─────────────────────────────────────────────────────────────

def _html_wrapper(title: str, body_content: str) -> str:
    """Wrap content in a responsive HTML email shell."""
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{title}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0"
               style="background:#ffffff;border-radius:12px;overflow:hidden;
                      box-shadow:0 4px 24px rgba(0,0,0,0.08);max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:{PRIMARY_BLUE};padding:28px 32px;">
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.3px;">
                {INSTITUTION_NAME}
              </h1>
              <p style="margin:4px 0 0;color:#bfdbfe;font-size:13px;">{title}</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              {body_content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;padding:20px 32px;border-top:1px solid #e2e8f0;">
              <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.6;">
                This is an automated message from {INSTITUTION_NAME}.<br/>
                Please do not reply to this email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


def _status_badge(status: str) -> str:
    if status == "present":
        return '<span style="color:#16a34a;font-weight:600;">✓ Present</span>'
    return '<span style="color:#dc2626;font-weight:600;">✗ Absent</span>'


def _table_row(cells: list[str], bg: str = "#ffffff") -> str:
    cells_html = "".join(
        f'<td style="padding:10px 14px;border-bottom:1px solid #f1f5f9;color:#374151;font-size:14px;">{c}</td>'
        for c in cells
    )
    return f'<tr style="background:{bg};">{cells_html}</tr>'


def _table_header(cols: list[str]) -> str:
    cells_html = "".join(
        f'<th style="padding:10px 14px;text-align:left;font-size:12px;'
        f'font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">{c}</th>'
        for c in cols
    )
    return f'<tr style="background:#f8fafc;border-bottom:2px solid #e5e7eb;">{cells_html}</tr>'


# ─────────────────────────────────────────────────────────────
# Daily summary email
# ─────────────────────────────────────────────────────────────

def build_daily_summary_html(
    student: dict,
    sessions_data: list[dict],
    date_str: str,
) -> str:
    """
    Build HTML for the daily attendance summary email.
    sessions_data: list of {subject, time, status, notes}
    """
    student_name = student.get("name", "Student")
    present_count = sum(1 for s in sessions_data if s.get("status") == "present")
    total_count = len(sessions_data)
    has_absent = any(s.get("status") == "absent" for s in sessions_data)

    # Build session rows
    rows_html = ""
    for i, sess in enumerate(sessions_data):
        bg = "#ffffff" if i % 2 == 0 else "#f9fafb"
        notes = sess.get("notes", "") or "—"
        notes_html = (
            f'<span style="color:#9ca3af;font-style:italic;font-size:13px;">{notes}</span>'
        )
        rows_html += _table_row(
            [
                f'<strong>{sess.get("subject","—")}</strong>',
                sess.get("time", "—"),
                _status_badge(sess.get("status", "absent")),
                notes_html,
            ],
            bg=bg,
        )

    absence_note = ""
    if has_absent:
        absence_note = """
        <div style="margin:20px 0;padding:14px 18px;background:#fef2f2;border-left:4px solid #ef4444;border-radius:6px;">
          <p style="margin:0;color:#b91c1c;font-size:14px;">
            ⚠ Please inform your teacher if any absence status is incorrect.
          </p>
        </div>"""

    formatted_date = datetime.fromisoformat(date_str).strftime("%A, %d %B %Y")

    body = f"""
    <p style="color:#374151;font-size:16px;margin-bottom:24px;">
      Dear <strong>{student_name}</strong>,<br/><br/>
      Here is your attendance summary for <strong>{formatted_date}</strong>.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0"
           style="border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:20px;">
      {_table_header(["Subject", "Time", "Status", "Notes"])}
      {rows_html}
    </table>

    <p style="color:#6b7280;font-size:12px;margin-bottom:16px;font-style:italic;">
      Session notes are added by your teacher and reflect what was covered in class.
    </p>

    <p style="color:#374151;font-size:15px;font-weight:600;margin-bottom:8px;">
      You attended <span style="color:{PRIMARY_BLUE};">{present_count}</span> out of
      <span style="color:{PRIMARY_BLUE};">{total_count}</span> sessions today.
    </p>

    {absence_note}
    """

    return _html_wrapper(f"Attendance Summary — {formatted_date}", body)


# ─────────────────────────────────────────────────────────────
# Weekly summary email
# ─────────────────────────────────────────────────────────────

def build_weekly_summary_html(
    student: dict,
    week_sessions: list[dict],
    student_attendance_records: list[dict],
    all_time_records: list[dict],
    start_date: str,
    end_date: str,
    has_parent_cc: bool = False,
) -> str:
    student_name = student.get("name", "Student")
    student_id = str(student.get("id") or student.get("_id", ""))

    # Week stats
    total_this_week = len(week_sessions)
    present_this_week = sum(1 for r in student_attendance_records if r.get("status") == "present")
    absent_this_week = total_this_week - present_this_week
    week_pct = round((present_this_week / total_this_week) * 100, 1) if total_this_week > 0 else 0.0

    # All-time stats
    total_all = len(all_time_records)
    present_all = sum(1 for r in all_time_records if r.get("status") == "present")
    all_pct = round((present_all / total_all) * 100, 1) if total_all > 0 else 0.0

    # Per-subject breakdown (this week)
    subject_map: dict[str, dict] = {}
    for sess in week_sessions:
        subj = sess.get("subject", "Unknown")
        if subj not in subject_map:
            subject_map[subj] = {"scheduled": 0, "present": 0, "absent": 0}
        subject_map[subj]["scheduled"] += 1

    # Match attendance records to sessions by date
    attendance_dates = {r.get("date"): r.get("status") for r in student_attendance_records}
    for sess in week_sessions:
        subj = sess.get("subject", "Unknown")
        d = sess.get("date", "")
        status = attendance_dates.get(d, "absent")
        if status == "present":
            subject_map[subj]["present"] += 1
        else:
            subject_map[subj]["absent"] += 1

    # Subject table rows
    subj_rows_html = ""
    for i, (subj, data) in enumerate(subject_map.items()):
        bg = "#ffffff" if i % 2 == 0 else "#f9fafb"
        rate = round((data["present"] / data["scheduled"]) * 100, 1) if data["scheduled"] > 0 else 0.0
        rate_color = "#16a34a" if rate >= 75 else "#d97706" if rate >= 50 else "#dc2626"
        subj_rows_html += _table_row(
            [
                f'<strong>{subj}</strong>',
                str(data["scheduled"]),
                f'<span style="color:#16a34a;">{data["present"]}</span>',
                f'<span style="color:#dc2626;">{data["absent"]}</span>',
                f'<span style="color:{rate_color};font-weight:600;">{rate}%</span>',
            ],
            bg=bg,
        )

    # Session notes section
    notes_items = ""
    for sess in week_sessions:
        notes = sess.get("notes", "")
        if notes:
            d = datetime.fromisoformat(sess.get("date", "2000-01-01")).strftime("%b %d")
            subj = sess.get("subject", "")
            notes_items += (
                f'<li style="margin-bottom:8px;color:#374151;font-size:14px;">'
                f'<strong>{d} — {subj}:</strong> '
                f'<span style="color:#6b7280;">{notes}</span></li>'
            )

    notes_section = ""
    if notes_items:
        notes_section = f"""
        <h3 style="font-size:15px;font-weight:600;color:#1e293b;margin:24px 0 12px;">
          This Week's Session Notes
        </h3>
        <ul style="padding-left:20px;margin:0 0 20px;">{notes_items}</ul>"""

    # Motivational / warning line
    if all_pct >= 85:
        motivation_bg = "#f0fdf4"
        motivation_border = "#86efac"
        motivation_text = "#166534"
        motivation_msg = "🎉 Great work! Keep it up."
    elif all_pct >= 75:
        motivation_bg = "#eff6ff"
        motivation_border = "#93c5fd"
        motivation_text = "#1e40af"
        motivation_msg = "📊 You are on track. Stay consistent."
    else:
        motivation_bg = "#fef2f2"
        motivation_border = "#fca5a5"
        motivation_text = "#b91c1c"
        motivation_msg = (
            "⚠ Your attendance is below the required 75%. "
            "Please take this seriously."
        )

    parent_note = ""
    if has_parent_cc:
        parent_note = (
            '<p style="color:#6b7280;font-size:13px;margin-bottom:20px;'
            'padding:10px 14px;background:#f8fafc;border-radius:6px;border:1px solid #e2e8f0;">'
            "ℹ This report is being shared with your parent/guardian.</p>"
        )

    formatted_start = datetime.fromisoformat(start_date).strftime("%d %b")
    formatted_end = datetime.fromisoformat(end_date).strftime("%d %b %Y")

    body = f"""
    {parent_note}
    <p style="color:#374151;font-size:16px;margin-bottom:24px;">
      Dear <strong>{student_name}</strong>,<br/><br/>
      Here is your weekly attendance report for the week of
      <strong>{formatted_start} – {formatted_end}</strong>.
    </p>

    <!-- Week summary cards -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td style="padding:0 6px 0 0;width:25%;">
          <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:14px;text-align:center;">
            <p style="margin:0;font-size:22px;font-weight:700;color:{PRIMARY_BLUE};">{total_this_week}</p>
            <p style="margin:4px 0 0;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;">Sessions</p>
          </div>
        </td>
        <td style="padding:0 6px;width:25%;">
          <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:14px;text-align:center;">
            <p style="margin:0;font-size:22px;font-weight:700;color:#16a34a;">{present_this_week}</p>
            <p style="margin:4px 0 0;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;">Present</p>
          </div>
        </td>
        <td style="padding:0 6px;width:25%;">
          <div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;padding:14px;text-align:center;">
            <p style="margin:0;font-size:22px;font-weight:700;color:#dc2626;">{absent_this_week}</p>
            <p style="margin:4px 0 0;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;">Absent</p>
          </div>
        </td>
        <td style="padding:0 0 0 6px;width:25%;">
          <div style="background:#faf5ff;border:1px solid #d8b4fe;border-radius:8px;padding:14px;text-align:center;">
            <p style="margin:0;font-size:22px;font-weight:700;color:#7c3aed;">{week_pct}%</p>
            <p style="margin:4px 0 0;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;">This Week</p>
          </div>
        </td>
      </tr>
    </table>

    <h3 style="font-size:15px;font-weight:600;color:#1e293b;margin:0 0 12px;">
      Subject Breakdown
    </h3>
    <table width="100%" cellpadding="0" cellspacing="0"
           style="border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:20px;">
      {_table_header(["Subject", "Scheduled", "Present", "Absent", "Rate"])}
      {subj_rows_html}
    </table>

    <p style="color:#374151;font-size:14px;margin-bottom:20px;">
      <strong>Overall attendance (all time):</strong>
      {present_all} / {total_all} sessions —
      <span style="font-weight:700;color:{PRIMARY_BLUE};">{all_pct}%</span>
    </p>

    {notes_section}

    <div style="padding:14px 18px;background:{motivation_bg};border:1px solid {motivation_border};
                border-radius:8px;margin-bottom:20px;">
      <p style="margin:0;color:{motivation_text};font-size:14px;font-weight:500;">
        {motivation_msg}
      </p>
    </div>
    """

    return _html_wrapper(f"Weekly Attendance Report — {formatted_start} to {formatted_end}", body)


# ─────────────────────────────────────────────────────────────
# Send helpers
# ─────────────────────────────────────────────────────────────

def send_daily_summary_for_date(date_str: str) -> dict:
    """
    Send daily attendance summary emails for all students for a given date.
    Returns {sent: N, failed: N, skipped: N}.
    """
    settings = get_email_settings()
    if not settings.get("daily_enabled", True):
        logger.info("Daily emails disabled — skipping.")
        return {"sent": 0, "failed": 0, "skipped": 0}

    mail_email, _, _ = _get_credentials()
    if not mail_email:
        logger.warning("Email credentials not configured — skipping daily send.")
        return {"sent": 0, "failed": 0, "skipped": 0}

    students = get_students(include_encodings=False)
    attendance_records = get_sessions_for_date(date_str)
    scheduled_sessions = get_scheduled_sessions_for_date(date_str)

    sent = failed = skipped = 0

    for student in students:
        student_email = student.get("email", "")
        parent_email = student.get("parent_email", "").strip()
        student_id = str(student.get("id") or student.get("_id", ""))

        if not student_email:
            skipped += 1
            continue

        # Build per-student session data list
        sessions_data = []
        for occ in scheduled_sessions:
            subj = occ.get("subject", "")
            # Find matching attendance record using session_date (local) then date (UTC)
            matching = next(
                (r for r in attendance_records
                 if (
                     str(r.get("schedule_id", "")) == occ.get("session_id", "")
                     or str(r.get("session_id", "")) == occ.get("id", "")
                     or r.get("subject") == subj
                 )),
                None,
            )
            if matching:
                present_ids = {
                    str(res.get("student_id", ""))
                    for res in matching.get("results", [])
                    if res.get("status") == "present"
                }
                status = "present" if student_id in present_ids else "absent"
                notes = matching.get("notes", "") or ""
            else:
                status = "absent"
                notes = ""

            sessions_data.append({
                "subject": subj,
                "time": occ.get("time", ""),
                "status": status,
                "notes": notes,
            })

        if not sessions_data:
            # No sessions scheduled today — nothing to report
            skipped += 1
            continue

        cc_list = [parent_email] if parent_email else []
        subject = f"Attendance Summary – {date_str}"
        html_body = build_daily_summary_html(student, sessions_data, date_str)

        ok = send_email(student_email, cc_list, subject, html_body, "daily", local_date=date_str)
        if ok:
            sent += 1
        else:
            failed += 1

    logger.info("Daily email send complete: sent=%d failed=%d skipped=%d", sent, failed, skipped)
    return {"sent": sent, "failed": failed, "skipped": skipped}


def send_weekly_summary() -> dict:
    """
    Send weekly attendance summary emails for all students.
    Called by APScheduler every Sunday at 20:00.
    Returns {sent: N, failed: N, skipped: N}.
    """
    settings = get_email_settings()
    if not settings.get("weekly_enabled", True):
        logger.info("Weekly emails disabled — skipping.")
        return {"sent": 0, "failed": 0, "skipped": 0}

    mail_email, _, _ = _get_credentials()
    if not mail_email:
        logger.warning("Email credentials not configured — skipping weekly send.")
        return {"sent": 0, "failed": 0, "skipped": 0}

    today = datetime.now(timezone.utc).date()
    # Week: Monday to Sunday
    monday = today - timedelta(days=today.weekday())
    sunday = monday + timedelta(days=6)
    start_str = monday.isoformat()
    end_str = sunday.isoformat()

    students = get_students(include_encodings=False)
    week_attendance_records = get_sessions_for_week(start_str, end_str)
    all_att_map = {}  # student_id -> all-time attendance records

    sent = failed = skipped = 0

    for student in students:
        student_email = student.get("email", "")
        parent_email = student.get("parent_email", "").strip()
        student_id = str(student.get("id") or student.get("_id", ""))

        if not student_email:
            skipped += 1
            continue

        # All-time attendance
        if student_id not in all_att_map:
            all_att_map[student_id] = get_student_attendance(student_id)

        # Filter this week's records for this student
        student_week_records = []
        week_sessions_occurred = []
        for rec in week_attendance_records:
            present_ids = {
                str(r.get("student_id", ""))
                for r in rec.get("results", [])
                if r.get("status") == "present"
            }
            absent_ids = {
                str(a.get("student_id", ""))
                for a in rec.get("absent_students", [])
            }
            if student_id in present_ids:
                student_week_records.append({
                    "date": rec.get("session_date") or rec.get("date"),
                    "status": "present",
                })
            elif student_id in absent_ids:
                student_week_records.append({
                    "date": rec.get("session_date") or rec.get("date"),
                    "status": "absent",
                })

            # Collect session info for notes (use local session_date for display)
            week_sessions_occurred.append({
                "date": rec.get("session_date") or rec.get("date", ""),
                "subject": rec.get("subject", ""),
                "time": rec.get("time", ""),
                "notes": rec.get("notes", ""),
            })

        cc_list = [parent_email] if parent_email else []
        subject = f"Weekly Attendance Report – Week of {start_str} to {end_str}"
        html_body = build_weekly_summary_html(
            student,
            week_sessions_occurred,
            student_week_records,
            all_att_map[student_id],
            start_str,
            end_str,
            has_parent_cc=bool(parent_email),
        )

        ok = send_email(student_email, cc_list, subject, html_body, "weekly", local_date=start_str)
        if ok:
            sent += 1
        else:
            failed += 1

    logger.info("Weekly email send complete: sent=%d failed=%d skipped=%d", sent, failed, skipped)
    return {"sent": sent, "failed": failed, "skipped": skipped}


def send_test_email(teacher_email: str, teacher_name: str) -> bool:
    """Send a sample daily-style email to the teacher's own address for preview."""
    from datetime import timedelta
    # Use IST (UTC+5:30) for the test email date so the preview looks correct for the teacher
    IST = timezone(timedelta(hours=5, minutes=30))
    today = datetime.now(IST).date().isoformat()
    sample_student = {
        "name": teacher_name,
        "email": teacher_email,
        "id": "test",
        "parent_email": "",
    }
    sample_sessions = [
        {"subject": "Data Structures", "time": "09:00 AM", "status": "present",
         "notes": "Covered binary trees and in-order traversal."},
        {"subject": "Operating Systems", "time": "11:00 AM", "status": "absent", "notes": ""},
        {"subject": "Mathematics", "time": "02:00 PM", "status": "present",
         "notes": "Covered differential equations."},
    ]
    html_body = build_daily_summary_html(sample_student, sample_sessions, today)
    subject = f"[TEST] Attendance Summary – {today}"
    return send_email(teacher_email, [], subject, html_body, "test", local_date=today)
