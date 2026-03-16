"""
SQLite — инициализация БД, создание таблиц, начальные данные.
"""
import os
import sqlite3
from contextlib import contextmanager
from datetime import datetime
from passlib.context import CryptContext

DB_PATH: str = os.getenv("DB_PATH", "clinic.db")

_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Маппинг id статуса записи ↔ строка, которую ожидает API
APPOINTMENT_STATUS_BY_ID: dict[int, str] = {
    1: "pending",
    2: "confirmed",
    3: "completed",
    4: "cancelled",
}
APPOINTMENT_STATUS_BY_NAME: dict[str, int] = {
    v: k for k, v in APPOINTMENT_STATUS_BY_ID.items()
}

# id=1 в doctor_statuses означает «активен»
DOCTOR_ACTIVE_STATUS_ID = 1
DOCTOR_INACTIVE_STATUS_ID = 4   # «больше не работает»


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA journal_mode = WAL")
    return conn


@contextmanager
def get_db():
    """Контекстный менеджер: открывает соединение, commit или rollback."""
    conn = get_connection()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


# ── Создание таблиц ─────────────────────────────────────────────────────────

_DDL = """
CREATE TABLE IF NOT EXISTS users (
    id            TEXT    PRIMARY KEY,
    name          TEXT    NOT NULL,
    phone         TEXT    NOT NULL UNIQUE,
    email         TEXT,
    password_hash TEXT    NOT NULL,
    role          TEXT    NOT NULL DEFAULT 'user'
                          CHECK (role IN ('user', 'admin')),
    discount      REAL    NOT NULL DEFAULT 0.10,
    is_active     INTEGER NOT NULL DEFAULT 1,
    created_at    TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS doctor_statuses (
    id   INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT    NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS doctors (
    id               TEXT    PRIMARY KEY,
    name             TEXT    NOT NULL,
    specialty        TEXT    NOT NULL,
    experience_years INTEGER NOT NULL DEFAULT 0,
    education        TEXT,
    description      TEXT,
    photo_url        TEXT,
    status_id        INTEGER NOT NULL DEFAULT 1
                             REFERENCES doctor_statuses(id)
);

CREATE TABLE IF NOT EXISTS services (
    id               TEXT    PRIMARY KEY,
    name             TEXT    NOT NULL,
    category         TEXT    NOT NULL
                             CHECK (category IN ('doctors', 'diagnostics', 'analysis')),
    price            REAL    NOT NULL,
    duration_minutes INTEGER NOT NULL,
    description      TEXT,
    doctor_id        TEXT    REFERENCES doctors(id),
    is_active        INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS appointment_statuses (
    id   INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT    NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS appointments (
    id               TEXT    PRIMARY KEY,
    user_id          TEXT    REFERENCES users(id),
    patient_name     TEXT    NOT NULL,
    patient_phone    TEXT    NOT NULL,
    service_id       TEXT    NOT NULL REFERENCES services(id),
    doctor_id        TEXT    REFERENCES doctors(id),
    appointment_date TEXT    NOT NULL,
    appointment_time TEXT    NOT NULL,
    status_id        INTEGER NOT NULL DEFAULT 1
                             REFERENCES appointment_statuses(id),
    base_price       REAL    NOT NULL,
    discount_applied REAL    NOT NULL DEFAULT 0.0,
    final_price      REAL    NOT NULL,
    notes            TEXT,
    created_at       TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS revoked_tokens (
    token      TEXT PRIMARY KEY,
    revoked_at TEXT NOT NULL DEFAULT ''
);
"""


def create_tables() -> None:
    with get_db() as conn:
        conn.executescript(_DDL)


# ── Наполнение справочников и тестовыми данными ──────────────────────────────

def _seed_statuses(conn: sqlite3.Connection) -> None:
    """Вставляет строки справочников, если их ещё нет."""
    doctor_statuses = [
        (1, "активен"),
        (2, "отпуск"),
        (3, "больничный"),
        (4, "больше не работает"),
    ]
    conn.executemany(
        "INSERT OR IGNORE INTO doctor_statuses (id, name) VALUES (?, ?)",
        doctor_statuses,
    )

    appointment_statuses = [
        (1, "ожидает"),
        (2, "подтверждена"),
        (3, "завершена"),
        (4, "отменена"),
    ]
    conn.executemany(
        "INSERT OR IGNORE INTO appointment_statuses (id, name) VALUES (?, ?)",
        appointment_statuses,
    )


def _seed_demo_data(conn: sqlite3.Connection) -> None:
    """Вставляет тестовых пользователей, врачей и услуги, если БД пуста."""
    if conn.execute("SELECT 1 FROM users LIMIT 1").fetchone():
        return  # данные уже есть

    now = datetime.utcnow().isoformat()

    # ── Пользователи ──────────────────────────────────────────────────────────
    users = [
        (
            "00000000-0000-0000-0000-000000000001",
            "Администратор",
            "+79000000000",
            "admin@medklinika.ru",
            _pwd_context.hash("admin123"),
            "admin",
            0.0,
            now,
        ),
        (
            "00000000-0000-0000-0000-000000000002",
            "Тестовый Пользователь",
            "+79161234567",
            "user@example.com",
            _pwd_context.hash("user123"),
            "user",
            0.1,
            now,
        ),
    ]
    conn.executemany(
        """INSERT OR IGNORE INTO users
           (id, name, phone, email, password_hash, role, discount, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        users,
    )

    # ── Врачи ─────────────────────────────────────────────────────────────────
    doc1 = "10000000-0000-0000-0000-000000000001"
    doc2 = "10000000-0000-0000-0000-000000000002"
    doc3 = "10000000-0000-0000-0000-000000000003"

    doctors = [
        (
            doc1,
            "Иванов Алексей Петрович",
            "Терапевт",
            15,
            "Первый МГМУ им. Сеченова, 2009",
            (
                "Врач-терапевт первой категории. Специализируется на диагностике "
                "и лечении заболеваний внутренних органов, профилактических "
                "осмотрах, диспансеризации."
            ),
            None,
            1,
        ),
        (
            doc2,
            "Смирнова Елена Викторовна",
            "Кардиолог",
            20,
            "РНИМУ им. Пирогова, 2004",
            (
                "Врач-кардиолог высшей категории, кандидат медицинских наук. "
                "Специализируется на диагностике и лечении заболеваний "
                "сердечно-сосудистой системы, интерпретации ЭКГ и ЭхоКГ."
            ),
            None,
            1,
        ),
        (
            doc3,
            "Петрова Наталья Сергеевна",
            "Невролог",
            12,
            "СПбГМУ им. Павлова, 2012",
            (
                "Врач-невролог. Специализируется на лечении головных болей, "
                "мигрени, остеохондроза, нарушений сна и функциональных "
                "расстройств нервной системы."
            ),
            None,
            1,
        ),
    ]
    conn.executemany(
        """INSERT OR IGNORE INTO doctors
           (id, name, specialty, experience_years, education, description, photo_url, status_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        doctors,
    )

    # ── Услуги ────────────────────────────────────────────────────────────────
    services = [
        (
            "20000000-0000-0000-0000-000000000001",
            "Приём терапевта",
            "doctors",
            1500.0,
            30,
            "Первичный и повторный приём врача-терапевта первой категории.",
            doc1,
            1,
        ),
        (
            "20000000-0000-0000-0000-000000000002",
            "Приём кардиолога",
            "doctors",
            2200.0,
            45,
            "Консультация кардиолога высшей категории, к.м.н.",
            doc2,
            1,
        ),
        (
            "20000000-0000-0000-0000-000000000003",
            "Приём невролога",
            "doctors",
            2000.0,
            40,
            "Консультация врача-невролога.",
            doc3,
            1,
        ),
        (
            "20000000-0000-0000-0000-000000000004",
            "УЗИ брюшной полости",
            "diagnostics",
            2500.0,
            30,
            (
                "Ультразвуковое исследование органов брюшной полости: печень, "
                "желчный пузырь, поджелудочная железа, почки, селезёнка. "
                "Результат выдаётся в тот же день."
            ),
            None,
            1,
        ),
        (
            "20000000-0000-0000-0000-000000000005",
            "ЭКГ с расшифровкой",
            "diagnostics",
            900.0,
            20,
            (
                "Электрокардиография в покое с расшифровкой результатов "
                "врачом-кардиологом. Заключение выдаётся сразу."
            ),
            None,
            1,
        ),
        (
            "20000000-0000-0000-0000-000000000006",
            "Общий анализ крови",
            "analysis",
            450.0,
            15,
            (
                "Клинический анализ крови с лейкоцитарной формулой и СОЭ. "
                "Результат готов на следующий рабочий день."
            ),
            None,
            1,
        ),
    ]
    conn.executemany(
        """INSERT OR IGNORE INTO services
           (id, name, category, price, duration_minutes, description, doctor_id, is_active)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        services,
    )


def _migrate(conn: sqlite3.Connection) -> None:
    """Безопасно добавляет новые колонки к существующим таблицам."""
    migrations = [
        "ALTER TABLE users ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1",
        "ALTER TABLE appointments ADD COLUMN notes TEXT",
        "ALTER TABLE revoked_tokens ADD COLUMN revoked_at TEXT NOT NULL DEFAULT ''",
    ]
    for sql in migrations:
        try:
            conn.execute(sql)
        except sqlite3.OperationalError:
            pass  # колонка уже существует


def init_db() -> None:
    """Создаёт таблицы и наполняет справочники + демо-данные при первом запуске."""
    create_tables()
    with get_db() as conn:
        _migrate(conn)
        _seed_statuses(conn)
        _seed_demo_data(conn)
