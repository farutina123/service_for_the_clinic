"""
Слой доступа к данным поверх SQLite.
Все функции возвращают dict, совместимые с Pydantic-моделями API.
"""
from typing import Optional
from datetime import datetime, timedelta
from uuid import uuid4

from database import (
    get_db,
    APPOINTMENT_STATUS_BY_ID,
    APPOINTMENT_STATUS_BY_NAME,
    DOCTOR_ACTIVE_STATUS_ID,
    DOCTOR_INACTIVE_STATUS_ID,
)


# ── Преобразование строк БД → dict для API ───────────────────────────────────

def _doctor_row(row) -> dict:
    d = dict(row)
    d["is_active"] = d.pop("status_id") == DOCTOR_ACTIVE_STATUS_ID
    return d


def _service_row(row) -> dict:
    d = dict(row)
    d["is_active"] = bool(d["is_active"])
    return d


def _appointment_row(row) -> dict:
    d = dict(row)
    status_id = d.pop("status_id")
    d["status"] = APPOINTMENT_STATUS_BY_ID.get(status_id, "pending")
    return d


# ── Users ────────────────────────────────────────────────────────────────────

def get_users() -> list[dict]:
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM users WHERE is_active = 1 ORDER BY created_at"
        ).fetchall()
        return [dict(r) for r in rows]


def get_user_by_id(user_id: str) -> Optional[dict]:
    with get_db() as conn:
        row = conn.execute(
            "SELECT * FROM users WHERE id = ? AND is_active = 1", (user_id,)
        ).fetchone()
        return dict(row) if row else None


def get_user_telegram_chat_id(user_id: str) -> Optional[str]:
    with get_db() as conn:
        row = conn.execute(
            "SELECT telegram_chat_id FROM users WHERE id = ? AND is_active = 1",
            (user_id,),
        ).fetchone()
        if not row:
            return None
        return row["telegram_chat_id"]


def set_user_telegram_chat_id(user_id: str, chat_id: str) -> Optional[dict]:
    now = datetime.utcnow().isoformat()
    with get_db() as conn:
        conn.execute(
            "UPDATE users SET telegram_chat_id = ?, telegram_linked_at = ? WHERE id = ? AND is_active = 1",
            (chat_id, now, user_id),
        )
    return get_user_by_id(user_id)


def clear_user_telegram_chat_id(user_id: str) -> Optional[dict]:
    with get_db() as conn:
        conn.execute(
            "UPDATE users SET telegram_chat_id = NULL, telegram_linked_at = NULL WHERE id = ? AND is_active = 1",
            (user_id,),
        )
    return get_user_by_id(user_id)


def get_user_by_phone(phone: str) -> Optional[dict]:
    with get_db() as conn:
        row = conn.execute(
            "SELECT * FROM users WHERE phone = ? AND is_active = 1", (phone,)
        ).fetchone()
        return dict(row) if row else None


def create_user(data: dict) -> dict:
    with get_db() as conn:
        conn.execute(
            """INSERT INTO users
               (id, name, phone, email, password_hash, role, discount, is_active, created_at)
               VALUES (:id, :name, :phone, :email, :password_hash, :role, :discount, 1, :created_at)""",
            data,
        )
    return get_user_by_id(data["id"])


def create_telegram_link_token(user_id: str, ttl_minutes: int) -> str:
    token = str(uuid4())
    now = datetime.utcnow()
    expires_at = (now + timedelta(minutes=ttl_minutes)).isoformat()
    with get_db() as conn:
        conn.execute(
            """INSERT INTO telegram_link_tokens
               (token, user_id, expires_at, is_used, created_at)
               VALUES (?, ?, ?, 0, ?)""",
            (token, user_id, expires_at, now.isoformat()),
        )
    return token


def use_telegram_link_token(token: str) -> Optional[str]:
    now = datetime.utcnow().isoformat()
    with get_db() as conn:
        row = conn.execute(
            """SELECT user_id, expires_at, is_used
               FROM telegram_link_tokens WHERE token = ?""",
            (token,),
        ).fetchone()
        if not row:
            return None
        if row["is_used"] == 1 or row["expires_at"] < now:
            return None
        conn.execute(
            "UPDATE telegram_link_tokens SET is_used = 1 WHERE token = ?",
            (token,),
        )
        return row["user_id"]


def update_user(user_id: str, updates: dict) -> Optional[dict]:
    if not updates:
        return get_user_by_id(user_id)
    set_clause = ", ".join(f"{k} = :{k}" for k in updates)
    params = {**updates, "_id": user_id}
    with get_db() as conn:
        conn.execute(
            f"UPDATE users SET {set_clause} WHERE id = :_id", params
        )
    return get_user_by_id(user_id)


def delete_user(user_id: str) -> bool:
    with get_db() as conn:
        cur = conn.execute(
            "UPDATE users SET is_active = 0 WHERE id = ? AND is_active = 1",
            (user_id,),
        )
        return cur.rowcount > 0


# ── Doctors ──────────────────────────────────────────────────────────────────

def get_doctors(active_only: bool = True) -> list[dict]:
    with get_db() as conn:
        if active_only:
            rows = conn.execute(
                "SELECT * FROM doctors WHERE status_id = ?",
                (DOCTOR_ACTIVE_STATUS_ID,),
            ).fetchall()
        else:
            rows = conn.execute("SELECT * FROM doctors").fetchall()
        return [_doctor_row(r) for r in rows]


def get_doctor_by_id(doctor_id: str) -> Optional[dict]:
    with get_db() as conn:
        row = conn.execute(
            "SELECT * FROM doctors WHERE id = ?", (doctor_id,)
        ).fetchone()
        return _doctor_row(row) if row else None


def create_doctor(data: dict) -> dict:
    db = {**data}
    is_active = db.pop("is_active", True)
    db["status_id"] = DOCTOR_ACTIVE_STATUS_ID if is_active else DOCTOR_INACTIVE_STATUS_ID
    with get_db() as conn:
        conn.execute(
            """INSERT INTO doctors
               (id, name, specialty, experience_years, education, description, photo_url, status_id)
               VALUES (:id, :name, :specialty, :experience_years, :education, :description, :photo_url, :status_id)""",
            db,
        )
    return get_doctor_by_id(data["id"])


def update_doctor(doctor_id: str, updates: dict) -> Optional[dict]:
    db = {**updates}
    if "is_active" in db:
        is_active = db.pop("is_active")
        db["status_id"] = (
            DOCTOR_ACTIVE_STATUS_ID if is_active else DOCTOR_INACTIVE_STATUS_ID
        )
    if not db:
        return get_doctor_by_id(doctor_id)
    set_clause = ", ".join(f"{k} = :{k}" for k in db)
    db["_id"] = doctor_id
    with get_db() as conn:
        conn.execute(
            f"UPDATE doctors SET {set_clause} WHERE id = :_id", db
        )
    return get_doctor_by_id(doctor_id)


# ── Services ─────────────────────────────────────────────────────────────────

def get_services(
    active_only: bool = True, category: Optional[str] = None
) -> list[dict]:
    sql = "SELECT * FROM services WHERE 1=1"
    params: list = []
    if active_only:
        sql += " AND is_active = 1"
    if category is not None:
        sql += " AND category = ?"
        params.append(category)
    with get_db() as conn:
        rows = conn.execute(sql, params).fetchall()
        return [_service_row(r) for r in rows]


def get_service_by_id(service_id: str) -> Optional[dict]:
    with get_db() as conn:
        row = conn.execute(
            "SELECT * FROM services WHERE id = ?", (service_id,)
        ).fetchone()
        return _service_row(row) if row else None


def create_service(data: dict) -> dict:
    db = {**data}
    db["is_active"] = 1 if db.get("is_active", True) else 0
    with get_db() as conn:
        conn.execute(
            """INSERT INTO services
               (id, name, category, price, duration_minutes, description, doctor_id, is_active)
               VALUES (:id, :name, :category, :price, :duration_minutes, :description, :doctor_id, :is_active)""",
            db,
        )
    return get_service_by_id(data["id"])


def update_service(service_id: str, updates: dict) -> Optional[dict]:
    db = {**updates}
    if "is_active" in db:
        db["is_active"] = 1 if db["is_active"] else 0
    if not db:
        return get_service_by_id(service_id)
    set_clause = ", ".join(f"{k} = :{k}" for k in db)
    db["_id"] = service_id
    with get_db() as conn:
        conn.execute(
            f"UPDATE services SET {set_clause} WHERE id = :_id", db
        )
    return get_service_by_id(service_id)


# ── Appointments ─────────────────────────────────────────────────────────────

def get_appointments(user_id: Optional[str] = None) -> list[dict]:
    with get_db() as conn:
        if user_id:
            rows = conn.execute(
                "SELECT * FROM appointments WHERE user_id = ? ORDER BY created_at DESC",
                (user_id,),
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM appointments ORDER BY created_at DESC"
            ).fetchall()
        return [_appointment_row(r) for r in rows]


def get_appointment_by_id(appointment_id: str) -> Optional[dict]:
    with get_db() as conn:
        row = conn.execute(
            "SELECT * FROM appointments WHERE id = ?", (appointment_id,)
        ).fetchone()
        return _appointment_row(row) if row else None


def create_appointment(data: dict) -> dict:
    db = {**data}
    status_str = db.pop("status", "pending")
    db["status_id"] = APPOINTMENT_STATUS_BY_NAME.get(status_str, 1)
    # SQLite принимает date/datetime напрямую, но храним как строки для надёжности
    if hasattr(db.get("appointment_date"), "isoformat"):
        db["appointment_date"] = db["appointment_date"].isoformat()
    if hasattr(db.get("created_at"), "isoformat"):
        db["created_at"] = db["created_at"].isoformat()
    with get_db() as conn:
        conn.execute(
            """INSERT INTO appointments
               (id, user_id, patient_name, patient_phone, service_id, doctor_id,
                appointment_date, appointment_time, status_id,
                base_price, discount_applied, final_price, notes, created_at)
               VALUES
               (:id, :user_id, :patient_name, :patient_phone, :service_id, :doctor_id,
                :appointment_date, :appointment_time, :status_id,
                :base_price, :discount_applied, :final_price, :notes, :created_at)""",
            db,
        )
    return get_appointment_by_id(data["id"])


def update_appointment_doctor(appointment_id: str, doctor_id: Optional[str]) -> Optional[dict]:
    with get_db() as conn:
        conn.execute(
            "UPDATE appointments SET doctor_id = ? WHERE id = ?",
            (doctor_id, appointment_id),
        )
    return get_appointment_by_id(appointment_id)


def update_appointment_status(appointment_id: str, status_str: str) -> Optional[dict]:
    status_id = APPOINTMENT_STATUS_BY_NAME.get(status_str, 1)
    with get_db() as conn:
        conn.execute(
            "UPDATE appointments SET status_id = ? WHERE id = ?",
            (status_id, appointment_id),
        )
    return get_appointment_by_id(appointment_id)


def get_occupied_slots(doctor_id: str, date_str: str) -> list[str]:
    """Возвращает занятые слоты врача на дату (не отменённые записи)."""
    cancelled_id = APPOINTMENT_STATUS_BY_NAME["cancelled"]
    with get_db() as conn:
        rows = conn.execute(
            """SELECT DISTINCT appointment_time FROM appointments
               WHERE doctor_id = ? AND appointment_date = ? AND status_id != ?""",
            (doctor_id, date_str, cancelled_id),
        ).fetchall()
        return [r["appointment_time"] for r in rows]


# ── Revoked tokens ───────────────────────────────────────────────────────────

def is_token_revoked(token: str) -> bool:
    with get_db() as conn:
        row = conn.execute(
            "SELECT 1 FROM revoked_tokens WHERE token = ?", (token,)
        ).fetchone()
        return row is not None


def revoke_token(token: str) -> None:
    with get_db() as conn:
        conn.execute(
            "INSERT OR IGNORE INTO revoked_tokens (token, revoked_at) VALUES (?, ?)",
            (token, datetime.utcnow().isoformat()),
        )


def create_telegram_notification_log(
    appointment_id: str,
    user_id: Optional[str],
    chat_id: str,
    message_type: str,
) -> str:
    notification_id = str(uuid4())
    now = datetime.utcnow().isoformat()
    with get_db() as conn:
        conn.execute(
            """INSERT INTO telegram_notifications
               (id, appointment_id, user_id, chat_id, message_type, status, created_at)
               VALUES (?, ?, ?, ?, ?, 'pending', ?)""",
            (notification_id, appointment_id, user_id, chat_id, message_type, now),
        )
    return notification_id


def update_telegram_notification_log(
    notification_id: str,
    status: str,
    error_code: Optional[str] = None,
    error_text: Optional[str] = None,
) -> None:
    sent_at = datetime.utcnow().isoformat() if status == "sent" else None
    with get_db() as conn:
        conn.execute(
            """UPDATE telegram_notifications
               SET status = ?, error_code = ?, error_text = ?, sent_at = ?
               WHERE id = ?""",
            (status, error_code, error_text, sent_at, notification_id),
        )
