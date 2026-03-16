import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { updateUser } from '../api'

export default function Profile() {
  const { user, login, token } = useAuth()

  const [name,    setName]    = useState(user?.name ?? '')
  const [email,   setEmail]   = useState(user?.email ?? '')
  const [saving,  setSaving]  = useState(false)
  const [success, setSuccess] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  if (!user) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setSaving(true)
    try {
      const updated = await updateUser(user!.id, {
        name,
        ...(email ? { email } : {}),
      })
      login(token!, {
        ...user!,
        name: updated.name,
        email: updated.email,
      })
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка сохранения')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-1">Мой профиль</h1>
      <p className="text-gray-500 mb-8">Редактирование личных данных</p>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        {/* Краткая инфо */}
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-blue-600 font-bold text-lg">
              {user.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <p className="font-semibold text-gray-900">{user.name}</p>
            <p className="text-sm text-gray-400">{user.phone}</p>
            {user.discount > 0 && (
              <p className="text-xs text-green-600 mt-0.5">
                Скидка {Math.round(user.discount * 100)}%
              </p>
            )}
          </div>
        </div>

        {success && (
          <div className="mb-4 px-4 py-3 bg-green-50 border border-green-100 rounded-xl text-green-600 text-sm">
            Данные сохранены
          </div>
        )}
        {error && (
          <div className="mb-4 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Полное имя
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Телефон
            </label>
            <input
              type="tel"
              disabled
              value={user.phone}
              className="w-full border border-gray-100 rounded-xl px-3 py-2.5 text-sm
                         bg-gray-50 text-gray-400 cursor-not-allowed"
            />
            <p className="text-xs text-gray-400 mt-1">Телефон изменить нельзя</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email <span className="text-gray-400 font-normal">(необязательно)</span>
            </label>
            <input
              type="email"
              placeholder="example@mail.ru"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60
                       text-white font-medium py-2.5 rounded-xl transition-colors"
          >
            {saving ? 'Сохранение...' : 'Сохранить изменения'}
          </button>
        </form>
      </div>
    </div>
  )
}
