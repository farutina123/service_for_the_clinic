from typing import List
from uuid import uuid4

from fastapi import APIRouter, HTTPException, Depends

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
    return [d for d in storage.doctors.values() if d["is_active"]]


@router.get(
    "/{doctor_id}",
    response_model=DoctorOut,
    summary="Врач по ID (доступно всем)",
)
def get_doctor(doctor_id: str):
    doctor = storage.doctors.get(doctor_id)
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
    doctor_id = str(uuid4())
    doctor = {
        "id": doctor_id,
        **data.model_dump(),
        "is_active": True,
    }
    storage.doctors[doctor_id] = doctor
    return doctor


@router.put(
    "/{doctor_id}",
    response_model=DoctorOut,
    summary="Обновить данные врача (только admin)",
)
def update_doctor(
    doctor_id: str, data: DoctorUpdate, _admin: dict = Depends(require_admin)
):
    doctor = storage.doctors.get(doctor_id)
    if not doctor:
        raise HTTPException(status_code=404, detail="Врач не найден")
    doctor.update({k: v for k, v in data.model_dump(exclude_none=True).items()})
    return doctor


@router.delete(
    "/{doctor_id}",
    response_model=DoctorOut,
    summary="Деактивировать врача (только admin, мягкое удаление)",
)
def delete_doctor(doctor_id: str, _admin: dict = Depends(require_admin)):
    doctor = storage.doctors.get(doctor_id)
    if not doctor:
        raise HTTPException(status_code=404, detail="Врач не найден")
    doctor["is_active"] = False
    return doctor
