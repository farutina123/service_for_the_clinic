from typing import List
from uuid import uuid4
from datetime import date as DateType

from fastapi import APIRouter, HTTPException, Depends, Query

from models import DoctorOut, DoctorCreate, DoctorUpdate, AvailabilityUpdate
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


def _validate_30min_times(times: list[str]) -> list[str]:
    # Шаг слота всегда 30 минут: MM ∈ {00,30}. Также отсекаем дубли.
    normalized: list[str] = []
    seen = set()
    for t in times:
        if not isinstance(t, str) or len(t) != 5 or t[2] != ":":
            raise HTTPException(status_code=400, detail="Некорректный формат времени слота (ожидается HH:MM)")
        hh, mm = t.split(":")
        if not (hh.isdigit() and mm.isdigit()):
            raise HTTPException(status_code=400, detail="Некорректный формат времени слота (ожидается HH:MM)")
        h = int(hh)
        m = int(mm)
        if h < 0 or h > 23 or m < 0 or m > 59:
            raise HTTPException(status_code=400, detail="Некорректное значение времени слота")
        if m not in (0, 30):
            raise HTTPException(status_code=400, detail="Шаг слота должен быть 30 минут (MM = 00 или 30)")
        norm = f"{h:02d}:{m:02d}"
        if norm in seen:
            continue
        seen.add(norm)
        normalized.append(norm)
    normalized.sort()
    return normalized


@router.put(
    "/{doctor_id}/availability",
    summary="Задать доступные слоты врача на дату (только admin). Если times пустой — очищает доступность на дату.",
)
def replace_doctor_availability(
    doctor_id: str,
    payload: AvailabilityUpdate,
    _admin: dict = Depends(require_admin),
):
    doctor = storage.get_doctor_by_id(doctor_id)
    if not doctor or not doctor["is_active"]:
        raise HTTPException(status_code=404, detail="Врач не найден")

    times = _validate_30min_times(payload.times)
    storage.replace_doctor_available_times(doctor_id, payload.date.isoformat(), times)
    return {"doctor_id": doctor_id, "date": payload.date.isoformat(), "times": times}


@router.get(
    "/{doctor_id}/availability",
    summary="Явно заданные доступные слоты врача на дату (доступно всем). Если не задано — вернёт пустой список.",
)
def get_doctor_availability(
    doctor_id: str,
    date: DateType = Query(..., description="Дата в формате YYYY-MM-DD"),
):
    doctor = storage.get_doctor_by_id(doctor_id)
    if not doctor or not doctor["is_active"]:
        raise HTTPException(status_code=404, detail="Врач не найден")

    times = storage.get_doctor_available_times(doctor_id, str(date))
    return {"doctor_id": doctor_id, "date": str(date), "times": times}


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
