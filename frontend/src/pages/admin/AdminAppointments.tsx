import { useState, useEffect, useRef } from 'react'
import {
  fetchAppointments,
  fetchAppointmentById,
  fetchAllServices,
  fetchDoctors,
  updateAppointmentStatus,
  type ApiAppointment,
  type ApiService,
  type ApiDoctor,
} from '../../api'

const STATUS_OPTIONS: ApiAppointment['status'][] = ['pending', 'confirmed', 'completed', 'cancelled']

const STATUS_LABELS: Record<ApiAppointment['status'], { label: string; badge: string; dot: string }> = {
  pending:   { label: 'Ожидает',      badge: 'bg-yellow-50 text-yellow-700 border-yellow-200', dot: 'bg-yellow-400' },
  confirmed: { label: 'Подтверждена', badge: 'bg-green-50  text-green-700  border-green-200',  dot: 'bg-green-500'  },
  completed: { label: 'Завершена',    badge: 'bg-gray-100  text-gray-500   border-gray-200',   dot: 'bg-gray-400'   },
  cancelled: { label: 'Отменена',     badge: 'bg-red-50    text-red-600    border-red-200',    dot: 'bg-red-400'    },
}

// ── Кастомный dropdown для статуса ──────────────────────────────────────────
function StatusDropdown({
  status,
  loading,
  onChange,
}: {
  status: ApiAppointment['status']
  loading: boolean
  onChange: (s: ApiAppointment['status']) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Закрываем при клике вне компонента
  useEffect(() => {
    if (!open) return
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [open])

  const { label, badge } = STATUS_LABELS[status]

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        disabled={loading}
        onClick={() => setOpen(o => !o)}
        className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1
                    rounded-full border cursor-pointer select-none
                    disabled:opacity-50 disabled:cursor-not-allowed
                    transition-opacity ${badge}`}
      >
        {loading ? (
          <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
        ) : (
          <>{label} <span className="opacity-60 text-[10px]">▾</span></>
        )}
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-30 bg-white border border-gray-200
                        rounded-xl shadow-lg overflow-hidden min-w-[150px]">
          {STATUS_OPTIONS.map(s => {
            const opt = STATUS_LABELS[s]
            const active = s === status
            return (
              <button
                key={s}
                type="button"
                onClick={() => { setOpen(false); if (!active) onChange(s) }}
                className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2
                            hover:bg-gray-50 transition-colors
                            ${active ? 'font-semibold bg-gray-50' : 'text-gray-700'}`}
              >
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${opt.dot}`} />
                {opt.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Основной компонент ───────────────────────────────────────────────────────
export default function AdminAppointments() {
  const [appointments, setAppointments] = useState<ApiAppointment[]>([])
  const [serviceMap,   setServiceMap]   = useState<Map<string, string>>(new Map())
  const [doctors,      setDoctors]      = useState<ApiDoctor[]>([])
  const [loading,      setLoading]      = useState(true)

  const [detailApt,     setDetailApt]     = useState<ApiAppointment | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const [updatingId,  setUpdatingId]  = useState<string | null>(null)
  const [statusError, setStatusError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetchAppointments(),
      fetchAllServices(),
      fetchDoctors(),
    ]).then(([apts, svcs, docs]) => {
      setAppointments(apts)
      setServiceMap(new Map((svcs as ApiService[]).map(s => [s.id, s.name])))
      setDoctors(docs)
    }).finally(() => setLoading(false))
  }, [])

  async function handleStatusChange(id: string, status: ApiAppointment['status']) {
    setStatusError(null)
    const snapshot = appointments
    // Оптимистичное обновление
    setAppointments(list => list.map(a => a.id === id ? { ...a, status } : a))
    setUpdatingId(id)
    try {
      const updated = await updateAppointmentStatus(id, status)
      setAppointments(list => list.map(a => a.id === id ? updated : a))
      if (detailApt?.id === id) setDetailApt(updated)
    } catch (err: unknown) {
      setAppointments(snapshot)
      setStatusError(err instanceof Error ? err.message : 'Не удалось обновить статус')
    } finally {
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

  function findDoctor(doctorId: string | null): ApiDoctor | undefined {
    if (!doctorId) return undefined
    return doctors.find(d => d.id === doctorId)
  }

  if (loading) return <div className="text-gray-400 py-10 text-center">Загрузка...</div>

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-800 mb-4">
        Все записи ({appointments.length})
      </h2>

      {statusError && (
        <div className="mb-3 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 text-sm
                        text-red-600 flex justify-between items-center">
          <span>⚠️ {statusError}</span>
          <button onClick={() => setStatusError(null)} className="text-red-400 hover:text-red-600 ml-4">×</button>
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-gray-100 shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="px-4 py-3 text-left">Пациент</th>
              <th className="px-4 py-3 text-left">Услуга</th>
              <th className="px-4 py-3 text-left">Дата / Время</th>
              <th className="px-4 py-3 text-left">Цена</th>
              <th className="px-4 py-3 text-left">Статус</th>
              <th className="px-4 py-3 text-left"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 bg-white">
            {appointments.map(apt => (
              <tr key={apt.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900">{apt.patient_name}</p>
                  <p className="text-gray-400 text-xs">{apt.patient_phone}</p>
                </td>
                <td className="px-4 py-3 text-gray-700 max-w-[180px]">
                  <p className="truncate">{serviceMap.get(apt.service_id) ?? '—'}</p>
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {apt.appointment_date}
                  <span className="text-gray-400 ml-1">{apt.appointment_time}</span>
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {apt.final_price.toLocaleString('ru-RU')} ₽
                </td>
                <td className="px-4 py-3">
                  <StatusDropdown
                    status={apt.status}
                    loading={updatingId === apt.id}
                    onChange={s => handleStatusChange(apt.id, s)}
                  />
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
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Модалка деталей ── */}
      {(detailApt || detailLoading) && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl max-h-[90vh] overflow-y-auto">
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
                  ['ID',          detailApt.id],
                  ['Пациент',     detailApt.patient_name],
                  ['Телефон',     detailApt.patient_phone],
                  ['Услуга',      serviceMap.get(detailApt.service_id) ?? detailApt.service_id],
                  ['Дата',        `${detailApt.appointment_date} в ${detailApt.appointment_time}`],
                  ['Статус',      STATUS_LABELS[detailApt.status].label],
                  ['Базовая цена',`${detailApt.base_price.toLocaleString('ru-RU')} ₽`],
                  ['Скидка',      detailApt.discount_applied > 0
                                    ? `${Math.round(detailApt.discount_applied * 100)}%` : '—'],
                  ['Итого',       `${detailApt.final_price.toLocaleString('ru-RU')} ₽`],
                  ['Создано',     new Date(detailApt.created_at).toLocaleString('ru-RU')],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4">
                    <dt className="text-gray-400 flex-shrink-0">{k}</dt>
                    <dd className="text-gray-900 font-medium text-right break-all">{v}</dd>
                  </div>
                ))}

                {/* Врач */}
                {(() => {
                  const doc = findDoctor(detailApt.doctor_id)
                  return (
                    <div className="flex justify-between gap-4">
                      <dt className="text-gray-400 flex-shrink-0">Врач</dt>
                      <dd className="text-gray-900 font-medium text-right">
                        {doc ? (
                          <>
                            {doc.name}
                            <span className="block text-xs text-gray-400 font-normal">{doc.specialty}</span>
                          </>
                        ) : '—'}
                      </dd>
                    </div>
                  )
                })()}

                {/* Комментарий */}
                {detailApt.notes && (
                  <div className="pt-1">
                    <dt className="text-gray-400 mb-1">Комментарий пациента</dt>
                    <dd className="text-gray-900 font-medium bg-gray-50 rounded-xl px-3 py-2 text-xs leading-relaxed">
                      {detailApt.notes}
                    </dd>
                  </div>
                )}
              </dl>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
