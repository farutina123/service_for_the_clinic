from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from auth.utils import decode_token
import storage

_security = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_security),
) -> dict:
    """Обязательная авторизация. Выбрасывает 401, если токен отсутствует или недействителен."""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Требуется авторизация",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = credentials.credentials
    if token in storage.revoked_tokens:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Токен отозван. Выполните вход заново",
        )
    payload = decode_token(token)
    user_id = payload.get("sub")
    user = storage.users.get(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Пользователь не найден",
        )
    return user


def optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_security),
) -> Optional[dict]:
    """Необязательная авторизация. Возвращает пользователя или None для гостей."""
    if not credentials:
        return None
    token = credentials.credentials
    if token in storage.revoked_tokens:
        return None
    try:
        payload = decode_token(token)
        user_id = payload.get("sub")
        return storage.users.get(user_id)
    except Exception:
        return None


def require_admin(
    current_user: dict = Depends(get_current_user),
) -> dict:
    """Проверяет роль admin. Выбрасывает 403 для обычных пользователей."""
    if current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Недостаточно прав. Требуется роль: admin",
        )
    return current_user
