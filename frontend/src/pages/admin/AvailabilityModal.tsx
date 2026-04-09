import { useEffect, useMemo, useState } from 'react'
import {
  fetchDoctorAvailability,
  replaceDoctorAvailability,
  fetchServiceAvailability,
  replaceServiceAvailability,
} from '../../api'

const ALL_TIME_SLOTS_30MIN = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00', '17:30',
]

function tomorrowISO(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().split('T')[0]
}

type Target =
  | { kind: 'doctor'; id: string; title: string }
  | { kind: 'service'; id: string; title: string }

export default function AvailabilityModal(props: {
  target: Target
  onClose: () => void
}) {
  const { target, onClose } = props

  const [date, setDate] = useState<string>(tomorrowISO())
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedCount = selected.size
  const canSave = !saving && !loading && !!date

  const selectedSorted = useMemo(() => {
    const list = Array.from(selected)
    list.sort()
    return list
  }, [selected])

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = target.kind === 'doctor'
          ? await fetchDoctorAvailability(target.id, date)
          : await fetchServiceAvailability(target.id, date)
        if (cancelled) return
        setSelected(new Set(res.times ?? []))
      } catch (e: unknown) {
        if (cancelled) return
        const msg = e instanceof Error ? e.message : 'Не удалось загрузить слоты'
        setError(msg)
        setSelected(new Set())
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => { cancelled = true }
  }, [target.id, target.kind, date])

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      if (target.kind === 'doctor') {
        await replaceDoctorAvailability(target.id, { date, times: selectedSorted })
      } else {
        await replaceServiceAvailability(target.id, { date, times: selectedSorted })
      }
      onClose()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Не удалось сохранить слоты'
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  function toggle(t: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(t)) next.delete(t)
      else next.add(t)
      return next
    })
  }

  function selectAll() {
    setSelected(new Set(ALL_TIME_SLOTS_30MIN))
  }

  function clearAll() {
    setSelected(new Set())
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl p-6 max-w-2xl w-full shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start gap-4 mb-4">
          <div className="min-w-0">
            <h3 className="font-bold text-gray-900 text-lg">Свободные слоты</h3>
            <p className="text-sm text-gray-500 truncate">{target.title}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-end gap-3 mb-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Дата</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={selectAll}
              disabled={loading || saving}
              className="border border-gray-200 text-gray-700 px-3 py-2.5 rounded-xl text-sm font-medium
                         hover:bg-gray-50 disabled:opacity-60 transition-colors"
            >
              Выбрать все
            </button>
            <button
              type="button"
              onClick={clearAll}
              disabled={loading || saving}
              className="border border-gray-200 text-gray-700 px-3 py-2.5 rounded-xl text-sm font-medium
                         hover:bg-gray-50 disabled:opacity-60 transition-colors"
            >
              Очистить
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-medium text-gray-700">
            Слоты (30 минут)
          </p>
          <p className="text-xs text-gray-400">
            Выбрано: {selectedCount}
            {loading ? ' • загрузка...' : ''}
          </p>
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
          {ALL_TIME_SLOTS_30MIN.map(t => {
            const checked = selected.has(t)
            return (
              <button
                key={t}
                type="button"
                onClick={() => toggle(t)}
                disabled={loading || saving}
                className={`py-2 rounded-lg text-sm font-medium transition-all border ${
                  checked
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-blue-400'
                } disabled:opacity-60`}
              >
                {t}
              </button>
            )
          })}
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl hover:bg-gray-50 transition-colors font-medium"
          >
            Отмена
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white py-2.5 rounded-xl transition-colors font-medium"
          >
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </div>
    </div>
  )
}

