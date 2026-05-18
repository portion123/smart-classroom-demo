export const SIM_TIME_EVENT = 'smart-classroom-time-updated'

export function normalizeTimestamp(value) {
  if (!value) return ''
  if (typeof value === 'number' && Number.isFinite(value)) {
    return formatDateTime(new Date(value))
  }
  const text = String(value).trim()
  if (!text) return ''
  return text.replace('T', ' ').slice(0, 19)
}

export function resolveSimulationTime(payload) {
  if (!payload || typeof payload !== 'object') return ''
  return normalizeTimestamp(
    payload.updatedAt ||
      payload.update_time ||
      payload.currentTime ||
      payload.generatedAt ||
      payload.analysisTime ||
      payload.time
  )
}

export function parseTimeMs(value) {
  const normalized = normalizeTimestamp(value)
  if (!normalized) return NaN
  const ms = Date.parse(normalized.replace(' ', 'T'))
  return Number.isFinite(ms) ? ms : NaN
}

export function formatDateTime(date) {
  const pad = (num) => String(num).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

export function nowDateTime() {
  return formatDateTime(new Date())
}

export function formatClockTime(value) {
  const ms = parseTimeMs(value)
  const date = Number.isFinite(ms) ? new Date(ms) : new Date()
  const week = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'][date.getDay()]
  return `${formatDateTime(date)}  ${week}`
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
