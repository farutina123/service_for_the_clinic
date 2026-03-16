from typing import List

from fastapi import APIRouter, HTTPException, Depends

from models import UserOut, UserUpdate, UserRole
from dependencies import get_current_user, require_admin
import storage

router = APIRouter()


@router.get(
    "/",
    response_model=List[UserOut],
    summary="Список всех пользователей (только admin)",
)
def list_users(_admin: dict = Depends(require_admin)):
    return storage.get_users()


@router.get(
    "/{user_id}",
    response_model=UserOut,
    summary="Получить пользователя по ID (admin или владелец)",
)
def get_user(user_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin" and current_user["id"] != user_id:
        raise HTTPException(status_code=403, detail="Нет доступа к этому профилю")
    user = storage.get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    return user


@router.put(
    "/{user_id}",
    response_model=UserOut,
    summary="Обновить профиль (admin или владелец; роль — только admin)",
)
def update_user(
    user_id: str,
    data: UserUpdate,
    current_user: dict = Depends(get_current_user),
):
    if current_user["role"] != "admin" and current_user["id"] != user_id:
        raise HTTPException(status_code=403, detail="Нет доступа к этому профилю")

    if not storage.get_user_by_id(user_id):
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    updates: dict = {}
    if data.name is not None:
        updates["name"] = data.name
    if data.email is not None:
        updates["email"] = data.email
    if data.role is not None:
        if current_user["role"] != "admin":
            raise HTTPException(
                status_code=403,
                detail="Только администратор может изменять роль пользователя",
            )
        updates["role"] = data.role
        updates["discount"] = 0.1 if data.role == UserRole.user else 0.0

    return storage.update_user(user_id, updates)


@router.delete(
    "/{user_id}",
    status_code=204,
    summary="Удалить пользователя (только admin)",
)
def delete_user(user_id: str, _admin: dict = Depends(require_admin)):
    if not storage.delete_user(user_id):
        raise HTTPException(status_code=404, detail="Пользователь не найден")
