"""
Общая логика привязки аккаунта по deep-link /start <token>.
Используется и webhook, и long polling.
"""
import logging
from typing import Any, Optional

import storage

logger = logging.getLogger("app.telegram")

# Результат обработки одного сообщения с /start
LINK_IGNORED = "ignored"
LINK_LINKED = "linked"
LINK_BAD_TOKEN = "bad_token"
LINK_CONFLICT = "conflict"


def link_telegram_from_start_payload(text: Optional[str], chat_id: Any) -> str:
    """
    Если текст — /start <token> из deep-link, привязывает telegram_chat_id к пользователю.
    Возвращает одну из констант LINK_* .
    """
    if chat_id is None:
        return LINK_IGNORED
    text = (text or "").strip()
    if not text.startswith("/start"):
        return LINK_IGNORED
    rest = text[len("/start") :].strip()
    if not rest:
        return LINK_IGNORED
    token = rest.split()[0]
    if not token:
        return LINK_IGNORED

    user_id = storage.use_telegram_link_token(token)
    if not user_id:
        logger.warning("telegram: invalid or expired link token")
        return LINK_BAD_TOKEN

    existing_chat = storage.get_user_telegram_chat_id(user_id)
    if existing_chat and existing_chat != str(chat_id):
        logger.warning("telegram: link conflict user_id=%s", user_id)
        return LINK_CONFLICT

    storage.set_user_telegram_chat_id(user_id, str(chat_id))
    logger.info("telegram: linked user_id=%s chat_id=%s", user_id, chat_id)
    return LINK_LINKED


def process_telegram_update_body(payload: dict) -> str:
    """
    Принимает объект Update от Telegram (webhook body).
    """
    msg = payload.get("message") or payload.get("edited_message") or {}
    text = msg.get("text")
    chat = msg.get("chat") or {}
    chat_id = chat.get("id")
    return link_telegram_from_start_payload(text, chat_id)
