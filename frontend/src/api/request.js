import axios from 'axios'
import { emitSimulationTime, nowDateTime, normalizeTimestamp, resolveSimulationTime, withUnifiedTime } from '../utils/simulationTime'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://127.0.0.1:8014' : '')
const ENABLE_MOCK = String(import.meta.env.VITE_ENABLE_MOCK || '').toLowerCase() === 'true'
const DEFAULT_CLASSROOM_ID = 'A205'

const request = axios.create({
  baseURL: API_BASE_URL,
  timeout: 6000
})

const classroomProfiles = {
  A205: {
    classroomId: 'A205',
    classroomName: 'A205 教室',
    building: '教学楼 A 栋',
    floor: '2F',
    area: 86,
    capacity: 80,
    peopleBase: 42,
    co2Base: 1030,
    temperatureBase: 26.8,
    humidityBase: 56,
    pm25Base: 24,
    noiseBase: 52,
    lightBase: 690,
    energyBase: 10.6
  },
  B101: {
    classroomId: 'B101',
    classroomName: 'B101 教室',
    building: '教学楼 B 栋',
    floor: '1F',
    area: 78,
    capacity: 72,
    peopleBase: 38,
    co2Base: 720,
    temperatureBase: 24.9,
    humidityBase: 52,
    pm25Base: 18,
    noiseBase: 46,
    lightBase: 720,
    energyBase: 7.8
  },
  B102: {
    classroomId: 'B102',
    classroomName: 'B102 教室',
    building: '教学楼 B 栋',
    floor: '1F',
    area: 64,
    capacity: 54,
    peopleBase: 20,
    co2Base: 560,
    temperatureBase: 24.2,
    humidityBase: 50,
    pm25Base: 15,
    noiseBase: 41,
    lightBase: 520,
    energyBase: 4.9
  },
  C301: {
    classroomId: 'C301',
    classroomName: 'C301 教室',
    building: '综合楼 C 栋',
    floor: '3F',
    area: 96,
    capacity: 90,
    peopleBase: 48,
    co2Base: 860,
    temperatureBase: 26.1,
    humidityBase: 58,
    pm25Base: 52,
    noiseBase: 63,
    lightBase: 650,
    energyBase: 10.2
  }
}

const defaultDeviceState = {
  light: true,
  ac: true,
  ventilation: true,
  curtain: true,
  multimedia: true
}

const mockDeviceStates = new Map()

function normalizeClassroomId(classroomId = DEFAULT_CLASSROOM_ID) {
  const normalized = String(classroomId || DEFAULT_CLASSROOM_ID).trim().toUpperCase()
  return classroomProfiles[normalized] ? normalized : DEFAULT_CLASSROOM_ID
}

function classroomQuery(classroomId) {
  return `classroomId=${encodeURIComponent(normalizeClassroomId(classroomId))}`
}

function getMockDeviceState(classroomId = DEFAULT_CLASSROOM_ID) {
  const id = normalizeClassroomId(classroomId)
  if (!mockDeviceStates.has(id)) {
    const base = { ...defaultDeviceState }
    if (id === 'B102') {
      base.ac = false
      base.multimedia = false
    }
    if (id === 'C301') {
      base.multimedia = true
    }
    mockDeviceStates.set(id, base)
  }
  return mockDeviceStates.get(id)
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

function latestMock(classroomId = DEFAULT_CLASSROOM_ID) {
  const id = normalizeClassroomId(classroomId)
  const profile = classroomProfiles[id]
  const deviceState = getMockDeviceState(id)
  const tick = Math.floor(Date.now() / 1000)
  const seed = Object.keys(classroomProfiles).indexOf(id) + 1
  const peopleCount = Math.max(0, Math.round(profile.peopleBase + Math.sin(tick / 22 + seed) * 6))
  const co2 = Math.round(profile.co2Base + peopleCount * 5 + (deviceState.ventilation ? -120 : 210) + Math.sin(tick / 18 + seed) * 45)
  const temperature = Number((profile.temperatureBase + (deviceState.ac ? -0.8 : 1.2) + Math.sin(tick / 24 + seed) * 0.6).toFixed(1))
  const time = nowDateTime()

  const state = {
    ...profile,
    classroom_id: id,
    classroomId: id,
    name: profile.classroomName,
    temperature,
    humidity: Number((profile.humidityBase + Math.sin(tick / 30 + seed) * 4).toFixed(1)),
    co2,
    light: Math.round(deviceState.light ? profile.lightBase + Math.sin(tick / 20 + seed) * 70 : 120 + Math.sin(tick / 20 + seed) * 25),
    pm25: Math.round(profile.pm25Base + Math.sin(tick / 26 + seed) * 6),
    noise: Math.round(profile.noiseBase + Math.sin(tick / 15 + seed) * 5),
    people_count: peopleCount,
    peopleCount,
    energy: Number((profile.energyBase + (deviceState.ac ? 2.0 : 0.3) + (deviceState.ventilation ? 0.9 : 0.2) + peopleCount * 0.03).toFixed(1)),
    light_status: deviceState.light ? 'on' : 'off',
    ac_status: deviceState.ac ? 'on' : 'off',
    ventilation_status: deviceState.ventilation ? 'on' : 'off',
    curtain_status: deviceState.curtain ? 'on' : 'off',
    multimedia_status: deviceState.multimedia ? 'on' : 'off',
    devices: {
      light: { name: '灯光', status: deviceState.light, online: true },
      airConditioner: { name: '空调', status: deviceState.ac, online: true },
      freshAir: { name: '新风', status: deviceState.ventilation, online: true },
      curtain: { name: '窗帘', status: deviceState.curtain, online: true },
      multimedia: { name: '多媒体', status: deviceState.multimedia, online: id !== 'C301' }
    },
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

function historyMock(length = 48, classroomId = DEFAULT_CLASSROOM_ID) {
  const id = normalizeClassroomId(classroomId)
  const profile = classroomProfiles[id]
  const result = []
  const now = Date.now()
  const seed = Object.keys(classroomProfiles).indexOf(id) + 1

  for (let index = length - 1; index >= 0; index -= 1) {
    const pointTime = new Date(now - index * 30 * 60 * 1000)
    const hour = pointTime.getHours()
    const minute = pointTime.getMinutes()
    const active = hour >= 8 && hour <= 21
    const wave = Math.sin((length - index) / 5 + seed)
    const peopleCount = Math.max(0, Math.round((active ? profile.peopleBase : 4) + Math.sin(index / 4 + seed) * 7))
    const updatedAt = normalizeTimestamp(pointTime.toISOString())

    result.push({
      ...profile,
      classroom_id: id,
      classroomId: id,
      name: profile.classroomName,
      time: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(pointTime.getSeconds()).padStart(2, '0')}`,
      date: updatedAt.slice(5, 10),
      updatedAt,
      update_time: updatedAt,
      generatedAt: updatedAt,
      currentTime: updatedAt,
      temperature: Number((profile.temperatureBase + wave * 1.1 + (active ? 0.6 : -0.4)).toFixed(1)),
      humidity: Number((profile.humidityBase + Math.cos(index / 6 + seed) * 5).toFixed(1)),
      co2: Math.round(profile.co2Base + (active ? peopleCount * 6 : 60) + Math.sin(index / 4 + seed) * 70),
      light: Math.round(profile.lightBase + Math.sin(index / 6 + seed) * 90 + (active ? 40 : -220)),
      pm25: Math.round(profile.pm25Base + Math.sin(index / 5 + seed) * 8),
      noise: Math.round(profile.noiseBase + Math.sin(index / 7 + seed) * 6 + (active ? 4 : -4)),
      people_count: peopleCount,
      peopleCount,
      energy: Number((profile.energyBase + (active ? 2.2 : 0.7) + Math.sin(index / 5 + seed) * 0.9).toFixed(1))
    })
  }

  return result
}

function alarmMock(classroomId = DEFAULT_CLASSROOM_ID) {
  const latest = latestMock(classroomId)
  const now = resolveSimulationTime(latest)
  const alarms = []

  if (latest.co2 > 1000) {
    alarms.push({
      id: `${latest.classroomId}-co2-${now}`,
      time: now,
      generatedAt: now,
      classroom_id: latest.classroomId,
      classroomId: latest.classroomId,
      classroomName: latest.classroomName,
      type: '空气质量报警',
      level: latest.co2 > 1500 ? 'danger' : 'warning',
      content: `CO2 ${latest.co2} ppm`,
      message: `CO2 ${latest.co2} ppm`,
      value: latest.co2,
      status: '未处理'
    })
  }

  if (latest.pm25 > 55 || latest.noise > 68) {
    alarms.push({
      id: `${latest.classroomId}-environment-${now}`,
      time: now,
      generatedAt: now,
      classroom_id: latest.classroomId,
      classroomId: latest.classroomId,
      classroomName: latest.classroomName,
      type: latest.pm25 > 55 ? '空气颗粒物报警' : '噪声异常报警',
      level: 'warning',
      content: latest.pm25 > 55 ? `PM2.5 ${latest.pm25}` : `Noise ${latest.noise} dB`,
      message: latest.pm25 > 55 ? `PM2.5 ${latest.pm25}` : `Noise ${latest.noise} dB`,
      value: latest.pm25 > 55 ? latest.pm25 : latest.noise,
      status: '未处理'
    })
  }

  return alarms
}

function aiMock(payload = {}) {
  const classroomId = payload.classroomId || payload.classroom_id || payload?.classroomData?.classroomId || DEFAULT_CLASSROOM_ID
  const latest = latestMock(classroomId)
  const analysisTime = resolveSimulationTime(latest)
  const result = {
    summary: `${latest.classroomName} 当前由动态模拟器生成，温度 ${latest.temperature}C，CO2 ${latest.co2} ppm，能耗 ${latest.energy} kW。`,
    riskLevel: latest.co2 > 1000 || latest.temperature > 30 || latest.pm25 > 55 ? '中' : '低',
    problems: [
      `CO2 当前 ${latest.co2} ppm`,
      `温度当前 ${latest.temperature}C`,
      `能耗当前 ${latest.energy} kW`
    ],
    suggestions: [
      latest.co2 > 1000 ? '开启或提高新风档位，优先降低 CO2。' : '新风保持低速巡航，减少无效能耗。',
      latest.temperature > 28 ? '空调建议设为 26C 并观察 10 分钟趋势。' : '空调维持当前策略。',
      '按人数变化联动照明和多媒体设备，课后自动降档。'
    ],
    deviceActions: [
      { device: '空调', action: latest.temperature > 28 ? '设为 26C' : '保持当前策略', reason: '平衡舒适度和能耗' },
      { device: '新风', action: latest.co2 > 1000 ? '中速运行' : '低速巡航', reason: '根据 CO2 和人数调节空气质量' },
      { device: '灯光', action: latest.light > 850 ? '亮度调整为 75%' : '保持当前亮度', reason: '兼顾照度和节能' }
    ]
  }

  return {
    classroom_id: latest.classroomId,
    classroomId: latest.classroomId,
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
    const time = normalizeTimestamp(item?.time || item?.generatedAt || item?.updatedAt) || normalizeTimestamp(fallbackTime) || nowDateTime()
    return {
      ...item,
      time,
      generatedAt: time,
      updatedAt: item?.updatedAt || time
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

export function getLatestClassroom(classroomId = DEFAULT_CLASSROOM_ID) {
  const id = normalizeClassroomId(classroomId)
  return apiGet(`/api/classroom/latest?${classroomQuery(id)}`, () => latestMock(id)).then((data) => normalizeLatestPayload(data))
}

export function getHistoryData(classroomId = DEFAULT_CLASSROOM_ID, limit = 72) {
  const id = normalizeClassroomId(classroomId)
  return apiGet(`/api/classroom/history?${classroomQuery(id)}&limit=${encodeURIComponent(limit)}`, () => historyMock(48, id)).then((data) => normalizeHistoryPayload(data))
}

export function getAlarmList(classroomId = DEFAULT_CLASSROOM_ID) {
  const id = normalizeClassroomId(classroomId)
  return apiGet(`/api/alarm/list?${classroomQuery(id)}`, () => alarmMock(id)).then((data) => normalizeAlarmPayload(data))
}

export async function analyzeAi(payload = {}) {
  const classroomId = typeof payload === 'string'
    ? payload
    : payload.classroomId || payload.classroom_id || payload?.classroomData?.classroomId || payload?.classroomState?.classroomId || DEFAULT_CLASSROOM_ID
  const id = normalizeClassroomId(classroomId)
  const body = typeof payload === 'string'
    ? { classroomId: id, classroom_id: id }
    : { ...payload, classroomId: id, classroom_id: id }
  const latest = await getLatestClassroom(id).catch(() => ({}))
  const fallbackTime = resolveSimulationTime(latest)

  try {
    const response = await request.post('/api/ai/analyze', body, { timeout: 45000 })
    if (response.data?.code === 200) {
      return normalizeAiPayload(response.data.data, fallbackTime)
    }
    throw new Error(response.data?.message || 'AI analyze response error')
  } catch (error) {
    if (!ENABLE_MOCK) throw error
    const fallback = aiMock(body)
    fallback.errorMessage = error?.message || 'AI analyze unavailable'
    return normalizeAiPayload(fallback, fallbackTime)
  }
}

export function controlDevice(payload = {}) {
  const id = normalizeClassroomId(payload.classroomId || payload.classroom_id || payload.room || DEFAULT_CLASSROOM_ID)
  const body = { ...payload, classroomId: id, classroom_id: id }

  return apiPost('/api/device/control', body, (fallbackBody) => {
    const deviceState = getMockDeviceState(id)
    const deviceMap = {
      ac: 'ac',
      air: 'ac',
      airConditioner: 'ac',
      ventilation: 'ventilation',
      freshAir: 'ventilation',
      fresh_air: 'ventilation',
      light: 'light',
      curtain: 'curtain',
      multimedia: 'multimedia'
    }
    const device = fallbackBody?.device || fallbackBody?.deviceId || fallbackBody?.type
    const key = deviceMap[device]
    const rawAction = fallbackBody?.action ?? fallbackBody?.status ?? fallbackBody?.value
    if (key) {
      deviceState[key] = rawAction === true || rawAction === 1 || rawAction === '1' || rawAction === 'on' || rawAction === 'open'
    }
    return {
      success: true,
      classroom_id: id,
      classroomId: id,
      device,
      action: rawAction,
      latest: latestMock(id),
      light_status: deviceState.light ? 'on' : 'off',
      ac_status: deviceState.ac ? 'on' : 'off',
      ventilation_status: deviceState.ventilation ? 'on' : 'off'
    }
  }).then((data) => ({
    ...data,
    latest: normalizeLatestPayload(data?.latest || latestMock(id))
  }))
}

export function getMockHistory(length, classroomId = DEFAULT_CLASSROOM_ID) {
  return historyMock(length, classroomId)
}

export function getMockAlarms(classroomId = DEFAULT_CLASSROOM_ID) {
  return alarmMock(classroomId)
}

export default request
