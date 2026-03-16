from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
from uuid import uuid4
from datetime import datetime

from models import RegisterRequest, LoginRequest, TokenResponse, UserOut
from auth.utils import hash_password, verify_password, create_access_token
from dependencies import get_current_user
import storage

router = APIRouter()
_security = HTTPBearer(auto_error=False)


@router.post(
    "/register",
    response_model=UserOut,
    status_code=201,
    summary="Регистрация нового пользователя",
)
def register(data: RegisterRequest):
    for user in storage.users.values():
        if user["phone"] == data.phone:
            raise HTTPException(
                status_code=400,
                detail="Пользователь с таким номером телефона уже существует",
            )

    user_id = str(uuid4())
    user = {
        "id": user_id,
        "name": data.name,
        "phone": data.phone,
        "email": data.email,
        "password_hash": hash_password(data.password),
        "role": "user",
        "discount": 0.1,
        "created_at": datetime.utcnow(),
    }
    storage.users[user_id] = user
    return user


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Получить JWT-токен",
)
def login(data: LoginRequest):
    user = next(
        (u for u in storage.users.values() if u["phone"] == data.phone), None
    )
    if not user or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(
            status_code=401,
            detail="Неверный телефон или пароль",
        )
    token = create_access_token({"sub": user["id"], "role": user["role"]})
    return {"access_token": token, "token_type": "bearer"}


@router.post(
    "/logout",
    summary="Отозвать токен (выход из системы)",
)
def logout(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_security),
):
    if credentials:
        storage.revoked_tokens.add(credentials.credentials)
    return {"message": "Успешный выход из системы"}


@router.get(
    "/me",
    response_model=UserOut,
    summary="Данные текущего авторизованного пользователя",
)
def me(current_user: dict = Depends(get_current_user)):
    return current_user
