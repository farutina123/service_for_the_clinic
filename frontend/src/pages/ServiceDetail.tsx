// Детальная страница врача/услуги: профиль, описание, таблица цен, кнопка «Записаться»
import { useParams, Link } from 'react-router-dom'
import { fetchServiceById } from '../api'
import { useApi } from '../hooks/useApi'

export default function ServiceDetail() {
  const { id } = useParams<{ id: string }>()

  const { data: service, loading, error, retry } = useApi(
    () => fetchServiceById(id!),
    [id],
  )

  // ─── Загрузка ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="h-4 bg-gray-200 rounded w-24 mb-8 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-3 animate-pulse">
            <div className="h-16 bg-gray-200 rounded-xl" />
            <div className="h-12 bg-gray-200 rounded-xl" />
          </div>
          <div className="md:col-span-2 space-y-4 animate-pulse">
            <div className="h-5 bg-gray-200 rounded w-24" />
            <div className="h-8 bg-gray-200 rounded w-2/3" />
            <div className="h-4 bg-gray-200 rounded w-full" />
            <div className="h-4 bg-gray-200 rounded w-4/5" />
            <div className="h-4 bg-gray-200 rounded w-3/5" />
          </div>
        </div>
      </div>
    )
  }

  // ─── Ошибка / не найдено ──────────────────────────────────────────
  if (error || !service) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <p className="text-5xl mb-4">{error ? '⚠️' : '😕'}</p>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {error ? 'Ошибка загрузки' : 'Услуга не найдена'}
        </h1>
        <p className="text-gray-500 mb-6">
          {error ?? 'Возможно, она была удалена или ссылка некорректна.'}
        </p>
        <div className="flex gap-3 justify-center">
          {error && (
            <button onClick={retry}
              className="bg-blue-600 text-white font-medium px-6 py-2.5 rounded-xl
                         hover:bg-blue-700 transition-colors text-sm">
              Попробовать ещё раз
            </button>
          )}
          <Link to="/services" className="text-blue-600 hover:underline text-sm self-center">
            ← Вернуться к каталогу
          </Link>
        </div>
      </div>
    )
  }

  const badgeClass =
    service.category === 'doctors'
      ? 'bg-blue-50 text-blue-600'
      : service.category === 'diagnostics'
      ? 'bg-teal-50 text-teal-600'
      : 'bg-purple-50 text-purple-600'

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">

      <Link to="/services"
        className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1 mb-6">
        ← Все услуги
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

        {/* ─── Левая колонка ─── */}
        <div className="md:col-span-1">
          <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center mb-4">
            <p className="text-green-700 text-sm font-medium">✓ Ближайший приём</p>
            <p className="text-green-600 text-xs mt-0.5">Завтра, 10:00</p>
          </div>
          <Link
            to={`/booking?serviceId=${service.id}`}
            className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white
                       font-semibold py-3 rounded-xl transition-colors"
          >
            Записаться
          </Link>
        </div>

        {/* ─── Правая колонка ─── */}
        <div className="md:col-span-2 space-y-6">
          <div>
            <span className={`inline-block text-xs px-3 py-1 rounded-full font-medium mb-2 ${badgeClass}`}>
              {service.specialty}
            </span>
            <h1 className="text-2xl font-bold text-gray-900">{service.name}</h1>

            {service.experience && (
              <div className="flex flex-wrap gap-x-6 gap-y-1 mt-3 text-sm text-gray-500">
                <span>👨‍⚕️ Стаж: <strong className="text-gray-700">{service.experience}</strong></span>
                {service.education && (
                  <span>🎓 <strong className="text-gray-700">{service.education}</strong></span>
                )}
              </div>
            )}
          </div>

          {service.description && (
            <div>
              <h2 className="font-semibold text-gray-900 mb-2">Описание</h2>
              <p className="text-gray-600 leading-relaxed">{service.description}</p>
            </div>
          )}

          {/* Таблица цен (из моков) или просто цена */}
          {service.priceTable ? (
            <div>
              <h2 className="font-semibold text-gray-900 mb-3">Стоимость услуг</h2>
              <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
                {service.priceTable.map((row, i) => (
                  <div key={i}
                    className={`flex items-center justify-between px-4 py-3 ${
                      i < service.priceTable!.length - 1 ? 'border-b border-gray-100' : ''
                    }`}>
                    <span className="text-gray-700 text-sm">{row.label}</span>
                    <span className="font-semibold text-gray-900">
                      {row.price.toLocaleString('ru-RU')} ₽
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <h2 className="font-semibold text-gray-900 mb-2">Стоимость</h2>
              <p className="text-blue-600 font-bold text-2xl">
                {service.price.toLocaleString('ru-RU')} ₽
              </p>
            </div>
          )}

          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>⏱</span>
            <span>Длительность:{' '}
              <strong className="text-gray-700">{service.duration} минут</strong>
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
