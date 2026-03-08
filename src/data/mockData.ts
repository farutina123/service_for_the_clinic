// ─── Типы данных ──────────────────────────────────────────────────────────────

export type Category = 'all' | 'doctors' | 'diagnostics' | 'analysis'

export interface Service {
  id: string
  name: string
  category: Exclude<Category, 'all'>
  specialty: string
  price: number
  duration: number        // длительность в минутах
  initials: string        // для цветного аватара
  color: string           // Tailwind bg-класс
  description: string
  experience?: string     // только для врачей
  education?: string      // только для врачей
  priceTable?: { label: string; price: number }[]
}

export interface TimeSlot {
  time: string
  available: boolean
}

export interface ScheduleDay {
  date: string    // 'YYYY-MM-DD'
  label: string   // 'Пн, 10 мар'
  slots: TimeSlot[]
}

export interface Appointment {
  id: string
  serviceId: string
  serviceName: string
  specialty: string
  date: string
  time: string
  price: number
  patientName: string
  patientPhone: string
  patientTelegram: string
  patientComment: string
  status: 'upcoming' | 'past' | 'cancelled'
  createdAt: string
}

// ─── Каталог услуг и врачей ───────────────────────────────────────────────────

export const services: Service[] = [
  {
    id: '1',
    name: 'Иванов Алексей Петрович',
    category: 'doctors',
    specialty: 'Терапевт',
    price: 1500,
    duration: 30,
    initials: 'ИА',
    color: 'bg-blue-500',
    description:
      'Врач-терапевт первой категории. Специализируется на диагностике и лечении заболеваний внутренних органов, профилактических осмотрах, диспансеризации.',
    experience: '15 лет',
    education: 'Первый МГМУ им. Сеченова, 2009',
    priceTable: [
      { label: 'Первичный приём', price: 1500 },
      { label: 'Повторный приём', price: 1200 },
      { label: 'Консультация по результатам анализов', price: 800 },
    ],
  },
  {
    id: '2',
    name: 'Смирнова Елена Викторовна',
    category: 'doctors',
    specialty: 'Кардиолог',
    price: 2200,
    duration: 45,
    initials: 'СЕ',
    color: 'bg-rose-500',
    description:
      'Врач-кардиолог высшей категории, кандидат медицинских наук. Специализируется на диагностике и лечении заболеваний сердечно-сосудистой системы, интерпретации ЭКГ и ЭхоКГ.',
    experience: '20 лет',
    education: 'РНИМУ им. Пирогова, 2004',
    priceTable: [
      { label: 'Первичный приём', price: 2200 },
      { label: 'Повторный приём', price: 1800 },
      { label: 'Расшифровка ЭКГ', price: 600 },
    ],
  },
  {
    id: '3',
    name: 'УЗИ брюшной полости',
    category: 'diagnostics',
    specialty: 'Диагностика',
    price: 2500,
    duration: 30,
    initials: 'УЗИ',
    color: 'bg-teal-500',
    description:
      'Ультразвуковое исследование органов брюшной полости: печень, желчный пузырь, поджелудочная железа, почки, селезёнка. Результат выдаётся в тот же день.',
    priceTable: [
      { label: 'УЗИ брюшной полости', price: 2500 },
      { label: 'УЗИ брюшной полости + почки', price: 3200 },
      { label: 'УЗИ брюшной полости + малый таз', price: 3500 },
    ],
  },
  {
    id: '4',
    name: 'ЭКГ с расшифровкой',
    category: 'diagnostics',
    specialty: 'Диагностика',
    price: 900,
    duration: 20,
    initials: 'ЭКГ',
    color: 'bg-orange-500',
    description:
      'Электрокардиография в покое с расшифровкой результатов врачом-кардиологом. Процедура занимает 15–20 минут, заключение выдаётся сразу.',
    priceTable: [
      { label: 'ЭКГ в покое', price: 900 },
      { label: 'ЭКГ с нагрузкой', price: 1800 },
      { label: 'Суточный мониторинг (Холтер)', price: 4500 },
    ],
  },
  {
    id: '5',
    name: 'Общий анализ крови',
    category: 'analysis',
    specialty: 'Лабораторный анализ',
    price: 450,
    duration: 15,
    initials: 'ОАК',
    color: 'bg-purple-500',
    description:
      'Клинический анализ крови с лейкоцитарной формулой и СОЭ. Сдать кровь можно без предварительной записи. Результат готов на следующий рабочий день.',
    priceTable: [
      { label: 'Общий анализ крови', price: 450 },
      { label: 'Общий анализ крови + СОЭ', price: 550 },
      { label: 'Расширенный (15 показателей)', price: 1200 },
    ],
  },
  {
    id: '6',
    name: 'Петрова Наталья Сергеевна',
    category: 'doctors',
    specialty: 'Невролог',
    price: 2000,
    duration: 40,
    initials: 'ПН',
    color: 'bg-indigo-500',
    description:
      'Врач-невролог. Специализируется на лечении головных болей, мигрени, остеохондроза, нарушений сна и функциональных расстройств нервной системы.',
    experience: '12 лет',
    education: 'СПбГМУ им. Павлова, 2012',
    priceTable: [
      { label: 'Первичный приём', price: 2000 },
      { label: 'Повторный приём', price: 1600 },
      { label: 'Приём с ЭЭГ', price: 3500 },
    ],
  },
]

// ─── Генератор расписания ─────────────────────────────────────────────────────
// Возвращает 14 рабочих дней с псевдослучайными доступными слотами

const ALL_TIME_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00',
]

const DAYS_RU = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']
const MONTHS_RU = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']

function toISODate(date: Date): string {
  return date.toISOString().split('T')[0]
}

function toLabel(date: Date): string {
  return `${DAYS_RU[date.getDay()]}, ${date.getDate()} ${MONTHS_RU[date.getMonth()]}`
}

export function generateSchedule(): ScheduleDay[] {
  const schedule: ScheduleDay[] = []
  const today = new Date()

  for (let i = 1; i <= 21; i++) {
    const date = new Date(today)
    date.setDate(today.getDate() + i)

    // Пропускаем воскресенья
    if (date.getDay() === 0) continue
    if (schedule.length >= 14) break

    // 70% слотов доступно, остальные заняты
    const slots: TimeSlot[] = ALL_TIME_SLOTS.map(time => ({
      time,
      available: Math.random() > 0.3,
    }))

    schedule.push({ date: toISODate(date), label: toLabel(date), slots })
  }

  return schedule
}

// ─── Работа с localStorage ────────────────────────────────────────────────────

const STORAGE_KEY = 'clinic_appointments'

export function getAppointments(): Appointment[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as Appointment[]
  } catch {
    return []
  }
}

export function saveAppointment(appointment: Appointment): void {
  const list = getAppointments()
  list.unshift(appointment) // новая запись первой
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
}

export function cancelAppointment(id: string): void {
  const list = getAppointments().map(a =>
    a.id === id ? { ...a, status: 'cancelled' as const } : a,
  )
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
}
