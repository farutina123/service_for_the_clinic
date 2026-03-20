import os
from pathlib import Path

from dotenv import load_dotenv
from typing import List

# Тот же .env, что и в main.py (папка backend)
load_dotenv(Path(__file__).resolve().parent / ".env")

APP_ENV: str = os.getenv("APP_ENV", "development").strip().lower()


def _required_secret(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise RuntimeError(f"{name} is required and must be set in environment")
    return value


SECRET_KEY: str = _required_secret("SECRET_KEY")
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

# Rate limit для /auth/login и /auth/register (in-memory, на процесс)
# Лимит применяется отдельно по IP и по номеру телефона.
def _positive_int(name: str, default: str, minimum: int = 1) -> int:
    raw = os.getenv(name, default).strip()
    try:
        value = int(raw)
    except ValueError:
        value = int(default)
    return max(minimum, value)


AUTH_LOGIN_RATE_LIMIT: int = _positive_int(
    "AUTH_LOGIN_RATE_LIMIT", "5", minimum=1
)
AUTH_LOGIN_RATE_WINDOW_SECONDS: int = _positive_int(
    "AUTH_LOGIN_RATE_WINDOW_SECONDS", "900", minimum=1
)
AUTH_REGISTER_RATE_LIMIT: int = _positive_int(
    "AUTH_REGISTER_RATE_LIMIT", "3", minimum=1
)
AUTH_REGISTER_RATE_WINDOW_SECONDS: int = _positive_int(
    "AUTH_REGISTER_RATE_WINDOW_SECONDS", "900", minimum=1
)

# Глобальный выключатель rate limit для /auth (для E2E/отладки).
AUTH_RATE_LIMIT_ENABLED: bool = (
    os.getenv("AUTH_RATE_LIMIT_ENABLED", "true").strip().lower() == "true"
)

SEED_DEMO_DATA: bool = (
    os.getenv("SEED_DEMO_DATA", "true").strip().lower() == "true"
)
SHOW_DEMO_CREDENTIALS_IN_DOCS: bool = (
    os.getenv("SHOW_DEMO_CREDENTIALS_IN_DOCS", "true").strip().lower() == "true"
)


def _parse_origins(value: str) -> List[str]:
    return [item.strip() for item in value.split(",") if item.strip()]


# Разрешённые источники CORS (через запятую)
_default_origins = "http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173"
CORS_ORIGINS: List[str] = _parse_origins(
    os.getenv("CORS_ORIGINS", _default_origins)
)
