import { useState, useEffect } from 'react'
import {
  fetchDoctors,
  createDoctor,
  updateDoctor,
  deleteDoctor,
  type ApiDoctor,
} from '../../api'

const EMPTY: Omit<ApiDoctor, 'id' | 'is_active'> = {
  name: '',
  specialty: '',
  experience_years: 0,
  education: null,
  description: null,
  photo_url: null,
}

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
        <h3 className="font-bold text-gray-900 text-lg mb-2">Деактивировать врача?</h3>
        <p className="text-gray-500 text-sm mb-6">
          Врач будет скрыт из публичного списка.
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl hover:bg-gray-50 transition-colors font-medium">
            Отмена
          </button>
          <button onClick={onConfirm}
            className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2.5 rounded-xl transition-colors font-medium">
            Деактивировать
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AdminDoctors() {
  const [doctors, setDoctors] = useState<ApiDoctor[]>([])
  const [loading, setLoading] = useState(true)
  const [modal,   setModal]   = useState<'create' | 'edit' | null>(null)
  const [form,    setForm]    = useState<Omit<ApiDoctor, 'id' | 'is_active'>>(EMPTY)
  const [editId,  setEditId]  = useState<string | null>(null)
  const [saving,  setSaving]  = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  useEffect(() => {
    fetchDoctors().then(setDoctors).finally(() => setLoading(false))
  }, [])

  function openCreate() {
    setForm(EMPTY)
    setEditId(null)
    setModal('create')
  }

  function openEdit(doc: ApiDoctor) {
    setForm({
      name: doc.name,
      specialty: doc.specialty,
      experience_years: doc.experience_years,
      education: doc.education,
      description: doc.description,
      photo_url: doc.photo_url,
    })
    setEditId(doc.id)
    setModal('edit')
  }

  async function handleSave() {
    setSaving(true)
    try {
      if (modal === 'create') {
        const created = await createDoctor(form)
        setDoctors(prev => [created, ...prev])
      } else if (editId) {
        const updated = await updateDoctor(editId, form)
        setDoctors(prev => prev.map(d => d.id === editId ? updated : d))
      }
      setModal(null)
    } catch { /* ignore */ } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteDoctor(id)
      setDoctors(prev => prev.filter(d => d.id !== id))
    } catch { /* ignore */ } finally {
      setDeleteTarget(null)
    }
  }

  if (loading) return <div className="text-gray-400 py-10 text-center">Загрузка...</div>

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-800">Врачи ({doctors.length})</h2>
        <button
          onClick={openCreate}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          + Добавить
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-gray-100 shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="px-4 py-3 text-left">Имя</th>
              <th className="px-4 py-3 text-left">Специальность</th>
              <th className="px-4 py-3 text-left">Опыт</th>
              <th className="px-4 py-3 text-left">Статус</th>
              <th className="px-4 py-3 text-left"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 bg-white">
            {doctors.map(doc => (
              <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-medium text-gray-900">{doc.name}</td>
                <td className="px-4 py-3 text-gray-500">{doc.specialty}</td>
                <td className="px-4 py-3 text-gray-500">{doc.experience_years} лет</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    doc.is_active ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'
                  }`}>
                    {doc.is_active ? 'Активен' : 'Отключён'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-3">
                    <button onClick={() => openEdit(doc)} className="text-blue-600 hover:text-blue-800 text-xs font-medium">
                      Изменить
                    </button>
                    <button onClick={() => setDeleteTarget(doc.id)} className="text-red-400 hover:text-red-600 text-xs font-medium">
                      Удалить
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-gray-900 text-lg">
                {modal === 'create' ? 'Новый врач' : 'Редактировать врача'}
              </h3>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <div className="space-y-4">
              <Field label="ФИО">
                <input type="text" required value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className={INPUT_CLS} />
              </Field>
              <Field label="Специальность">
                <input type="text" required value={form.specialty}
                  onChange={e => setForm(f => ({ ...f, specialty: e.target.value }))}
                  className={INPUT_CLS} />
              </Field>
              <Field label="Опыт (лет)">
                <input type="number" min={0} value={form.experience_years}
                  onChange={e => setForm(f => ({ ...f, experience_years: Number(e.target.value) }))}
                  className={INPUT_CLS} />
              </Field>
              <Field label="Образование">
                <input type="text" value={form.education ?? ''}
                  onChange={e => setForm(f => ({ ...f, education: e.target.value || null }))}
                  className={INPUT_CLS} />
              </Field>
              <Field label="Описание">
                <textarea value={form.description ?? ''} rows={3}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value || null }))}
                  className={INPUT_CLS} />
              </Field>
              <Field label="URL фото">
                <input type="url" value={form.photo_url ?? ''}
                  onChange={e => setForm(f => ({ ...f, photo_url: e.target.value || null }))}
                  className={INPUT_CLS} />
              </Field>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setModal(null)}
                className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl hover:bg-gray-50 transition-colors font-medium">
                Отмена
              </button>
              <button onClick={handleSave} disabled={saving || !form.name || !form.specialty}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white py-2.5 rounded-xl transition-colors font-medium">
                {saving ? 'Сохранение...' : 'Сохранить'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <ConfirmDelete
          onConfirm={() => handleDelete(deleteTarget)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
