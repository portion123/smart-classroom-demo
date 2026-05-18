import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import OpenAI from 'openai'
import {
  buildAnalysisContext,
  controlDevice,
  getAlarmList,
  getHistoryData,
  getLatestClassroom
} from './simulator.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

loadEnvFile(path.join(__dirname, '.env'))

const app = express()
const PORT = process.env.PORT || 8014
const configuredCorsOrigins = (process.env.CORS_ORIGIN || process.env.FRONTEND_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

app.use(express.json({ limit: '1mb', type: ['application/json', 'application/*+json'] }))
app.use((req, res, next) => {
  const origin = req.headers.origin
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  if (isAllowedOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*')
    res.setHeader('Vary', 'Origin')
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.status(isAllowedOrigin(origin) ? 204 : 403).end()
  next()
})

app.get('/health', (req, res) => {
  sendJson(res, {
    code: 200,
    message: 'ok',
    data: { service: 'smart-classroom-node-ai', port: PORT }
  })
})

app.get('/api/ai/health', (req, res) => {
  sendJson(res, {
    code: 200,
    message: 'success',
    data: {
      port: PORT,
      hasApiKey: Boolean(resolveLlmConfig().apiKey),
      baseURL: Boolean(resolveLlmConfig().baseURL),
      model: resolveLlmConfig().model,
      status: 'ok'
    }
  })
})

app.get('/api/classroom/latest', (req, res) => {
  sendJson(res, {
    code: 200,
    message: 'success',
    data: getLatestClassroom()
  })
})

app.get('/api/classroom/history', (req, res) => {
  sendJson(res, {
    code: 200,
    message: 'success',
    data: getHistoryData(req.query.limit)
  })
})

app.get('/api/alarm/list', (req, res) => {
  sendJson(res, {
    code: 200,
    message: 'success',
    data: getAlarmList()
  })
})

app.post('/api/device/control', (req, res) => {
  sendJson(res, {
    code: 200,
    message: 'success',
    data: controlDevice(req.body)
  })
})

app.post('/api/ai/analyze', async (req, res) => {
  const context = buildAnalysisContext()
  const classroom = normalizeClassroomPayload(req.body?.classroomData || req.body?.classroomState ? req.body : context.classroomState)
  const config = resolveLlmConfig()

  if (!config.apiKey) {
    return sendJson(res, {
      code: 200,
      message: 'success',
      data: buildMockData(classroom, context, '缺少 DeepSeek API Key，已启用本地 AI 模拟分析')
    })
  }

  try {
    const { analysis, usage } = await callLlmAnalysis(classroom, context, config)
    return sendJson(res, {
      code: 200,
      message: 'success',
      data: {
        mode: 'llm',
        classroom_id: classroom.classroom_id,
        analysis: formatAnalysisText(analysis),
        result: analysis,
        usage,
        update_time: context.classroomState.update_time
      }
    })
  } catch (error) {
    return sendJson(res, {
      code: 200,
      message: 'success',
      data: buildMockData(classroom, context, readableError(error))
    })
  }
})

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Smart classroom Node AI backend listening on port ${PORT}`)
})

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Stop the old backend service or set PORT to another value.`)
  } else {
    console.error(error)
  }
  process.exit(1)
})

function sendJson(res, payload, status = 200) {
  return res.status(status).set('Content-Type', 'application/json; charset=utf-8').send(JSON.stringify(payload))
}

function resolveLlmConfig() {
  return {
    apiKey: process.env.LLM_API_KEY || process.env.DEEPSEEK_API_KEY || '',
    baseURL: process.env.LLM_BASE_URL || process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
    model: process.env.LLM_MODEL || process.env.DEEPSEEK_MODEL || 'deepseek-chat'
  }
}

function isAllowedOrigin(origin) {
  if (!origin) return true
  if (configuredCorsOrigins.includes(origin)) return true

  try {
    const url = new URL(origin)
    const isLocal = ['localhost', '127.0.0.1', '::1'].includes(url.hostname)
    const isZeabur = url.hostname === 'zeabur.app' || url.hostname.endsWith('.zeabur.app')
    return isLocal || isZeabur
  } catch (error) {
    return false
  }
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return

  const content = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '')
  content.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) return

    const index = trimmed.indexOf('=')
    if (index < 0) return

    const key = trimmed.slice(0, index).trim()
    const value = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, '')
    if (key && process.env[key] === undefined) process.env[key] = value
  })
}

function normalizeClassroomPayload(body = {}) {
  const classroomData = body.classroomData || body.classroom || body.metrics || body
  const devices = classroomData.devices || body.devices || {}
  const room = classroomData.room || classroomData.classroom_id || classroomData.classroomId || body.room || body.classroom_id || 'A205'

  return {
    classroom_id: String(room),
    room: String(room),
    temperature: numberOrDefault(classroomData.temperature, 28.6),
    humidity: numberOrDefault(classroomData.humidity, 68),
    co2: numberOrDefault(classroomData.co2 ?? classroomData.CO2 ?? classroomData['co₂'], 1450),
    pm25: numberOrDefault(classroomData.pm25 ?? classroomData['pm2.5'], 42),
    noise: numberOrDefault(classroomData.noise, 56),
    people_count: numberOrDefault(classroomData.people_count ?? classroomData.peopleCount ?? classroomData.people, 48),
    light_status: devices.light_status || devices.light || classroomData.light_status || classroomData.lightStatus || 'on',
    ac_status: devices.ac_status || devices.ac || classroomData.ac_status || classroomData.acStatus || 'on',
    ventilation_status: devices.ventilation_status || devices.ventilation || classroomData.ventilation_status || classroomData.ventilationStatus || 'off',
    curtain_status: devices.curtain_status || devices.curtain || classroomData.curtain_status || classroomData.curtainStatus || 'on',
    multimedia_status: devices.multimedia_status || devices.multimedia || classroomData.multimedia_status || classroomData.multimediaStatus || 'on'
  }
}

function numberOrDefault(value, fallback) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

async function callLlmAnalysis(classroom, context, config) {
  const client = new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseURL,
    timeout: Number(process.env.LLM_TIMEOUT_MS || 30000)
  })

  const response = await client.chat.completions.create({
    model: config.model,
    temperature: 0.2,
    max_tokens: 900,
    messages: [
      {
        role: 'system',
        content: '你是智慧教室环境监测与节能调控专家。必须只输出严格 JSON，不要输出 Markdown、代码块或额外解释。'
      },
      {
        role: 'user',
        content: buildPrompt(classroom, context)
      }
    ]
  })

  const content = response.choices?.[0]?.message?.content || ''
  const parsed = parseJsonContent(content)

  return {
    analysis: normalizeLlmResult(parsed),
    usage: response.usage || null
  }
}

function buildPrompt(classroom, context) {
  const history = context.history.slice(-12).map((item) => ({
    time: item.time,
    temperature: item.temperature,
    humidity: item.humidity,
    co2: item.co2,
    light: item.light,
    peopleCount: item.peopleCount,
    energy: item.energy
  }))
  const alarms = context.alarms.map((item) => ({
    type: item.type,
    level: item.level,
    content: item.content,
    status: item.status
  }))

  return `请根据 ${classroom.classroom_id} 智慧教室实时数据生成环境分析与节能调控方案。

当前数据：
- 教室：${classroom.classroom_id}
- 温度：${classroom.temperature}℃
- 湿度：${classroom.humidity}%
- CO2：${classroom.co2} ppm
- PM2.5：${classroom.pm25} μg/m³
- 噪声：${classroom.noise} dB
- 人数：${classroom.people_count}
- 光照：${classroom.light || context.classroomState.light} lux
- 能耗：${classroom.energy || context.classroomState.energy} kWh
- 灯光状态：${classroom.light_status}
- 空调状态：${classroom.ac_status}
- 新风状态：${classroom.ventilation_status}
- 窗帘状态：${classroom.curtain_status}
- 多媒体状态：${classroom.multimedia_status}
- 最近历史曲线：${JSON.stringify(history)}
- 当前报警：${JSON.stringify(alarms)}

输出 JSON 结构必须为：
{
  "summary": "总体分析，1-2 句话",
  "riskLevel": "低/中/高",
  "problems": ["问题1", "问题2"],
  "suggestions": ["节能建议1", "设备调度建议2"],
  "deviceActions": [
    { "device": "空调", "action": "设为 26℃", "reason": "原因" },
    { "device": "新风", "action": "开启中速", "reason": "原因" }
  ]
}`
}

function parseJsonContent(content) {
  const cleaned = content.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim()

  try {
    return JSON.parse(cleaned)
  } catch (error) {
    const match = cleaned.match(/\{[\s\S]*\}/)
    if (match) return JSON.parse(match[0])
    throw new Error('大模型返回内容不是有效 JSON')
  }
}

function normalizeLlmResult(result = {}) {
  return {
    summary: String(result.summary || '当前教室环境存在一定波动，建议结合舒适度和能耗执行联动优化。'),
    riskLevel: String(result.riskLevel || '中'),
    problems: arrayOfText(result.problems),
    suggestions: arrayOfText(result.suggestions),
    deviceActions: Array.isArray(result.deviceActions)
      ? result.deviceActions.map((item) => ({
          device: String(item.device || '设备'),
          action: String(item.action || '保持当前策略'),
          reason: String(item.reason || '根据环境数据自动生成')
        }))
      : []
  }
}

function arrayOfText(value) {
  return Array.isArray(value) ? value.map((item) => String(item)).filter(Boolean) : []
}

function buildMockData(classroom, context, reason) {
  const latest = context.classroomState
  const alarmText = context.alarms.length
    ? context.alarms.slice(0, 3).map((item) => item.type).join('、')
    : '暂无严重报警'
  const freshAirSuggestion = latest.co2 > 1000 ? '新风开启中速或高速运行，优先把 CO2 降到 900 ppm 以下' : '新风保持低速巡航，避免过度通风造成能耗浪费'
  const acSuggestion = latest.temperature > 28 ? '空调设为 26℃ 制冷，温度稳定后切换节能模式' : '空调维持当前设定，避免频繁启停'
  const lightSuggestion = latest.light > 850 ? '灯光亮度下调到 70%-80%，配合窗帘利用自然光' : '灯光保持当前亮度，优先保证课堂照度'
  const analysis = normalizeLlmResult({
    summary: `${classroom.classroom_id} 当前环境由动态模拟器生成，温度 ${latest.temperature}℃、CO2 ${latest.co2} ppm、能耗 ${latest.energy} kWh，主要风险为 ${alarmText}。`,
    riskLevel: latest.status === 'danger' ? '高' : latest.status === 'warning' ? '中' : '低',
    problems: [
      latest.co2 > 1000 ? `CO2 当前为 ${latest.co2} ppm，人数与通风状态导致空气质量压力上升` : 'CO2 处于可接受范围',
      latest.temperature > 30 ? `温度达到 ${latest.temperature}℃，已触发温度异常` : `温度 ${latest.temperature}℃，舒适度整体可控`,
      latest.energy > 16 ? `能耗 ${latest.energy} kWh 偏高，照明、空调和多媒体存在联动优化空间` : '能耗暂未超过阈值'
    ],
    suggestions: [
      freshAirSuggestion,
      acSuggestion,
      lightSuggestion,
      '人数上升时优先通风，人数下降后自动降档，预计节能 10%-18%'
    ],
    deviceActions: [
      { device: '空调', action: latest.temperature > 28 ? '设为 26℃' : '保持当前策略', reason: '根据温度趋势控制舒适度与能耗' },
      { device: '新风', action: latest.co2 > 1000 ? '开启中速' : '低速巡航', reason: '根据 CO2 和人数变化调节空气质量' },
      { device: '灯光', action: latest.light > 850 ? '亮度调整为 75%' : '保持当前亮度', reason: '兼顾照度与节能' }
    ]
  })

  return {
    mode: 'mock',
    fallback: true,
    error: reason,
    classroom_id: classroom.classroom_id,
    analysis: formatAnalysisText(analysis),
    result: analysis,
    usage: null,
    update_time: latest.update_time
  }
}

function formatAnalysisText(result) {
  return [
    `总体分析：${result.summary} 风险等级：${result.riskLevel}。`,
    `存在问题：${result.problems.join('；') || '暂无明显异常。'}`,
    `调控建议：${result.suggestions.join('；') || '保持当前策略并持续观察。'}`,
    `设备动作：${result.deviceActions.map((item) => `${item.device}${item.action}`).join('；') || '暂无需要立即执行的设备动作。'}`
  ].join('\n\n')
}

function readableError(error) {
  if (!error) return '大模型调用失败'
  if (error.status && error.message) return `大模型调用失败：HTTP ${error.status}，${error.message}`
  return `大模型调用失败：${error.message || String(error)}`
}
