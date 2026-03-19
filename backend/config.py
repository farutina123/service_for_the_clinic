import os
from pathlib import Path

from dotenv import load_dotenv
from typing import List

# Тот же .env, что и в main.py (папка backend)
load_dotenv(Path(__file__).resolve().parent / ".env")

SECRET_KEY: str = os.getenv("SECRET_KEY", "change-me-in-production-please")
ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES: int = int(
    os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60")
)

# Путь к файлу БД (по умолчанию clinic.db в папке backend)
DB_PATH: str = os.getenv("DB_PATH", "clinic.db")

# Telegram
TELEGRAM_BOT_TOKEN: str = os.getenv("TELEGRAM_BOT_TOKEN", "").strip()
TELEGRAM_BOT_USERNAME: str = os.getenv("TELEGRAM_BOT_USERNAME", "").strip()
TELEGRAM_WEBHOOK_SECRET: str = os.getenv("TELEGRAM_WEBHOOK_SECRET", "").strip()
TELEGRAM_WEBHOOK_URL: str = os.getenv("TELEGRAM_WEBHOOK_URL", "").strip()
# Локальная разработка: getUpdates вместо webhook (не нужен ngrok/localtunnel)
TELEGRAM_USE_POLLING: bool = (
    os.getenv("TELEGRAM_USE_POLLING", "false").strip().lower() == "true"
)
TELEGRAM_NOTIFY_ENABLED: bool = (
    os.getenv("TELEGRAM_NOTIFY_ENABLED", "true").strip().lower() == "true"
)
TELEGRAM_CONNECT_TOKEN_TTL_MINUTES: int = int(
    os.getenv("TELEGRAM_CONNECT_TOKEN_TTL_MINUTES", "15")
)
TELEGRAM_HTTP_TIMEOUT_SECONDS: int = int(
    os.getenv("TELEGRAM_HTTP_TIMEOUT_SECONDS", "5")
)


def _parse_origins(value: str) -> List[str]:
    return [item.strip() for item in value.split(",") if item.strip()]


# Разрешённые источники CORS (через запятую)
_default_origins = "http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173"
CORS_ORIGINS: List[str] = _parse_origins(
    os.getenv("CORS_ORIGINS", _default_origins)
)
