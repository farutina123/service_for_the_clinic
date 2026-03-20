from collections import defaultdict, deque
from threading import Lock
from time import monotonic

from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
from uuid import uuid4
from datetime import datetime

from models import RegisterRequest, LoginRequest, TokenResponse, UserOut, ChangePasswordRequest
from auth.utils import hash_password, verify_password, create_access_token
from config import (
    AUTH_LOGIN_RATE_LIMIT,
    AUTH_LOGIN_RATE_WINDOW_SECONDS,
    AUTH_RATE_LIMIT_ENABLED,
    AUTH_REGISTER_RATE_LIMIT,
    AUTH_REGISTER_RATE_WINDOW_SECONDS,
)
from dependencies import get_current_user
import storage

router = APIRouter()
_security = HTTPBearer(auto_error=False)


class _RateLimiter:
    def __init__(self):
        self._events: dict[str, deque[float]] = defaultdict(deque)
        self._lock = Lock()

    def check(self, key: str, limit: int, window_seconds: int) -> None:
        now = monotonic()
        cutoff = now - window_seconds
        with self._lock:
            dq = self._events[key]
            while dq and dq[0] <= cutoff:
                dq.popleft()
            if len(dq) >= limit:
                raise HTTPException(
                    status_code=429,
                    detail="Слишком много попыток, попробуйте позже",
                )
            dq.append(now)


_rate_limiter = _RateLimiter()


def _client_ip(request: Request) -> str:
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    if request.client and request.client.host:
        return request.client.host
    return "unknown"


@router.post(
    "/register",
    response_model=UserOut,
    status_code=201,
    summary="Регистрация нового пользователя",
)
def register(data: RegisterRequest, request: Request):
    if AUTH_RATE_LIMIT_ENABLED:
        ip = _client_ip(request)
        _rate_limiter.check(
            key=f"register:ip:{ip}",
            limit=AUTH_REGISTER_RATE_LIMIT,
            window_seconds=AUTH_REGISTER_RATE_WINDOW_SECONDS,
        )
        _rate_limiter.check(
            key=f"register:phone:{data.phone}",
            limit=AUTH_REGISTER_RATE_LIMIT,
            window_seconds=AUTH_REGISTER_RATE_WINDOW_SECONDS,
        )
    if storage.get_user_by_phone(data.phone):
        raise HTTPException(
            status_code=400,
            detail="Пользователь с таким номером телефона уже существует",
        )

    user = {
        "id": str(uuid4()),
        "name": data.name,
        "phone": data.phone,
        "email": data.email,
        "password_hash": hash_password(data.password),
        "role": "user",
        "discount": 0.1,
        "created_at": datetime.utcnow().isoformat(),
    }
    return storage.create_user(user)


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Получить JWT-токен",
)
def login(data: LoginRequest, request: Request):
    if AUTH_RATE_LIMIT_ENABLED:
        ip = _client_ip(request)
        _rate_limiter.check(
            key=f"login:ip:{ip}",
            limit=AUTH_LOGIN_RATE_LIMIT,
            window_seconds=AUTH_LOGIN_RATE_WINDOW_SECONDS,
        )
        _rate_limiter.check(
            key=f"login:phone:{data.phone}",
            limit=AUTH_LOGIN_RATE_LIMIT,
            window_seconds=AUTH_LOGIN_RATE_WINDOW_SECONDS,
        )
    user = storage.get_user_by_phone(data.phone)
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
        storage.revoke_token(credentials.credentials)
    return {"message": "Успешный выход из системы"}


@router.get(
    "/me",
    response_model=UserOut,
    summary="Данные текущего авторизованного пользователя",
)
def me(current_user: dict = Depends(get_current_user)):
    return current_user


@router.post(
    "/change-password",
    summary="Сменить пароль текущего пользователя",
)
def change_password(
    data: ChangePasswordRequest,
    current_user: dict = Depends(get_current_user),
):
    # Проверяем старый пароль
    if not verify_password(data.old_password, current_user["password_hash"]):
        raise HTTPException(
            status_code=400,
            detail="Неверный текущий пароль",
        )

    # Обновляем пароль в БД
    new_hash = hash_password(data.new_password)
    storage.update_user(current_user["id"], {"password_hash": new_hash})

    return {"message": "Пароль успешно изменён"}
