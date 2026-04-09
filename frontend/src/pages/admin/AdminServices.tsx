import { useState, useEffect } from 'react'
import {
  fetchAllServices,
  createService,
  updateService,
  deleteService,
  fetchDoctors,
  type ApiService,
  type ApiDoctor,
} from '../../api'
import AvailabilityModal from './AvailabilityModal'

const EMPTY: Omit<ApiService, 'id' | 'is_active'> = {
  name: '',
  category: 'doctors',
  price: 0,
  duration_minutes: 30,
  description: null,
  doctor_id: null,
}

export default function AdminServices() {
  const [services, setServices] = useState<ApiService[]>([])
  const [doctors,  setDoctors]  = useState<ApiDoctor[]>([])
  const [loading,  setLoading]  = useState(true)
  const [modal,    setModal]    = useState<'create' | 'edit' | null>(null)
  const [form,     setForm]     = useState<Omit<ApiService, 'id' | 'is_active'>>(EMPTY)
  const [editId,   setEditId]   = useState<string | null>(null)
  const [saving,   setSaving]   = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [availabilityTarget, setAvailabilityTarget] = useState<ApiService | null>(null)

  useEffect(() => {
    Promise.all([fetchAllServices(), fetchDoctors()])
      .then(([s, d]) => { setServices(s); setDoctors(d) })
      .finally(() => setLoading(false))
  }, [])

  function openCreate() {
    setForm(EMPTY)
    setEditId(null)
    setModal('create')
  }

  function openEdit(svc: ApiService) {
    setForm({
      name: svc.name,
      category: svc.category,
      price: svc.price,
      duration_minutes: svc.duration_minutes,
      description: svc.description,
      doctor_id: svc.doctor_id,
    })
    setEditId(svc.id)
    setModal('edit')
  }

  async function handleSave() {
    setSaving(true)
    try {
      if (modal === 'create') {
        const created = await createService(form)
        setServices(prev => [created, ...prev])
      } else if (editId) {
        const updated = await updateService(editId, form)
        setServices(prev => prev.map(s => s.id === editId ? updated : s))
      }
      setModal(null)
    } catch { /* ignore */ } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteService(id)
      setServices(prev => prev.filter(s => s.id !== id))
    } catch { /* ignore */ } finally {
      setDeleteTarget(null)
    }
  }

  if (loading) return <div className="text-gray-400 py-10 text-center">Загрузка...</div>

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-800">Услуги ({services.length})</h2>
        <button
          onClick={openCreate}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium
                     px-4 py-2 rounded-lg transition-colors"
        >
          + Добавить
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-gray-100 shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="px-4 py-3 text-left">Название</th>
              <th className="px-4 py-3 text-left">Категория</th>
              <th className="px-4 py-3 text-left">Цена</th>
              <th className="px-4 py-3 text-left">Длит.</th>
              <th className="px-4 py-3 text-left">Статус</th>
              <th className="px-4 py-3 text-left"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 bg-white">
            {services.map(svc => (
              <tr key={svc.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-medium text-gray-900">{svc.name}</td>
                <td className="px-4 py-3 text-gray-500">{svc.category}</td>
                <td className="px-4 py-3 text-gray-600">{svc.price.toLocaleString('ru-RU')} ₽</td>
                <td className="px-4 py-3 text-gray-500">{svc.duration_minutes} мин</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    svc.is_active ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'
                  }`}>
                    {svc.is_active ? 'Активна' : 'Отключена'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-3">
                    <button
                      onClick={() => openEdit(svc)}
                      className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                    >
                      Изменить
                    </button>
                    <button
                      onClick={() => setAvailabilityTarget(svc)}
                      className="text-gray-600 hover:text-gray-800 text-xs font-medium"
                    >
                      Слоты
                    </button>
                    <button
                      onClick={() => setDeleteTarget(svc.id)}
                      className="text-red-400 hover:text-red-600 text-xs font-medium"
                    >
                      Удалить
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Модалка создания/редактирования */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-gray-900 text-lg">
                {modal === 'create' ? 'Новая услуга' : 'Редактировать услугу'}
              </h3>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <div className="space-y-4">
              <Field label="Название">
                <input
                  type="text" required value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className={INPUT_CLS}
                />
              </Field>
              <Field label="Категория">
                <select
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value as ApiService['category'] }))}
                  className={INPUT_CLS}
                >
                  <option value="doctors">Врачи</option>
                  <option value="diagnostics">Диагностика</option>
                  <option value="analysis">Анализы</option>
                </select>
              </Field>
              <Field label="Цена (₽)">
                <input
                  type="number" min={0} value={form.price}
                  onChange={e => setForm(f => ({ ...f, price: Number(e.target.value) }))}
                  className={INPUT_CLS}
                />
              </Field>
              <Field label="Длительность (мин)">
                <input
                  type="number" min={5} value={form.duration_minutes}
                  onChange={e => setForm(f => ({ ...f, duration_minutes: Number(e.target.value) }))}
                  className={INPUT_CLS}
                />
              </Field>
              <Field label="Описание">
                <textarea
                  value={form.description ?? ''}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value || null }))}
                  rows={3}
                  className={INPUT_CLS}
                />
              </Field>
              <Field label="Врач">
                <select
                  value={form.doctor_id ?? ''}
                  onChange={e => setForm(f => ({ ...f, doctor_id: e.target.value || null }))}
                  className={INPUT_CLS}
                >
                  <option value="">— Без врача —</option>
                  {doctors.map(d => (
                    <option key={d.id} value={d.id}>{d.name} — {d.specialty}</option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setModal(null)}
                className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl
                           hover:bg-gray-50 transition-colors font-medium"
              >
                Отмена
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.name}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60
                           text-white py-2.5 rounded-xl transition-colors font-medium"
              >
                {saving ? 'Сохранение...' : 'Сохранить'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Подтверждение удаления */}
      {deleteTarget && (
        <ConfirmDelete
          onConfirm={() => handleDelete(deleteTarget)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {availabilityTarget && (
        <AvailabilityModal
          target={
            availabilityTarget.doctor_id
              ? {
                  kind: 'doctor',
                  id: availabilityTarget.doctor_id,
                  title: `${availabilityTarget.name} (врач)`,
                }
              : {
                  kind: 'service',
                  id: availabilityTarget.id,
                  title: `${availabilityTarget.name} (услуга без врача)`,
                }
          }
          onClose={() => setAvailabilityTarget(null)}
        />
      )}
    </div>
  )
}

// ── Маленькие вспомогательные компоненты ──────────────────────────────────

const INPUT_CLS = `w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm
                   focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  )
}

function ConfirmDelete({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
        <h3 className="font-bold text-gray-900 text-lg mb-2">Деактивировать?</h3>
        <p className="text-gray-500 text-sm mb-6">
          Элемент будет деактивирован и скрыт из публичного списка.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl
                       hover:bg-gray-50 transition-colors font-medium"
          >
            Отмена
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2.5
                       rounded-xl transition-colors font-medium"
          >
            Деактивировать
          </button>
        </div>
      </div>
    </div>
  )
}
