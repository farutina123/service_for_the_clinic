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
  notes?: string | null
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
  discount_applied: number   // дробь: 0.10 = 10%
  notes: string | null
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

// ── Дополнительные типы ────────────────────────────────────────────────────

export interface ApiUser {
  id: string
  name: string
  phone: string
  email: string | null
  role: 'user' | 'admin'
  discount: number        // дробь: 0.1 = 10%
  is_active: boolean
  created_at: string
}

export interface ApiTokenResponse {
  access_token: string
  token_type: string
}

// ── HTTP-обёртка ───────────────────────────────────────────────────────────

function getToken(): string | null {
  return localStorage.getItem('clinic_token')
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    ...(options?.headers as Record<string, string>),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(API_BASE + path, { ...options, headers })
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

// ── Auth ───────────────────────────────────────────────────────────────────

export interface ApiLoginResult {
  token: string
  user: ApiUser
}

/**
 * Регистрация: бэкенд возвращает только UserOut (без токена),
 * поэтому после регистрации сразу логинимся.
 */
export async function apiRegister(data: {
  name: string
  phone: string
  password: string
  email?: string
}): Promise<ApiLoginResult> {
  await apiFetch<ApiUser>('/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return apiLogin({ phone: data.phone, password: data.password })
}

/**
 * Логин: бэкенд возвращает только токен,
 * поэтому после получения токена запрашиваем /auth/me.
 */
export async function apiLogin(data: {
  phone: string
  password: string
}): Promise<ApiLoginResult> {
  const { access_token } = await apiFetch<ApiTokenResponse>('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  // Временно сохраняем токен, чтобы apiFetch мог добавить заголовок для /auth/me
  localStorage.setItem('clinic_token', access_token)
  const user = await apiFetch<ApiUser>('/auth/me')
  return { token: access_token, user }
}

export async function apiLogout(): Promise<void> {
  await apiFetch<void>('/auth/logout', { method: 'POST' })
}

export async function apiMe(): Promise<ApiUser> {
  return apiFetch<ApiUser>('/auth/me')
}

export async function apiChangePassword(data: {
  old_password: string
  new_password: string
}): Promise<{ message: string }> {
  return apiFetch<{ message: string }>('/auth/change-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

// ── Users ──────────────────────────────────────────────────────────────────

export async function fetchUsers(): Promise<ApiUser[]> {
  return apiFetch<ApiUser[]>('/users/')
}

export async function fetchUserById(id: string): Promise<ApiUser> {
  return apiFetch<ApiUser>(`/users/${id}`)
}

export async function updateUser(id: string, data: {
  name?: string
  email?: string
  role?: string
}): Promise<ApiUser> {
  return apiFetch<ApiUser>(`/users/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export async function deleteUser(id: string): Promise<void> {
  await apiFetch<void>(`/users/${id}`, { method: 'DELETE' })
}

// ── Doctors (admin) ────────────────────────────────────────────────────────

export async function fetchDoctors(): Promise<ApiDoctor[]> {
  return apiFetch<ApiDoctor[]>('/doctors/')
}

export async function createDoctor(data: Omit<ApiDoctor, 'id' | 'is_active'>): Promise<ApiDoctor> {
  return apiFetch<ApiDoctor>('/doctors/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export async function updateDoctor(id: string, data: Partial<Omit<ApiDoctor, 'id'>>): Promise<ApiDoctor> {
  return apiFetch<ApiDoctor>(`/doctors/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export async function deleteDoctor(id: string): Promise<void> {
  await apiFetch<void>(`/doctors/${id}`, { method: 'DELETE' })
}

// ── Services (admin) ───────────────────────────────────────────────────────

export async function fetchAllServices(): Promise<ApiService[]> {
  return apiFetch<ApiService[]>('/services/')
}

export async function createService(data: Omit<ApiService, 'id' | 'is_active'>): Promise<ApiService> {
  return apiFetch<ApiService>('/services/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export async function updateService(id: string, data: Partial<Omit<ApiService, 'id'>>): Promise<ApiService> {
  return apiFetch<ApiService>(`/services/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export async function deleteService(id: string): Promise<void> {
  await apiFetch<void>(`/services/${id}`, { method: 'DELETE' })
}

// ── Appointments ───────────────────────────────────────────────────────────

export async function fetchAppointments(): Promise<ApiAppointment[]> {
  return apiFetch<ApiAppointment[]>('/appointments/')
}

export async function fetchAppointmentById(id: string): Promise<ApiAppointment> {
  return apiFetch<ApiAppointment>(`/appointments/${id}`)
}

export async function updateAppointmentStatus(
  id: string,
  status: ApiAppointment['status'],
): Promise<ApiAppointment> {
  return apiFetch<ApiAppointment>(`/appointments/${id}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  })
}

export async function cancelAppointmentApi(id: string): Promise<void> {
  await apiFetch<void>(`/appointments/${id}`, { method: 'DELETE' })
}

export async function updateAppointmentDoctor(
  id: string,
  doctorId: string | null,
): Promise<ApiAppointment> {
  return apiFetch<ApiAppointment>(`/appointments/${id}/doctor`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ doctor_id: doctorId }),
  })
}
