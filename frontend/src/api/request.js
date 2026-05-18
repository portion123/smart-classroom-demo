import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://127.0.0.1:8014' : '')
const ENABLE_MOCK = String(import.meta.env.VITE_ENABLE_MOCK || '').toLowerCase() === 'true'
const AI_ANALYZE_URL = `${API_BASE_URL}/api/ai/analyze`

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

function nowText() {
  const date = new Date()
  const pad = (value) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
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
  const state = {
    classroom_id: 'A205',
    temperature,
    humidity: Number((62 + Math.sin(tick / 30) * 6).toFixed(1)),
    co2,
    light: Math.round(deviceState.light ? 720 + Math.sin(tick / 20) * 80 : 120 + Math.sin(tick / 20) * 30),
    pm25: Math.round(34 + Math.sin(tick / 26) * 8),
    noise: Math.round(52 + Math.sin(tick / 15) * 9),
    people_count: Math.round(42 + Math.sin(tick / 22) * 8),
    peopleCount: Math.round(42 + Math.sin(tick / 22) * 8),
    energy: Number((12.4 + Math.sin(tick / 28) * 1.2 + (deviceState.ac ? 2.2 : 0.3) + (deviceState.ventilation ? 1.1 : 0.2)).toFixed(1)),
    light_status: deviceState.light ? 'on' : 'off',
    ac_status: deviceState.ac ? 'on' : 'off',
    ventilation_status: deviceState.ventilation ? 'on' : 'off',
    curtain_status: deviceState.curtain ? 'on' : 'off',
    multimedia_status: deviceState.multimedia ? 'on' : 'off',
    update_time: nowText()
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
    result.push({
      time: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
      date: `05-${String(pointTime.getDate()).padStart(2, '0')}`,
      temperature: Number((24.8 + wave * 2.1 + (active ? 1.2 : 0)).toFixed(1)),
      humidity: Number((58 + Math.cos(index / 6) * 8).toFixed(1)),
      co2: Math.round(820 + (active ? 420 : 120) + Math.sin(index / 4) * 180),
      light: Math.round(680 + Math.sin(index / 6) * 120 + (active ? 80 : -220)),
      pm25: Math.round(34 + Math.sin(index / 5) * 18 + (active ? 5 : 0)),
      noise: Math.round(46 + Math.sin(index / 7) * 10 + (active ? 6 : 0)),
      people_count: Math.max(8, Math.round((active ? 38 : 10) + Math.sin(index / 4) * 18)),
      peopleCount: Math.max(8, Math.round((active ? 38 : 10) + Math.sin(index / 4) * 18)),
      energy: Number((8.6 + (active ? 4.2 : 1.2) + Math.sin(index / 5) * 1.4).toFixed(1))
    })
  }
  return result
}

function alarmMock() {
  return [
    { time: '2025-05-23 10:18:32', classroom_id: 'A205', type: 'CO2超标', level: 'danger', content: 'CO₂浓度达到 1680 ppm，超过阈值 1500 ppm', status: '未处理' },
    { time: '2025-05-23 09:55:11', classroom_id: 'A205', type: '温度偏高', level: 'warning', content: '温度达到 31.2 ℃，超过阈值 30 ℃', status: '未处理' },
    { time: '2025-05-23 09:31:26', classroom_id: 'A205', type: '湿度偏高', level: 'warning', content: '湿度达到 78%，超过阈值 75%', status: '已处理' },
    { time: '2025-05-23 08:47:03', classroom_id: 'A205', type: 'PM2.5超标', level: 'danger', content: 'PM2.5 浓度达到 82 μg/m³，空气质量异常', status: '已处理' },
    { time: '2025-05-23 08:15:42', classroom_id: 'A205', type: '噪声超标', level: 'info', content: '噪声达到 72 dB，超过阈值 70 dB', status: '已处理' },
    { time: '2025-05-22 17:42:58', classroom_id: 'B101', type: 'CO2超标', level: 'warning', content: 'CO₂浓度达到 1550 ppm，接近阈值', status: '已处理' },
    { time: '2025-05-22 16:33:18', classroom_id: 'C301', type: '人数过多', level: 'info', content: '当前人数达到 58 人，建议开启通风', status: '已处理' }
  ]
}

function aiMock() {
  const result = {
    summary: 'A205 教室当前 CO2 与温度偏高，空气流通不足，建议执行舒适节能平衡策略。',
    riskLevel: '中',
    problems: [
      'CO2 接近 1500 ppm，继续上升会影响课堂专注度',
      '温度偏高，空调与新风需要联动调节',
      '灯光亮度偏高，存在一定能耗优化空间'
    ],
    suggestions: [
      '空调设为 26℃，保持舒适温区',
      '开启新风中速运行，优先降低 CO2 浓度',
      '灯光亮度调整为 80%，兼顾照度与节能',
      '课间保持 10 分钟通风，预计节能 18%'
    ],
    deviceActions: [
      { device: '空调', action: '设为 26℃', reason: '降低室内温度并保持舒适度' },
      { device: '新风', action: '开启中速', reason: '降低 CO2 浓度' },
      { device: '灯光', action: '亮度调整为 80%', reason: '减少照明能耗' },
      { device: '窗帘', action: '保持 50% 开合', reason: '利用自然光并避免眩光' }
    ]
  }
  return {
    classroom_id: 'A205',
    mode: 'mock',
    fallback: true,
    update_time: nowText(),
    result,
    analysis:
      `总体分析：${result.summary} 风险等级：${result.riskLevel}。\n\n` +
      `存在问题：${result.problems.join('；')}。\n\n` +
      `调控建议：${result.suggestions.join('；')}。\n\n` +
      `设备动作：${result.deviceActions.map((item) => `${item.device}${item.action}`).join('；')}。`
  }
}

async function apiGet(path, fallback) {
  try {
    const response = await request.get(path)
    if (response.data?.code === 200) return response.data.data
    throw new Error(response.data?.message || '接口返回异常')
  } catch (error) {
    if (ENABLE_MOCK) return fallback()
    throw error
  }
}

async function apiPost(path, body, fallback) {
  try {
    const response = await request.post(path, body)
    if (response.data?.code === 200) return response.data.data
    throw new Error(response.data?.message || '接口返回异常')
  } catch (error) {
    if (ENABLE_MOCK) return fallback(body)
    throw error
  }
}

export function getLatestClassroom() {
  return apiGet('/api/classroom/latest', latestMock)
}

export function getHistoryData() {
  return apiGet('/api/classroom/history', historyMock)
}

export function getAlarmList() {
  return apiGet('/api/alarm/list', alarmMock)
}

export async function analyzeAi(payload = { classroom_id: 'A205' }) {
  try {
    const response = await axios.post(AI_ANALYZE_URL, payload, { timeout: 45000 })
    if (response.data?.code === 200) return response.data.data
    throw new Error(response.data?.message || 'AI 分析接口返回异常')
  } catch (error) {
    if (!ENABLE_MOCK) throw error
    const fallback = aiMock(payload)
    fallback.errorMessage = error?.message || 'AI 分析接口不可用'
    return fallback
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
  })
}

export function getMockHistory(length) {
  return historyMock(length)
}

export function getMockAlarms() {
  return alarmMock()
}

export default request
