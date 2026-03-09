/**
 * Многошаговая форма записи (4 шага):
 * 1. Выбор услуги/врача
 * 2. Выбор даты и времени
 * 3. Данные пациента
 * 4. Сводка + подтверждение
 *
 * При подтверждении — сохраняем в localStorage и переходим на /booking/confirmation.
 */
import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  services,
  generateSchedule,
  saveAppointment,
  type Service,
  type ScheduleDay,
} from '../data/mockData'

interface FormState {
  selectedService: Service | null
  selectedDate: string
  selectedTime: string
  patientName: string
  patientPhone: string
  patientTelegram: string
  patientComment: string
}

const EMPTY: FormState = {
  selectedService: null,
  selectedDate: '',
  selectedTime: '',
  patientName: '',
  patientPhone: '',
  patientTelegram: '',
  patientComment: '',
}

const STEP_LABELS = ['Услуга', 'Дата и время', 'Данные', 'Итог']

// Валидация мобильного телефона РФ:
//   89XXXXXXXXX  — ровно 11 цифр, начинается с 89 (мобильные коды 9XX)
//   +79XXXXXXXXX — «+» и ровно 11 цифр, начинается с +79
// Городские номера (84X, 83X…) не проходят — только мобильные.
// Посторонние символы (пробелы, скобки, тире) не проходят.
function isPhoneValid(phone: string): boolean {
  return /^89\d{9}$/.test(phone) || /^\+79\d{9}$/.test(phone)
}

// Фильтр ввода: оставляем только цифры и необязательный «+» в начале.
// Это не даёт пользователю ввести скобки, пробелы, тире и т.п.
function filterPhoneInput(raw: string): string {
  if (raw.startsWith('+')) {
    return '+' + raw.slice(1).replace(/\D/g, '')
  }
  return raw.replace(/\D/g, '')
}

export default function Booking() {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState<FormState>(EMPTY)
  // Расписание генерируется один раз при монтировании компонента
  const [schedule] = useState<ScheduleDay[]>(generateSchedule)
  // Показывать ошибку телефона только после первого взаимодействия с полем
  const [phoneTouched, setPhoneTouched] = useState(false)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // Если пришли из каталога с ?serviceId=X — предвыбираем услугу и сразу открываем шаг 2
  useEffect(() => {
    const serviceId = searchParams.get('serviceId')
    if (serviceId) {
      const found = services.find(s => s.id === serviceId)
      if (found) {
        setForm(prev => ({ ...prev, selectedService: found }))
        setStep(2)
      }
    }
  }, [searchParams])

  // Слоты для выбранной даты
  const daySchedule = schedule.find(d => d.date === form.selectedDate)

  // Проверка валидности текущего шага перед переходом
  function canProceed(): boolean {
    if (step === 1) return form.selectedService !== null
    if (step === 2) return form.selectedDate !== '' && form.selectedTime !== ''
    if (step === 3) return form.patientName.trim() !== '' && isPhoneValid(form.patientPhone)
    return true
  }

  // Финальное подтверждение: сохраняем запись и переходим на страницу успеха
  function handleConfirm() {
    if (!form.selectedService) return
    const appointment = {
      id: String(Date.now()),
      serviceId: form.selectedService.id,
      serviceName: form.selectedService.name,
      specialty: form.selectedService.specialty,
      date: form.selectedDate,
      time: form.selectedTime,
      price: form.selectedService.price,
      patientName: form.patientName,
      patientPhone: form.patientPhone,
      patientTelegram: form.patientTelegram,
      patientComment: form.patientComment,
      status: 'upcoming' as const,
      createdAt: new Date().toISOString(),
    }
    saveAppointment(appointment)
    navigate('/booking/confirmation', { state: { appointment } })
  }

  // Вспомогательная функция обновления полей формы
  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">

      {/* ─── Прогресс-бар ─────────────────────────────────────────── */}
      <div className="mb-10">
        <div className="flex items-start justify-between relative">
          {/* Линия-соединитель под кружками */}
          <div className="absolute top-4 left-4 right-4 h-0.5 bg-gray-200 -z-0" />
          <div
            className="absolute top-4 left-4 h-0.5 bg-blue-600 transition-all duration-300 -z-0"
            style={{ width: `calc(${((step - 1) / 3) * 100}% - 2rem)` }}
          />

          {STEP_LABELS.map((label, i) => {
            const n = i + 1
            const done = n < step
            const active = n === step
            return (
              <div key={n} className="flex flex-col items-center flex-1 relative z-10">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm
                              font-semibold transition-all ${
                    done
                      ? 'bg-blue-600 text-white'
                      : active
                      ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                      : 'bg-white border-2 border-gray-200 text-gray-400'
                  }`}
                >
                  {done ? '✓' : n}
                </div>
                <span
                  className={`text-xs mt-1.5 font-medium ${
                    active ? 'text-blue-600' : done ? 'text-gray-500' : 'text-gray-400'
                  }`}
                >
                  {label}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* ─── Шаг 1: Выбор услуги ──────────────────────────────────── */}
      {step === 1 && (
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-1">Выберите услугу или врача</h2>
          <p className="text-gray-500 text-sm mb-6">Нажмите на карточку, чтобы выбрать</p>

          {/* Пустое состояние: каталог услуг недоступен */}
          {services.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <div className="text-5xl mb-4">🏥</div>
              <p className="text-lg font-medium text-gray-500">Услуги временно недоступны</p>
              <p className="text-sm mt-1">Попробуйте зайти позже или позвоните нам</p>
              <p className="text-sm mt-3 font-medium text-gray-600">+7 (495) 123-45-67</p>
            </div>
          )}

          <div className="space-y-3">
            {services.map(service => (
              <button
                key={service.id}
                onClick={() => update('selectedService', service)}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left
                            transition-all ${
                  form.selectedService?.id === service.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm'
                }`}
              >
                <div
                  className={`w-12 h-12 rounded-xl ${service.color} flex items-center
                              justify-center flex-shrink-0`}
                >
                  <span className="text-white font-semibold text-xs leading-tight text-center">
                    {service.initials}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm">{service.name}</p>
                  <p className="text-gray-400 text-xs mt-0.5">{service.specialty}</p>
                </div>

                <div className="text-right flex-shrink-0">
                  <p className="text-blue-600 font-bold text-sm">
                    {service.price.toLocaleString('ru-RU')} ₽
                  </p>
                  <p className="text-gray-400 text-xs">{service.duration} мин</p>
                </div>

                {form.selectedService?.id === service.id && (
                  <span className="text-blue-600 text-lg ml-1">✓</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ─── Шаг 2: Дата и время ──────────────────────────────────── */}
      {step === 2 && (
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-1">Выберите дату и время</h2>
          <p className="text-gray-500 text-sm mb-6">Доступные слоты на ближайшие 2 недели</p>

          {/* Пустое состояние: нет доступных дат */}
          {schedule.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <div className="text-5xl mb-4">📅</div>
              <p className="text-lg font-medium text-gray-500">Нет доступных дат для записи</p>
              <p className="text-sm mt-1">Расписание временно недоступно. Позвоните нам.</p>
              <p className="text-sm mt-3 font-medium text-gray-600">+7 (495) 123-45-67</p>
            </div>
          )}

          {/* Горизонтальный слайдер дат */}
          <div className="flex gap-2 overflow-x-auto pb-3 mb-6 scrollbar-hide">
            {schedule.map(day => (
              <button
                key={day.date}
                onClick={() => {
                  update('selectedDate', day.date)
                  update('selectedTime', '') // сбрасываем время при смене даты
                }}
                className={`flex-shrink-0 px-3 py-2.5 rounded-xl text-center min-w-[72px]
                            border transition-all ${
                  form.selectedDate === day.date
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300'
                }`}
              >
                <p className="text-xs font-medium">{day.label.split(',')[0]}</p>
                <p className="text-sm font-bold mt-0.5">{day.label.split(', ')[1]}</p>
              </button>
            ))}
          </div>

          {/* Сетка временных слотов */}
          {form.selectedDate && daySchedule ? (
            daySchedule.slots.every(s => !s.available) ? (
              /* Пустое состояние: день выбран, но все слоты заняты */
              <div className="text-center py-10 text-gray-400">
                <div className="text-4xl mb-3">😔</div>
                <p className="font-medium text-gray-500">На этот день нет свободного времени</p>
                <p className="text-sm mt-1">Выберите другую дату</p>
              </div>
            ) : (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-3">Доступное время</p>
                <div className="grid grid-cols-4 gap-2">
                  {daySchedule.slots.map(slot => (
                    <button
                      key={slot.time}
                      disabled={!slot.available}
                      onClick={() => update('selectedTime', slot.time)}
                      className={`py-2.5 rounded-lg text-sm font-medium transition-all ${
                        !slot.available
                          ? 'bg-gray-50 text-gray-300 cursor-not-allowed'
                          : form.selectedTime === slot.time
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-white border border-gray-200 text-gray-700 hover:border-blue-400'
                      }`}
                    >
                      {slot.time}
                    </button>
                  ))}
                </div>
              </div>
            )
          ) : (
            <p className="text-gray-400 text-sm text-center py-8">
              ← Выберите дату, чтобы увидеть доступное время
            </p>
          )}

          {/* Выбранный слот */}
          {form.selectedDate && form.selectedTime && (
            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5 text-sm">
              <span className="text-blue-700 font-medium">
                Выбрано: {form.selectedDate} в {form.selectedTime}
              </span>
            </div>
          )}
        </div>
      )}

      {/* ─── Шаг 3: Данные пациента ───────────────────────────────── */}
      {step === 3 && (
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-1">Данные пациента</h2>
          <p className="text-gray-500 text-sm mb-6">Укажите контактные данные для записи</p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Имя и фамилия <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Иванова Мария Ивановна"
                value={form.patientName}
                onChange={e => update('patientName', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3
                           focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Телефон <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                placeholder="89991234567 или +79991234567"
                value={form.patientPhone}
                onChange={e => update('patientPhone', filterPhoneInput(e.target.value))}
                onBlur={() => setPhoneTouched(true)}
                className={`w-full border rounded-xl px-4 py-3 focus:outline-none
                            focus:ring-2 text-sm transition-colors ${
                  phoneTouched && !isPhoneValid(form.patientPhone)
                    ? 'border-red-400 focus:ring-red-400 bg-red-50'
                    : 'border-gray-200 focus:ring-blue-500'
                }`}
              />
              {/* Ошибка валидации: показываем только после того, как поле потрогали */}
              {phoneTouched && !isPhoneValid(form.patientPhone) && (
                <p className="text-red-500 text-xs mt-1.5">
                  Только мобильный номер РФ: 89XXXXXXXXX (11 цифр) или +79XXXXXXXXX (знак + и 11 цифр)
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Telegram username
              </label>
              <input
                type="text"
                placeholder="@username"
                value={form.patientTelegram}
                onChange={e => update('patientTelegram', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3
                           focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
              {/* Подсказка про Telegram-уведомления */}
              <p className="text-blue-600 text-xs mt-1.5 bg-blue-50 rounded-lg px-3 py-2">
                ✈️ Укажите @username, чтобы получить напоминание в Telegram за 24 часа до приёма
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Комментарий (необязательно)
              </label>
              <textarea
                placeholder="Например: аллергия на пенициллин, повторный приём..."
                value={form.patientComment}
                onChange={e => update('patientComment', e.target.value)}
                rows={3}
                className="w-full border border-gray-200 rounded-xl px-4 py-3
                           focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* ─── Шаг 4: Сводка и подтверждение ───────────────────────── */}
      {/* Пустое состояние: данные формы потеряны (например после обновления страницы) */}
      {step === 4 && !form.selectedService && (
        <div className="text-center py-16 text-gray-400">
          <div className="text-5xl mb-4">⚠️</div>
          <p className="text-lg font-medium text-gray-500">Данные формы не заполнены</p>
          <p className="text-sm mt-1 mb-6">Вернитесь в начало и заполните все шаги</p>
          <button
            onClick={() => setStep(1)}
            className="bg-blue-600 text-white font-medium px-8 py-3 rounded-xl
                       hover:bg-blue-700 transition-colors"
          >
            Начать заново
          </button>
        </div>
      )}
      {step === 4 && form.selectedService && (
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-1">Подтвердите запись</h2>
          <p className="text-gray-500 text-sm mb-6">Проверьте данные перед отправкой</p>

          {/* Карточка сводки */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-6">
            {/* Шапка с выбранной услугой */}
            <div className="flex items-center gap-4 p-5 border-b border-gray-100">
              <div
                className={`w-12 h-12 rounded-xl ${form.selectedService.color} flex items-center
                            justify-center flex-shrink-0`}
              >
                <span className="text-white font-semibold text-xs">{form.selectedService.initials}</span>
              </div>
              <div>
                <p className="font-semibold text-gray-900">{form.selectedService.name}</p>
                <p className="text-gray-400 text-sm">{form.selectedService.specialty}</p>
              </div>
            </div>

            {/* Строки с деталями */}
            {[
              { label: 'Дата', value: form.selectedDate },
              { label: 'Время', value: form.selectedTime },
              { label: 'Стоимость', value: `${form.selectedService.price.toLocaleString('ru-RU')} ₽` },
              { label: 'Пациент', value: form.patientName },
              { label: 'Телефон', value: form.patientPhone },
              ...(form.patientTelegram ? [{ label: 'Telegram', value: form.patientTelegram }] : []),
              ...(form.patientComment ? [{ label: 'Комментарий', value: form.patientComment }] : []),
            ].map(({ label, value }) => (
              <div
                key={label}
                className="flex justify-between items-start px-5 py-3
                           border-b border-gray-50 last:border-0"
              >
                <span className="text-gray-500 text-sm">{label}</span>
                <span className="text-gray-900 text-sm font-medium text-right max-w-[60%]">
                  {value}
                </span>
              </div>
            ))}
          </div>

          {/* Кнопка финального подтверждения */}
          <button
            onClick={handleConfirm}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold
                       py-4 rounded-xl transition-colors text-lg"
          >
            Подтвердить запись
          </button>
        </div>
      )}

      {/* ─── Навигация Назад / Далее ───────────────────────────────── */}
      {step < 4 && (
        <div className="flex gap-3 mt-8">
          {step > 1 && (
            <button
              onClick={() => setStep(s => s - 1)}
              className="flex-1 py-3 border border-gray-200 rounded-xl text-gray-700
                         font-medium hover:bg-gray-50 transition-colors"
            >
              ← Назад
            </button>
          )}
          <button
            onClick={() => setStep(s => s + 1)}
            disabled={!canProceed()}
            className="flex-1 py-3 bg-blue-600 text-white font-medium rounded-xl
                       hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed
                       transition-colors"
          >
            Далее →
          </button>
        </div>
      )}
    </div>
  )
}
