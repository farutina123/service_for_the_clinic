from datetime import datetime
import logging
from typing import Any, Optional

from fastapi import APIRouter, Depends, Header, HTTPException

from config import (
    TELEGRAM_BOT_USERNAME,
    TELEGRAM_CONNECT_TOKEN_TTL_MINUTES,
    TELEGRAM_WEBHOOK_SECRET,
)
from dependencies import get_current_user
from models import TelegramLinkStatusOut, TelegramLinkTokenOut
from telegram_linking import (
    LINK_BAD_TOKEN,
    LINK_CONFLICT,
    process_telegram_update_body,
)
import storage

# Telegram шлёт этот заголовок при передаче secret_token в setWebhook
TELEGRAM_SECRET_HEADER = "X-Telegram-Bot-Api-Secret-Token"

router = APIRouter()
logger = logging.getLogger("app.telegram")


def _mask_chat_id(chat_id: Optional[str]) -> Optional[str]:
    if not chat_id:
        return None
    if len(chat_id) <= 4:
        return "*" * len(chat_id)
    return f"{chat_id[:2]}***{chat_id[-2:]}"


@router.post(
    "/link-token",
    response_model=TelegramLinkTokenOut,
    summary="Создать токен привязки Telegram",
)
def create_link_token(current_user: dict = Depends(get_current_user)):
    if not TELEGRAM_BOT_USERNAME:
        raise HTTPException(
            status_code=500,
            detail="TELEGRAM_BOT_USERNAME не настроен",
        )
    token = storage.create_telegram_link_token(
        current_user["id"], TELEGRAM_CONNECT_TOKEN_TTL_MINUTES
    )
    deep_link = f"https://t.me/{TELEGRAM_BOT_USERNAME}?start={token}"
    return {
        "deep_link": deep_link,
        "expires_in_minutes": TELEGRAM_CONNECT_TOKEN_TTL_MINUTES,
    }


@router.get(
    "/me",
    response_model=TelegramLinkStatusOut,
    summary="Статус привязки Telegram",
)
def telegram_status(current_user: dict = Depends(get_current_user)):
    chat_id = current_user.get("telegram_chat_id")
    linked_at = current_user.get("telegram_linked_at")
    return {
        "linked": bool(chat_id),
        "chat_id_masked": _mask_chat_id(chat_id),
        "linked_at": datetime.fromisoformat(linked_at) if linked_at else None,
    }


@router.delete(
    "/me",
    response_model=TelegramLinkStatusOut,
    summary="Отвязать Telegram от профиля",
)
def unlink_telegram(current_user: dict = Depends(get_current_user)):
    updated = storage.clear_user_telegram_chat_id(current_user["id"])
    return {"linked": False, "chat_id_masked": None, "linked_at": None} if updated else {
        "linked": False,
        "chat_id_masked": None,
        "linked_at": None,
    }


@router.post(
    "/webhook",
    summary="Webhook Telegram для /start <token>",
)
def telegram_webhook(
    payload: dict[str, Any],
    x_telegram_secret_token: Optional[str] = Header(
        default=None,
        alias=TELEGRAM_SECRET_HEADER,
    ),
):
    if TELEGRAM_WEBHOOK_SECRET and x_telegram_secret_token != TELEGRAM_WEBHOOK_SECRET:
        raise HTTPException(status_code=403, detail="Invalid webhook secret")

    result = process_telegram_update_body(payload)
    if result == LINK_BAD_TOKEN:
        raise HTTPException(status_code=400, detail="Невалидный или просроченный токен")
    if result == LINK_CONFLICT:
        raise HTTPException(status_code=409, detail="Конфликт привязки Telegram")
    return {"ok": True}
