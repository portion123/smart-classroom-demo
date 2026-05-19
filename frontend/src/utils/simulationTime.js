export const SIM_TIME_EVENT = 'smart-classroom-time-updated'
export const TIME_ZONE = 'Asia/Shanghai'

const dateTimeFormatter = new Intl.DateTimeFormat('zh-CN', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false
})

const weekdayFormatter = new Intl.DateTimeFormat('zh-CN', {
  timeZone: TIME_ZONE,
  weekday: 'long'
})

const timeFormatter = new Intl.DateTimeFormat('zh-CN', {
  timeZone: TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false
})

function dateFromValue(value) {
  if (!value) return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  if (typeof value === 'number' && Number.isFinite(value)) return new Date(value)

  const text = String(value).trim()
  if (!text) return null
  if (/^\d{2}:\d{2}(:\d{2})?$/.test(text)) {
    const today = formatDateTime(new Date()).slice(0, 10)
    const withSeconds = text.length === 5 ? `${text}:00` : text
    return new Date(`${today}T${withSeconds}+08:00`)
  }
  const normalized = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(text)
    ? `${text.replace(' ', 'T')}+08:00`
    : text
  const parsed = new Date(normalized)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function partsMap(formatter, date) {
  return Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]))
}

export function formatDateTime(value = new Date()) {
  const date = dateFromValue(value) || new Date()
  const parts = partsMap(dateTimeFormatter, date)
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`
}

export function formatTime(value = new Date()) {
  const date = dateFromValue(value) || new Date()
  return timeFormatter.format(date).replace(/\//g, '-')
}

export function getWeekday(value = new Date()) {
  const date = dateFromValue(value) || new Date()
  return weekdayFormatter.format(date)
}

export function nowDateTime() {
  return formatDateTime(new Date())
}

export function normalizeTimestamp(value) {
  const date = dateFromValue(value)
  return date ? formatDateTime(date) : ''
}

export function resolveSimulationTime(payload) {
  if (!payload || typeof payload !== 'object') return ''
  return normalizeTimestamp(
    payload.updatedAt ||
      payload.update_time ||
      payload.currentTime ||
      payload.generatedAt ||
      payload.analysisTime ||
      payload.time ||
      payload.createdAt
  )
}

export function parseTimeMs(value) {
  const date = dateFromValue(value)
  return date ? date.getTime() : NaN
}

export function formatClockTime(value = new Date()) {
  const date = dateFromValue(value) || new Date()
  return `${formatDateTime(date)} ${getWeekday(date)}`
}

export function withUnifiedTime(payload, fallbackTime = '') {
  const normalized = resolveSimulationTime(payload) || normalizeTimestamp(fallbackTime) || nowDateTime()
  return {
    ...(payload || {}),
    currentTime: normalized,
    updatedAt: normalized,
    generatedAt: normalized,
    update_time: normalized
  }
}

export function emitSimulationTime(value) {
  const updatedAt = normalizeTimestamp(value)
  if (!updatedAt) return
  window.dispatchEvent(
    new CustomEvent(SIM_TIME_EVENT, {
      detail: {
        updatedAt
      }
    })
  )
}
