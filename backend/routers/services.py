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
