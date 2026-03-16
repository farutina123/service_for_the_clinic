import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { apiLogin, apiRegister } from '../api'
import { useAuth } from '../context/AuthContext'

type Tab = 'login' | 'register'

export default function Login() {
  const { login } = useAuth()
  const navigate   = useNavigate()
  const [tab, setTab] = useState<Tab>('login')

  // Login fields
  const [loginPhone,    setLoginPhone]    = useState('')
  const [loginPassword, setLoginPassword] = useState('')

  // Register fields
  const [regName,     setRegName]     = useState('')
  const [regPhone,    setRegPhone]    = useState('')
  const [regEmail,    setRegEmail]    = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regPassword2,setRegPassword2]= useState('')

  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await apiLogin({ phone: loginPhone, password: loginPassword })
      login(res.token, res.user)
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка входа')
    } finally {
      setLoading(false)
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (regPassword !== regPassword2) {
      setError('Пароли не совпадают')
      return
    }
    setLoading(true)
    try {
      const res = await apiRegister({
        name: regName,
        phone: regPhone,
        password: regPassword,
        ...(regEmail ? { email: regEmail } : {}),
      })
      login(res.token, res.user)
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка регистрации')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-base leading-none">+</span>
            </div>
            <span className="font-semibold text-gray-900 text-lg">МедКлиника</span>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">
            {tab === 'login' ? 'Войти в аккаунт' : 'Создать аккаунт'}
          </h1>
        </div>

        {/* Tabs */}
        <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
          <button
            onClick={() => { setTab('login'); setError(null) }}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
              tab === 'login'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Войти
          </button>
          <button
            onClick={() => { setTab('register'); setError(null) }}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
              tab === 'register'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Зарегистрироваться
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          {error && (
            <div className="mb-4 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm">
              {error}
            </div>
          )}

          {tab === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Номер телефона
                </label>
                <input
                  type="tel"
                  required
                  placeholder="+7 (999) 123-45-67"
                  value={loginPhone}
                  onChange={e => setLoginPhone(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm
                             focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Пароль
                </label>
                <input
                  type="password"
                  required
                  placeholder="Ваш пароль"
                  value={loginPassword}
                  onChange={e => setLoginPassword(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm
                             focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60
                           text-white font-medium py-2.5 rounded-xl transition-colors"
              >
                {loading ? 'Вход...' : 'Войти'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Полное имя
                </label>
                <input
                  type="text"
                  required
                  placeholder="Иван Иванов"
                  value={regName}
                  onChange={e => setRegName(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm
                             focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Номер телефона
                </label>
                <input
                  type="tel"
                  required
                  placeholder="+7 (999) 123-45-67"
                  value={regPhone}
                  onChange={e => setRegPhone(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm
                             focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email <span className="text-gray-400 font-normal">(необязательно)</span>
                </label>
                <input
                  type="email"
                  placeholder="example@mail.ru"
                  value={regEmail}
                  onChange={e => setRegEmail(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm
                             focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Пароль
                </label>
                <input
                  type="password"
                  required
                  placeholder="Минимум 6 символов"
                  value={regPassword}
                  onChange={e => setRegPassword(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm
                             focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Повторите пароль
                </label>
                <input
                  type="password"
                  required
                  placeholder="Повторите пароль"
                  value={regPassword2}
                  onChange={e => setRegPassword2(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm
                             focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60
                           text-white font-medium py-2.5 rounded-xl transition-colors"
              >
                {loading ? 'Регистрация...' : 'Создать аккаунт'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
