import json
import logging
from typing import Optional
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from config import TELEGRAM_BOT_TOKEN, TELEGRAM_HTTP_TIMEOUT_SECONDS

logger = logging.getLogger("app.telegram")


class TelegramSendError(Exception):
    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code
        self.message = message


def send_message(chat_id: str, text: str) -> None:
    if not TELEGRAM_BOT_TOKEN:
        raise TelegramSendError("config_error", "TELEGRAM_BOT_TOKEN is empty")

    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    payload = {"chat_id": chat_id, "text": text}
    body = json.dumps(payload).encode("utf-8")

    logger.info("telegram request: %s chat_id=%s", "sendMessage", chat_id)
    request = Request(
        url=url,
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urlopen(request, timeout=TELEGRAM_HTTP_TIMEOUT_SECONDS) as response:
            response_data = json.loads(response.read().decode("utf-8"))
            logger.info(
                "telegram response: status=%s ok=%s",
                response.status,
                response_data.get("ok"),
            )
            if not response_data.get("ok"):
                description = response_data.get("description", "Unknown Telegram error")
                raise TelegramSendError("telegram_api_error", description)
    except HTTPError as exc:
        body_text: Optional[str] = None
        try:
            body_text = exc.read().decode("utf-8")
        except Exception:
            body_text = None
        logger.error(
            "telegram response error: status=%s body=%s",
            exc.code,
            body_text,
        )
        if exc.code == 429:
            code = "rate_limited"
        elif 500 <= exc.code <= 599:
            code = "telegram_server_error"
        else:
            code = "telegram_http_error"
        raise TelegramSendError(code, f"HTTP {exc.code}") from exc
    except URLError as exc:
        logger.error("telegram transport error: %s", exc)
        raise TelegramSendError("network_error", str(exc)) from exc
