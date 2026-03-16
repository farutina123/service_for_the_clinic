import { useState, useEffect } from 'react'
import {
  fetchAppointments,
  fetchAppointmentById,
  updateAppointmentStatus,
  type ApiAppointment,
} from '../../api'

const STATUS_OPTIONS: ApiAppointment['status'][] = ['pending', 'confirmed', 'completed', 'cancelled']

const STATUS_LABELS: Record<ApiAppointment['status'], { label: string; className: string }> = {
  pending:   { label: 'Ожидает',      className: 'bg-yellow-50 text-yellow-600' },
  confirmed: { label: 'Подтверждена', className: 'bg-green-50 text-green-600' },
  completed: { label: 'Завершена',    className: 'bg-gray-100 text-gray-500' },
  cancelled: { label: 'Отменена',     className: 'bg-red-50 text-red-500' },
}

export default function AdminAppointments() {
  const [appointments, setAppointments] = useState<ApiAppointment[]>([])
  const [loading, setLoading] = useState(true)
  const [detailApt, setDetailApt] = useState<ApiAppointment | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  useEffect(() => {
    fetchAppointments()
      .then(setAppointments)
      .finally(() => setLoading(false))
  }, [])

  async function handleStatusChange(id: string, status: ApiAppointment['status']) {
    setUpdatingId(id)
    try {
      const updated = await updateAppointmentStatus(id, status)
      setAppointments(prev => prev.map(a => a.id === id ? updated : a))
      if (detailApt?.id === id) setDetailApt(updated)
    } catch { /* ignore */ } finally {
      setUpdatingId(null)
    }
  }

  async function openDetail(id: string) {
    setDetailLoading(true)
    setDetailApt(null)
    try {
      const apt = await fetchAppointmentById(id)
      setDetailApt(apt)
    } finally {
      setDetailLoading(false)
    }
  }

  if (loading) return <div className="text-gray-400 py-10 text-center">Загрузка...</div>

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-800 mb-4">
        Все записи ({appointments.length})
      </h2>

      <div className="overflow-x-auto rounded-2xl border border-gray-100 shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="px-4 py-3 text-left">Пациент</th>
              <th className="px-4 py-3 text-left">Дата / Время</th>
              <th className="px-4 py-3 text-left">Цена</th>
              <th className="px-4 py-3 text-left">Статус</th>
              <th className="px-4 py-3 text-left"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 bg-white">
            {appointments.map(apt => {
              const badge = STATUS_LABELS[apt.status]
              return (
                <tr key={apt.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{apt.patient_name}</p>
                    <p className="text-gray-400 text-xs">{apt.patient_phone}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {apt.appointment_date}
                    <span className="text-gray-400 ml-1">{apt.appointment_time}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {apt.final_price.toLocaleString('ru-RU')} ₽
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={apt.status}
                      disabled={updatingId === apt.id}
                      onChange={e => handleStatusChange(apt.id, e.target.value as ApiAppointment['status'])}
                      className={`text-xs font-medium px-2 py-1 rounded-lg border-0
                                  focus:ring-2 focus:ring-blue-500 cursor-pointer
                                  disabled:opacity-50 ${badge.className}`}
                    >
                      {STATUS_OPTIONS.map(s => (
                        <option key={s} value={s}>{STATUS_LABELS[s].label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => openDetail(apt.id)}
                      className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                    >
                      Подробнее
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Модалка деталей */}
      {(detailApt || detailLoading) && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-gray-900 text-lg">Детали записи</h3>
              <button
                onClick={() => setDetailApt(null)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                ×
              </button>
            </div>
            {detailLoading ? (
              <div className="text-center py-8 text-gray-400">Загрузка...</div>
            ) : detailApt && (
              <dl className="space-y-3 text-sm">
                {[
                  ['ID', detailApt.id],
                  ['Пациент', detailApt.patient_name],
                  ['Телефон', detailApt.patient_phone],
                  ['Дата', `${detailApt.appointment_date} в ${detailApt.appointment_time}`],
                  ['Статус', STATUS_LABELS[detailApt.status].label],
                  ['Базовая цена', `${detailApt.base_price.toLocaleString('ru-RU')} ₽`],
                  ['Скидка', `${detailApt.discount_applied}%`],
                  ['Итого', `${detailApt.final_price.toLocaleString('ru-RU')} ₽`],
                  ['Создано', new Date(detailApt.created_at).toLocaleString('ru-RU')],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4">
                    <dt className="text-gray-400">{k}</dt>
                    <dd className="text-gray-900 font-medium text-right break-all">{v}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
