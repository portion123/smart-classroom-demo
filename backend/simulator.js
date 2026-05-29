import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const DEFAULT_CLASSROOM_ID = 'A205'
const HISTORY_INTERVAL_MS = Number(process.env.HISTORY_INTERVAL_MS || 15 * 60 * 1000)
const HISTORY_RETENTION_DAYS = Number(process.env.HISTORY_RETENTION_DAYS || 30)
const HISTORY_SEED_DAYS = Number(process.env.HISTORY_SEED_DAYS || 30)
const HISTORY_MAX_POINTS = Math.ceil((HISTORY_RETENTION_DAYS * 24 * 60 * 60 * 1000) / HISTORY_INTERVAL_MS)
const DEFAULT_HISTORY_LIMIT = HISTORY_MAX_POINTS
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const historyDataDir = process.env.HISTORY_DATA_DIR || path.join(__dirname, 'data')

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))
const round = (value, digits = 1) => Number(value.toFixed(digits))
const clone = (value) => JSON.parse(JSON.stringify(value))

const nowIso = () => new Date().toISOString()

const deviceTemplate = {
  light: { name: '灯光', status: true, power: 1.8, online: true },
  airConditioner: { name: '空调', status: true, power: 3.6, mode: 'cool', temperature: 24, online: true },
  freshAir: { name: '新风', status: true, power: 1.2, online: true },
  curtain: { name: '窗帘', status: false, position: 45, online: true },
  multimedia: { name: '多媒体', status: true, power: 0.9, online: true }
}

const classroomProfiles = {
  A205: {
    classroomId: 'A205',
    classroomName: 'A205 教室',
    name: 'A205 教室',
    building: '教学楼 A 栋',
    floor: '2F',
    area: 86,
    capacity: 80,
    phase: 0.2,
    peopleBase: 42,
    peopleSwing: 7,
    nightPeople: 4,
    temperatureBase: 27.2,
    humidityBase: 56,
    co2Base: 860,
    co2Bias: 170,
    pm25Base: 22,
    noiseBase: 52,
    lightBase: 520,
    energyBase: 8.4,
    energyAlarm: 12,
    devices: clone(deviceTemplate)
  },
  B101: {
    classroomId: 'B101',
    classroomName: 'B101 教室',
    name: 'B101 教室',
    building: '教学楼 B 栋',
    floor: '1F',
    area: 78,
    capacity: 72,
    phase: 1.5,
    peopleBase: 38,
    peopleSwing: 5,
    nightPeople: 3,
    temperatureBase: 25.1,
    humidityBase: 52,
    co2Base: 690,
    co2Bias: 25,
    pm25Base: 18,
    noiseBase: 47,
    lightBase: 560,
    energyBase: 6.9,
    energyAlarm: 11,
    devices: {
      ...clone(deviceTemplate),
      curtain: { name: '窗帘', status: true, position: 70, online: true }
    }
  },
  B102: {
    classroomId: 'B102',
    classroomName: 'B102 教室',
    name: 'B102 教室',
    building: '教学楼 B 栋',
    floor: '1F',
    area: 64,
    capacity: 54,
    phase: 2.6,
    peopleBase: 20,
    peopleSwing: 4,
    nightPeople: 1,
    temperatureBase: 24.4,
    humidityBase: 50,
    co2Base: 560,
    co2Bias: -20,
    pm25Base: 15,
    noiseBase: 42,
    lightBase: 460,
    energyBase: 4.5,
    energyAlarm: 8.5,
    devices: {
      ...clone(deviceTemplate),
      airConditioner: { name: '空调', status: false, power: 3.2, mode: 'cool', temperature: 25, online: true },
      multimedia: { name: '多媒体', status: false, power: 0.8, online: true }
    }
  },
  C301: {
    classroomId: 'C301',
    classroomName: 'C301 教室',
    name: 'C301 教室',
    building: '综合楼 C 栋',
    floor: '3F',
    area: 96,
    capacity: 90,
    phase: 3.9,
    peopleBase: 48,
    peopleSwing: 8,
    nightPeople: 5,
    temperatureBase: 26.2,
    humidityBase: 58,
    co2Base: 780,
    co2Bias: 80,
    pm25Base: 48,
    noiseBase: 61,
    lightBase: 500,
    energyBase: 9.2,
    energyAlarm: 12.8,
    devices: {
      ...clone(deviceTemplate),
      freshAir: { name: '新风', status: true, power: 1.4, online: true },
      multimedia: { name: '多媒体', status: true, power: 1.1, online: false }
    }
  }
}

const runtimeMap = new Map()

const normalizeClassroomId = (classroomId = DEFAULT_CLASSROOM_ID) => {
  const normalized = String(classroomId || DEFAULT_CLASSROOM_ID).trim().toUpperCase()
  return classroomProfiles[normalized] ? normalized : DEFAULT_CLASSROOM_ID
}

const getProfile = (classroomId) => classroomProfiles[normalizeClassroomId(classroomId)]

const historyFilePath = (classroomId) => path.join(historyDataDir, `${normalizeClassroomId(classroomId)}-history.json`)

const timestampOf = (item) => {
  const value = item?.updatedAt || item?.update_time || item?.generatedAt || item?.timestamp || item?.time
  const time = new Date(value).getTime()
  return Number.isFinite(time) ? time : 0
}

const trimHistory = (runtime) => {
  if (runtime.historyData.length > HISTORY_MAX_POINTS) {
    runtime.historyData.splice(0, runtime.historyData.length - HISTORY_MAX_POINTS)
  }
}

const saveHistoryData = (runtime) => {
  try {
    fs.mkdirSync(historyDataDir, { recursive: true })
    fs.writeFileSync(historyFilePath(runtime.profile.classroomId), JSON.stringify(runtime.historyData, null, 2))
  } catch (error) {
    console.warn(`Failed to persist history for ${runtime.profile.classroomId}: ${error.message}`)
  }
}

const loadHistoryData = (runtime) => {
  try {
    const filePath = historyFilePath(runtime.profile.classroomId)
    if (!fs.existsSync(filePath)) return []
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'))
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((item) => timestampOf(item))
      .sort((a, b) => timestampOf(a) - timestampOf(b))
      .slice(-HISTORY_MAX_POINTS)
  } catch (error) {
    console.warn(`Failed to load history for ${runtime.profile.classroomId}: ${error.message}`)
    return []
  }
}

const applyHistoryPointToState = (runtime, point) => {
  if (!point) return
  Object.assign(runtime.state, {
    temperature: round(Number(point.temperature) || runtime.state.temperature),
    humidity: round(Number(point.humidity) || runtime.state.humidity),
    co2: Math.round(Number(point.co2) || runtime.state.co2),
    pm25: round(Number(point.pm25) || runtime.state.pm25),
    noise: round(Number(point.noise) || runtime.state.noise),
    light: Math.round(Number(point.light) || runtime.state.light),
    peopleCount: Math.round(Number(point.peopleCount ?? point.people_count) || runtime.state.peopleCount),
    energy: round(Number(point.energy) || runtime.state.energy, 2),
    currentTime: point.currentTime || point.updatedAt || point.update_time || point.generatedAt || point.time,
    updatedAt: point.updatedAt || point.update_time || point.generatedAt || point.time,
    generatedAt: point.generatedAt || point.updatedAt || point.update_time || point.time,
    update_time: point.update_time || point.updatedAt || point.generatedAt || point.time
  })
}

const seedHistoryRange = (runtime, start, end) => {
  const originalHistory = runtime.historyData
  runtime.historyData = []
  for (let timestamp = start; timestamp <= end; timestamp += HISTORY_INTERVAL_MS) {
    simulateStep(runtime, timestamp)
    pushHistoryPoint(runtime, timestamp, false)
  }
  const seeded = runtime.historyData
  runtime.historyData = originalHistory
  return seeded
}

const computeDeviceEnergy = (devices) => Object.values(devices).reduce((sum, device) => {
  if (!device.status || device.online === false) return sum
  return sum + Number(device.power || 0)
}, 0)

const createInitialState = (profile, timestamp = Date.now()) => {
  const generatedAt = new Date(timestamp).toISOString()
  const devices = clone(profile.devices)

  return {
    classroomId: profile.classroomId,
    classroom_id: profile.classroomId,
    classroomName: profile.classroomName,
    name: profile.name,
    building: profile.building,
    floor: profile.floor,
    area: profile.area,
    capacity: profile.capacity,
    temperature: round(profile.temperatureBase),
    humidity: round(profile.humidityBase),
    co2: Math.round(profile.co2Base + profile.co2Bias),
    pm25: round(profile.pm25Base),
    noise: round(profile.noiseBase),
    light: Math.round(profile.lightBase),
    peopleCount: profile.peopleBase,
    energy: round(profile.energyBase + computeDeviceEnergy(devices)),
    devices,
    currentTime: generatedAt,
    updatedAt: generatedAt,
    generatedAt,
    update_time: generatedAt,
    status: 'normal'
  }
}

const serializeState = (runtime) => {
  const state = runtime.state
  return {
    ...clone(state),
    classroom_id: state.classroomId,
    classroomName: state.classroomName || state.name,
    light_status: state.devices.light?.status ? 1 : 0,
    ac_status: state.devices.airConditioner?.status ? 1 : 0,
    ventilation_status: state.devices.freshAir?.status ? 1 : 0,
    curtain_status: state.devices.curtain?.status ? 1 : 0,
    multimedia_status: state.devices.multimedia?.status ? 1 : 0
  }
}

const createHistoryPoint = (runtime, timestampMs) => {
  const state = runtime.state
  const timestamp = new Date(timestampMs).toISOString()

  return {
    classroomId: state.classroomId,
    classroom_id: state.classroomId,
    classroomName: state.classroomName,
    name: state.name,
    building: state.building,
    floor: state.floor,
    area: state.area,
    capacity: state.capacity,
    temperature: round(state.temperature),
    humidity: round(state.humidity),
    co2: Math.round(state.co2),
    pm25: round(state.pm25),
    noise: round(state.noise),
    light: Math.round(state.light),
    peopleCount: Math.round(state.peopleCount),
    energy: round(state.energy, 2),
    time: timestamp,
    timestamp,
    updatedAt: timestamp,
    generatedAt: timestamp,
    update_time: timestamp
  }
}

const pushHistoryPoint = (runtime, timestampMs, persist = true) => {
  const point = createHistoryPoint(runtime, timestampMs)
  runtime.historyData.push(point)
  trimHistory(runtime)
  runtime.lastHistoryAt = timestampMs
  if (persist) saveHistoryData(runtime)
}

const softMove = (current, target, factor, noise = 0, min = -Infinity, max = Infinity) => {
  const next = current + (target - current) * factor + (Math.random() - 0.5) * noise
  return clamp(next, min, max)
}

const simulateStep = (runtime, timestampMs) => {
  const state = runtime.state
  const profile = runtime.profile
  const devices = state.devices
  const date = new Date(timestampMs)
  const hour = date.getHours() + date.getMinutes() / 60
  const teachingTime = hour >= 8 && hour <= 21
  const minuteWave = Math.sin(timestampMs / 1000 / 720 + profile.phase)
  const shortWave = Math.sin(timestampMs / 1000 / 180 + profile.phase * 1.7)

  const peopleTarget = teachingTime
    ? profile.peopleBase + minuteWave * profile.peopleSwing + shortWave * 2
    : profile.nightPeople + Math.max(0, shortWave)

  state.peopleCount = Math.round(softMove(state.peopleCount, peopleTarget, 0.22, 1.8, 0, state.capacity))

  const peopleLoad = state.peopleCount / Math.max(1, state.capacity)
  const acCooling = devices.airConditioner?.status && devices.airConditioner?.online !== false ? 2.4 : -0.4
  const temperatureTarget = profile.temperatureBase + peopleLoad * 4.2 - acCooling + Math.sin(hour / 24 * Math.PI * 2 + profile.phase) * 1.2
  state.temperature = round(softMove(state.temperature, temperatureTarget, 0.12, 0.12, 18, 34))

  const freshAirActive = devices.freshAir?.status && devices.freshAir?.online !== false
  const co2Target = profile.co2Base + profile.co2Bias + state.peopleCount * 8.5 - (freshAirActive ? 230 : 0)
  state.co2 = Math.round(softMove(state.co2, co2Target, 0.18, 8, 420, 1800))

  const humidityTarget = profile.humidityBase + peopleLoad * 8 - (devices.airConditioner?.status ? 3 : 0) + (freshAirActive ? -2 : 1)
  state.humidity = round(softMove(state.humidity, humidityTarget, 0.1, 0.28, 35, 78))

  const lightTarget = devices.light?.status
    ? profile.lightBase + 260 + (devices.curtain?.status ? 140 : -60)
    : 80 + (devices.curtain?.status ? 140 : 35)
  state.light = Math.round(softMove(state.light, lightTarget, 0.26, 10, 30, 980))

  const pm25Target = profile.pm25Base + (freshAirActive ? -5 : 8) + (profile.classroomId === 'C301' ? shortWave * 8 : shortWave * 2)
  state.pm25 = round(softMove(state.pm25, pm25Target, 0.14, 0.8, 5, 95))

  const noiseTarget = profile.noiseBase + peopleLoad * 18 + (devices.multimedia?.status ? 4 : 0) + (profile.classroomId === 'C301' ? 4 : 0)
  state.noise = round(softMove(state.noise, noiseTarget, 0.18, 1.1, 28, 82))

  const deviceEnergy = computeDeviceEnergy(devices)
  const energyTarget = profile.energyBase + deviceEnergy + state.peopleCount * 0.035 + (state.light > 650 ? 0.5 : 0)
  state.energy = round(softMove(state.energy, energyTarget, 0.16, 0.16, 1.5, 18), 2)

  const generatedAt = new Date(timestampMs).toISOString()
  state.currentTime = generatedAt
  state.updatedAt = generatedAt
  state.generatedAt = generatedAt
  state.update_time = generatedAt
  state.status = state.co2 > 1000 || state.temperature > 30 || state.energy > profile.energyAlarm || state.pm25 > 55 || state.noise > 68
    ? 'warning'
    : 'normal'
}

const getRuntime = (classroomId = DEFAULT_CLASSROOM_ID) => {
  const normalizedId = normalizeClassroomId(classroomId)
  if (!runtimeMap.has(normalizedId)) {
    const profile = getProfile(normalizedId)
    const runtime = {
      profile,
      state: createInitialState(profile),
      historyData: [],
      alarmRecords: [],
      lastTickAt: Date.now(),
      lastHistoryAt: 0
    }

    const loadedHistory = loadHistoryData(runtime)
    if (loadedHistory.length) {
      const now = Date.now()
      const desiredStart = now - Math.min(HISTORY_SEED_DAYS, HISTORY_RETENTION_DAYS) * 24 * 60 * 60 * 1000
      const firstLoadedAt = timestampOf(loadedHistory[0])
      const backfilledHistory = firstLoadedAt > desiredStart + HISTORY_INTERVAL_MS
        ? seedHistoryRange(runtime, desiredStart, firstLoadedAt - HISTORY_INTERVAL_MS)
        : []
      runtime.historyData = [...backfilledHistory, ...loadedHistory].slice(-HISTORY_MAX_POINTS)
      const lastPoint = loadedHistory[loadedHistory.length - 1]
      const lastTimestamp = timestampOf(lastPoint) || Date.now()
      applyHistoryPointToState(runtime, lastPoint)
      runtime.lastHistoryAt = lastTimestamp
      runtime.lastTickAt = lastTimestamp
      if (backfilledHistory.length) saveHistoryData(runtime)
    } else {
      const now = Date.now()
      const start = now - Math.min(HISTORY_SEED_DAYS, HISTORY_RETENTION_DAYS) * 24 * 60 * 60 * 1000
      for (let timestamp = start; timestamp <= now; timestamp += HISTORY_INTERVAL_MS) {
        simulateStep(runtime, timestamp)
        pushHistoryPoint(runtime, timestamp, false)
      }
      runtime.lastTickAt = now
      saveHistoryData(runtime)
    }

    runtimeMap.set(normalizedId, runtime)
  }

  return runtimeMap.get(normalizedId)
}

const advanceSimulation = (runtime) => {
  const now = Date.now()
  let elapsed = now - runtime.lastTickAt
  if (elapsed <= 0) {
    simulateStep(runtime, now)
    return
  }

  const step = 15000
  let historyChanged = false
  while (elapsed > 0) {
    const tickAt = runtime.lastTickAt + Math.min(step, elapsed)
    simulateStep(runtime, tickAt)
    runtime.lastTickAt = tickAt
    if (tickAt - runtime.lastHistoryAt >= HISTORY_INTERVAL_MS) {
      pushHistoryPoint(runtime, tickAt, false)
      historyChanged = true
    }
    elapsed = now - runtime.lastTickAt
  }

  if (!runtime.historyData.length) {
    pushHistoryPoint(runtime, now, false)
    historyChanged = true
  } else if (runtime.historyData.length) {
    runtime.historyData[runtime.historyData.length - 1] = createHistoryPoint(runtime, now)
    historyChanged = true
  }

  if (historyChanged) saveHistoryData(runtime)
}

const buildCurrentAlarms = (runtime) => {
  const state = runtime.state
  const alarms = []
  const time = state.updatedAt || nowIso()
  const base = {
    classroomId: state.classroomId,
    classroom_id: state.classroomId,
    classroomName: state.classroomName,
    room: state.classroomName,
    generatedAt: time,
    time,
    status: '未处理'
  }

  if (state.co2 > 1000) {
    alarms.push({
      ...base,
      id: `${state.classroomId}-co2-${time}`,
      type: '空气质量报警',
      level: state.co2 > 1300 ? 'high' : 'medium',
      title: `${state.classroomName} CO2 浓度偏高`,
      message: `当前 CO2 浓度 ${Math.round(state.co2)} ppm，建议开启新风或通风。`,
      value: Math.round(state.co2),
      metric: 'co2',
      threshold: 1000
    })
  }

  if (state.temperature > 30) {
    alarms.push({
      ...base,
      id: `${state.classroomId}-temperature-${time}`,
      type: '温度异常报警',
      level: state.temperature > 32 ? 'high' : 'medium',
      title: `${state.classroomName} 温度偏高`,
      message: `当前温度 ${round(state.temperature)} ℃，建议开启空调并降低人员密度。`,
      value: round(state.temperature),
      metric: 'temperature',
      threshold: 30
    })
  }

  if (state.energy > runtime.profile.energyAlarm) {
    alarms.push({
      ...base,
      id: `${state.classroomId}-energy-${time}`,
      type: '能耗异常报警',
      level: 'medium',
      title: `${state.classroomName} 能耗偏高`,
      message: `当前能耗 ${round(state.energy, 2)} kW，高于 ${runtime.profile.energyAlarm} kW 阈值。`,
      value: round(state.energy, 2),
      metric: 'energy',
      threshold: runtime.profile.energyAlarm
    })
  }

  if (state.pm25 > 55) {
    alarms.push({
      ...base,
      id: `${state.classroomId}-pm25-${time}`,
      type: '空气颗粒物报警',
      level: state.pm25 > 75 ? 'high' : 'medium',
      title: `${state.classroomName} PM2.5 偏高`,
      message: `当前 PM2.5 为 ${round(state.pm25)} μg/m³，建议开启新风并检查过滤系统。`,
      value: round(state.pm25),
      metric: 'pm25',
      threshold: 55
    })
  }

  if (state.noise > 68) {
    alarms.push({
      ...base,
      id: `${state.classroomId}-noise-${time}`,
      type: '噪声异常报警',
      level: 'low',
      title: `${state.classroomName} 噪声偏高`,
      message: `当前噪声 ${round(state.noise)} dB，建议调整课堂活动和多媒体音量。`,
      value: round(state.noise),
      metric: 'noise',
      threshold: 68
    })
  }

  Object.entries(state.devices).forEach(([key, device]) => {
    if (device.online === false) {
      alarms.push({
        ...base,
        id: `${state.classroomId}-device-${key}-${time}`,
        type: '设备异常报警',
        level: 'high',
        title: `${state.classroomName} ${device.name || key} 离线`,
        message: `${device.name || key} 当前离线，请检查设备网关或供电状态。`,
        value: 0,
        metric: key,
        threshold: 1
      })
    }
  })

  return alarms
}

const syncAlarmRecords = (runtime) => {
  const current = buildCurrentAlarms(runtime)
  current.forEach((alarm) => {
    const duplicate = runtime.alarmRecords.find((item) => (
      item.classroomId === alarm.classroomId
      && item.type === alarm.type
      && item.metric === alarm.metric
      && Math.abs(new Date(item.generatedAt).getTime() - new Date(alarm.generatedAt).getTime()) < 5 * 60 * 1000
    ))

    if (!duplicate) {
      runtime.alarmRecords.unshift(alarm)
    } else {
      Object.assign(duplicate, alarm, { id: duplicate.id })
    }
  })

  if (runtime.alarmRecords.length > 60) {
    runtime.alarmRecords.splice(60)
  }

  return [...current, ...runtime.alarmRecords.filter((alarm) => (
    !current.some((item) => item.type === alarm.type && item.metric === alarm.metric)
  ))]
}

export const classroomStates = Object.fromEntries(
  Object.keys(classroomProfiles).map((classroomId) => [classroomId, getRuntime(classroomId).state])
)

export const classroomState = classroomStates[DEFAULT_CLASSROOM_ID]

export const getSimulationTime = (classroomId = DEFAULT_CLASSROOM_ID) => {
  const runtime = getRuntime(classroomId)
  advanceSimulation(runtime)
  return runtime.state.updatedAt
}

export const getLatestClassroom = (classroomId = DEFAULT_CLASSROOM_ID) => {
  const runtime = getRuntime(classroomId)
  advanceSimulation(runtime)
  return serializeState(runtime)
}

export const getHistoryData = (limit = DEFAULT_HISTORY_LIMIT, classroomId = DEFAULT_CLASSROOM_ID) => {
  const runtime = getRuntime(classroomId)
  advanceSimulation(runtime)
  const max = Math.min(Number(limit) || DEFAULT_HISTORY_LIMIT, HISTORY_MAX_POINTS)
  return runtime.historyData.slice(-max)
}

export const getAlarmList = (classroomId = DEFAULT_CLASSROOM_ID) => {
  const runtime = getRuntime(classroomId)
  advanceSimulation(runtime)
  return syncAlarmRecords(runtime).slice(0, 30)
}

export const controlDevice = (payload = {}) => {
  const classroomId = payload.classroomId || payload.classroom_id || payload.room || DEFAULT_CLASSROOM_ID
  const runtime = getRuntime(classroomId)
  advanceSimulation(runtime)

  const deviceId = payload.deviceId || payload.device || payload.type
  const status = payload.status ?? payload.value ?? payload.enabled ?? payload.action
  const normalizedDeviceId = {
    air: 'airConditioner',
    ac: 'airConditioner',
    airConditioner: 'airConditioner',
    fresh_air: 'freshAir',
    ventilation: 'freshAir',
    freshAir: 'freshAir',
    light: 'light',
    curtain: 'curtain',
    multimedia: 'multimedia'
  }[deviceId] || deviceId

  if (!normalizedDeviceId || !runtime.state.devices[normalizedDeviceId]) {
    return {
      success: false,
      message: '设备不存在',
      classroomId: runtime.state.classroomId,
      latest: serializeState(runtime)
    }
  }

  if (typeof status === 'boolean') {
    runtime.state.devices[normalizedDeviceId].status = status
  } else if (status === 1 || status === '1' || status === 'on' || status === 'open') {
    runtime.state.devices[normalizedDeviceId].status = true
  } else if (status === 0 || status === '0' || status === 'off' || status === 'close') {
    runtime.state.devices[normalizedDeviceId].status = false
  }

  if (payload.position !== undefined && normalizedDeviceId === 'curtain') {
    runtime.state.devices.curtain.position = clamp(Number(payload.position), 0, 100)
  }

  if (payload.temperature !== undefined && normalizedDeviceId === 'airConditioner') {
    runtime.state.devices.airConditioner.temperature = clamp(Number(payload.temperature), 18, 30)
  }

  simulateStep(runtime, Date.now())
  pushHistoryPoint(runtime, Date.now())

  return {
    success: true,
    message: '设备控制成功',
    classroomId: runtime.state.classroomId,
    deviceId: normalizedDeviceId,
    status: runtime.state.devices[normalizedDeviceId].status,
    latest: serializeState(runtime)
  }
}

export const buildAnalysisContext = (classroomId = DEFAULT_CLASSROOM_ID) => {
  const latest = getLatestClassroom(classroomId)
  const history = getHistoryData(48, classroomId)
  const alarms = getAlarmList(classroomId)

  return {
    classroomState: latest,
    latest,
    history,
    alarms,
    analysisTime: latest.updatedAt,
    classroomId: latest.classroomId
  }
}
