"""
Pydantic-схемы для всех сущностей API.
"""
from pydantic import BaseModel, Field, EmailStr
from typing import Optional
from enum import Enum
from datetime import date, datetime

PHONE_PATTERN = r"^(\+7|8)\d{10}$"
TIME_PATTERN = r"^\d{2}:\d{2}$"


# ── Перечисления ───────────────────────────────────────────────────────────────

class UserRole(str, Enum):
    user = "user"
    admin = "admin"


class AppointmentStatus(str, Enum):
    pending = "pending"
    confirmed = "confirmed"
    cancelled = "cancelled"
    completed = "completed"


class ServiceCategory(str, Enum):
    doctors = "doctors"
    diagnostics = "diagnostics"
    analysis = "analysis"


# ── Auth ───────────────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100, examples=["Анна Петрова"])
    phone: str = Field(
        ...,
        pattern=PHONE_PATTERN,
        examples=["+79161234567"],
        description="Формат: +7XXXXXXXXXX или 8XXXXXXXXXX",
    )
    email: Optional[EmailStr] = Field(None, examples=["anna@example.com"])
    password: str = Field(..., min_length=6, examples=["securepass123"])


class LoginRequest(BaseModel):
    phone: str = Field(..., pattern=PHONE_PATTERN, examples=["+79161234567"])
    password: str = Field(..., examples=["securepass123"])


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class ChangePasswordRequest(BaseModel):
    old_password: str = Field(..., min_length=6, examples=["oldpass123"])
    new_password: str = Field(..., min_length=6, examples=["newpass456"])


# ── User ───────────────────────────────────────────────────────────────────────

class UserOut(BaseModel):
    id: str
    name: str
    phone: str
    email: Optional[str] = None
    role: UserRole
    discount: float
    is_active: bool
    created_at: datetime


class UserUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    email: Optional[EmailStr] = None
    role: Optional[UserRole] = Field(
        None, description="Только администратор может изменять роль"
    )


# ── Doctor ─────────────────────────────────────────────────────────────────────

class DoctorCreate(BaseModel):
    name: str = Field(..., min_length=2, examples=["Мария Смирнова"])
    specialty: str = Field(..., min_length=2, examples=["Терапевт"])
    experience_years: int = Field(0, ge=0, examples=[10])
    education: Optional[str] = Field(None, examples=["МГМУ им. Сеченова, 2015"])
    description: Optional[str] = None
    photo_url: Optional[str] = None


class DoctorUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2)
    specialty: Optional[str] = Field(None, min_length=2)
    experience_years: Optional[int] = Field(None, ge=0)
    education: Optional[str] = None
    description: Optional[str] = None
    photo_url: Optional[str] = None
    is_active: Optional[bool] = None


class DoctorOut(BaseModel):
    id: str
    name: str
    specialty: str
    experience_years: int
    education: Optional[str] = None
    description: Optional[str] = None
    photo_url: Optional[str] = None
    is_active: bool


# ── Service ────────────────────────────────────────────────────────────────────

class ServiceCreate(BaseModel):
    name: str = Field(..., min_length=2, examples=["Приём терапевта"])
    category: ServiceCategory
    price: float = Field(..., gt=0, examples=[1500.0])
    duration_minutes: int = Field(..., gt=0, examples=[30])
    description: Optional[str] = None
    doctor_id: Optional[str] = Field(
        None, description="ID врача из /doctors (если услуга привязана к врачу)"
    )


class ServiceUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2)
    category: Optional[ServiceCategory] = None
    price: Optional[float] = Field(None, gt=0)
    duration_minutes: Optional[int] = Field(None, gt=0)
    description: Optional[str] = None
    doctor_id: Optional[str] = None
    is_active: Optional[bool] = None


class ServiceOut(BaseModel):
    id: str
    name: str
    category: ServiceCategory
    price: float
    duration_minutes: int
    description: Optional[str] = None
    doctor_id: Optional[str] = None
    is_active: bool


# ── Appointment ────────────────────────────────────────────────────────────────

class AppointmentCreate(BaseModel):
    patient_name: str = Field(..., min_length=2, examples=["Иван Иванов"])
    patient_phone: str = Field(
        ...,
        pattern=PHONE_PATTERN,
        examples=["89031234567"],
        description="Формат: +7XXXXXXXXXX или 8XXXXXXXXXX",
    )
    service_id: str = Field(..., description="ID услуги из /services")
    doctor_id: Optional[str] = Field(
        None,
        description="ID врача из /doctors. Не обязателен для процедур без конкретного врача.",
    )
    appointment_date: date = Field(..., examples=["2026-04-01"])
    appointment_time: str = Field(
        ..., pattern=TIME_PATTERN, examples=["10:00"], description="Формат HH:MM"
    )
    notes: Optional[str] = Field(
        None,
        max_length=500,
        examples=["Аллергия на пенициллин, прошу учесть"],
        description="Комментарий пациента к записи (жалобы, пожелания)",
    )
    apply_discount: bool = Field(
        True,
        description=(
            "Применить скидку авторизованного пользователя (10%). "
            "Для гостей игнорируется — скидки нет всегда. "
            "Передайте false, чтобы авторизованный пользователь оплатил полную стоимость."
        ),
    )


class AppointmentStatusUpdate(BaseModel):
    status: AppointmentStatus


class AppointmentDoctorUpdate(BaseModel):
    doctor_id: Optional[str] = Field(
        None, description="ID врача из /doctors или null для снятия привязки"
    )


class AppointmentOut(BaseModel):
    id: str
    patient_name: str
    patient_phone: str
    service_id: str
    doctor_id: Optional[str] = None
    appointment_date: date
    appointment_time: str
    status: AppointmentStatus
    base_price: float
    final_price: float
    discount_applied: float
    notes: Optional[str] = None
    user_id: Optional[str] = None
    created_at: datetime
