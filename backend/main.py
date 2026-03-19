"""
МедКлиника — REST API
Запуск: uvicorn main:app --reload --port 8000
Документация: http://localhost:8000/docs
"""
# dotenv должен загружаться до всех остальных импортов,
# чтобы os.getenv() в config.py прочитал переменные из .env
import asyncio
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv

# Всегда backend/.env, даже если uvicorn запущен из корня репозитория
load_dotenv(Path(__file__).resolve().parent / ".env")

from fastapi import FastAPI
import logging
import time
from fastapi.middleware.cors import CORSMiddleware
from starlette.requests import Request
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from database import init_db
from config import CORS_ORIGINS, TELEGRAM_BOT_TOKEN, TELEGRAM_USE_POLLING
from auth.router import router as auth_router
from routers.users import router as users_router
from routers.doctors import router as doctors_router
from routers.services import router as services_router
from routers.appointments import router as appointments_router
from routers.telegram import router as telegram_router
from telegram_poller import delete_webhook_for_polling, poll_loop

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
logger = logging.getLogger("app.http")

_telegram_poller_task: asyncio.Task | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _telegram_poller_task
    init_db()
    if TELEGRAM_USE_POLLING and TELEGRAM_BOT_TOKEN:
        logger.info("Telegram: TELEGRAM_USE_POLLING=true — запуск long polling, webhook отключаем")
        await delete_webhook_for_polling()
        _telegram_poller_task = asyncio.create_task(poll_loop())
    yield
    if _telegram_poller_task:
        _telegram_poller_task.cancel()
        try:
            await _telegram_poller_task
        except asyncio.CancelledError:
            pass
        _telegram_poller_task = None


app = FastAPI(
    title="МедКлиника API",
    description=(
        "REST API для сервиса записи на приём в клинику.\n\n"
        "**Тестовые учётные данные:**\n"
        "- Администратор: `+79000000000` / `admin123`\n"
        "- Пользователь (скидка 10%): `+79161234567` / `user123`"
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS ───────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Роутеры ────────────────────────────────────────────────────────────────────
app.include_router(auth_router, prefix="/auth", tags=["Авторизация"])
app.include_router(users_router, prefix="/users", tags=["Пользователи"])
app.include_router(doctors_router, prefix="/doctors", tags=["Врачи"])
app.include_router(services_router, prefix="/services", tags=["Услуги"])
app.include_router(appointments_router, prefix="/appointments", tags=["Записи"])
app.include_router(telegram_router, prefix="/telegram", tags=["Telegram"])


@app.middleware("http")
async def log_requests_and_responses(request: Request, call_next):
    started = time.perf_counter()
    logger.info(
        "request: method=%s path=%s query=%s",
        request.method,
        request.url.path,
        request.url.query,
    )
    response = await call_next(request)
    elapsed_ms = int((time.perf_counter() - started) * 1000)
    logger.info(
        "response: method=%s path=%s status=%s duration_ms=%s",
        request.method,
        request.url.path,
        response.status_code,
        elapsed_ms,
    )
    return response


app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/test", include_in_schema=False)
def test_page():
    return FileResponse("static/test.html")


@app.get("/", tags=["Корень"])
def root():
    return {
        "message": "МедКлиника API работает",
        "docs": "/docs",
        "redoc": "/redoc",
        "test": "/test",
    }
