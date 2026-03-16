import { NavLink, Outlet } from 'react-router-dom'

const TABS = [
  { to: '/admin/appointments', label: 'Записи' },
  { to: '/admin/services',     label: 'Услуги' },
  { to: '/admin/doctors',      label: 'Врачи' },
  { to: '/admin/users',        label: 'Пользователи' },
]

export default function AdminLayout() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Панель администратора</h1>

      {/* Вкладки */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-8 w-fit">
        {TABS.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                isActive
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`
            }
          >
            {label}
          </NavLink>
        ))}
      </div>

      <Outlet />
    </div>
  )
}
