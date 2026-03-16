from typing import List, Optional
from uuid import uuid4
from datetime import date, datetime

from fastapi import APIRouter, HTTPException, Depends

from models import AppointmentOut, AppointmentCreate, AppointmentStatusUpdate
from dependencies import get_current_user, optional_user, require_admin
import storage

router = APIRouter()


@router.get(
    "/",
    response_model=List[AppointmentOut],
    summary="Список записей: admin видит все, user — только свои (требует авторизации)",
)
def list_appointments(current_user: dict = Depends(get_current_user)):
    if current_user["role"] == "admin":
        return list(storage.appointments.values())
    return [
        a for a in storage.appointments.values()
        if a["user_id"] == current_user["id"]
    ]


@router.get(
    "/{appointment_id}",
    response_model=AppointmentOut,
    summary="Запись по ID (admin или владелец)",
)
def get_appointment(
    appointment_id: str, current_user: dict = Depends(get_current_user)
):
    appointment = storage.appointments.get(appointment_id)
    if not appointment:
        raise HTTPException(status_code=404, detail="Запись не найдена")
    if (
        current_user["role"] != "admin"
        and appointment["user_id"] != current_user["id"]
    ):
        raise HTTPException(status_code=403, detail="Нет доступа к этой записи")
    return appointment


@router.post(
    "/",
    response_model=AppointmentOut,
    status_code=201,
    summary=(
        "Создать запись. "
        "Гость — всегда без скидки. "
        "Авторизованный — скидка 10% по умолчанию; "
        "передайте apply_discount=false для полной стоимости."
    ),
)
def create_appointment(
    data: AppointmentCreate,
    current_user: Optional[dict] = Depends(optional_user),
):
    service = storage.services.get(data.service_id)
    if not service or not service["is_active"]:
        raise HTTPException(status_code=404, detail="Услуга не найдена или неактивна")

    doctor = None
    if data.doctor_id:
        doctor = storage.doctors.get(data.doctor_id)
        if not doctor or not doctor["is_active"]:
            raise HTTPException(status_code=404, detail="Врач не найден или неактивен")

    if data.appointment_date < date.today():
        raise HTTPException(
            status_code=400, detail="Дата записи не может быть в прошлом"
        )

    # Скидка применяется только если: пользователь авторизован И явно не отказался
    discount = (
        current_user["discount"]
        if current_user and data.apply_discount
        else 0.0
    )
    base_price = service["price"]
    final_price = round(base_price * (1 - discount), 2)

    appointment_id = str(uuid4())
    appointment = {
        "id": appointment_id,
        "patient_name": data.patient_name,
        "patient_phone": data.patient_phone,
        "service_id": data.service_id,
        "doctor_id": data.doctor_id,
        "appointment_date": data.appointment_date,
        "appointment_time": data.appointment_time,
        "status": "pending",
        "base_price": base_price,
        "final_price": final_price,
        "discount_applied": discount,
        "user_id": current_user["id"] if current_user else None,
        "created_at": datetime.utcnow(),
    }
    storage.appointments[appointment_id] = appointment
    return appointment


@router.put(
    "/{appointment_id}/status",
    response_model=AppointmentOut,
    summary="Изменить статус записи (только admin)",
)
def update_appointment_status(
    appointment_id: str,
    data: AppointmentStatusUpdate,
    _admin: dict = Depends(require_admin),
):
    appointment = storage.appointments.get(appointment_id)
    if not appointment:
        raise HTTPException(status_code=404, detail="Запись не найдена")
    appointment["status"] = data.status
    return appointment


@router.delete(
    "/{appointment_id}",
    response_model=AppointmentOut,
    summary="Отменить запись (admin или владелец)",
)
def cancel_appointment(
    appointment_id: str, current_user: dict = Depends(get_current_user)
):
    appointment = storage.appointments.get(appointment_id)
    if not appointment:
        raise HTTPException(status_code=404, detail="Запись не найдена")
    if (
        current_user["role"] != "admin"
        and appointment["user_id"] != current_user["id"]
    ):
        raise HTTPException(status_code=403, detail="Нет доступа к этой записи")
    if appointment["status"] == "cancelled":
        raise HTTPException(status_code=400, detail="Запись уже отменена")
    appointment["status"] = "cancelled"
    return appointment
