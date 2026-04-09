from typing import List, Optional
from uuid import uuid4
from datetime import date as DateType, datetime, timedelta

from fastapi import APIRouter, HTTPException, Depends, Query

from models import ServiceOut, ServiceCreate, ServiceUpdate, ServiceCategory, AvailabilityUpdate
from dependencies import require_admin
import storage

router = APIRouter()

ALL_TIME_SLOTS_30MIN = [
    "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
    "12:00", "12:30", "14:00", "14:30", "15:00", "15:30",
    "16:00", "16:30", "17:00", "17:30",
]

DAYS_RU = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"]
MONTHS_RU = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"]


def _to_label(d: datetime) -> str:
    return f"{DAYS_RU[d.weekday() if d.weekday() < 6 else 0]}, {d.day} {MONTHS_RU[d.month - 1]}"


def _validate_30min_times(times: list[str]) -> list[str]:
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


@router.get(
    "/",
    response_model=List[ServiceOut],
    summary="Список активных услуг (доступно всем). Фильтр: ?category=doctors|diagnostics|analysis",
)
def list_services(category: Optional[ServiceCategory] = None):
    return storage.get_services(
        active_only=True,
        category=category.value if category is not None else None,
    )


@router.get(
    "/{service_id}",
    response_model=ServiceOut,
    summary="Услуга по ID (доступно всем)",
)
def get_service(service_id: str):
    service = storage.get_service_by_id(service_id)
    if not service:
        raise HTTPException(status_code=404, detail="Услуга не найдена")
    return service


@router.post(
    "/",
    response_model=ServiceOut,
    status_code=201,
    summary="Создать услугу (только admin)",
)
def create_service(data: ServiceCreate, _admin: dict = Depends(require_admin)):
    if data.doctor_id and not storage.get_doctor_by_id(data.doctor_id):
        raise HTTPException(status_code=404, detail="Врач не найден")

    return storage.create_service({
        "id": str(uuid4()),
        **data.model_dump(),
        "is_active": True,
    })


@router.put(
    "/{service_id}",
    response_model=ServiceOut,
    summary="Обновить услугу (только admin)",
)
def update_service(
    service_id: str, data: ServiceUpdate, _admin: dict = Depends(require_admin)
):
    if not storage.get_service_by_id(service_id):
        raise HTTPException(status_code=404, detail="Услуга не найдена")

    update_data = data.model_dump(exclude_none=True)
    if "doctor_id" in update_data and update_data["doctor_id"]:
        if not storage.get_doctor_by_id(update_data["doctor_id"]):
            raise HTTPException(status_code=404, detail="Врач не найден")

    return storage.update_service(service_id, update_data)


@router.delete(
    "/{service_id}",
    response_model=ServiceOut,
    summary="Деактивировать услугу (только admin, мягкое удаление)",
)
def delete_service(service_id: str, _admin: dict = Depends(require_admin)):
    if not storage.get_service_by_id(service_id):
        raise HTTPException(status_code=404, detail="Услуга не найдена")
    return storage.update_service(service_id, {"is_active": False})


@router.put(
    "/{service_id}/availability",
    summary="Задать доступные слоты для услуги без врача на дату (только admin). Если times пустой — очищает доступность.",
)
def replace_service_availability(
    service_id: str,
    payload: AvailabilityUpdate,
    _admin: dict = Depends(require_admin),
):
    service = storage.get_service_by_id(service_id)
    if not service or not service["is_active"]:
        raise HTTPException(status_code=404, detail="Услуга не найдена или неактивна")
    if service.get("doctor_id"):
        raise HTTPException(status_code=400, detail="Услуга привязана к врачу — задавайте доступность через /doctors/{id}/availability")

    times = _validate_30min_times(payload.times)
    storage.replace_service_available_times(service_id, payload.date.isoformat(), times)
    return {"service_id": service_id, "date": payload.date.isoformat(), "times": times}


@router.get(
    "/{service_id}/availability",
    summary="Явно заданные доступные слоты услуги без врача на дату (доступно всем). Если не задано — вернёт пустой список.",
)
def get_service_availability(
    service_id: str,
    date: DateType = Query(..., description="Дата в формате YYYY-MM-DD"),
):
    service = storage.get_service_by_id(service_id)
    if not service or not service["is_active"]:
        raise HTTPException(status_code=404, detail="Услуга не найдена или неактивна")
    if service.get("doctor_id"):
        raise HTTPException(status_code=400, detail="Услуга привязана к врачу — используйте /doctors/{id}/availability")

    times = storage.get_service_available_times(service_id, str(date))
    return {"service_id": service_id, "date": str(date), "times": times}


@router.get(
    "/{service_id}/schedule",
    summary="Расписание доступных слотов на 14 дней для услуги (доступно всем)",
)
def get_service_schedule(
    service_id: str,
    from_date: Optional[DateType] = Query(None, description="Дата начала (YYYY-MM-DD). По умолчанию: завтра."),
):
    service = storage.get_service_by_id(service_id)
    if not service or not service["is_active"]:
        raise HTTPException(status_code=404, detail="Услуга не найдена или неактивна")

    start = from_date or (datetime.utcnow().date() + timedelta(days=1))
    today_dt = datetime.combine(start, datetime.min.time())

    schedule = []
    days_added = 0
    i = 0
    while days_added < 14 and i < 60:
        d = today_dt + timedelta(days=i)
        i += 1

        # Пропускаем воскресенье (как в моках фронта).
        # datetime.weekday(): 0=Mon..6=Sun
        if d.weekday() == 6:
            continue

        date_str = d.date().isoformat()

        doctor_id = service.get("doctor_id")
        if doctor_id:
            explicit = storage.get_doctor_available_times(doctor_id, date_str)
            # Время должно появляться только если админ явно задал доступность.
            base_times = explicit
            occupied = set(storage.get_occupied_slots(doctor_id, date_str))
        else:
            explicit = storage.get_service_available_times(service_id, date_str)
            # Время должно появляться только если админ явно задал доступность.
            base_times = explicit
            occupied = set(storage.get_occupied_service_slots(service_id, date_str))

        slots = [{"time": t, "available": (t in base_times and t not in occupied)} for t in ALL_TIME_SLOTS_30MIN if t in base_times]

        schedule.append({
            "date": date_str,
            "label": f"{DAYS_RU[(d.weekday()+1)%7]}, {d.day} {MONTHS_RU[d.month - 1]}",
            "slots": slots,
        })
        days_added += 1

    return schedule
