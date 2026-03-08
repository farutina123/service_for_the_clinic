---
name: Clinic Frontend Plan
overview: "Спланировать структуру фронтенда для сервиса записи в клинику: страницы, компоненты, отображаемые данные. Только фронтенд (React + TypeScript), без бэкенда — данные из моков."
todos:
  - id: scaffold
    content: "Инициализировать проект: Vite + React + TypeScript + Tailwind CSS, настроить React Router"
    status: pending
  - id: mock-data
    content: "Создать моковые данные: doctors.ts, services.ts, schedule.ts"
    status: pending
  - id: shared-ui
    content: "Реализовать shared компоненты: Header, Footer, Button, Card, Badge, Modal"
    status: pending
  - id: home-page
    content: "Страница Home: HeroSection, FeaturedServicesGrid, HowItWorksSection, ContactsSection"
    status: pending
  - id: services-page
    content: "Страница Services: CategoryTabs, SearchBar, ServiceCard, фильтрация"
    status: pending
  - id: service-detail
    content: "Страница ServiceDetail: DoctorProfile, PriceTable, BookButton"
    status: pending
  - id: booking-page
    content: "Страница Booking: 4-шаговая форма с DatePicker, TimeSlotGrid, PatientForm, BookingSummary"
    status: pending
  - id: confirmation-page
    content: "Страница Confirmation: SuccessIcon, ConfirmationCard, TelegramBlock"
    status: pending
  - id: appointments-page
    content: "Страница MyAppointments: AppointmentCard, статусы, отмена через localStorage"
    status: pending
isProject: false
---

# Архитектура фронтенда: сервис записи в клинику

## Стек

- React + TypeScript (Create React App или Vite)
- React Router v6 — маршрутизация
- Tailwind CSS — стили
- Mock-данные в `src/data/` — врачи, услуги, расписание

---

## Маршруты

```
/                        → Home
/services                → Services (каталог)
/services/:id            → ServiceDetail (карточка врача/услуги)
/booking                 → Booking (multi-step форма)
/booking/confirmation    → Confirmation (успешная запись)
/appointments            → MyAppointments (мои записи, localStorage)
```

---

## Страница 1 — Home (`/`)

Что видит пользователь: промо-блок с CTA, краткий список направлений, как это работает, контакты.

Компоненты:

- `Header` — логотип, ссылки на страницы, кнопка «Записаться»
- `HeroSection` — заголовок («Запись к врачу онлайн»), подзаголовок, кнопка-CTA → `/booking`
- `FeaturedServicesGrid` — 6 карточек популярных направлений (терапевт, УЗИ, ЭКГ…)
- `HowItWorksSection` — 3 шага: выбери → выбери время → получи подтверждение
- `ContactsSection` — адрес, телефон, карта (заглушка)
- `Footer` — ссылки, соцсети, Telegram бот

---

## Страница 2 — Services (`/services`)

Что видит пользователь: полный каталог с ценами, фильтры по категориям, поиск.

Компоненты:

- `CategoryTabs` — вкладки: Все / Врачи / Диагностика / Анализы
- `SearchBar` — поиск по имени врача или названию услуги
- `ServiceCard` — фото (аватар), имя, специализация, цена приёма, длительность, кнопка «Записаться»
- `PriceTag` — бейдж с ценой (напр. «от 1 500 ₽»)
- `EmptyState` — если по фильтру ничего нет

Данные на карточке:

```
Имя врача / название услуги
Специализация / категория
Цена (₽)
Длительность (мин)
```

---

## Страница 3 — ServiceDetail (`/services/:id`)

Что видит пользователь: подробная информация о враче или услуге + кнопка перехода к записи.

Компоненты:

- `DoctorProfile` — большое фото, ФИО, специализация, стаж, образование
- `ServiceDescription` — описание услуги, что включено
- `PriceTable` — таблица «Услуга → Цена» (для диагностик: несколько тарифов)
- `AvailabilityBadge` — «Ближайший приём: завтра, 10:00»
- `BookButton` — кнопка «Записаться» → переход на `/booking?serviceId=…`

---

## Страница 4 — Booking (`/booking`) — Multi-step форма

Что видит пользователь: 4 шага записи с прогресс-индикатором.

Компоненты-обёртки:

- `BookingProgressBar` — шаги: 1 Услуга → 2 Дата и время → 3 Данные → 4 Подтверждение
- `StepNavigation` — кнопки «Назад» / «Далее»

**Шаг 1 — Выбор услуги:**

- `ServiceSelector` — список врачей/услуг с фильтром (если не выбрано из каталога)
- Показывает: имя, специализация, цена, кнопка выбора

**Шаг 2 — Дата и время:**

- `DatePicker` — горизонтальный слайдер на 14 дней (моковые доступные даты)
- `TimeSlotGrid` — сетка слотов (09:00, 09:30, 10:00…), недоступные — серые
- `SelectedSlotBadge` — выбранный слот отображается поверх

**Шаг 3 — Данные пациента:**

- `PatientForm` — поля: Имя и фамилия, Телефон, Telegram username (`@username`), комментарий (необязательно)
- `TelegramHint` — подсказка: «Укажите @username, чтобы получить уведомление в Telegram»

**Шаг 4 — Итог:**

- `BookingSummary` — карточка: врач, дата, время, цена, ФИО пациента
- `ConfirmButton` — «Подтвердить запись»

---

## Страница 5 — Confirmation (`/booking/confirmation`)

Что видит пользователь: экран успеха с деталями и инструкцией по Telegram.

Компоненты:

- `SuccessIcon` — анимированная галочка
- `ConfirmationCard` — врач, дата, время, адрес клиники, цена
- `TelegramBlock` — «Мы отправим вам напоминание за 24 часа» + кнопка-ссылка «Открыть Telegram бот»
- `AddToCalendarButton` — генерирует `.ics` файл (опционально)
- `BackToHomeButton`

---

## Страница 6 — MyAppointments (`/appointments`)

Что видит пользователь: список своих записей (из localStorage), возможность отмены.

Компоненты:

- `AppointmentCard` — дата, врач, статус (предстоящая / прошедшая / отменена), цена
- `StatusBadge` — цветной бейдж статуса
- `CancelButton` — меняет статус в localStorage
- `EmptyState` — «У вас пока нет записей»

---

## Shared компоненты (`src/components/ui/`)

- `Header` + `Footer`
- `Button` (primary / secondary / ghost)
- `Badge` (price, status, category)
- `Card` (обёртка с тенью)
- `Modal` (для подтверждения отмены)
- `Spinner` (лоадер)

---

## Структура данных (моки)

`src/data/doctors.ts` — массив врачей (id, name, specialty, price, photo, slots)

`src/data/services.ts` — услуги диагностики (id, name, category, price, duration)

`src/data/schedule.ts` — расписание: `{ doctorId, date, slots: string[] }`

`src/store/bookingStore.ts` — состояние формы бронирования (Context API или Zustand)