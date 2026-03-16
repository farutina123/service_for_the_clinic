import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { getAppointments, cancelAppointment, type Appointment } from '../data/mockData'
import { fetchAppointments, fetchAllServices, cancelAppointmentApi, type ApiAppointment, type ApiService } from '../api'
import { useAuth } from '../context/AuthContext'

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  upcoming:  { label: 'Предстоящая', className: 'bg-blue-50 text-blue-600' },
  past:      { label: 'Прошедшая',   className: 'bg-gray-100 text-gray-500' },
  cancelled: { label: 'Отменена',    className: 'bg-red-50 text-red-500' },
  pending:   { label: 'Ожидает',     className: 'bg-yellow-50 text-yellow-600' },
  confirmed: { label: 'Подтверждена',className: 'bg-green-50 text-green-600' },
  completed: { label: 'Завершена',   className: 'bg-gray-100 text-gray-500' },
}

function isUpcoming(apt: ApiAppointment) {
  return apt.status !== 'cancelled' && apt.status !== 'completed' &&
    new Date(`${apt.appointment_date}T${apt.appointment_time}`) > new Date()
}

export default function MyAppointments() {
  const { user } = useAuth()

  // Режим API (авторизован) или localStorage (гость)
  const [apiAppointments, setApiAppointments] = useState<ApiAppointment[]>([])
  const [localAppointments, setLocalAppointments] = useState<Appointment[]>([])
  const [serviceMap, setServiceMap] = useState<Map<string, string>>(new Map())
  const [loading, setLoading] = useState(false)
  const [cancelTarget, setCancelTarget] = useState<string | null>(null)
  const [cancelling, setCancelling] = useState(false)

  const loadApiAppointments = useCallback(async () => {
    setLoading(true)
    try {
      const [data, svcs] = await Promise.all([
        fetchAppointments(),
        fetchAllServices(),
      ])
      setApiAppointments(data)
      setServiceMap(new Map((svcs as ApiService[]).map(s => [s.id, s.name])))
    } catch {
      // fallback to empty
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (user) {
      loadApiAppointments()
    } else {
      setLocalAppointments(getAppointments())
    }
  }, [user, loadApiAppointments])

  async function handleCancel(id: string) {
    setCancelling(true)
    try {
      if (user) {
        await cancelAppointmentApi(id)
        await loadApiAppointments()
      } else {
        cancelAppointment(id)
        setLocalAppointments(getAppointments())
      }
    } catch { /* ignore */ } finally {
      setCancelling(false)
      setCancelTarget(null)
    }
  }

  // ── Рендер карточки для API-записи ──────────────────────────────────────
  function renderApiCard(apt: ApiAppointment) {
    const key    = apt.status === 'cancelled' ? 'cancelled' : isUpcoming(apt) ? 'upcoming' : 'completed'
    const badge  = STATUS_LABELS[apt.status] ?? STATUS_LABELS[key]
    const canCancel = isUpcoming(apt)

    return (
      <div
        key={apt.id}
        className={`bg-white rounded-2xl border shadow-sm p-5 transition-all ${
          apt.status === 'cancelled' ? 'opacity-60 border-gray-100' : 'border-gray-100 hover:shadow-md'
        }`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h3 className="font-semibold text-gray-900 text-sm leading-snug">
                {serviceMap.get(apt.service_id) ?? `Запись #${apt.id.slice(0, 8)}`}
              </h3>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badge.className}`}>
                {badge.label}
              </span>
            </div>
            <p className="text-gray-400 text-xs mb-2">{apt.patient_name}</p>
            <div className="flex flex-wrap gap-3 text-sm text-gray-600">
              <span>📅 {apt.appointment_date}</span>
              <span>🕐 {apt.appointment_time}</span>
              <span>💳 {apt.final_price.toLocaleString('ru-RU')} ₽</span>
            </div>
            {apt.notes && (
              <p className="text-xs text-gray-400 mt-2 italic">{apt.notes}</p>
            )}
          </div>
          {canCancel && (
            <button
              onClick={() => setCancelTarget(apt.id)}
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
  }

  // ── Рендер карточки для localStorage-записи ──────────────────────────────
  function renderLocalCard(appointment: Appointment) {
    const status = STATUS_LABELS[appointment.status] ?? STATUS_LABELS['cancelled']
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
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h3 className="font-semibold text-gray-900 text-sm leading-snug">
                {appointment.serviceName}
              </h3>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.className}`}>
                {status.label}
              </span>
            </div>
            <p className="text-gray-400 text-xs mb-2">{appointment.specialty}</p>
            <div className="flex flex-wrap gap-3 text-sm text-gray-600">
              <span>📅 {appointment.date}</span>
              <span>🕐 {appointment.time}</span>
              <span>💳 {appointment.price.toLocaleString('ru-RU')} ₽</span>
            </div>
            <p className="text-xs text-gray-400 mt-1.5">{appointment.patientName}</p>
          </div>
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
  }

  const isEmpty = user
    ? apiAppointments.length === 0
    : localAppointments.length === 0

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold text-gray-900 mb-1">Мои записи</h1>
      <p className="text-gray-500 mb-8">История и предстоящие приёмы</p>

      {loading && (
        <div className="text-center py-20 text-gray-400">Загрузка...</div>
      )}

      {!loading && isEmpty && (
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

      {!loading && (
        <div className="space-y-4">
          {user
            ? apiAppointments.map(renderApiCard)
            : localAppointments.map(renderLocalCard)
          }
        </div>
      )}

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
                disabled={cancelling}
                className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl
                           hover:bg-gray-50 transition-colors font-medium"
              >
                Нет, оставить
              </button>
              <button
                onClick={() => handleCancel(cancelTarget)}
                disabled={cancelling}
                className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-60
                           text-white py-2.5 rounded-xl transition-colors font-medium"
              >
                {cancelling ? 'Отмена...' : 'Да, отменить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
