const HISTORY_LIMIT = 160
const ALARM_LIMIT = 80
const TICK_SECONDS = 3
const TICK_MS = TICK_SECONDS * 1000
const SIM_TIMEZONE = 'Asia/Shanghai'
const HISTORY_SYNC_TOLERANCE_MS = 1500

export const classroomState = {
  classroomId: 'A205',
  temperature: 27.2,
  humidity: 61.5,
  co2: 920,
  light: 720,
  peopleCount: 42,
  energy: 12.8,
  pm25: 32,
  noise: 51,
  devices: {
    light: { on: true, online: true, brightness: 80 },
    airConditioner: { on: true, online: true, targetTemperature: 26, mode: 'cool' },
    freshAir: { on: true, online: true, speed: 'mid' },
    curtain: { on: true, online: true, opening: 60 },
    multimedia: { on: true, online: true, volume: 58 }
  },
  currentTime: '',
  updatedAt: '',
  generatedAt: ''
}

const historyData = []
const alarmRecords = []
let lastTickAt = Date.now()
let lastHistoryAt = 0
syncStateTime(lastTickAt)

seedHistory()

export function getLatestClassroom() {
  advanceSimulation()
  return serializeState()
}

export function getHistoryData(limit = 72) {
  advanceSimulation()
  ensureHistorySynced()
  return historyData.slice(-Number(limit || 72))
}

export function getAlarmList() {
  advanceSimulation()
  appendCurrentAlarms()
  return alarmRecords.slice(0, ALARM_LIMIT)
}

export function controlDevice(payload = {}) {
  advanceSimulation()
  const key = normalizeDeviceKey(payload.device)
  if (!key || !classroomState.devices[key]) {
    return {
      mode: 'mock',
      classroom_id: classroomState.classroomId,
      message: `unsupported device: ${payload.device || ''}`,
      latest: serializeState()
    }
  }

  const device = classroomState.devices[key]
  const action = String(payload.action || '').toLowerCase()
  if (action === 'offline') device.online = false
  if (action === 'online') device.online = true
  if (action === 'on') {
    device.on = true
    device.online = true
  }
  if (action === 'off') device.on = false

  applyDevicePayload(key, device, payload)
  syncStateTime(lastTickAt)
  appendHistoryPoint(lastTickAt)
  appendCurrentAlarms()

  return {
    classroom_id: classroomState.classroomId,
    classroomId: classroomState.classroomId,
    device: payload.device,
    normalizedDevice: key,
    action,
    latest: serializeState(),
    ...deviceStatuses()
  }
}

export function buildAnalysisContext() {
  advanceSimulation()
  appendCurrentAlarms()
  return {
    classroomState: serializeState(),
    history: getHistoryData(36),
    alarms: alarmRecords.slice(0, 12)
  }
}

function advanceSimulation() {
  const now = Date.now()
  const elapsed = now - lastTickAt
  const steps = Math.min(10, Math.floor(elapsed / TICK_MS))
  if (steps <= 0) {
    syncStateTime(lastTickAt)
    return
  }

  for (let index = 0; index < steps; index += 1) {
    lastTickAt += TICK_MS
    simulateStep(lastTickAt)
    syncStateTime(lastTickAt)
  }
  if (now - lastHistoryAt >= 5000) appendHistoryPoint(lastTickAt)
}

function simulateStep(tickMs) {
  const now = new Date(tickMs)
  const hour = getHourInTimezone(now, SIM_TIMEZONE)
  const activeScore = hour >= 8 && hour <= 21 ? 1 : 0.2
  const classWave = Math.sin(tickMs / 1000 / 95)
  const peopleTarget = activeScore ? 38 + classWave * 9 + smoothNoise(3) : 9 + smoothNoise(2)

  classroomState.peopleCount = Math.round(approach(classroomState.peopleCount, peopleTarget, 0.08, 3, 60))

  const ac = classroomState.devices.airConditioner
  const freshAir = classroomState.devices.freshAir
  const light = classroomState.devices.light
  const curtain = classroomState.devices.curtain
  const multimedia = classroomState.devices.multimedia

  const ambientTemperature = 27.5 + Math.sin(tickMs / 1000 / 180) * 1.7 + classroomState.peopleCount * 0.025
  const temperatureTarget = ac.on && ac.online ? ac.targetTemperature : ambientTemperature + (light.on ? 0.25 : 0)
  classroomState.temperature = round1(approach(classroomState.temperature, temperatureTarget, ac.on && ac.online ? 0.13 : 0.045, 22, 33.5))

  const humidityTarget = 58 + Math.cos(tickMs / 1000 / 150) * 6 + (freshAir.on && freshAir.online ? -2.5 : 3)
  classroomState.humidity = round1(approach(classroomState.humidity, humidityTarget, 0.055, 38, 82))

  const co2Target = 520 + classroomState.peopleCount * 13 + (freshAir.on && freshAir.online ? -160 : 330)
  classroomState.co2 = Math.round(approach(classroomState.co2, co2Target, freshAir.on && freshAir.online ? 0.18 : 0.075, 430, 1900))

  const lightTarget = (light.on && light.online ? light.brightness * 9 : 80) + (curtain.online ? curtain.opening * 2.4 : 0)
  classroomState.light = Math.round(approach(classroomState.light, lightTarget, 0.16, 40, 1150))

  const pm25Target = 28 + (freshAir.on && freshAir.online ? -4 : 12) + Math.max(classroomState.peopleCount - 42, 0) * 0.22
  classroomState.pm25 = Math.round(approach(classroomState.pm25, pm25Target, 0.07, 12, 95))

  const noiseTarget = 37 + classroomState.peopleCount * 0.38 + (multimedia.on && multimedia.online ? multimedia.volume * 0.05 : 0)
  classroomState.noise = Math.round(approach(classroomState.noise, noiseTarget, 0.1, 32, 78))

  const energyTarget =
    4.8 +
    classroomState.peopleCount * 0.055 +
    (light.on && light.online ? light.brightness * 0.018 : 0.2) +
    (ac.on && ac.online ? 3.1 + Math.max(classroomState.temperature - ac.targetTemperature, 0) * 0.35 : 0.35) +
    (freshAir.on && freshAir.online ? 1.4 : 0.2) +
    (curtain.on && curtain.online ? 0.25 : 0.08) +
    (multimedia.on && multimedia.online ? multimedia.volume * 0.017 : 0.1)
  classroomState.energy = round1(approach(classroomState.energy, energyTarget, 0.12, 3, 28))

  if (tickMs > 0) {
    Object.values(classroomState.devices).forEach((device) => {
      if (Math.random() < 0.0003) device.online = false
    })
  }
}

function appendHistoryPoint(timestampMs = lastTickAt) {
  const item = historyItem(timestampMs)
  if (historyData.length && historyData[historyData.length - 1].generatedAt === item.generatedAt) return
  historyData.push(item)
  if (historyData.length > HISTORY_LIMIT) historyData.splice(0, historyData.length - HISTORY_LIMIT)
  lastHistoryAt = timestampMs
}

function appendCurrentAlarms() {
  const alarms = buildCurrentAlarms()
  alarms.forEach((alarm) => {
    const key = `${alarm.type}-${alarm.classroom_id}`
    const exists = alarmRecords.find((item) => item.key === key && item.status === '未处理')
    if (exists) {
      exists.time = alarm.time
      exists.content = alarm.content
      exists.value = alarm.value
      return
    }
    alarmRecords.unshift({ ...alarm, key, id: `${key}-${alarm.generatedAt || classroomState.generatedAt}` })
  })
  if (alarmRecords.length > ALARM_LIMIT) alarmRecords.splice(ALARM_LIMIT)
}

function buildCurrentAlarms() {
  const now = classroomState.currentTime
  const records = []
  if (classroomState.co2 > 1000) {
    records.push({
      time: now,
      classroom_id: classroomState.classroomId,
      type: '空气质量报警',
      level: classroomState.co2 > 1500 ? 'danger' : 'warning',
      value: classroomState.co2,
      content: `CO2 当前 ${classroomState.co2} ppm，超过 1000 ppm，建议开启或提高新风。`,
      status: '未处理'
    })
  }
  if (classroomState.temperature > 30) {
    records.push({
      time: now,
      classroom_id: classroomState.classroomId,
      type: '温度异常报警',
      level: 'danger',
      value: classroomState.temperature,
      content: `温度当前 ${classroomState.temperature} ℃，超过 30 ℃，建议开启空调制冷。`,
      status: '未处理'
    })
  }
  if (classroomState.energy > 16) {
    records.push({
      time: now,
      classroom_id: classroomState.classroomId,
      type: '能耗异常报警',
      level: classroomState.energy > 20 ? 'danger' : 'warning',
      value: classroomState.energy,
      content: `当前能耗 ${classroomState.energy} kWh，高于演示阈值 16 kWh，建议启用节能策略。`,
      status: '未处理'
    })
  }
  Object.entries(classroomState.devices).forEach(([key, device]) => {
    if (!device.online) {
      records.push({
        time: now,
        classroom_id: classroomState.classroomId,
        type: '设备异常报警',
        level: 'danger',
        value: key,
        content: `${deviceLabel(key)} 离线，请检查网关或设备电源。`,
        status: '未处理'
      })
    }
  })
  return records.map((item) => ({
    ...item,
    currentTime: now,
    updatedAt: now,
    generatedAt: now
  }))
}

function seedHistory() {
  const nowMs = Date.now()
  const savedTick = lastTickAt
  const start = Date.now() - 72 * 5 * 60 * 1000
  for (let index = 0; index < 72; index += 1) {
    const t = start + index * 5 * 60 * 1000
    lastTickAt = t
    simulateStep(t)
    syncStateTime(t)
    historyData.push(historyItem(t))
  }
  lastTickAt = Math.max(savedTick, nowMs)
  syncStateTime(lastTickAt)
  lastHistoryAt = lastTickAt
}

function historyItem(timestampMs = lastTickAt) {
  const date = new Date(timestampMs)
  const stamp = formatDate(date)
  return {
    time: formatTime(date),
    date: formatMonthDay(date),
    currentTime: stamp,
    updatedAt: stamp,
    update_time: stamp,
    generatedAt: stamp,
    classroom_id: classroomState.classroomId,
    classroomId: classroomState.classroomId,
    temperature: classroomState.temperature,
    humidity: classroomState.humidity,
    co2: classroomState.co2,
    light: classroomState.light,
    peopleCount: classroomState.peopleCount,
    people_count: classroomState.peopleCount,
    energy: classroomState.energy,
    pm25: classroomState.pm25,
    noise: classroomState.noise
  }
}

function serializeState() {
  const serializedDevices = JSON.parse(JSON.stringify(classroomState.devices))
  return {
    classroomId: classroomState.classroomId,
    classroom_id: classroomState.classroomId,
    temperature: classroomState.temperature,
    humidity: classroomState.humidity,
    co2: classroomState.co2,
    light: classroomState.light,
    peopleCount: classroomState.peopleCount,
    people_count: classroomState.peopleCount,
    energy: classroomState.energy,
    pm25: classroomState.pm25,
    noise: classroomState.noise,
    devices: serializedDevices,
    currentTime: classroomState.currentTime,
    updatedAt: classroomState.updatedAt,
    generatedAt: classroomState.generatedAt,
    update_time: classroomState.updatedAt,
    status: statusByState(),
    ...deviceStatuses()
  }
}

function deviceStatuses() {
  return {
    light_status: classroomState.devices.light.on && classroomState.devices.light.online ? 'on' : 'off',
    ac_status: classroomState.devices.airConditioner.on && classroomState.devices.airConditioner.online ? 'on' : 'off',
    ventilation_status: classroomState.devices.freshAir.on && classroomState.devices.freshAir.online ? 'on' : 'off',
    curtain_status: classroomState.devices.curtain.on && classroomState.devices.curtain.online ? 'on' : 'off',
    multimedia_status: classroomState.devices.multimedia.on && classroomState.devices.multimedia.online ? 'on' : 'off'
  }
}

function statusByState() {
  if (classroomState.co2 > 1500 || classroomState.temperature > 30 || classroomState.energy > 20) return 'danger'
  if (classroomState.co2 > 1000 || classroomState.temperature > 28 || classroomState.energy > 16) return 'warning'
  return 'normal'
}

function applyDevicePayload(key, device, payload) {
  if (key === 'light' && Number.isFinite(Number(payload.brightness))) {
    device.brightness = clamp(Number(payload.brightness), 0, 100)
    device.on = device.brightness > 0
  }
  if (key === 'airConditioner') {
    if (Number.isFinite(Number(payload.temperature))) device.targetTemperature = clamp(Number(payload.temperature), 18, 30)
    if (payload.mode) device.mode = String(payload.mode)
  }
  if (key === 'freshAir' && payload.speed) device.speed = String(payload.speed)
  if (key === 'curtain' && Number.isFinite(Number(payload.opening))) {
    device.opening = clamp(Number(payload.opening), 0, 100)
    device.on = device.opening > 0
  }
  if (key === 'multimedia' && Number.isFinite(Number(payload.volume))) {
    device.volume = clamp(Number(payload.volume), 0, 100)
    device.on = device.volume > 0
  }
}

function normalizeDeviceKey(device) {
  const value = String(device || '').toLowerCase()
  const map = {
    light: 'light',
    lamp: 'light',
    ac: 'airConditioner',
    airconditioner: 'airConditioner',
    air_conditioner: 'airConditioner',
    ventilation: 'freshAir',
    freshair: 'freshAir',
    fresh_air: 'freshAir',
    curtain: 'curtain',
    media: 'multimedia',
    multimedia: 'multimedia'
  }
  return map[value]
}

function deviceLabel(key) {
  return {
    light: '灯光系统',
    airConditioner: '空调系统',
    freshAir: '新风系统',
    curtain: '窗帘系统',
    multimedia: '多媒体设备'
  }[key] || key
}

function approach(current, target, ratio, min, max) {
  const next = current + (target - current) * ratio + smoothNoise(0.18)
  return clamp(next, min, max)
}

function smoothNoise(scale) {
  return (Math.random() - 0.5) * scale
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function round1(value) {
  return Math.round(value * 10) / 10
}

function syncStateTime(timestampMs) {
  const date = new Date(timestampMs)
  const stamp = formatDate(date)
  classroomState.currentTime = stamp
  classroomState.updatedAt = stamp
  classroomState.generatedAt = stamp
}

function ensureHistorySynced() {
  if (!historyData.length) {
    appendHistoryPoint(lastTickAt)
    return
  }
  const last = historyData[historyData.length - 1]
  const lastMs = parseDateTime(last.generatedAt)
  const currentMs = parseDateTime(classroomState.generatedAt)
  if (!Number.isFinite(lastMs) || !Number.isFinite(currentMs) || Math.abs(currentMs - lastMs) > HISTORY_SYNC_TOLERANCE_MS) {
    appendHistoryPoint(lastTickAt)
  }
}

function formatDate(date) {
  const parts = getTimeParts(date, SIM_TIMEZONE)
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`
}

function formatTime(date) {
  const parts = getTimeParts(date, SIM_TIMEZONE)
  return `${parts.hour}:${parts.minute}:${parts.second}`
}

function formatMonthDay(date) {
  const parts = getTimeParts(date, SIM_TIMEZONE)
  return `${parts.month}-${parts.day}`
}

function getHourInTimezone(date, timezone) {
  return Number(getTimeParts(date, timezone).hour) + Number(getTimeParts(date, timezone).minute) / 60
}

function getTimeParts(date, timezone) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })
  const map = {}
  formatter.formatToParts(date).forEach((part) => {
    if (part.type !== 'literal') map[part.type] = part.value
  })
  return map
}

function parseDateTime(value) {
  if (!value) return NaN
  const normalized = String(value).replace(' ', 'T')
  const ms = Date.parse(normalized)
  return Number.isFinite(ms) ? ms : NaN
}

export function getSimulationTime() {
  const timestampMs = parseDateTime(classroomState.generatedAt)
  return {
    currentTime: classroomState.currentTime,
    updatedAt: classroomState.updatedAt,
    generatedAt: classroomState.generatedAt,
    timestampMs: Number.isFinite(timestampMs) ? timestampMs : lastTickAt
  }
}
