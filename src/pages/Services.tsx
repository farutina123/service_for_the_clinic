// Каталог услуг: поиск + фильтрация по категориям + карточки с кнопкой «Записаться»
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { services, type Category } from '../data/mockData'

const CATEGORY_TABS: { id: Category; label: string }[] = [
  { id: 'all', label: 'Все' },
  { id: 'doctors', label: 'Врачи' },
  { id: 'diagnostics', label: 'Диагностика' },
  { id: 'analysis', label: 'Анализы' },
]

// Человекочитаемые названия категорий для бейджа на карточке
const CATEGORY_LABEL: Record<Exclude<Category, 'all'>, string> = {
  doctors: 'Врач',
  diagnostics: 'Диагностика',
  analysis: 'Анализ',
}

const CATEGORY_BADGE: Record<Exclude<Category, 'all'>, string> = {
  doctors: 'bg-blue-50 text-blue-600',
  diagnostics: 'bg-teal-50 text-teal-600',
  analysis: 'bg-purple-50 text-purple-600',
}

export default function Services() {
  const [activeCategory, setActiveCategory] = useState<Category>('all')
  const [search, setSearch] = useState('')

  // Фильтрация по категории и строке поиска
  const filtered = services.filter(s => {
    const matchCategory = activeCategory === 'all' || s.category === activeCategory
    const matchSearch =
      search === '' ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.specialty.toLowerCase().includes(search.toLowerCase())
    return matchCategory && matchSearch
  })

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold text-gray-900 mb-1">Услуги и специалисты</h1>
      <p className="text-gray-500 mb-8">Выберите услугу или врача и запишитесь онлайн</p>

      {/* ─── Строка поиска ─── */}
      <div className="relative mb-6">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">🔍</span>
        <input
          type="text"
          placeholder="Поиск по имени врача или услуге..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl
                     focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
        />
      </div>

      {/* ─── Вкладки-категории ─── */}
      <div className="flex gap-2 flex-wrap mb-8">
        {CATEGORY_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveCategory(tab.id)}
            className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${
              activeCategory === tab.id
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-blue-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─── Пустое состояние ─── */}
      {filtered.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          <div className="text-5xl mb-4">🔎</div>
          <p className="text-lg font-medium text-gray-500">Ничего не найдено</p>
          <p className="text-sm mt-1">Попробуйте изменить запрос или выбрать другую категорию</p>
        </div>
      )}

      {/* ─── Сетка карточек ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map(service => (
          <div
            key={service.id}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm
                       hover:shadow-md transition-shadow p-5 flex flex-col"
          >
            {/* Аватар + имя */}
            <div className="flex items-start gap-4 mb-4">
              <div
                className={`w-14 h-14 rounded-xl ${service.color} flex items-center
                            justify-center flex-shrink-0`}
              >
                <span className="text-white font-semibold text-xs text-center leading-tight">
                  {service.initials}
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 text-sm leading-snug">
                  {service.name}
                </h3>
                <p className="text-gray-400 text-xs mt-0.5">{service.specialty}</p>

                {/* Бейдж категории */}
                <span
                  className={`inline-block mt-1.5 text-xs px-2 py-0.5 rounded-full font-medium
                              ${CATEGORY_BADGE[service.category]}`}
                >
                  {CATEGORY_LABEL[service.category]}
                </span>
              </div>
            </div>

            {/* Цена + длительность */}
            <div className="flex items-end justify-between mb-4 mt-auto">
              <div>
                <p className="text-blue-600 font-bold text-xl">
                  {service.price.toLocaleString('ru-RU')} ₽
                </p>
                <p className="text-gray-400 text-xs">{service.duration} мин</p>
              </div>
            </div>

            {/* Кнопки действий */}
            <div className="flex gap-2">
              <Link
                to={`/services/${service.id}`}
                className="flex-1 text-center text-sm text-gray-600 border border-gray-200
                           rounded-lg py-2 hover:border-gray-300 transition-colors"
              >
                Подробнее
              </Link>
              <Link
                to={`/booking?serviceId=${service.id}`}
                className="flex-1 text-center text-sm bg-blue-600 text-white rounded-lg
                           py-2 hover:bg-blue-700 transition-colors font-medium"
              >
                Записаться
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
