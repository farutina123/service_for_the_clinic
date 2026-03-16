// Страница успешного подтверждения записи.
// Данные получаем через router state (navigate('/booking/confirmation', { state: { appointment } })).
import { useLocation, Link } from 'react-router-dom'
import type { Appointment } from '../data/mockData'

export default function Confirmation() {
  const location = useLocation()
  const appointment = (location.state as { appointment?: Appointment } | null)?.appointment

  // Если зашли напрямую без данных (напр. обновили страницу) — общее сообщение
  if (!appointment) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <div className="text-5xl mb-4">✅</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Запись подтверждена!</h1>
        <p className="text-gray-500 mb-6">Детали записи сохранены в разделе «Мои записи».</p>
        <div className="flex flex-col gap-3">
          <Link
            to="/appointments"
            className="block bg-white border border-gray-200 text-gray-700 font-medium
                       py-3 rounded-xl hover:bg-gray-50 transition-colors"
          >
            Мои записи
          </Link>
          <Link
            to="/"
            className="block bg-blue-600 text-white font-medium py-3 rounded-xl
                       hover:bg-blue-700 transition-colors"
          >
            На главную
          </Link>
        </div>
      </div>
    )
  }

  // Строки детальной карточки
  const rows = [
    { label: 'Врач / Услуга', value: appointment.serviceName },
    { label: 'Специализация', value: appointment.specialty },
    { label: 'Дата', value: appointment.date },
    { label: 'Время', value: appointment.time },
    { label: 'Адрес клиники', value: 'Москва, ул. Примерная, д. 12' },
    { label: 'Стоимость', value: `${appointment.price.toLocaleString('ru-RU')} ₽` },
    { label: 'Пациент', value: appointment.patientName },
    { label: 'Телефон', value: appointment.patientPhone },
    ...(appointment.patientTelegram
      ? [{ label: 'Telegram', value: appointment.patientTelegram }]
      : []),
  ]

  return (
    <div className="max-w-lg mx-auto px-4 py-10">

      {/* ─── Анимированная иконка успеха ─── */}
      <div className="text-center mb-8">
        <div
          className="inline-flex items-center justify-center w-20 h-20 bg-green-100
                     rounded-full mb-4 animate-bounce"
        >
          <span className="text-4xl">✅</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Вы записаны!</h1>
        <p className="text-gray-500">Запись успешно создана и сохранена</p>
      </div>

      {/* ─── Карточка с деталями ─── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-6">
        <div className="bg-green-50 px-5 py-4 border-b border-green-100">
          <p className="text-green-700 font-semibold">Детали записи</p>
        </div>
        {rows.map(({ label, value }) => (
          <div
            key={label}
            className="flex justify-between items-start px-5 py-3
                       border-b border-gray-50 last:border-0"
          >
            <span className="text-gray-500 text-sm">{label}</span>
            <span className="text-gray-900 text-sm font-medium text-right max-w-[60%]">
              {value}
            </span>
          </div>
        ))}
      </div>

      {/* ─── Блок Telegram ─── */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 mb-6">
        <div className="flex items-start gap-3">
          <span className="text-2xl mt-0.5">✈️</span>
          <div>
            <p className="font-semibold text-gray-900 mb-1">Напоминание в Telegram</p>
            <p className="text-gray-600 text-sm mb-3 leading-relaxed">
              Мы отправим напоминание о записи за 24 часа до приёма через Telegram-бот.
              {appointment.patientTelegram && (
                <> Уведомление придёт на <strong>{appointment.patientTelegram}</strong>.</>
              )}
            </p>
            <a
              href="https://t.me/medklinika_bot"
              target="_blank"
              rel="noreferrer"
              className="inline-block bg-blue-600 text-white text-sm font-medium px-5 py-2
                         rounded-lg hover:bg-blue-700 transition-colors"
            >
              Открыть Telegram-бот
            </a>
          </div>
        </div>
      </div>

      {/* ─── Кнопки навигации ─── */}
      <div className="flex flex-col gap-3">
        <Link
          to="/appointments"
          className="block text-center bg-white border border-gray-200 text-gray-700
                     font-medium py-3 rounded-xl hover:bg-gray-50 transition-colors"
        >
          Мои записи
        </Link>
        <Link
          to="/"
          className="block text-center bg-blue-600 text-white font-medium py-3
                     rounded-xl hover:bg-blue-700 transition-colors"
        >
          На главную
        </Link>
      </div>
    </div>
  )
}
