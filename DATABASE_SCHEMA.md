# Схема базы данных — МедКлиника

> Последнее обновление: 16.03.2026  
> Используемая СУБД: SQLite (текущая), PostgreSQL (целевая)

---

## Сводная таблица сущностей

| Таблица | Назначение |
|---|---|
| `users` | Зарегистрированные пользователи (пациенты и администраторы) |
| `doctor_statuses` | Справочник статусов врача |
| `doctors` | Врачи клиники |
| `services` | Медицинские услуги |
| `appointment_statuses` | Справочник статусов записи |
| `appointments` | Записи на приём |
| `revoked_tokens` | Отозванные JWT-токены (logout) |

> **Примечание:** таблица `doctor_services` (many-to-many врач ↔ услуга) запланирована, но не реализована.  
> Сейчас связь 1:N — поле `services.doctor_id` (одна услуга → один врач).

---

## Таблицы

### `users` — Пользователи

| Поле | Тип | Ограничения | Описание |
|---|---|---|---|
| `id` | TEXT | PRIMARY KEY | UUID строка |
| `name` | VARCHAR(100) | NOT NULL | Минимум 2 символа |
| `phone` | VARCHAR(12) | NOT NULL, UNIQUE | Формат `+7XXXXXXXXXX` или `8XXXXXXXXXX` |
| `email` | VARCHAR(255) | — | Опционально, валидируется как email |
| `password_hash` | VARCHAR(255) | NOT NULL | bcrypt, не возвращается в ответах API |
| `role` | VARCHAR(10) | NOT NULL, DEFAULT `'user'` | Значения: `user`, `admin` |
| `discount` | DECIMAL(4,2) | NOT NULL, DEFAULT `0.10` | `user` → 0.10, `admin` → 0.00 |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT `TRUE` | Мягкое удаление (`DELETE /users/{id}` устанавливает `FALSE`) |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Дата регистрации |

---

### `doctor_statuses` — Справочник статусов врача

| Поле | Тип | Ограничения |
|---|---|---|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT |
| `name` | VARCHAR(50) | NOT NULL, UNIQUE |

**Начальные данные (seed):**

| id | name |
|---|---|
| 1 | активен |
| 2 | отпуск |
| 3 | больничный |
| 4 | больше не работает |

---

### `doctors` — Врачи

| Поле | Тип | Ограничения | Описание |
|---|---|---|---|
| `id` | TEXT | PRIMARY KEY | UUID строка |
| `name` | VARCHAR(200) | NOT NULL | ФИО врача |
| `specialty` | VARCHAR(100) | NOT NULL | Специальность |
| `experience_years` | INTEGER | NOT NULL, DEFAULT 0, >= 0 | Лет опыта |
| `education` | TEXT | — | Опционально |
| `description` | TEXT | — | Опционально |
| `photo_url` | VARCHAR(500) | — | URL фото, опционально |
| `status_id` | INTEGER | FK → `doctor_statuses.id`, NOT NULL, DEFAULT 1 | Статус врача |

> **Примечание:** API работает с булевым `is_active` (слой `storage.py` транслирует `status_id = 1` → `is_active = True`, `status_id = 4` → `is_active = False`).  
> При мягком удалении врача через API устанавливается `status_id = 4` («больше не работает»).

---

### `services` — Услуги

| Поле | Тип | Ограничения | Описание |
|---|---|---|---|
| `id` | TEXT | PRIMARY KEY | UUID строка |
| `name` | VARCHAR(200) | NOT NULL | Название услуги |
| `category` | VARCHAR(20) | NOT NULL | Значения: `doctors`, `diagnostics`, `analysis` |
| `price` | DECIMAL(10,2) | NOT NULL, > 0 | Базовая цена |
| `duration_minutes` | INTEGER | NOT NULL, > 0 | Длительность в минутах |
| `description` | TEXT | — | Опционально |
| `doctor_id` | TEXT | FK → `doctors.id`, NULL разрешён | NULL для услуг без конкретного врача (анализы, диагностика) |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT TRUE | Мягкое удаление |

> **Будущее:** поле `doctor_id` планируется заменить таблицей `doctor_services` (many-to-many).

---

### `appointment_statuses` — Справочник статусов записи

| Поле | Тип | Ограничения |
|---|---|---|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT |
| `name` | VARCHAR(50) | NOT NULL, UNIQUE |

**Начальные данные (seed) и соответствующие значения API:**

| id | name (БД) | status (API) |
|---|---|---|
| 1 | ожидает | `pending` |
| 2 | подтверждена | `confirmed` |
| 3 | завершена | `completed` |
| 4 | отменена | `cancelled` |

> Слой `storage.py` транслирует числовой `status_id` в строковый `status` при каждом чтении.

---

### `appointments` — Записи на приём

| Поле | Тип | Ограничения | Описание |
|---|---|---|---|
| `id` | TEXT | PRIMARY KEY | UUID строка |
| `user_id` | TEXT | FK → `users.id`, NULL разрешён | NULL для гостевых записей |
| `patient_name` | VARCHAR(200) | NOT NULL | Имя пациента |
| `patient_phone` | VARCHAR(12) | NOT NULL | Телефон пациента |
| `service_id` | TEXT | FK → `services.id`, NOT NULL | |
| `doctor_id` | TEXT | FK → `doctors.id`, NULL разрешён | NULL для услуг без конкретного врача |
| `appointment_date` | DATE | NOT NULL | Не может быть в прошлом |
| `appointment_time` | VARCHAR(5) | NOT NULL | Формат `HH:MM` |
| `status_id` | INTEGER | FK → `appointment_statuses.id`, NOT NULL, DEFAULT 1 | Статус записи |
| `base_price` | DECIMAL(10,2) | NOT NULL | Цена услуги без скидки |
| `discount_applied` | DECIMAL(4,2) | NOT NULL, DEFAULT 0.00 | Применённая скидка (0.00 или 0.10) |
| `final_price` | DECIMAL(10,2) | NOT NULL | Итоговая цена |
| `notes` | TEXT | — | Комментарий пациента к записи (жалобы, пожелания), max 500 символов |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Дата создания записи |

> **Важно:** `patient_name` и `patient_phone` необходимы для гостевых записей (`user_id = NULL`). Даже для авторизованных пользователей хранение контакта на момент записи защищает от ситуации, когда пользователь потом сменил телефон.

---

### `revoked_tokens` — Отозванные токены

| Поле | Тип | Ограничения | Описание |
|---|---|---|---|
| `token` | TEXT | PRIMARY KEY | JWT-токен целиком |
| `revoked_at` | TEXT | NOT NULL | ISO-8601 timestamp момента отзыва |

> Используется эндпоинтом `POST /auth/logout`. При каждом запросе `dependencies.py` проверяет токен по этой таблице.  
> В production рекомендуется периодически удалять записи, чей токен истёк (по полю `revoked_at` + TTL токена).

---

## Диаграмма связей (ERD)

```
users (1) ─────────────────────────────── (N) appointments
                                               │
doctor_statuses (1) ── (N) doctors (N) ────────┘ (через doctor_id)
                            │
                            └──── (1) services ──── (N) appointments
                                       │                    │
                                  is_active          appointment_statuses (1) ───────┘
```

---

## Описание всех связей

| Связь | Тип | Реализация | Описание |
|---|---|---|---|
| `users` → `appointments` | 1:N | `appointments.user_id → users.id` | Один пользователь — много записей. NULL = гость |
| `doctors` → `appointments` | 1:N | `appointments.doctor_id → doctors.id` | Один врач — много записей. NULL = услуга без врача |
| `services` → `appointments` | 1:N | `appointments.service_id → services.id` | Одна услуга — во многих записях |
| `doctors` → `services` | 1:N | `services.doctor_id → doctors.id` | Один врач — много услуг (**временно 1:N**, будет N:M) |
| `doctor_statuses` → `doctors` | 1:N | `doctors.status_id → doctor_statuses.id` | Один статус — у многих врачей |
| `appointment_statuses` → `appointments` | 1:N | `appointments.status_id → appointment_statuses.id` | Один статус — у многих записей |

---

## Бизнес-правила

- **Скидка:** пользователь с ролью `user` получает скидку 10% (`discount = 0.10`). Администратор и гости — без скидки (`0.00`).
- **Гость (guest):** не имеет учётной записи и не отправляет JWT-токен. В БД такие записи хранятся с `user_id = NULL`, скидки нет.
- **Мягкое удаление врача:** `status_id = 4` («больше не работает»), запись не удаляется.
- **Мягкое удаление услуги:** `is_active = FALSE`, запись не удаляется.
- **Мягкое удаление пользователя:** `is_active = FALSE`, запись не удаляется. Деактивированный пользователь не может войти в систему.
- **Отмена записи:** `status_id = 4` («отменена»), запись не удаляется.
- **Статусы в API vs БД:** справочники хранят русские названия; слой `storage.py` транслирует их в английские строки для API (`pending`, `confirmed`, `completed`, `cancelled`).

---

## Текущее состояние реализации

| Компонент | Статус |
|---|---|
| Pydantic-модели (`models.py`) | ✅ Реализовано |
| SQLite хранилище (`storage.py`, `database.py`) | ✅ Реализовано |
| REST API (FastAPI роутеры) | ✅ Реализовано |
| `doctor_statuses` / `appointment_statuses` | ✅ Реализовано (справочники + seed) |
| Мягкое удаление врачей и услуг | ✅ Реализовано |
| Мягкое удаление пользователей (`is_active`) | ✅ Реализовано |
| `notes` в записях на приём | ✅ Реализовано |
| `revoked_tokens` с `revoked_at` | ✅ Реализовано |
| `doctor_services` (many-to-many врач ↔ услуга) | ⏳ Не реализовано (пока `services.doctor_id`) |
| PostgreSQL миграции | ⏳ Не реализовано |
