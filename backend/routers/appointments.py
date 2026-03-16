from typing import List, Optional
from uuid import uuid4
from datetime import date, datetime

from fastapi import APIRouter, HTTPException, Depends

from models import AppointmentOut, AppointmentCreate, AppointmentStatusUpdate, AppointmentDoctorUpdate
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
        return storage.get_appointments()
    return storage.get_appointments(user_id=current_user["id"])


@router.get(
    "/{appointment_id}",
    response_model=AppointmentOut,
    summary="Запись по ID (admin или владелец)",
)
def get_appointment(
    appointment_id: str, current_user: dict = Depends(get_current_user)
):
    appointment = storage.get_appointment_by_id(appointment_id)
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
    service = storage.get_service_by_id(data.service_id)
    if not service or not service["is_active"]:
        raise HTTPException(status_code=404, detail="Услуга не найдена или неактивна")

    if data.doctor_id:
        doctor = storage.get_doctor_by_id(data.doctor_id)
        if not doctor or not doctor["is_active"]:
            raise HTTPException(status_code=404, detail="Врач не найден или неактивен")

    if data.appointment_date < date.today():
        raise HTTPException(
            status_code=400, detail="Дата записи не может быть в прошлом"
        )

    discount = (
        current_user["discount"]
        if current_user and data.apply_discount
        else 0.0
    )
    base_price = service["price"]
    final_price = round(base_price * (1 - discount), 2)

    appointment = {
        "id": str(uuid4()),
        "patient_name": data.patient_name,
        "patient_phone": data.patient_phone,
        "service_id": data.service_id,
        "doctor_id": data.doctor_id,
        "appointment_date": str(data.appointment_date),
        "appointment_time": data.appointment_time,
        "status": "pending",
        "base_price": base_price,
        "final_price": final_price,
        "discount_applied": discount,
        "notes": data.notes,
        "user_id": current_user["id"] if current_user else None,
        "created_at": datetime.utcnow().isoformat(),
    }
    return storage.create_appointment(appointment)


@router.put(
    "/{appointment_id}/doctor",
    response_model=AppointmentOut,
    summary="Изменить врача в записи (только admin)",
)
def update_appointment_doctor(
    appointment_id: str,
    data: AppointmentDoctorUpdate,
    _admin: dict = Depends(require_admin),
):
    if not storage.get_appointment_by_id(appointment_id):
        raise HTTPException(status_code=404, detail="Запись не найдена")
    if data.doctor_id:
        doctor = storage.get_doctor_by_id(data.doctor_id)
        if not doctor or not doctor["is_active"]:
            raise HTTPException(status_code=404, detail="Врач не найден или неактивен")
    return storage.update_appointment_doctor(appointment_id, data.doctor_id)


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
    if not storage.get_appointment_by_id(appointment_id):
        raise HTTPException(status_code=404, detail="Запись не найдена")
    return storage.update_appointment_status(appointment_id, data.status.value)


@router.delete(
    "/{appointment_id}",
    response_model=AppointmentOut,
    summary="Отменить запись (admin или владелец)",
)
def cancel_appointment(
    appointment_id: str, current_user: dict = Depends(get_current_user)
):
    appointment = storage.get_appointment_by_id(appointment_id)
    if not appointment:
        raise HTTPException(status_code=404, detail="Запись не найдена")
    if (
        current_user["role"] != "admin"
        and appointment["user_id"] != current_user["id"]
    ):
        raise HTTPException(status_code=403, detail="Нет доступа к этой записи")
    if appointment["status"] == "cancelled":
        raise HTTPException(status_code=400, detail="Запись уже отменена")
    return storage.update_appointment_status(appointment_id, "cancelled")
