from typing import List, Optional
from uuid import uuid4

from fastapi import APIRouter, HTTPException, Depends

from models import ServiceOut, ServiceCreate, ServiceUpdate, ServiceCategory
from dependencies import require_admin
import storage

router = APIRouter()


@router.get(
    "/",
    response_model=List[ServiceOut],
    summary="Список активных услуг (доступно всем). Фильтр: ?category=doctors|diagnostics|analysis",
)
def list_services(category: Optional[ServiceCategory] = None):
    result = [s for s in storage.services.values() if s["is_active"]]
    if category is not None:
        result = [s for s in result if s["category"] == category]
    return result


@router.get(
    "/{service_id}",
    response_model=ServiceOut,
    summary="Услуга по ID (доступно всем)",
)
def get_service(service_id: str):
    service = storage.services.get(service_id)
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
    if data.doctor_id and data.doctor_id not in storage.doctors:
        raise HTTPException(status_code=404, detail="Врач не найден")

    service_id = str(uuid4())
    service = {
        "id": service_id,
        **data.model_dump(),
        "is_active": True,
    }
    storage.services[service_id] = service
    return service


@router.put(
    "/{service_id}",
    response_model=ServiceOut,
    summary="Обновить услугу (только admin)",
)
def update_service(
    service_id: str, data: ServiceUpdate, _admin: dict = Depends(require_admin)
):
    service = storage.services.get(service_id)
    if not service:
        raise HTTPException(status_code=404, detail="Услуга не найдена")

    update_data = data.model_dump(exclude_none=True)
    if "doctor_id" in update_data and update_data["doctor_id"] not in storage.doctors:
        raise HTTPException(status_code=404, detail="Врач не найден")

    service.update(update_data)
    return service


@router.delete(
    "/{service_id}",
    response_model=ServiceOut,
    summary="Деактивировать услугу (только admin, мягкое удаление)",
)
def delete_service(service_id: str, _admin: dict = Depends(require_admin)):
    service = storage.services.get(service_id)
    if not service:
        raise HTTPException(status_code=404, detail="Услуга не найдена")
    service["is_active"] = False
    return service
