import { useState, useEffect } from 'react'
import { fetchUsers, fetchUserById, deleteUser, type ApiUser } from '../../api'

export default function AdminUsers() {
  const [users,   setUsers]   = useState<ApiUser[]>([])
  const [loading, setLoading] = useState(true)
  const [detail,  setDetail]  = useState<ApiUser | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  useEffect(() => {
    fetchUsers().then(setUsers).finally(() => setLoading(false))
  }, [])

  async function openDetail(id: string) {
    setDetailLoading(true)
    setDetail(null)
    try {
      const u = await fetchUserById(id)
      setDetail(u)
    } finally {
      setDetailLoading(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteUser(id)
      setUsers(prev => prev.filter(u => u.id !== id))
    } catch { /* ignore */ } finally {
      setDeleteTarget(null)
    }
  }

  if (loading) return <div className="text-gray-400 py-10 text-center">Загрузка...</div>

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-800 mb-4">
        Пользователи ({users.length})
      </h2>

      <div className="overflow-x-auto rounded-2xl border border-gray-100 shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="px-4 py-3 text-left">Имя</th>
              <th className="px-4 py-3 text-left">Телефон</th>
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-left">Роль</th>
              <th className="px-4 py-3 text-left">Скидка</th>
              <th className="px-4 py-3 text-left"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 bg-white">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-medium text-gray-900">{u.name}</td>
                <td className="px-4 py-3 text-gray-600">{u.phone}</td>
                <td className="px-4 py-3 text-gray-500">{u.email ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    u.role === 'admin'
                      ? 'bg-purple-50 text-purple-600'
                      : 'bg-gray-100 text-gray-500'
                  }`}>
                    {u.role === 'admin' ? 'Админ' : 'Пользователь'}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {u.discount_percent > 0 ? `${u.discount_percent}%` : '—'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-3">
                    <button
                      onClick={() => openDetail(u.id)}
                      className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                    >
                      Детали
                    </button>
                    <button
                      onClick={() => setDeleteTarget(u.id)}
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

      {/* Модалка деталей */}
      {(detail || detailLoading) && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-gray-900 text-lg">Профиль пользователя</h3>
              <button onClick={() => setDetail(null)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            {detailLoading ? (
              <div className="text-center py-8 text-gray-400">Загрузка...</div>
            ) : detail && (
              <dl className="space-y-3 text-sm">
                {[
                  ['ID', detail.id],
                  ['Имя', detail.name],
                  ['Телефон', detail.phone],
                  ['Email', detail.email ?? '—'],
                  ['Роль', detail.role === 'admin' ? 'Администратор' : 'Пользователь'],
                  ['Скидка', detail.discount_percent > 0 ? `${detail.discount_percent}%` : '—'],
                  ['Статус', detail.is_active ? 'Активен' : 'Отключён'],
                  ['Зарегистрирован', new Date(detail.created_at).toLocaleString('ru-RU')],
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

      {/* Подтверждение удаления */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="font-bold text-gray-900 text-lg mb-2">Удалить пользователя?</h3>
            <p className="text-gray-500 text-sm mb-6">
              Пользователь будет удалён. Это действие нельзя отменить.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl hover:bg-gray-50 transition-colors font-medium"
              >
                Отмена
              </button>
              <button
                onClick={() => handleDelete(deleteTarget)}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2.5 rounded-xl transition-colors font-medium"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
