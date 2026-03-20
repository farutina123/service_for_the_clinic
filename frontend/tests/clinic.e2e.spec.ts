import { test, expect, type APIRequestContext, type Page } from '@playwright/test'
import {
  normalizePhone,
  selectServiceAndProceed,
  selectDateTimeAndProceed,
  fillPatientAndProceed,
  confirmAppointment,
  createAppointmentFlow,
  stubTelegramForUnlinkedUser,
} from './utils'

const USER_PHONE = normalizePhone('+7 999 999 99 99')
const USER_PASSWORD = 'password123'
const ADMIN_PHONE = normalizePhone('+7 900 000 00 00')
const ADMIN_PASSWORD = 'admin123'

function uniqueSuffix() {
  return `${Date.now()}`.slice(-6)
}

async function ensureUser(request: APIRequestContext, opts: { name: string; phone: string; password: string }) {
  await request.post('http://localhost:8000/auth/register', {
    data: { name: opts.name, phone: opts.phone, password: opts.password },
  }).catch(() => {
    // Если пользователь уже существует — просто игнорируем.
  })
}

async function login(
  page: Page,
  opts: { phone: string; password: string },
  expectedFirstName?: string,
) {
  await page.goto('/login')

  const phoneInput = page.locator('input[type="tel"]').first()
  const passwordInput = page.locator('input[type="password"]').first()
  await phoneInput.fill(opts.phone)
  await passwordInput.fill(opts.password)

  // На странице логина «Войти» встречается дважды (вкладка и submit).
  // Нам нужен submit-кнопка внутри формы.
  await page.locator('form').first().getByRole('button', { name: 'Войти' }).click()
  await expect(page.getByRole('button', { name: 'Выйти' })).toBeVisible()

  if (expectedFirstName) {
    // Текст справа в шапке = `user.name.split(' ')[0]`.
    await expect(page.getByRole('link', { name: expectedFirstName })).toBeVisible()
  }
}

async function registerOrLogin(page: Page, opts: { name: string; phone: string; password: string }) {
  await page.goto('/login')
  await page.getByRole('button', { name: 'Зарегистрироваться' }).click()

  const nameInput = page.locator('input[type="text"]').first()
  const phoneInput = page.locator('input[type="tel"]').first()
  const password1 = page.locator('input[type="password"]').nth(0)
  const password2 = page.locator('input[type="password"]').nth(1)

  await nameInput.fill(opts.name)
  await phoneInput.fill(opts.phone)
  await password1.fill(opts.password)
  await password2.fill(opts.password)

  await page.getByRole('button', { name: 'Создать аккаунт' }).click()

  const homeHeading = page.getByRole('heading', { name: 'Запись к врачу онлайн' })
  try {
    await expect(homeHeading).toBeVisible({ timeout: 8000 })
    return
  } catch {
    // Возможно, аккаунт уже существует — переключаемся на вкладку «Войти».
    await login(page, { phone: opts.phone, password: opts.password })
  }
}

async function logoutIfLoggedIn(page: Page) {
  const exitBtn = page.getByRole('button', { name: 'Выйти' })
  if (await exitBtn.isVisible().catch(() => false)) {
    await exitBtn.click()
    // Ожидаем возврат на главную (navigate('/') из handleLogout).
    await expect(page.getByRole('heading', { name: 'Запись к врачу онлайн' })).toBeVisible()
  }
}

test.describe('E2E сценарии клиники', () => {
  test.describe.configure({ mode: 'serial' })

  test('Пользователь регистрируется и попадает на главную страницу', async ({ page }) => {
    const suffix = uniqueSuffix()
    const userName = `E2E Пользователь ${suffix}`

    await registerOrLogin(page, {
      name: userName,
      phone: USER_PHONE,
      password: USER_PASSWORD,
    })

    await expect(page.getByRole('heading', { name: 'Запись к врачу онлайн' })).toBeVisible()
  })

  test('Пользователь создает запись, она появляется в списке', async ({ page, request }) => {
    const suffix = uniqueSuffix()
    const userName = `E2E Пользователь ${suffix}`
    // При авторизации шаг 3 ("Данные пациента") автоматически считается выполненным,
    // поэтому пациент в записи будет равен имени пользователя из профиля.
    const patientName = userName
    const patientPhone = USER_PHONE

    await ensureUser(request, { name: userName, phone: USER_PHONE, password: USER_PASSWORD })
    await login(page, { phone: USER_PHONE, password: USER_PASSWORD })

    // Telegram в подтверждении для авторизованных пользователей подменяем.
    await stubTelegramForUnlinkedUser(page)

    await page.goto('/booking')
    const { serviceName, selectedDate, selectedTime } = await createAppointmentFlow(page, {
      patientName,
      patientPhone,
      stubTelegram: false,
      request,
    })

    // На странице может быть несколько ссылок «Мои записи» (хедер + контент страницы).
    await page.locator('a[href="/appointments"]').first().click()
    await expect(page.getByRole('heading', { name: 'Мои записи' })).toBeVisible()

    // Данные подтягиваются с бэкенда — даём больше времени.
    const card = page
      .locator('div.bg-white.rounded-2xl.border.shadow-sm.p-5')
      .filter({ hasText: serviceName })
      .filter({ hasText: selectedDate })
      .first()

    await expect(card).toBeVisible({ timeout: 20_000 })
    await expect(card).toContainText(selectedTime, { timeout: 20_000 })
  })

  test('Пользователь не может отправлять форму с пустым обязательным полем', async ({ page, request }) => {
    // Выбираем doctorless услугу по API, чтобы не зависеть от текста карточек в UI.
    const servicesRes = await request.get('http://localhost:8000/services/')
    const services = (await servicesRes.json()) as Array<{ id: string; doctor_id: string | null }>
    const doctorless = services.find(s => !s.doctor_id) ?? services[0]

    await page.goto(`/booking?serviceId=${encodeURIComponent(doctorless.id)}`)

    // Заполняем шаг 2 (после выбора услуги UI сразу на step=2).
    await selectDateTimeAndProceed(page)

    // Шаг 3: ничего не заполняем — кнопка «Далее» должна быть недоступна,
    // а шаг подтверждения не должен открываться.
    const nextButton = page.getByRole('button', { name: /Далее\s*→/ })
    await expect(nextButton).toBeDisabled()
    await expect(page.getByRole('heading', { name: 'Подтвердите запись' })).toHaveCount(0)
  })

  test('Пользователь без авторизации не видит защищенные данные', async ({ page }) => {
    await page.goto('/appointments')
    await expect(page.getByRole('heading', { name: 'Мои записи' })).toBeVisible()
    await expect(page.getByText('У вас пока нет записей')).toBeVisible()

    await page.goto('/profile')
    await expect(page).toHaveURL(/\/login/)

    await page.goto('/admin/appointments')
    await expect(page).toHaveURL(/\/login/)
  })

  test('Админ может видеть записи всех пользователей (авторизованные и гости)', async ({
    page,
    request,
  }) => {
    const suffix = uniqueSuffix()
    const guestPatientName = `E2E Гость ${suffix}`
    const userPatientName = `E2E Пользователь ${suffix}`

    const guestPhone = normalizePhone('+7 910 123 45 67')
    const userPhone = USER_PHONE

    // 1) Гостевая запись
    await page.goto('/booking')
    const guestBooking = await createAppointmentFlow(page, {
      patientName: guestPatientName,
      patientPhone: guestPhone,
      stubTelegram: false,
      request,
    })

    // 2) Авторизованная запись
    await ensureUser(request, { name: `E2E Пользователь ${suffix}`, phone: USER_PHONE, password: USER_PASSWORD })
    await login(page, { phone: USER_PHONE, password: USER_PASSWORD })

    await stubTelegramForUnlinkedUser(page)
    await page.goto('/booking')
    const userBooking = await createAppointmentFlow(page, {
      patientName: userPatientName,
      patientPhone: userPhone,
      stubTelegram: false,
      request,
    })

    // 3) Админ смотрит все записи
    await login(page, { phone: ADMIN_PHONE, password: ADMIN_PASSWORD }, 'Администратор')
    await page.goto('/admin/appointments')

    // Важно: на retry имя пользователя может не обновиться из-за идемпотентности ensureUser(),
    // поэтому проверяем видимость записей по телефону и по дате/времени.
    const guestRow = page
      .locator('tbody tr')
      .filter({ hasText: guestPhone })
      .filter({ hasText: guestBooking.selectedDate })
      .filter({ hasText: guestBooking.selectedTime })
      .first()

    const userRow = page
      .locator('tbody tr')
      .filter({ hasText: userPhone })
      .filter({ hasText: userBooking.selectedDate })
      .filter({ hasText: userBooking.selectedTime })
      .first()

    await expect(guestRow).toBeVisible({ timeout: 20_000 })
    await expect(userRow).toBeVisible({ timeout: 20_000 })
  })

  test('Админ может создать врача и услугу (услуга появляется в перечне)', async ({ page, request }) => {
    const suffix = uniqueSuffix()
    const doctorName = `E2E Доктор ${suffix}`
    const doctorSpecialty = `E2E Специализация ${suffix}`
    const serviceName = `E2E Услуга ${suffix}`

    await login(page, { phone: ADMIN_PHONE, password: ADMIN_PASSWORD }, 'Администратор')

    // Чтобы избежать флейка модалок ввода, создаём врача/услугу через API,
    // а в браузере проверяем, что UI их показывает.
    const loginRes = await request.post('http://localhost:8000/auth/login', {
      headers: { 'Content-Type': 'application/json' },
      data: { phone: ADMIN_PHONE, password: ADMIN_PASSWORD },
    })
    if (!loginRes.ok()) {
      const body = await loginRes.text()
      throw new Error(`Не удалось залогиниться админом через API: status=${loginRes.status()} body=${body}`)
    }

    const { access_token: token } = (await loginRes.json()) as { access_token: string }
    const authHeaders = { Authorization: `Bearer ${token}` }

    const doctorRes = await request.post('http://localhost:8000/doctors/', {
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      data: {
        name: doctorName,
        specialty: doctorSpecialty,
        experience_years: 5,
        education: null,
        description: null,
        photo_url: null,
      },
    })
    expect(doctorRes.ok(), 'Создание врача через API не удалось').toBeTruthy()
    const createdDoctor = (await doctorRes.json()) as { id: string }

    const serviceRes = await request.post('http://localhost:8000/services/', {
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      data: {
        name: serviceName,
        category: 'doctors',
        price: 2000,
        duration_minutes: 30,
        description: null,
        doctor_id: createdDoctor.id,
      },
    })
    expect(serviceRes.ok(), 'Создание услуги через API не удалось').toBeTruthy()

    await page.goto('/admin/doctors')
    await expect(page.getByText(doctorName)).toBeVisible({ timeout: 20_000 })

    await page.goto('/services')
    await expect(page.getByText(serviceName)).toBeVisible({ timeout: 20_000 })
  })

  test('Админ может менять статус записей пользователей', async ({ page, request }) => {
    const suffix = uniqueSuffix()
    const patientName = `E2E Статус ${suffix}`
    const patientPhone = normalizePhone('+7 911 111 22 33')

    // Создаём гостевую запись, чтобы она гарантированно была видна администратору как «гость».
    await page.goto('/booking')
    await createAppointmentFlow(page, {
      patientName,
      patientPhone,
      stubTelegram: false,
      request,
    })

    // Логинимся админом и меняем статус первой записи с нашим пациентом.
    await login(page, { phone: ADMIN_PHONE, password: ADMIN_PASSWORD }, 'Администратор')
    await page.goto('/admin/appointments')

    const row = page.locator('tbody tr', { hasText: patientName }).first()
    await expect(row).toBeVisible()

    const statuses = ['Ожидает', 'Подтверждена', 'Завершена', 'Отменена']
    const statusButton = row.locator('button').filter({ hasText: /Ожидает|Подтверждена|Завершена|Отменена/ }).first()

    const currentText = (await statusButton.textContent()) ?? ''
    const currentLabel = statuses.find(s => currentText.includes(s))
    expect(currentLabel, 'Не удалось определить текущую метку статуса').toBeTruthy()

    const desiredLabel = statuses.find(s => s !== currentLabel)!

    await statusButton.click()

    // Кнопка со статусом в выпадающем списке (тоже находится внутри строки).
    const option = row.getByRole('button', { name: desiredLabel }).first()
    await option.click()

    await expect(statusButton).toContainText(desiredLabel)
  })
})

