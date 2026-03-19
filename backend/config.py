import os
from dotenv import load_dotenv
from typing import List

load_dotenv()

SECRET_KEY: str = os.getenv("SECRET_KEY", "change-me-in-production-please")
ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES: int = int(
    os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60")
)

# Путь к файлу БД (по умолчанию clinic.db в папке backend)
DB_PATH: str = os.getenv("DB_PATH", "clinic.db")


def _parse_origins(value: str) -> List[str]:
    return [item.strip() for item in value.split(",") if item.strip()]


# Разрешённые источники CORS (через запятую)
_default_origins = "http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173"
CORS_ORIGINS: List[str] = _parse_origins(
    os.getenv("CORS_ORIGINS", _default_origins)
)
