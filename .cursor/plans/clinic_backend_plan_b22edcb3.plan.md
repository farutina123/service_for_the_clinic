---
name: Clinic Backend Plan
overview: Разработать REST API бэкенд на FastAPI (Python) для клиники МедКлиника с хранением данных в памяти, JWT-авторизацией, тремя ролями и валидацией телефона.
todos:
  - id: setup
    content: Создать backend/ директорию, requirements.txt и main.py
    status: completed
  - id: storage
    content: Реализовать storage.py с in-memory словарями и заполнить начальными данными из mockData.ts
    status: completed
  - id: models
    content: Написать Pydantic-схемы в models.py для всех 4 сущностей (User, Doctor, Service, Appointment)
    status: completed
  - id: auth
    content: Реализовать auth/utils.py (JWT, bcrypt) и auth/router.py (register, login, logout, me)
    status: completed
  - id: dependencies
    content: "Написать dependencies.py: get_current_user, require_admin, optional_user"
    status: completed
  - id: routers
    content: "Реализовать 4 роутера: users, doctors, services, appointments с проверками прав"
    status: completed
  - id: cors
    content: Подключить CORS middleware для связи с фронтендом на localhost:5173
    status: completed
isProject: false
---

# Бэкенд для сервиса записи на приём

## Выбор технологии: FastAPI (Python)

FastAPI выбран над NestJS по следующим причинам:

- **Автодокументация**: Swagger UI `/docs` и ReDoc `/redoc` генерируются автоматически — без единой строки конфига. Для сервиса с ролями и валидацией это критично при разработке и тестировании.
- **Pydantic**: встроенная валидация данных с описанием полей прямо в схеме, включая регулярные выражения для телефона. В NestJS это требует отдельного пакета `class-validator`.
- **Скорость прототипирования**: FastAPI + in-memory хранилище запускается за минуты. NestJS требует значительно больше бойлерплейта (модули, провайдеры, DI).
- **Простота in-memory хранилища**: обычный `dict` в Python — нет нужды в NestJS-провайдерах и инъекции зависимостей.
- **Единственный контраргумент** для NestJS — TypeScript-совместимость с фронтом — несущественен, так как фронт и бэк работают как отдельные приложения.

---

## Структура проекта

```
backend/
├── main.py              ← точка входа, регистрация роутеров
├── requirements.txt     ← зависимости
├── auth/
│   ├── router.py        ← /auth/register, /auth/login, /auth/me
│   └── utils.py         ← JWT, хэш пароля, получение текущего пользователя
├── storage.py           ← in-memory "база" (словари)
├── models.py            ← Pydantic-схемы для всех сущностей
├── routers/
│   ├── users.py
│   ├── doctors.py
│   ├── services.py
│   └── appointments.py
└── dependencies.py      ← get_current_user, require_admin, optional_user
```

---

## Сущности

### User (Пользователь)


| Поле            | Тип      | Правило                                                   |
| --------------- | -------- | --------------------------------------------------------- |
| `id`            | UUID     | генерируется автоматически                                |
| `name`          | str      | обязательное, 2–100 символов                              |
| `phone`         | str      | **обязательное**, формат `+7XXXXXXXXXX` или `8XXXXXXXXXX` |
| `email`         | str      | опциональное, валидируется как email                      |
| `password_hash` | str      | не возвращается в ответах                                 |
| `role`          | enum     | `"user"`                                                  |
| `discount`      | float    | вычисляется из роли: user → 0.10, admin → 0.0             |
| `created_at`    | datetime | генерируется автоматически                                |


**Права:**

- `POST /auth/register` — любой (неавторизованный)
- `GET /users` — только admin
- `GET /users/{id}` — admin или владелец
- `PUT /users/{id}` — admin или владелец (нельзя менять role самому себе)
- `DELETE /users/{id}` — только admin

---

### Doctor (Врач)


| Поле               | Тип  | Правило             |
| ------------------ | ---- | ------------------- |
| `id`               | UUID | авто                |
| `name`             | str  | обязательное        |
| `specialty`        | str  | обязательное        |
| `experience_years` | int  | ≥ 0                 |
| `education`        | str  | опциональное        |
| `description`      | str  | опциональное        |
| `photo_url`        | str  | опциональное        |
| `is_active`        | bool | по умолчанию `true` |


**Права:**

- `GET /doctors`, `GET /doctors/{id}` — все (включая неавторизованных)
- `POST /doctors` — только admin
- `PUT /doctors/{id}` — только admin
- `DELETE /doctors/{id}` — только admin (мягкое удаление: `is_active = false`)

---

### Service (Услуга)


| Поле               | Тип   | Правило                       |
| ------------------ | ----- | ----------------------------- |
| `id`               | UUID  | авто                          |
| `name`             | str   | обязательное                  |
| `category`         | enum  | `"doctors"`                   |
| `price`            | float | > 0                           |
| `duration_minutes` | int   | > 0                           |
| `description`      | str   | опциональное                  |
| `doctor_id`        | UUID  | опциональное, ссылка на врача |
| `is_active`        | bool  | по умолчанию `true`           |


**Права:**

- `GET /services`, `GET /services/{id}` — все
- `POST /services` — только admin
- `PUT /services/{id}` — только admin
- `DELETE /services/{id}` — только admin (мягкое удаление)

---

### Appointment (Запись)


| Поле               | Тип      | Правило                                           |
| ------------------ | -------- | ------------------------------------------------- |
| `id`               | UUID     | авто                                              |
| `patient_name`     | str      | обязательное                                      |
| `patient_phone`    | str      | **обязательное**, тот же формат телефона          |
| `service_id`       | UUID     | обязательное, должна существовать                 |
| `doctor_id`        | UUID     | обязательное, должен существовать и быть активным |
| `appointment_date` | date     | обязательное, не в прошлом                        |
| `appointment_time` | str      | обязательное, формат `HH:MM`                      |
| `status`           | enum     | `"pending"`                                       |
| `base_price`       | float    | цена услуги без скидки                            |
| `final_price`      | float    | цена после применения скидки                      |
| `discount_applied` | float    | 0.0 или 0.1                                       |
| `user_id`          | UUID     | опционально (null для гостей)                     |
| `created_at`       | datetime | авто                                              |


**Права:**

- `POST /appointments` — все; скидка 10% только для авторизованных user/admin
- `GET /appointments` — admin видит все; user видит только свои
- `GET /appointments/{id}` — admin или владелец записи
- `PUT /appointments/{id}/status` — только admin (изменить статус)
- `DELETE /appointments/{id}` — admin или владелец (меняет статус на `cancelled`)

---

## Авторизация

Используется **JWT Bearer Token** (библиотека `python-jose`). Токен передаётся в заголовке `Authorization: Bearer <token>`.

```
Роль          | Создание записи | Скидка | CRUD докторов | CRUD услуг | Все записи
──────────────────────────────────────────────────────────────────────────────────
guest         |       ✓         |   ✗    |      ✗        |     ✗      |     ✗
user          |       ✓         |  10%   |      ✗        |     ✗      |  только свои
admin         |       ✓         |   ✗    |      ✓        |     ✓      |     ✓
```

Хранилище токенов: in-memory `set` отозванных токенов (для логаута).

---

## Валидация телефона

Pydantic-поле с регулярным выражением:

```python
phone: str = Field(..., pattern=r"^(\+7|8)\d{10}$")
```

Принимает: `+79161234567`, `89161234567`  
Отклоняет: `79161234567`, `+7916123456` (9 цифр), `+8916...`

---

## Список эндпоинтов

### Auth

- `POST /auth/register` — регистрация
- `POST /auth/login` — получение JWT
- `POST /auth/logout` — отзыв токена
- `GET /auth/me` — текущий пользователь

### Users

- `GET /users` — список пользователей (admin)
- `GET /users/{id}` — пользователь по id
- `PUT /users/{id}` — обновление профиля
- `DELETE /users/{id}` — удаление (admin)

### Doctors

- `GET /doctors` — список всех врачей
- `GET /doctors/{id}` — врач по id
- `POST /doctors` — создать врача (admin)
- `PUT /doctors/{id}` — обновить врача (admin)
- `DELETE /doctors/{id}` — деактивировать врача (admin)

### Services

- `GET /services` — список услуг (с фильтром `?category=`)
- `GET /services/{id}` — услуга по id
- `POST /services` — создать услугу (admin)
- `PUT /services/{id}` — обновить услугу (admin)
- `DELETE /services/{id}` — деактивировать услугу (admin)

### Appointments

- `GET /appointments` — список записей
- `GET /appointments/{id}` — запись по id
- `POST /appointments` — создать запись
- `PUT /appointments/{id}/status` — изменить статус (admin)
- `DELETE /appointments/{id}` — отменить запись

---

## Примеры запросов и ответов

### POST /auth/register

**Запрос:**

```json
{
  "name": "Анна Петрова",
  "phone": "+79161234567",
  "email": "anna@example.com",
  "password": "securepass123"
}
```

**Ответ 201:**

```json
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "name": "Анна Петрова",
  "phone": "+79161234567",
  "email": "anna@example.com",
  "role": "user",
  "discount": 0.1,
  "created_at": "2026-03-16T10:00:00"
}
```

**Ошибка 422 (неверный телефон):**

```json
{
  "detail": [
    {
      "loc": ["body", "phone"],
      "msg": "string does not match regex '^(\\+7|8)\\d{10}$'",
      "type": "value_error.str.regex"
    }
  ]
}
```

---

### POST /auth/login

**Запрос:**

```json
{
  "phone": "+79161234567",
  "password": "securepass123"
}
```

**Ответ 200:**

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

---

### POST /appointments — гость (без токена)

**Запрос:**

```json
{
  "patient_name": "Иван Иванов",
  "patient_phone": "89031234567",
  "service_id": "...",
  "doctor_id": "...",
  "appointment_date": "2026-03-20",
  "appointment_time": "10:00"
}
```

**Ответ 201:**

```json
{
  "id": "...",
  "patient_name": "Иван Иванов",
  "patient_phone": "89031234567",
  "service_id": "...",
  "doctor_id": "...",
  "appointment_date": "2026-03-20",
  "appointment_time": "10:00",
  "status": "pending",
  "base_price": 3000.0,
  "final_price": 3000.0,
  "discount_applied": 0.0,
  "user_id": null,
  "created_at": "2026-03-16T12:00:00"
}
```

---

### POST /appointments — авторизованный user (скидка 10%)

Те же данные, но с заголовком `Authorization: Bearer <token>`.

**Ответ 201:**

```json
{
  ...
  "base_price": 3000.0,
  "final_price": 2700.0,
  "discount_applied": 0.1,
  "user_id": "3fa85f64-..."
}
```

---

### POST /doctors — admin

**Запрос** (с `Authorization: Bearer <admin_token>`):

```json
{
  "name": "Мария Смирнова",
  "specialty": "Терапевт",
  "experience_years": 12,
  "education": "МГМУ им. Сеченова",
  "description": "Специалист широкого профиля"
}
```

**Ответ 201:**

```json
{
  "id": "...",
  "name": "Мария Смирнова",
  "specialty": "Терапевт",
  "experience_years": 12,
  "education": "МГМУ им. Сеченова",
  "description": "Специалист широкого профиля",
  "photo_url": null,
  "is_active": true
}
```

**Ошибка 403 (не admin):**

```json
{
  "detail": "Недостаточно прав. Требуется роль: admin"
}
```

---

### DELETE /appointments/{id} — отмена записи пользователем

**Ответ 200:**

```json
{
  "id": "...",
  "status": "cancelled",
  ...
}
```

**Ошибка 403 (чужая запись):**

```json
{
  "detail": "Нет доступа к этой записи"
}
```

---

## Зависимости (requirements.txt)

- `fastapi` — фреймворк
- `uvicorn[standard]` — ASGI-сервер
- `python-jose[cryptography]` — JWT
- `passlib[bcrypt]` — хэширование паролей
- `pydantic[email]` — валидация email

