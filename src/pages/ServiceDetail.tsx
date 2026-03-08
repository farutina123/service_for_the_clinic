// Детальная страница врача/услуги: профиль, описание, таблица цен, кнопка «Записаться»
import { useParams, Link } from 'react-router-dom'
import { services } from '../data/mockData'

export default function ServiceDetail() {
  const { id } = useParams<{ id: string }>()
  const service = services.find(s => s.id === id)

  // Услуга не найдена
  if (!service) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <p className="text-5xl mb-4">😕</p>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Услуга не найдена</h1>
        <p className="text-gray-500 mb-6">Возможно, она была удалена или ссылка некорректна.</p>
        <Link to="/services" className="text-blue-600 hover:underline">
          ← Вернуться к каталогу
        </Link>
      </div>
    )
  }

  // Стиль бейджа категории
  const badgeClass =
    service.category === 'doctors'
      ? 'bg-blue-50 text-blue-600'
      : service.category === 'diagnostics'
      ? 'bg-teal-50 text-teal-600'
      : 'bg-purple-50 text-purple-600'

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">

      {/* Ссылка назад */}
      <Link
        to="/services"
        className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1 mb-6"
      >
        ← Все услуги
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

        {/* ─── Левая колонка: аватар + бейдж доступности + кнопка ─── */}
        <div className="md:col-span-1">

          {/* Большой цветной аватар */}
          <div
            className={`w-full aspect-square rounded-2xl ${service.color} flex items-center
                        justify-center mb-4 shadow-md`}
          >
            <span className="text-white font-bold text-5xl">{service.initials}</span>
          </div>

          {/* Бейдж ближайшего слота */}
          <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center mb-4">
            <p className="text-green-700 text-sm font-medium">✓ Ближайший приём</p>
            <p className="text-green-600 text-xs mt-0.5">Завтра, 10:00</p>
          </div>

          {/* CTA-кнопка записи */}
          <Link
            to={`/booking?serviceId=${service.id}`}
            className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white
                       font-semibold py-3 rounded-xl transition-colors"
          >
            Записаться
          </Link>
        </div>

        {/* ─── Правая колонка: детали ─── */}
        <div className="md:col-span-2 space-y-6">

          {/* Заголовок */}
          <div>
            <span className={`inline-block text-xs px-3 py-1 rounded-full font-medium mb-2 ${badgeClass}`}>
              {service.specialty}
            </span>
            <h1 className="text-2xl font-bold text-gray-900">{service.name}</h1>

            {/* Опциональные поля для врачей */}
            {service.experience && (
              <div className="flex flex-wrap gap-x-6 gap-y-1 mt-3 text-sm text-gray-500">
                <span>👨‍⚕️ Стаж: <strong className="text-gray-700">{service.experience}</strong></span>
                {service.education && (
                  <span>🎓 <strong className="text-gray-700">{service.education}</strong></span>
                )}
              </div>
            )}
          </div>

          {/* Описание */}
          <div>
            <h2 className="font-semibold text-gray-900 mb-2">Описание</h2>
            <p className="text-gray-600 leading-relaxed">{service.description}</p>
          </div>

          {/* Таблица цен */}
          {service.priceTable && (
            <div>
              <h2 className="font-semibold text-gray-900 mb-3">Стоимость услуг</h2>
              <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
                {service.priceTable.map((row, i) => (
                  <div
                    key={i}
                    className={`flex items-center justify-between px-4 py-3 ${
                      i < service.priceTable!.length - 1 ? 'border-b border-gray-100' : ''
                    }`}
                  >
                    <span className="text-gray-700 text-sm">{row.label}</span>
                    <span className="font-semibold text-gray-900">
                      {row.price.toLocaleString('ru-RU')} ₽
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Длительность */}
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>⏱</span>
            <span>
              Длительность:{' '}
              <strong className="text-gray-700">{service.duration} минут</strong>
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
