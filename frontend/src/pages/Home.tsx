// Главная страница: Hero → Популярные услуги → Как это работает → Контакты
import { Link } from 'react-router-dom'
import { fetchServices } from '../api'
import { useApi } from '../hooks/useApi'

const HOW_IT_WORKS = [
  { step: '1', title: 'Выберите услугу',      desc: 'Найдите нужного врача или исследование в каталоге' },
  { step: '2', title: 'Выберите время',        desc: 'Выберите удобный день и свободный временной слот' },
  { step: '3', title: 'Получите подтверждение', desc: 'Мы пришлём напоминание в Telegram за 24 часа до приёма' },
]

export default function Home() {
  const { data, loading, error, retry } = useApi(fetchServices)
  const featured = data?.slice(0, 6) ?? []

  return (
    <div>

      {/* ─── Hero ─────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-blue-600 to-blue-800 text-white py-24 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
            Запись к врачу онлайн
          </h1>
          <p className="text-blue-100 text-lg md:text-xl mb-8 max-w-2xl mx-auto">
            Без очередей и звонков. Выберите врача, выберите время — и получите
            подтверждение прямо в Telegram.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/booking"
              className="bg-white text-blue-700 font-semibold px-8 py-3 rounded-xl hover:bg-blue-50 transition-colors">
              Записаться сейчас
            </Link>
            <Link to="/services"
              className="border-2 border-white/40 text-white font-medium px-8 py-3 rounded-xl hover:bg-white/10 transition-colors">
              Смотреть услуги
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Популярные направления ───────────────────────────────── */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Популярные направления</h2>
          <p className="text-gray-500 mb-8">Самые востребованные услуги нашей клиники</p>

          {/* Загрузка */}
          {loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 animate-pulse">
                  <div className="w-12 h-12 rounded-xl bg-gray-200 flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-gray-200 rounded w-3/4" />
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Ошибка */}
          {!loading && error && (
            <div className="text-center py-10">
              <p className="text-gray-500 mb-3">Не удалось загрузить услуги</p>
              <button onClick={retry}
                className="text-blue-600 text-sm hover:underline">
                Попробовать ещё раз
              </button>
            </div>
          )}

          {/* Данные */}
          {!loading && !error && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {featured.map(service => (
                <Link
                  key={service.id}
                  to={`/services/${service.id}`}
                  className="flex items-center gap-4 p-4 rounded-xl border border-gray-100
                             hover:border-blue-200 hover:shadow-md transition-all group"
                >
                  <div className={`w-12 h-12 rounded-xl ${service.color} flex items-center
                                  justify-center flex-shrink-0`}>
                    <span className="text-white font-semibold text-xs text-center leading-tight">
                      {service.initials}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 group-hover:text-blue-600
                                  transition-colors text-sm leading-snug">
                      {service.name}
                    </p>
                    <p className="text-gray-400 text-xs mt-0.5">{service.specialty}</p>
                    <p className="text-blue-600 font-medium text-xs mt-1">
                      от {service.price.toLocaleString('ru-RU')} ₽
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}

          <div className="text-center mt-8">
            <Link to="/services"
              className="inline-flex items-center gap-1 text-blue-600 font-medium hover:text-blue-700 transition-colors">
              Все услуги →
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Как это работает ─────────────────────────────────────── */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Как это работает</h2>
          <p className="text-gray-500 mb-12">Три простых шага до приёма у врача</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {HOW_IT_WORKS.map(({ step, title, desc }) => (
              <div key={step} className="flex flex-col items-center">
                <div className="w-14 h-14 bg-blue-600 text-white rounded-full flex items-center
                                justify-center text-xl font-bold mb-4 shadow-md">
                  {step}
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
          <Link to="/booking"
            className="inline-block mt-12 bg-blue-600 text-white font-semibold
                       px-10 py-3 rounded-xl hover:bg-blue-700 transition-colors">
            Записаться сейчас
          </Link>
        </div>
      </section>

      {/* ─── Контакты ─────────────────────────────────────────────── */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">Контакты</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            <div className="space-y-5">
              <div className="flex items-start gap-3">
                <span className="text-2xl">📍</span>
                <div>
                  <p className="font-medium text-gray-900">Адрес</p>
                  <p className="text-gray-500 text-sm">Москва, ул. Примерная, д. 12, этаж 2</p>
                  <p className="text-gray-400 text-xs mt-0.5">ст. м. Пример, 5 мин пешком</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-2xl">📞</span>
                <div>
                  <p className="font-medium text-gray-900">Телефон</p>
                  <p className="text-gray-500 text-sm">+7 (495) 123-45-67</p>
                  <p className="text-gray-400 text-xs mt-0.5">Пн–Пт: 8:00–20:00 · Сб: 9:00–17:00</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-2xl">✈️</span>
                <div>
                  <p className="font-medium text-gray-900">Telegram-бот</p>
                  <a href="https://t.me/medklinika_bot" target="_blank" rel="noreferrer"
                     className="text-blue-600 hover:underline text-sm">
                    @medklinika_bot
                  </a>
                  <p className="text-gray-400 text-xs mt-0.5">Уведомления о записи и напоминания</p>
                </div>
              </div>
            </div>
            <div className="bg-gray-100 rounded-2xl h-64 flex items-center justify-center
                            text-gray-400 border border-gray-200">
              <div className="text-center">
                <div className="text-5xl mb-2">🗺️</div>
                <p className="text-sm font-medium">Карта (заглушка)</p>
                <p className="text-xs mt-1">Москва, ул. Примерная, д. 12</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
