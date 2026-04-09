import type { APIRequestContext, Page } from '@playwright/test'

const ADMIN_PHONE = '+79000000000'
const ADMIN_PASSWORD = 'admin123'

export function normalizePhone(phone: string): string {
  const raw = phone.trim()
  const digits = raw.replace(/\D/g, '')

  if (raw.startsWith('+')) return `+${digits}`
  if (raw.startsWith('8')) return `+7${digits.slice(1)}`
  if (raw.startsWith('7')) return `+${digits}`

  // На всякий случай: если пришли только цифры, считаем, что это номер с 7.
  if (digits.startsWith('7')) return `+${digits}`
  return `+7${digits}`
}

async function ensureServiceAvailability(
  request: APIRequestContext,
  serviceId: string,
): Promise<void> {
  // С новым поведением schedule слоты появляются только если админ явно задал доступность.
  const loginRes = await request.post('http://localhost:8000/auth/login', {
    headers: { 'Content-Type': 'application/json' },
    data: { phone: ADMIN_PHONE, password: ADMIN_PASSWORD },
  })
  if (!loginRes.ok()) {
    const body = await loginRes.text()
    throw new Error(`Не удалось залогиниться админом для задания доступности: status=${loginRes.status()} body=${body}`)
  }
  const { access_token: token } = (await loginRes.json()) as { access_token: string }
  const authHeaders = { Authorization: `Bearer ${token}` }

  const svcRes = await request.get(`http://localhost:8000/services/${encodeURIComponent(serviceId)}`)
  if (!svcRes.ok()) {
    const body = await svcRes.text()
    throw new Error(`Не удалось получить услугу: status=${svcRes.status()} body=${body}`)
  }
  const svc = (await svcRes.json()) as { doctor_id: string | null }

  // Слоты появляются только после явной установки админом.
  // Для устойчивости к UTC/локальному времени берём дату подальше (через 7 дней),
  // и если это воскресенье — сдвигаем на понедельник (schedule пропускает воскресенье).
  const d = new Date()
  d.setDate(d.getDate() + 7)
  if (d.getDay() === 0) d.setDate(d.getDate() + 1)
  const date = d.toISOString().split('T')[0]
  // Задаём широкий набор слотов, чтобы с учётом уже существующих записей
  // в schedule почти наверняка оставался хотя бы один доступный.
  const payload = {
    date,
    times: [
      '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
      '12:00', '12:30', '14:00', '14:30', '15:00', '15:30',
      '16:00', '16:30', '17:00', '17:30',
    ],
  }

  if (svc.doctor_id) {
    const res = await request.put(`http://localhost:8000/doctors/${encodeURIComponent(svc.doctor_id)}/availability`, {
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      data: payload,
    })
    if (!res.ok()) {
      const body = await res.text()
      throw new Error(`Не удалось задать доступность врача: status=${res.status()} body=${body}`)
    }
  } else {
    const res = await request.put(`http://localhost:8000/services/${encodeURIComponent(serviceId)}/availability`, {
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      data: payload,
    })
    if (!res.ok()) {
      const body = await res.text()
      throw new Error(`Не удалось задать доступность услуги: status=${res.status()} body=${body}`)
    }
  }
}

export async function stubTelegramForUnlinkedUser(page: Page) {
  // В подтверждении записи у авторизованных пользователей вызываются telegram endpoints.
  // Чтобы тесты не зависели от Telegram и сети, подменяем ответы.
  await page.route('**/api/telegram/me', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        linked: false,
        chat_id_masked: null,
        linked_at: null,
      }),
    })
  })

  await page.route('**/api/telegram/link-token', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        deep_link: 'https://t.me/dummy_link',
        expires_in_minutes: 60,
      }),
    })
  })
}

export async function selectServiceAndProceed(page: Page) {
  await page.getByRole('heading', { name: 'Выберите услугу или врача' }).waitFor()

  // Важно для стабильности:
  // выбираем услугу из демо, которая не привязана к врачу (doctor_id = null),
  // чтобы не отключать слоты через /doctors/:id/slots.
  const doctorlessCandidates = [
    'ЭКГ с расшифровкой',
    'УЗИ брюшной полости',
    'Общий анализ крови',
  ]

  let serviceButton: ReturnType<typeof page.locator> | null = null
  for (const name of doctorlessCandidates) {
    const candidate = page.locator('button').filter({ hasText: name }).first()
    if ((await candidate.count()) > 0) {
      serviceButton = candidate
      break
    }
  }

  // fallback: первое доступное по цене (на случай если UI/текст изменился)
  if (!serviceButton) {
    serviceButton = page.locator('button:has-text("₽")').first()
  }

  await serviceButton.waitFor({ state: 'visible' })

  // Внутри первой карточки сначала идёт название, затем длительность.
  const serviceName = (await serviceButton.locator('p').first().innerText()).trim()

  await serviceButton.click()

  const nextButton = page.getByRole('button', { name: /Далее\s*→/ })
  await nextButton.click()

  return { serviceName }
}

export async function selectDateTimeAndProceed(page: Page): Promise<{ selectedDate: string; selectedTime: string }> {
  await page.getByRole('heading', { name: 'Выберите дату и время' }).waitFor()

  const step2Root = page.getByRole('heading', { name: 'Выберите дату и время' }).locator('xpath=..')

  const monthRegex = /янв|фев|мар|апр|май|июн|июл|авг|сен|окт|ноя|дек/
  const dayCandidates = step2Root.locator('button').filter({ hasText: monthRegex })
  const dayCount = await dayCandidates.count()

  // На некоторых днях может не оказаться доступного времени — перебираем.
  let selectedTime = false
  const maxTries = Math.min(dayCount, 14)

  // Важно для стабильности: backend проверяет, что дата не в прошлом.
  // Из-за различий UTC/локального времени "завтра" иногда может оказаться в прошлом для сервера.
  // Поэтому первыми пробуем более дальние даты.
  const preferredOrder = [6, 7, 8, 9, 10, 5, 4, 3, 2, 1, 0].filter(i => i < maxTries)

  for (const idx of preferredOrder) {
    // Делаем клик по дню коротким и устойчивым: иногда UI перерисовывается и клик может
    // ждать слишком долго, из-за чего тест упирается в общий timeout.
    const dayBtn = dayCandidates.nth(idx)
    try {
      await dayBtn.scrollIntoViewIfNeeded()
      await dayBtn.click({ timeout: 3_000 })
    } catch {
      continue
    }

    try {
      const timeButtons = step2Root
        .locator('button')
        .filter({ hasText: /\d{2}:\d{2}/ })

      const timeCount = await timeButtons.count()
      if (timeCount === 0) continue

      // Дожидаемся отрисовки хотя бы одного тайм-слота.
      await timeButtons.first().waitFor({ state: 'visible', timeout: 1_800 })

      for (let t = 0; t < timeCount; t++) {
        const btn = timeButtons.nth(t)
        const isDisabled = await btn.evaluate((el: HTMLElement) => (el as HTMLButtonElement).disabled)
        if (isDisabled) continue

        await btn.click({ timeout: 2_000 })
        selectedTime = true

        const chosenText = await page.getByText(/Выбрано:/).first().innerText()
        const match = chosenText.match(/Выбрано:\s*(\d{4}-\d{2}-\d{2})\s*в\s*(\d{2}:\d{2})/)
        if (!match) throw new Error(`Не удалось распарсить выбранные дату/время: "${chosenText}"`)

        const selectedDate = match[1]
        const chosenSlotTime = match[2]

        const nextButton = page.getByRole('button', { name: /Далее\s*→/ })
        await nextButton.click()

        return { selectedDate, selectedTime: chosenSlotTime }
      }
    } catch {
      // Если на выбранный день нет слотов — пробуем следующий.
    }
  }

  if (!selectedTime) {
    throw new Error('Не удалось выбрать доступный слот времени на шаге 2')
  }

  // На практике до сюда не должно доходить (мы делаем return внутри try).
  throw new Error('Не удалось продолжить после выбора даты/времени')
}

export async function fillPatientAndProceed(
  page: Page,
  patientName: string,
  patientPhone: string,
) {
  await page.getByRole('heading', { name: 'Данные пациента' }).waitFor()

  // На шаге 3 в форме есть:
  // - input[type="text"] для имени (placeholder "Иванова Мария Ивановна")
  // - input[type="tel"] для телефона
  const nameInput = page.getByPlaceholder('Иванова Мария Ивановна')
  await nameInput.fill(patientName)

  const phoneInput = page.locator('input[type="tel"]').first()
  await phoneInput.fill(patientPhone)

  const nextButton = page.getByRole('button', { name: /Далее\s*→/ })
  await nextButton.click()
}

export async function confirmAppointment(page: Page) {
  await page.getByRole('heading', { name: 'Подтвердите запись' }).waitFor()
  await page.getByRole('button', { name: 'Подтвердить запись' }).click()
  await page.getByRole('heading', { name: 'Вы записаны!' }).waitFor()
}

export async function createAppointmentFlow(
  page: Page,
  params: {
    patientName: string
    patientPhone: string
    stubTelegram?: boolean
    request?: APIRequestContext
    preferDoctorlessService?: boolean
  },
): Promise<{ serviceName: string; selectedDate: string; selectedTime: string }> {
  if (params.stubTelegram) {
    await stubTelegramForUnlinkedUser(page)
  }

  let serviceName: string
  let serviceId: string | null = null
  if (params.request && params.preferDoctorlessService !== false) {
    // Стабильнее всего выбирать doctorless услугу по данным API,
    // потому что названия в UI могут отличаться/кодироваться по-разному.
    const servicesRes = await params.request.get('http://localhost:8000/services/')
    const services = (await servicesRes.json()) as Array<{ id: string; name: string; doctor_id: string | null }>
    const doctorless = services.find(s => !s.doctor_id) ?? services[0]
    if (!doctorless) throw new Error('Не удалось получить список doctorless услуг')

    serviceName = doctorless.name
    serviceId = doctorless.id
    await page.goto(`/booking?serviceId=${encodeURIComponent(doctorless.id)}`)
  } else {
    const selected = await selectServiceAndProceed(page)
    serviceName = selected.serviceName
  }

  // Выбор слота:
  // - если есть APIRequestContext и мы знаем serviceId — выбираем доступный слот по данным /services/:id/schedule,
  //   чтобы тест не зависел от заполненности БД;
  // - иначе fallback на "кликаем куда получится" по UI.
  let selectedDate: string
  let selectedTime: string
  if (params.request && serviceId) {
    // Гарантируем, что у услуги будет хотя бы один слот (его задаёт админ).
    await ensureServiceAvailability(params.request, serviceId)

    const scheduleRes = await params.request.get(`http://localhost:8000/services/${encodeURIComponent(serviceId)}/schedule`)
    if (!scheduleRes.ok()) {
      const body = await scheduleRes.text()
      throw new Error(`Не удалось получить schedule услуги: status=${scheduleRes.status()} body=${body}`)
    }
    const schedule = (await scheduleRes.json()) as Array<{
      date: string
      label: string
      slots: Array<{ time: string; available: boolean }>
    }>

    const day = schedule.find(d => d.slots.some(s => s.available))
    if (!day) throw new Error('В schedule не найдено ни одного доступного слота')
    const slot = day.slots.find(s => s.available)!

    await page.getByRole('heading', { name: 'Выберите дату и время' }).waitFor()
    const step2Root = page.getByRole('heading', { name: 'Выберите дату и время' }).locator('xpath=..')
    const labelSecondPart = day.label.split(', ')[1] ?? day.label

    await step2Root.locator('button').filter({ hasText: labelSecondPart }).first().click()
    const slotBtn = step2Root.getByRole('button', { name: slot.time }).first()
    try {
      await slotBtn.waitFor({ state: 'visible', timeout: 12_000 })
      await slotBtn.click({ timeout: 5_000 })
    } catch {
      // Fallback: выбираем любой первый доступный тайм-слот, если UI перерисовался.
      const timeButtons = step2Root
        .locator('button')
        .filter({ hasText: /\d{2}:\d{2}/ })
      const timeCount = await timeButtons.count()
      for (let i = 0; i < timeCount; i++) {
        const btn = timeButtons.nth(i)
        const isDisabled = await btn.evaluate((el: HTMLElement) => (el as HTMLButtonElement).disabled)
        if (isDisabled) continue
        await btn.click({ timeout: 5_000 })
        break
      }
    }

    selectedDate = day.date
    selectedTime = slot.time

    const nextButton = page.getByRole('button', { name: /Далее\s*→/ })
    await nextButton.click()
  } else {
    const picked = await selectDateTimeAndProceed(page)
    selectedDate = picked.selectedDate
    selectedTime = picked.selectedTime
  }

  // Если пользователь авторизован, UI может пропустить шаг 3 и перейти сразу к шагу 4.
  // Поэтому заполняем шаг 3 только если он реально виден.
  const patientStepHeading = page.getByRole('heading', { name: 'Данные пациента' })
  const patientStepVisible = await patientStepHeading.isVisible().catch(() => false)
  if (patientStepVisible) {
    await fillPatientAndProceed(page, params.patientName, params.patientPhone)
  }

  await confirmAppointment(page)

  return { serviceName, selectedDate, selectedTime }
}

