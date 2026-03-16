// ─── Типы данных ──────────────────────────────────────────────────────────────

export type Category = 'all' | 'doctors' | 'diagnostics' | 'analysis'

export interface Service {
  id: string
  name: string
  category: Exclude<Category, 'all'>
  specialty: string
  price: number
  duration: number          // длительность в минутах
  initials: string          // для цветного аватара
  color: string             // Tailwind bg-класс
  description: string
  experience?: string       // только для врачей
  education?: string        // только для врачей
  priceTable?: { label: string; price: number }[]
  doctorId?: string         // ID врача в бэкенде (для создания записи)
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

// ─── Генератор расписания ─────────────────────────────────────────────────────
// Возвращает 14 рабочих дней с псевдослучайными доступными слотами

const ALL_TIME_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00',
]

const DAYS_RU   = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']
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
    if (date.getDay() === 0) continue
    if (schedule.length >= 14) break

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
  list.unshift(appointment)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
}

export function cancelAppointment(id: string): void {
  const list = getAppointments().map(a =>
    a.id === id ? { ...a, status: 'cancelled' as const } : a,
  )
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
}
