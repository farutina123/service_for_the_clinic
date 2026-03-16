// Shared обёртка: Header (sticky) + <Outlet> (контент страницы) + Footer
import { Link, NavLink, Outlet } from 'react-router-dom'

const NAV_LINKS = [
  { to: '/', label: 'Главная' },
  { to: '/services', label: 'Услуги' },
  { to: '/appointments', label: 'Мои записи' },
]

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">

      {/* ─── Header ─────────────────────────────────────────────── */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">

          {/* Логотип */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-base leading-none">+</span>
            </div>
            <span className="font-semibold text-gray-900 text-lg">МедКлиника</span>
          </Link>

          {/* Навигация (скрывается на мобильных) */}
          <nav className="hidden md:flex items-center gap-6">
            {NAV_LINKS.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                end
                className={({ isActive }) =>
                  `text-sm font-medium transition-colors ${
                    isActive ? 'text-blue-600' : 'text-gray-600 hover:text-gray-900'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>

          {/* CTA-кнопка */}
          <Link
            to="/booking"
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            Записаться
          </Link>
        </div>
      </header>

      {/* ─── Контент страницы ────────────────────────────────────── */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* ─── Footer ─────────────────────────────────────────────── */}
      <footer className="bg-gray-900 text-gray-400 py-10 mt-auto">
        <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8">

          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xs">+</span>
              </div>
              <span className="text-white font-semibold">МедКлиника</span>
            </div>
            <p className="text-sm leading-relaxed">
              Современный сервис онлайн-записи к врачу. Без очередей и телефонных звонков.
            </p>
          </div>

          <div>
            <h4 className="text-white font-medium mb-3">Навигация</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/" className="hover:text-white transition-colors">Главная</Link></li>
              <li><Link to="/services" className="hover:text-white transition-colors">Услуги</Link></li>
              <li><Link to="/booking" className="hover:text-white transition-colors">Записаться</Link></li>
              <li><Link to="/appointments" className="hover:text-white transition-colors">Мои записи</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-medium mb-3">Контакты</h4>
            <ul className="space-y-2 text-sm">
              <li>📍 Москва, ул. Примерная, д. 12</li>
              <li>📞 +7 (495) 123-45-67</li>
              <li>✉️ info@medklinika.ru</li>
              <li>
                <a
                  href="https://t.me/medklinika_bot"
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Telegram @medklinika_bot
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 mt-8 pt-6 border-t border-gray-800 text-sm text-center">
          © 2026 МедКлиника. Все права защищены.
        </div>
      </footer>
    </div>
  )
}
