import axios from 'axios'
import { emitSimulationTime, nowDateTime, normalizeTimestamp, resolveSimulationTime, withUnifiedTime } from '../utils/simulationTime'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://127.0.0.1:8014' : '')
const ENABLE_MOCK = String(import.meta.env.VITE_ENABLE_MOCK || '').toLowerCase() === 'true'

const request = axios.create({
  baseURL: API_BASE_URL,
  timeout: 6000
})

const deviceState = {
  light: true,
  ac: true,
  ventilation: true,
  curtain: true,
  multimedia: true
}

function statusByValue(key, value) {
  const rules = {
    temperature: [28, 30],
    humidity: [70, 75],
    co2: [1000, 1500],
    pm25: [55, 75],
    noise: [60, 70],
    people_count: [50, 55]
  }
  const [warning, danger] = rules[key] || [999, 999]
  if (value >= danger) return 'danger'
  if (value >= warning) return 'warning'
  return 'normal'
}

function latestMock() {
  const tick = Math.floor(Date.now() / 1000)
  const co2 = Math.round(deviceState.ventilation ? 980 + Math.sin(tick / 18) * 80 : 1450 + Math.sin(tick / 16) * 120)
  const temperature = Number((deviceState.ac ? 26.1 + Math.sin(tick / 24) * 0.6 : 28.6 + Math.sin(tick / 20) * 1.2).toFixed(1))
  const peopleCount = Math.round(42 + Math.sin(tick / 22) * 8)
  const time = nowDateTime()

  const state = {
    classroom_id: 'A205',
    classroomId: 'A205',
    temperature,
    humidity: Number((62 + Math.sin(tick / 30) * 6).toFixed(1)),
    co2,
    light: Math.round(deviceState.light ? 720 + Math.sin(tick / 20) * 80 : 120 + Math.sin(tick / 20) * 30),
    pm25: Math.round(34 + Math.sin(tick / 26) * 8),
    noise: Math.round(52 + Math.sin(tick / 15) * 9),
    people_count: peopleCount,
    peopleCount,
    energy: Number((12.4 + Math.sin(tick / 28) * 1.2 + (deviceState.ac ? 2.2 : 0.3) + (deviceState.ventilation ? 1.1 : 0.2)).toFixed(1)),
    light_status: deviceState.light ? 'on' : 'off',
    ac_status: deviceState.ac ? 'on' : 'off',
    ventilation_status: deviceState.ventilation ? 'on' : 'off',
    curtain_status: deviceState.curtain ? 'on' : 'off',
    multimedia_status: deviceState.multimedia ? 'on' : 'off',
    update_time: time,
    updatedAt: time,
    currentTime: time,
    generatedAt: time
  }

  state.status = ['temperature', 'humidity', 'co2', 'pm25', 'noise', 'people_count'].some((key) => statusByValue(key, state[key]) === 'danger')
    ? 'danger'
    : ['temperature', 'humidity', 'co2', 'pm25', 'noise', 'people_count'].some((key) => statusByValue(key, state[key]) === 'warning')
      ? 'warning'
      : 'normal'

  return state
}

function historyMock(length = 48) {
  const result = []
  const now = Date.now()

  for (let index = length - 1; index >= 0; index -= 1) {
    const pointTime = new Date(now - index * 30 * 60 * 1000)
    const hour = pointTime.getHours()
    const minute = pointTime.getMinutes()
    const active = hour >= 8 && hour <= 21
    const wave = Math.sin((length - index) / 5)
    const peopleCount = Math.max(8, Math.round((active ? 38 : 10) + Math.sin(index / 4) * 18))
    const updatedAt = normalizeTimestamp(pointTime.toISOString())

    result.push({
      time: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(pointTime.getSeconds()).padStart(2, '0')}`,
      date: updatedAt.slice(5, 10),
      updatedAt,
      update_time: updatedAt,
      generatedAt: updatedAt,
      currentTime: updatedAt,
      temperature: Number((24.8 + wave * 2.1 + (active ? 1.2 : 0)).toFixed(1)),
      humidity: Number((58 + Math.cos(index / 6) * 8).toFixed(1)),
      co2: Math.round(820 + (active ? 420 : 120) + Math.sin(index / 4) * 180),
      light: Math.round(680 + Math.sin(index / 6) * 120 + (active ? 80 : -220)),
      pm25: Math.round(34 + Math.sin(index / 5) * 18 + (active ? 5 : 0)),
      noise: Math.round(46 + Math.sin(index / 7) * 10 + (active ? 6 : 0)),
      people_count: peopleCount,
      peopleCount,
      energy: Number((8.6 + (active ? 4.2 : 1.2) + Math.sin(index / 5) * 1.4).toFixed(1))
    })
  }

  return result
}

function alarmMock() {
  const latest = latestMock()
  const now = resolveSimulationTime(latest)
  return [
    {
      id: `co2-${now}`,
      time: now,
      classroom_id: 'A205',
      type: '空气质量报警',
      level: latest.co2 > 1500 ? 'danger' : 'warning',
      content: `CO2 ${latest.co2} ppm`,
      value: latest.co2,
      status: '未处理'
    }
  ]
}

function aiMock() {
  const latest = latestMock()
  const analysisTime = resolveSimulationTime(latest)
  const result = {
    summary: '当前教室环境存在轻微波动，建议联动空调与新风优化舒适度和能耗。',
    riskLevel: latest.co2 > 1000 || latest.temperature > 30 ? '中' : '低',
    problems: [
      `CO2 当前 ${latest.co2} ppm`,
      `温度当前 ${latest.temperature}°C`
    ],
    suggestions: [
      '空调维持 26°C 运行',
      '新风保持中速，持续降低 CO2',
      '照明根据自然光自动调光'
    ],
    deviceActions: [
      { device: '空调', action: '设为 26°C', reason: '控制温度波动' },
      { device: '新风', action: '中速运行', reason: '降低 CO2' },
      { device: '灯光', action: '亮度 80%', reason: '兼顾照明和节能' }
    ]
  }

  return {
    classroom_id: latest.classroom_id,
    mode: 'mock',
    fallback: true,
    result,
    analysisTime,
    update_time: analysisTime,
    updatedAt: analysisTime,
    currentTime: analysisTime,
    generatedAt: analysisTime,
    analysis: [
      `总体分析：${result.summary}`,
      `风险等级：${result.riskLevel}`,
      `问题：${result.problems.join('；')}`,
      `建议：${result.suggestions.join('；')}`
    ].join('\n\n')
  }
}

function normalizeLatestPayload(payload) {
  const normalized = withUnifiedTime(payload || {}, resolveSimulationTime(payload))
  emitSimulationTime(normalized.updatedAt)
  return normalized
}

function normalizeHistoryPoint(item, fallbackTime) {
  const baseTime = resolveSimulationTime(item) || normalizeTimestamp(fallbackTime) || nowDateTime()
  const normalized = withUnifiedTime(item || {}, baseTime)
  const peopleCount = normalized.peopleCount ?? normalized.people_count ?? 0
  return {
    ...normalized,
    time: String(normalized.time || normalized.updatedAt.split(' ')[1]).slice(0, 8),
    date: normalized.date || normalized.updatedAt.slice(5, 10),
    peopleCount,
    people_count: peopleCount
  }
}

function normalizeHistoryPayload(list) {
  if (!Array.isArray(list)) return []
  const normalized = list.map((item, index) => {
    const prev = index > 0 ? resolveSimulationTime(list[index - 1]) : ''
    return normalizeHistoryPoint(item, prev)
  })
  const lastTime = resolveSimulationTime(normalized[normalized.length - 1])
  if (lastTime) emitSimulationTime(lastTime)
  return normalized
}

function normalizeAlarmPayload(list, fallbackTime = '') {
  if (!Array.isArray(list)) return []
  return list.map((item) => {
    const time = normalizeTimestamp(item?.time) || normalizeTimestamp(fallbackTime) || nowDateTime()
    return {
      ...item,
      time
    }
  })
}

function normalizeAiPayload(payload, fallbackTime = '') {
  const normalized = payload || {}
  const analysisTime =
    normalizeTimestamp(normalized.analysisTime) ||
    resolveSimulationTime(normalized) ||
    normalizeTimestamp(fallbackTime) ||
    nowDateTime()

  emitSimulationTime(analysisTime)

  return {
    ...withUnifiedTime(normalized, analysisTime),
    analysisTime
  }
}

async function apiGet(path, fallback) {
  try {
    const response = await request.get(path)
    if (response.data?.code === 200) return response.data.data
    throw new Error(response.data?.message || 'API response error')
  } catch (error) {
    if (ENABLE_MOCK) return fallback()
    throw error
  }
}

async function apiPost(path, body, fallback) {
  try {
    const response = await request.post(path, body)
    if (response.data?.code === 200) return response.data.data
    throw new Error(response.data?.message || 'API response error')
  } catch (error) {
    if (ENABLE_MOCK) return fallback(body)
    throw error
  }
}

export function getLatestClassroom() {
  return apiGet('/api/classroom/latest', latestMock).then((data) => normalizeLatestPayload(data))
}

export function getHistoryData() {
  return apiGet('/api/classroom/history', historyMock).then((data) => normalizeHistoryPayload(data))
}

export function getAlarmList() {
  return apiGet('/api/alarm/list', alarmMock).then((data) => normalizeAlarmPayload(data))
}

export async function analyzeAi(payload = { classroom_id: 'A205' }) {
  const latest = await getLatestClassroom().catch(() => ({}))
  const fallbackTime = resolveSimulationTime(latest)

  try {
    const response = await request.post('/api/ai/analyze', payload, { timeout: 45000 })
    if (response.data?.code === 200) {
      return normalizeAiPayload(response.data.data, fallbackTime)
    }
    throw new Error(response.data?.message || 'AI analyze response error')
  } catch (error) {
    if (!ENABLE_MOCK) throw error
    const fallback = aiMock()
    fallback.errorMessage = error?.message || 'AI analyze unavailable'
    return normalizeAiPayload(fallback, fallbackTime)
  }
}

export function controlDevice(payload) {
  return apiPost('/api/device/control', payload, (body) => {
    const deviceMap = { ac: 'ac', airConditioner: 'ac', ventilation: 'ventilation', freshAir: 'ventilation', light: 'light' }
    const key = deviceMap[body?.device]
    if (key) {
      deviceState[key] = body.action === 'on'
    }
    return {
      classroom_id: body?.classroom_id || 'A205',
      device: body?.device,
      action: body?.action,
      latest: latestMock(),
      light_status: deviceState.light ? 'on' : 'off',
      ac_status: deviceState.ac ? 'on' : 'off',
      ventilation_status: deviceState.ventilation ? 'on' : 'off'
    }
  }).then((data) => ({
    ...data,
    latest: normalizeLatestPayload(data?.latest || {})
  }))
}

export function getMockHistory(length) {
  return historyMock(length)
}

export function getMockAlarms() {
  return alarmMock()
}

export default request
