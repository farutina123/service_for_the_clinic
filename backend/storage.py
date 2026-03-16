"""
In-memory хранилище данных.
При перезапуске сервера данные сбрасываются, seed-данные восстанавливаются.
"""
from typing import Dict, Set
from datetime import datetime
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ── Хранилища ──────────────────────────────────────────────────────────────────
users: Dict[str, dict] = {}
doctors: Dict[str, dict] = {}
services: Dict[str, dict] = {}
appointments: Dict[str, dict] = {}
revoked_tokens: Set[str] = set()


# ── Seed-данные ────────────────────────────────────────────────────────────────
def _seed() -> None:
    # Администратор
    admin_id = "00000000-0000-0000-0000-000000000001"
    users[admin_id] = {
        "id": admin_id,
        "name": "Администратор",
        "phone": "+79000000000",
        "email": "admin@medklinika.ru",
        "password_hash": pwd_context.hash("admin123"),
        "role": "admin",
        "discount": 0.0,
        "created_at": datetime.utcnow(),
    }

    # Тестовый пользователь
    user_id = "00000000-0000-0000-0000-000000000002"
    users[user_id] = {
        "id": user_id,
        "name": "Тестовый Пользователь",
        "phone": "+79161234567",
        "email": "user@example.com",
        "password_hash": pwd_context.hash("user123"),
        "role": "user",
        "discount": 0.1,
        "created_at": datetime.utcnow(),
    }

    # Врачи (из mockData.ts)
    doc1 = "10000000-0000-0000-0000-000000000001"
    doc2 = "10000000-0000-0000-0000-000000000002"
    doc3 = "10000000-0000-0000-0000-000000000003"

    doctors[doc1] = {
        "id": doc1,
        "name": "Иванов Алексей Петрович",
        "specialty": "Терапевт",
        "experience_years": 15,
        "education": "Первый МГМУ им. Сеченова, 2009",
        "description": (
            "Врач-терапевт первой категории. Специализируется на диагностике "
            "и лечении заболеваний внутренних органов, профилактических "
            "осмотрах, диспансеризации."
        ),
        "photo_url": None,
        "is_active": True,
    }
    doctors[doc2] = {
        "id": doc2,
        "name": "Смирнова Елена Викторовна",
        "specialty": "Кардиолог",
        "experience_years": 20,
        "education": "РНИМУ им. Пирогова, 2004",
        "description": (
            "Врач-кардиолог высшей категории, кандидат медицинских наук. "
            "Специализируется на диагностике и лечении заболеваний "
            "сердечно-сосудистой системы, интерпретации ЭКГ и ЭхоКГ."
        ),
        "photo_url": None,
        "is_active": True,
    }
    doctors[doc3] = {
        "id": doc3,
        "name": "Петрова Наталья Сергеевна",
        "specialty": "Невролог",
        "experience_years": 12,
        "education": "СПбГМУ им. Павлова, 2012",
        "description": (
            "Врач-невролог. Специализируется на лечении головных болей, "
            "мигрени, остеохондроза, нарушений сна и функциональных "
            "расстройств нервной системы."
        ),
        "photo_url": None,
        "is_active": True,
    }

    # Услуги (из mockData.ts)
    svc1 = "20000000-0000-0000-0000-000000000001"
    svc2 = "20000000-0000-0000-0000-000000000002"
    svc3 = "20000000-0000-0000-0000-000000000003"
    svc4 = "20000000-0000-0000-0000-000000000004"
    svc5 = "20000000-0000-0000-0000-000000000005"
    svc6 = "20000000-0000-0000-0000-000000000006"

    services[svc1] = {
        "id": svc1,
        "name": "Приём терапевта",
        "category": "doctors",
        "price": 1500.0,
        "duration_minutes": 30,
        "description": "Первичный и повторный приём врача-терапевта первой категории.",
        "doctor_id": doc1,
        "is_active": True,
    }
    services[svc2] = {
        "id": svc2,
        "name": "Приём кардиолога",
        "category": "doctors",
        "price": 2200.0,
        "duration_minutes": 45,
        "description": "Консультация кардиолога высшей категории, к.м.н.",
        "doctor_id": doc2,
        "is_active": True,
    }
    services[svc3] = {
        "id": svc3,
        "name": "Приём невролога",
        "category": "doctors",
        "price": 2000.0,
        "duration_minutes": 40,
        "description": "Консультация врача-невролога.",
        "doctor_id": doc3,
        "is_active": True,
    }
    services[svc4] = {
        "id": svc4,
        "name": "УЗИ брюшной полости",
        "category": "diagnostics",
        "price": 2500.0,
        "duration_minutes": 30,
        "description": (
            "Ультразвуковое исследование органов брюшной полости: печень, "
            "желчный пузырь, поджелудочная железа, почки, селезёнка. "
            "Результат выдаётся в тот же день."
        ),
        "doctor_id": None,
        "is_active": True,
    }
    services[svc5] = {
        "id": svc5,
        "name": "ЭКГ с расшифровкой",
        "category": "diagnostics",
        "price": 900.0,
        "duration_minutes": 20,
        "description": (
            "Электрокардиография в покое с расшифровкой результатов "
            "врачом-кардиологом. Заключение выдаётся сразу."
        ),
        "doctor_id": None,
        "is_active": True,
    }
    services[svc6] = {
        "id": svc6,
        "name": "Общий анализ крови",
        "category": "analysis",
        "price": 450.0,
        "duration_minutes": 15,
        "description": (
            "Клинический анализ крови с лейкоцитарной формулой и СОЭ. "
            "Результат готов на следующий рабочий день."
        ),
        "doctor_id": None,
        "is_active": True,
    }


_seed()
