/**
 * API-клиент для МедКлиника.
 * Все запросы идут через Vite proxy: /api → http://localhost:8000
 */
import type { Service, Appointment } from './data/mockData'

const API_BASE = '/api'

// ── Типы ответов бэкенда ───────────────────────────────────────────────────

export interface ApiService {
  id: string
  name: string
  category: 'doctors' | 'diagnostics' | 'analysis'
  price: number
  duration_minutes: number
  description: string | null
  doctor_id: string | null
  is_active: boolean
}

export interface ApiDoctor {
  id: string
  name: string
  specialty: string
  experience_years: number
  education: string | null
  description: string | null
  photo_url: string | null
  is_active: boolean
}

export interface ApiAppointmentCreate {
  patient_name: string
  patient_phone: string
  service_id: string
  doctor_id?: string | null
  appointment_date: string   // 'YYYY-MM-DD'
  appointment_time: string   // 'HH:MM'
  apply_discount?: boolean
}

export interface ApiAppointment {
  id: string
  patient_name: string
  patient_phone: string
  service_id: string
  doctor_id: string | null
  appointment_date: string
  appointment_time: string
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
  base_price: number
  final_price: number
  discount_applied: number
  user_id: string | null
  created_at: string
}

// ── Вспомогательные функции ────────────────────────────────────────────────

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/)
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase()
  }
  return words[0].slice(0, 3).toUpperCase()
}

const COLORS_BY_CATEGORY: Record<string, string[]> = {
  doctors:     ['bg-blue-500', 'bg-rose-500', 'bg-indigo-500', 'bg-emerald-500', 'bg-violet-500'],
  diagnostics: ['bg-teal-500', 'bg-orange-500', 'bg-cyan-500'],
  analysis:    ['bg-purple-500', 'bg-pink-500', 'bg-amber-500'],
}

function getColor(category: string, id: string): string {
  const palette = COLORS_BY_CATEGORY[category] ?? ['bg-blue-500']
  const hash = id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return palette[hash % palette.length]
}

function formatExperience(years: number): string {
  const mod10 = years % 10
  const mod100 = years % 100
  if (mod10 === 1 && mod100 !== 11) return `${years} год`
  if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return `${years} года`
  return `${years} лет`
}

const CATEGORY_SPECIALTY: Record<string, string> = {
  doctors:     'Специалист',
  diagnostics: 'Диагностика',
  analysis:    'Лабораторный анализ',
}

// ── Трансформеры ──────────────────────────────────────────────────────────

export function toService(svc: ApiService, doctor?: ApiDoctor): Service {
  return {
    id:          svc.id,
    name:        svc.name,
    category:    svc.category,
    specialty:   doctor?.specialty ?? CATEGORY_SPECIALTY[svc.category] ?? 'Услуга',
    price:       svc.price,
    duration:    svc.duration_minutes,
    initials:    getInitials(svc.name),
    color:       getColor(svc.category, svc.id),
    description: svc.description ?? '',
    experience:  doctor && doctor.experience_years > 0
                   ? formatExperience(doctor.experience_years)
                   : undefined,
    education:   doctor?.education ?? undefined,
    doctorId:    svc.doctor_id ?? undefined,
  }
}

/** Преобразует ответ API в формат для localStorage (страница «Мои записи»). */
export function toLocalAppointment(
  apt: ApiAppointment,
  service: Service,
  patientTelegram = '',
  patientComment  = '',
): Appointment {
  const aptDateTime = new Date(`${apt.appointment_date}T${apt.appointment_time}`)
  const now = new Date()

  let status: Appointment['status']
  if (apt.status === 'cancelled') {
    status = 'cancelled'
  } else if (apt.status === 'completed' || aptDateTime < now) {
    status = 'past'
  } else {
    status = 'upcoming'
  }

  return {
    id:              apt.id,
    serviceId:       apt.service_id,
    serviceName:     service.name,
    specialty:       service.specialty,
    date:            apt.appointment_date,
    time:            apt.appointment_time,
    price:           apt.final_price,
    patientName:     apt.patient_name,
    patientPhone:    apt.patient_phone,
    patientTelegram,
    patientComment,
    status,
    createdAt:       apt.created_at,
  }
}

// ── HTTP-обёртка ───────────────────────────────────────────────────────────

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(API_BASE + path, options)
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    const detail = body?.detail
    const message = typeof detail === 'string'
      ? detail
      : Array.isArray(detail)
      ? detail.map((e: { msg: string }) => e.msg).join('; ')
      : `Ошибка сервера (HTTP ${res.status})`
    throw new Error(message)
  }
  return res.json() as Promise<T>
}

// ── Публичные функции ──────────────────────────────────────────────────────

/** Загружает все активные услуги вместе с данными врачей (параллельно). */
export async function fetchServices(): Promise<Service[]> {
  const [services, doctors] = await Promise.all([
    apiFetch<ApiService[]>('/services/'),
    apiFetch<ApiDoctor[]>('/doctors/'),
  ])
  const doctorMap = new Map(doctors.map(d => [d.id, d]))
  return services.map(s =>
    toService(s, s.doctor_id ? doctorMap.get(s.doctor_id) : undefined),
  )
}

/** Загружает одну услугу по ID вместе с данными её врача. */
export async function fetchServiceById(id: string): Promise<Service> {
  const svc = await apiFetch<ApiService>(`/services/${id}`)
  let doctor: ApiDoctor | undefined
  if (svc.doctor_id) {
    doctor = await apiFetch<ApiDoctor>(`/doctors/${svc.doctor_id}`)
  }
  return toService(svc, doctor)
}

/** Создаёт запись на приём (гость или авторизованный пользователь). */
export async function createAppointment(
  data: ApiAppointmentCreate,
): Promise<ApiAppointment> {
  return apiFetch<ApiAppointment>('/appointments/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}
