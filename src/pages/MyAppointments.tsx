// Страница «Мои записи»: читает из localStorage, позволяет отменить запись через модалку
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getAppointments, cancelAppointment, type Appointment } from '../data/mockData'

// Конфигурация бейджей статусов
const STATUS: Record<Appointment['status'], { label: string; className: string }> = {
  upcoming: { label: 'Предстоящая', className: 'bg-blue-50 text-blue-600' },
  past: { label: 'Прошедшая', className: 'bg-gray-100 text-gray-500' },
  cancelled: { label: 'Отменена', className: 'bg-red-50 text-red-500' },
}

export default function MyAppointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  // ID записи, ожидающей подтверждения отмены (для модалки)
  const [cancelTarget, setCancelTarget] = useState<string | null>(null)

  // Читаем из localStorage при монтировании
  useEffect(() => {
    setAppointments(getAppointments())
  }, [])

  // Отмена записи: обновляем localStorage и перечитываем список
  function handleCancel(id: string) {
    cancelAppointment(id)
    setAppointments(getAppointments())
    setCancelTarget(null)
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold text-gray-900 mb-1">Мои записи</h1>
      <p className="text-gray-500 mb-8">История и предстоящие приёмы</p>

      {/* ─── Пустое состояние ─── */}
      {appointments.length === 0 && (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">📋</div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">У вас пока нет записей</h2>
          <p className="text-gray-400 mb-6">
            Запишитесь к врачу, чтобы здесь появились ваши приёмы
          </p>
          <Link
            to="/booking"
            className="inline-block bg-blue-600 text-white font-medium px-8 py-3
                       rounded-xl hover:bg-blue-700 transition-colors"
          >
            Записаться
          </Link>
        </div>
      )}

      {/* ─── Список карточек ─── */}
      <div className="space-y-4">
        {appointments.map(appointment => {
          const status = STATUS[appointment.status]
          return (
            <div
              key={appointment.id}
              className={`bg-white rounded-2xl border shadow-sm p-5 transition-all ${
                appointment.status === 'cancelled'
                  ? 'opacity-60 border-gray-100'
                  : 'border-gray-100 hover:shadow-md'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {/* Имя + бейдж статуса */}
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900 text-sm leading-snug">
                      {appointment.serviceName}
                    </h3>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.className}`}
                    >
                      {status.label}
                    </span>
                  </div>

                  <p className="text-gray-400 text-xs mb-2">{appointment.specialty}</p>

                  {/* Дата, время, цена */}
                  <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                    <span>📅 {appointment.date}</span>
                    <span>🕐 {appointment.time}</span>
                    <span>💳 {appointment.price.toLocaleString('ru-RU')} ₽</span>
                  </div>

                  {/* Имя пациента */}
                  <p className="text-xs text-gray-400 mt-1.5">{appointment.patientName}</p>
                </div>

                {/* Кнопка «Отменить» — только для предстоящих */}
                {appointment.status === 'upcoming' && (
                  <button
                    onClick={() => setCancelTarget(appointment.id)}
                    className="text-red-400 hover:text-red-600 text-xs font-medium border
                               border-red-200 hover:border-red-400 px-3 py-1.5 rounded-lg
                               transition-colors flex-shrink-0"
                  >
                    Отменить
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* ─── Модалка подтверждения отмены ─── */}
      {cancelTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="font-bold text-gray-900 text-lg mb-2">Отменить запись?</h3>
            <p className="text-gray-500 text-sm mb-6 leading-relaxed">
              Это действие нельзя отменить. Запись будет помечена как отменённая.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setCancelTarget(null)}
                className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl
                           hover:bg-gray-50 transition-colors font-medium"
              >
                Нет, оставить
              </button>
              <button
                onClick={() => handleCancel(cancelTarget)}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2.5 rounded-xl
                           transition-colors font-medium"
              >
                Да, отменить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
