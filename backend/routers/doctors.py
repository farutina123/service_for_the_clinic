from typing import List
from uuid import uuid4
from datetime import date as DateType

from fastapi import APIRouter, HTTPException, Depends, Query

from models import DoctorOut, DoctorCreate, DoctorUpdate
from dependencies import require_admin
import storage

router = APIRouter()


@router.get(
    "/",
    response_model=List[DoctorOut],
    summary="Список активных врачей (доступно всем)",
)
def list_doctors():
    return storage.get_doctors(active_only=True)


@router.get(
    "/{doctor_id}/slots",
    summary="Занятые временные слоты врача на дату (доступно всем)",
)
def get_occupied_slots(
    doctor_id: str,
    date: DateType = Query(..., description="Дата в формате YYYY-MM-DD"),
):
    doctor = storage.get_doctor_by_id(doctor_id)
    if not doctor or not doctor["is_active"]:
        raise HTTPException(status_code=404, detail="Врач не найден")

    occupied = storage.get_occupied_slots(doctor_id, str(date))
    return {"doctor_id": doctor_id, "date": str(date), "occupied": occupied}


@router.get(
    "/{doctor_id}",
    response_model=DoctorOut,
    summary="Врач по ID (доступно всем)",
)
def get_doctor(doctor_id: str):
    doctor = storage.get_doctor_by_id(doctor_id)
    if not doctor:
        raise HTTPException(status_code=404, detail="Врач не найден")
    return doctor


@router.post(
    "/",
    response_model=DoctorOut,
    status_code=201,
    summary="Создать врача (только admin)",
)
def create_doctor(data: DoctorCreate, _admin: dict = Depends(require_admin)):
    return storage.create_doctor({
        "id": str(uuid4()),
        **data.model_dump(),
        "is_active": True,
    })


@router.put(
    "/{doctor_id}",
    response_model=DoctorOut,
    summary="Обновить данные врача (только admin)",
)
def update_doctor(
    doctor_id: str, data: DoctorUpdate, _admin: dict = Depends(require_admin)
):
    if not storage.get_doctor_by_id(doctor_id):
        raise HTTPException(status_code=404, detail="Врач не найден")
    return storage.update_doctor(doctor_id, data.model_dump(exclude_none=True))


@router.delete(
    "/{doctor_id}",
    response_model=DoctorOut,
    summary="Деактивировать врача (только admin, мягкое удаление)",
)
def delete_doctor(doctor_id: str, _admin: dict = Depends(require_admin)):
    if not storage.get_doctor_by_id(doctor_id):
        raise HTTPException(status_code=404, detail="Врач не найден")
    return storage.update_doctor(doctor_id, {"is_active": False})
