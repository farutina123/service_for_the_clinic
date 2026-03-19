"""
МедКлиника — REST API
Запуск: uvicorn main:app --reload --port 8000
Документация: http://localhost:8000/docs
"""
# dotenv должен загружаться до всех остальных импортов,
# чтобы os.getenv() в config.py прочитал переменные из .env
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from database import init_db
from config import CORS_ORIGINS
from auth.router import router as auth_router
from routers.users import router as users_router
from routers.doctors import router as doctors_router
from routers.services import router as services_router
from routers.appointments import router as appointments_router

app = FastAPI(
    title="МедКлиника API",
    description=(
        "REST API для сервиса записи на приём в клинику.\n\n"
        "**Тестовые учётные данные:**\n"
        "- Администратор: `+79000000000` / `admin123`\n"
        "- Пользователь (скидка 10%): `+79161234567` / `user123`"
    ),
    version="1.0.0",
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


@app.on_event("startup")
def on_startup() -> None:
    init_db()


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
