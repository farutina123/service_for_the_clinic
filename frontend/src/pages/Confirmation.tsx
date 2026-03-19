// Страница успешного подтверждения записи.
// Данные получаем через router state (navigate('/booking/confirmation', { state: { appointment } })).
import { useEffect, useState } from 'react'
import { useLocation, Link } from 'react-router-dom'
import type { Appointment } from '../data/mockData'
import { useAuth } from '../context/AuthContext'
import { apiCreateTelegramLinkToken, apiGetTelegramStatus } from '../api'

export default function Confirmation() {
  const location = useLocation()
  const { user } = useAuth()
  const appointment = (location.state as { appointment?: Appointment } | null)?.appointment
  const [telegramLinked, setTelegramLinked] = useState(false)
  const [telegramLink, setTelegramLink] = useState<string | null>(null)
  const [telegramLoading, setTelegramLoading] = useState(false)
  const [telegramError, setTelegramError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    let isCancelled = false

    async function loadTelegramBlock() {
      setTelegramLoading(true)
      setTelegramError(null)
      try {
        const status = await apiGetTelegramStatus()
        if (isCancelled) return
        if (status.linked) {
          setTelegramLinked(true)
          setTelegramLink(null)
          return
        }
        setTelegramLinked(false)
        const result = await apiCreateTelegramLinkToken()
        if (!isCancelled) {
          setTelegramLink(result.deep_link)
        }
      } catch (err: unknown) {
        if (!isCancelled) {
          const message = err instanceof Error ? err.message : 'Не удалось подготовить ссылку Telegram'
          setTelegramError(message)
        }
      } finally {
        if (!isCancelled) {
          setTelegramLoading(false)
        }
      }
    }

    loadTelegramBlock()
    return () => {
      isCancelled = true
    }
  }, [user])

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

      {/* ─── Подключение Telegram после заявки ─── */}
      {user && (
        <div className="mb-6 rounded-2xl border border-blue-100 bg-blue-50 p-4">
          {telegramLinked ? (
            <>
              <p className="text-sm font-semibold text-green-800 mb-1">
                Telegram подключён
              </p>
              <p className="text-sm text-green-700">
                Уведомления о новых записях будут приходить вам в бот.
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-blue-800 mb-1">
                Получать уведомления о записи в Telegram
              </p>
              <p className="text-sm text-blue-700 mb-3">
                Нажмите кнопку ниже и в боте выберите Start. После этого уведомления будут приходить автоматически.
              </p>

              {telegramError && (
                <p className="text-sm text-red-600 mb-3">{telegramError}</p>
              )}

              {telegramLink ? (
                <a
                  href={telegramLink}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
                >
                  Подключить Telegram
                </a>
              ) : (
                <button
                  type="button"
                  disabled
                  className="inline-flex items-center justify-center rounded-xl bg-blue-300 px-4 py-2.5 text-sm font-semibold text-white cursor-not-allowed"
                >
                  {telegramLoading ? 'Проверяем подключение...' : 'Ссылка недоступна'}
                </button>
              )}
            </>
          )}
        </div>
      )}

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
