/**
 * Многошаговая форма записи (4 шага):
 * 1. Выбор услуги/врача   — данные из API
 * 2. Выбор даты и времени — генерируется локально
 * 3. Данные пациента
 * 4. Сводка + подтверждение — POST к API, сохранение в localStorage
 */
import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { fetchServices, createAppointment, toLocalAppointment, fetchServiceSchedule } from '../api'
import { useApi } from '../hooks/useApi'
import { useAuth } from '../context/AuthContext'
import {
  saveAppointment,
  type Service,
  type ScheduleDay,
} from '../data/mockData'

interface FormState {
  selectedService: Service | null
  selectedDate:    string
  selectedTime:    string
  patientName:     string
  patientPhone:    string
  patientTelegram: string
  patientComment:  string
}

const EMPTY: FormState = {
  selectedService: null,
  selectedDate:    '',
  selectedTime:    '',
  patientName:     '',
  patientPhone:    '',
  patientTelegram: '',
  patientComment:  '',
}

const STEP_LABELS = ['Услуга', 'Дата и время', 'Данные', 'Итог']

function isPhoneValid(phone: string): boolean {
  return /^89\d{9}$/.test(phone) || /^\+79\d{9}$/.test(phone)
}

function filterPhoneInput(raw: string): string {
  if (raw.startsWith('+')) return '+' + raw.slice(1).replace(/\D/g, '')
  return raw.replace(/\D/g, '')
}

export default function Booking() {
  const { user } = useAuth()

  const [step, setStep]                   = useState(1)
  const [form, setForm]                   = useState<FormState>(EMPTY)
  const [schedule, setSchedule]           = useState<ScheduleDay[]>([])
  const [scheduleLoading, setScheduleLoading] = useState(false)
  const [scheduleError, setScheduleError] = useState<string | null>(null)
  const [phoneTouched, setPhoneTouched]   = useState(false)
  const [submitting, setSubmitting]       = useState(false)
  const [submitError, setSubmitError]     = useState<string | null>(null)
  const preSelectedRef                    = useRef(false)

  const navigate       = useNavigate()
  const [searchParams] = useSearchParams()

  // Если пользователь авторизован — подтягиваем его данные в форму
  useEffect(() => {
    if (user) {
      setForm(prev => ({
        ...prev,
        patientName:  user.name,
        patientPhone: user.phone,
      }))
    }
  }, [user])

  // ── Загрузка списка услуг (шаг 1) ──────────────────────────────────────
  const { data, loading: servicesLoading, error: servicesError, retry } = useApi(fetchServices)
  const services = data ?? []

  // Предвыбор услуги из URL ?serviceId=X (после загрузки списка)
  useEffect(() => {
    if (!services.length || preSelectedRef.current) return
    preSelectedRef.current = true

    const serviceId = searchParams.get('serviceId')
    if (!serviceId) return

    const found = services.find(s => s.id === serviceId)
    if (found) {
      setForm(prev => ({ ...prev, selectedService: found }))
      setStep(2)
    }
  }, [services, searchParams])

  useEffect(() => {
    async function loadSchedule(serviceId: string) {
      setScheduleLoading(true)
      setScheduleError(null)
      setSchedule([])
      try {
        const days = await fetchServiceSchedule(serviceId)
        setSchedule(days)
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Не удалось загрузить расписание'
        setScheduleError(msg)
      } finally {
        setScheduleLoading(false)
      }
    }

    if (form.selectedService?.id) {
      // При смене услуги сбрасываем выбранные дату/время и перезагружаем расписание.
      setForm(prev => ({ ...prev, selectedDate: '', selectedTime: '' }))
      void loadSchedule(form.selectedService.id)
    } else {
      setSchedule([])
    }
  }, [form.selectedService?.id])

  const daySchedule = schedule.find(d => d.date === form.selectedDate)

  function canProceed(): boolean {
    if (step === 1) return form.selectedService !== null
    if (step === 2) return form.selectedDate !== '' && form.selectedTime !== ''
    if (step === 3) return form.patientName.trim() !== '' && isPhoneValid(form.patientPhone)
    return true
  }

  // ── Финальное подтверждение: POST к API ────────────────────────────────
  async function handleConfirm() {
    if (!form.selectedService) return
    setSubmitting(true)
    setSubmitError(null)

    try {
      const result = await createAppointment({
        patient_name:     form.patientName,
        patient_phone:    form.patientPhone,
        service_id:       form.selectedService.id,
        doctor_id:        form.selectedService.doctorId ?? null,
        appointment_date: form.selectedDate,
        appointment_time: form.selectedTime,
        notes:            form.patientComment || null,
      })

      // Сохраняем в localStorage для страницы «Мои записи»
      const localAppt = toLocalAppointment(
        result,
        form.selectedService,
        form.patientTelegram,
        form.patientComment,
      )
      saveAppointment(localAppt)
      navigate('/booking/confirmation', { state: { appointment: localAppt } })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Не удалось создать запись'
      setSubmitError(message)
    } finally {
      setSubmitting(false)
    }
  }

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">

      {/* ─── Прогресс-бар ─────────────────────────────────────────── */}
      <div className="mb-10">
        <div className="flex items-start justify-between relative">
          <div className="absolute top-4 left-4 right-4 h-0.5 bg-gray-200 -z-0" />
          <div
            className="absolute top-4 left-4 h-0.5 bg-blue-600 transition-all duration-300 -z-0"
            style={{ width: `calc(${((step - 1) / 3) * 100}% - 2rem)` }}
          />
          {STEP_LABELS.map((label, i) => {
            const n = i + 1
            // Для авторизованных шаг 3 считается автоматически выполненным
            const autoFilled = user && n === 3
            const done   = n < step || autoFilled
            const active = n === step && !autoFilled
            return (
              <div key={n} className="flex flex-col items-center flex-1 relative z-10">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm
                                font-semibold transition-all ${
                  done   ? 'bg-blue-600 text-white'
                  : active ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                  : 'bg-white border-2 border-gray-200 text-gray-400'
                }`}>
                  {done ? '✓' : n}
                </div>
                <span className={`text-xs mt-1.5 font-medium ${
                  active ? 'text-blue-600' : done ? 'text-gray-500' : 'text-gray-400'
                }`}>
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

          {/* Загрузка */}
          {servicesLoading && (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-3
                                        rounded-xl border-2 border-gray-100 animate-pulse">
                  <div className="h-3 bg-gray-200 rounded w-2/5" />
                  <div className="h-3 bg-gray-200 rounded w-16" />
                </div>
              ))}
            </div>
          )}

          {/* Ошибка */}
          {!servicesLoading && servicesError && (
            <div className="text-center py-16">
              <div className="text-5xl mb-4">⚠️</div>
              <p className="text-lg font-medium text-gray-600 mb-1">Не удалось загрузить услуги</p>
              <p className="text-gray-400 text-sm mb-5">{servicesError}</p>
              <button onClick={retry}
                className="bg-blue-600 text-white font-medium px-6 py-2.5 rounded-xl
                           hover:bg-blue-700 transition-colors text-sm">
                Попробовать ещё раз
              </button>
            </div>
          )}

          {/* Пусто */}
          {!servicesLoading && !servicesError && services.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <div className="text-5xl mb-4">🏥</div>
              <p className="text-lg font-medium text-gray-500">Услуги временно недоступны</p>
              <p className="text-sm mt-1">Попробуйте зайти позже или позвоните нам</p>
              <p className="text-sm mt-3 font-medium text-gray-600">+7 (495) 123-45-67</p>
            </div>
          )}

          {/* Список — компактный: название + цена */}
          {!servicesLoading && !servicesError && services.length > 0 && (
            <div className="space-y-2">
              {services.map(service => {
                const selected = form.selectedService?.id === service.id
                return (
                  <button
                    key={service.id}
                    onClick={() => update('selectedService', service)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl
                                border-2 text-left transition-all ${
                      selected
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-100 bg-white hover:border-gray-200'
                    }`}
                  >
                    <div className="min-w-0 mr-4">
                      <p className={`text-sm font-medium leading-snug ${
                        selected ? 'text-blue-700' : 'text-gray-900'
                      }`}>
                        {service.name}
                      </p>
                      <p className="text-gray-400 text-xs mt-0.5">{service.duration} мин</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-blue-600 font-bold text-sm">
                        {service.price.toLocaleString('ru-RU')} ₽
                      </span>
                      {selected && <span className="text-blue-600 text-base">✓</span>}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── Шаг 2: Дата и время ──────────────────────────────────── */}
      {step === 2 && (
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-1">Выберите дату и время</h2>
          <p className="text-gray-500 text-sm mb-6">Доступные слоты на ближайшие 2 недели</p>

          {scheduleLoading && (
            <div className="text-center py-12 text-gray-400">
              <div className="text-5xl mb-4">⏳</div>
              <p className="text-lg font-medium text-gray-500">Загружаем расписание...</p>
            </div>
          )}

          {!scheduleLoading && scheduleError && (
            <div className="text-center py-12 text-gray-400">
              <div className="text-5xl mb-4">⚠️</div>
              <p className="text-lg font-medium text-gray-600 mb-1">Не удалось загрузить расписание</p>
              <p className="text-sm mt-1">{scheduleError}</p>
            </div>
          )}

          {!scheduleLoading && !scheduleError && schedule.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <div className="text-5xl mb-4">📅</div>
              <p className="text-lg font-medium text-gray-500">Нет доступных дат для записи</p>
              <p className="text-sm mt-1">Расписание временно недоступно. Позвоните нам.</p>
              <p className="text-sm mt-3 font-medium text-gray-600">+7 (495) 123-45-67</p>
            </div>
          )}

          {!scheduleLoading && !scheduleError && schedule.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-3 mb-6 scrollbar-hide">
              {schedule.map(day => (
                <button
                  key={day.date}
                  onClick={() => { update('selectedDate', day.date); update('selectedTime', '') }}
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
          )}

          {form.selectedDate && daySchedule ? (
            (() => {
              const slots = daySchedule.slots
              const hasAvailable = slots.some(s => s.available)

              return hasAvailable ? (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-gray-700">Доступное время</p>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {slots.map(slot => (
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
              ) : (
                <div className="text-center py-10 text-gray-400">
                  <div className="text-4xl mb-3">😔</div>
                  <p className="font-medium text-gray-500">На этот день нет свободного времени</p>
                  <p className="text-sm mt-1">Выберите другую дату</p>
                </div>
              )
            })()
          ) : (
            <p className="text-gray-400 text-sm text-center py-8">
              ← Выберите дату, чтобы увидеть доступное время
            </p>
          )}

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
      {step === 4 && !form.selectedService && (
        <div className="text-center py-16 text-gray-400">
          <div className="text-5xl mb-4">⚠️</div>
          <p className="text-lg font-medium text-gray-500">Данные формы не заполнены</p>
          <p className="text-sm mt-1 mb-6">Вернитесь в начало и заполните все шаги</p>
          <button onClick={() => setStep(1)}
            className="bg-blue-600 text-white font-medium px-8 py-3 rounded-xl
                       hover:bg-blue-700 transition-colors">
            Начать заново
          </button>
        </div>
      )}

      {step === 4 && form.selectedService && (
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-1">Подтвердите запись</h2>
          <p className="text-gray-500 text-sm mb-6">Проверьте данные перед отправкой</p>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-6">
            <div className="flex items-center gap-4 p-5 border-b border-gray-100">
              <div className={`w-12 h-12 rounded-xl ${form.selectedService.color} flex items-center
                              justify-center flex-shrink-0`}>
                <span className="text-white font-semibold text-xs">{form.selectedService.initials}</span>
              </div>
              <div>
                <p className="font-semibold text-gray-900">{form.selectedService.name}</p>
                <p className="text-gray-400 text-sm">{form.selectedService.specialty}</p>
              </div>
            </div>
            {[
              { label: 'Дата',        value: form.selectedDate },
              { label: 'Время',       value: form.selectedTime },
              { label: 'Стоимость',   value: `${form.selectedService.price.toLocaleString('ru-RU')} ₽` },
              { label: 'Пациент',     value: form.patientName },
              { label: 'Телефон',     value: form.patientPhone },
              ...(form.patientTelegram ? [{ label: 'Telegram',    value: form.patientTelegram }] : []),
              ...(form.patientComment  ? [{ label: 'Комментарий', value: form.patientComment  }] : []),
            ].map(({ label, value }) => (
              <div key={label}
                className="flex justify-between items-start px-5 py-3
                           border-b border-gray-50 last:border-0">
                <span className="text-gray-500 text-sm">{label}</span>
                <span className="text-gray-900 text-sm font-medium text-right max-w-[60%]">{value}</span>
              </div>
            ))}
          </div>

          {/* Подсказка для авторизованных */}
          {user && (
            <div className="mb-4 bg-green-50 border border-green-100 rounded-xl px-4 py-2.5 text-sm text-green-700">
              Данные пациента подтянуты из вашего профиля
            </div>
          )}

          {/* Ошибка отправки */}
          {submitError && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
              ⚠️ {submitError}
            </div>
          )}

          <button
            onClick={handleConfirm}
            disabled={submitting}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60
                       disabled:cursor-not-allowed text-white font-semibold
                       py-4 rounded-xl transition-colors text-lg flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <span className="w-5 h-5 border-2 border-white border-t-transparent
                                 rounded-full animate-spin" />
                Отправка...
              </>
            ) : (
              'Подтвердить запись'
            )}
          </button>
        </div>
      )}

      {/* ─── Навигация Назад / Далее ───────────────────────────────── */}
      {step < 4 && (
        <div className="flex gap-3 mt-8">
          {step > 1 && (
            <button
              onClick={() => setStep(s => (user && s === 4 ? 2 : s - 1))}
              className="flex-1 py-3 border border-gray-200 rounded-xl text-gray-700
                         font-medium hover:bg-gray-50 transition-colors">
              ← Назад
            </button>
          )}
          <button
            onClick={() => setStep(s => (user && s === 2 ? 4 : s + 1))}
            disabled={!canProceed() || (step === 1 && servicesLoading)}
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
