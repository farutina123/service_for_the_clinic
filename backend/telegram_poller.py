"""
Long polling getUpdates — для локальной разработки без публичного URL / туннеля.
При старте вызывает deleteWebhook, чтобы не дублировать доставку с webhook.
"""
import asyncio
import json
import logging
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from config import (
    TELEGRAM_BOT_TOKEN,
    TELEGRAM_HTTP_TIMEOUT_SECONDS,
    TELEGRAM_USE_POLLING,
)
from telegram_linking import LINK_BAD_TOKEN, LINK_CONFLICT, process_telegram_update_body

logger = logging.getLogger("app.telegram")

_POLL_TIMEOUT = 25
_REQUEST_TIMEOUT = max(TELEGRAM_HTTP_TIMEOUT_SECONDS, 35)


def _api_post(method: str, body: dict[str, Any]) -> dict[str, Any]:
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/{method}"
    data = json.dumps(body).encode("utf-8")
    req = Request(
        url,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urlopen(req, timeout=_REQUEST_TIMEOUT) as response:
        return json.loads(response.read().decode("utf-8"))


async def delete_webhook_for_polling() -> None:
    if not TELEGRAM_BOT_TOKEN:
        return
    try:
        r = await asyncio.to_thread(_api_post, "deleteWebhook", {"drop_pending_updates": False})
        if r.get("ok"):
            logger.info("telegram polling: deleteWebhook ok")
        else:
            logger.warning("telegram polling: deleteWebhook response %s", r)
    except (URLError, HTTPError, OSError) as exc:
        logger.warning("telegram polling: deleteWebhook failed: %s", exc)


async def _poll_once(offset: int) -> tuple[list[dict], int]:
    """Возвращает (список updates, следующий offset для getUpdates)."""
    q = urlencode({"offset": offset, "timeout": _POLL_TIMEOUT})
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/getUpdates?{q}"
    req = Request(url, method="GET")

    def _fetch() -> dict[str, Any]:
        with urlopen(req, timeout=_REQUEST_TIMEOUT) as response:
            return json.loads(response.read().decode("utf-8"))

    data = await asyncio.to_thread(_fetch)
    if not data.get("ok"):
        logger.warning("telegram polling: getUpdates not ok %s", data)
        return [], offset
    updates = data.get("result") or []
    if not updates:
        return [], offset
    next_offset = updates[-1]["update_id"] + 1
    return updates, next_offset


async def poll_loop() -> None:
    if not TELEGRAM_USE_POLLING or not TELEGRAM_BOT_TOKEN:
        return
    logger.info("telegram polling: loop started")
    offset = 0
    while True:
        try:
            updates, offset = await _poll_once(offset)
        except asyncio.CancelledError:
            logger.info("telegram polling: cancelled")
            raise
        except Exception as exc:
            logger.error("telegram polling: getUpdates error: %s", exc)
            await asyncio.sleep(5)
            continue

        for upd in updates:
            res = process_telegram_update_body(upd)
            if res == LINK_BAD_TOKEN:
                logger.warning("telegram polling: bad or expired token")
            elif res == LINK_CONFLICT:
                logger.warning("telegram polling: telegram already linked to other chat")
