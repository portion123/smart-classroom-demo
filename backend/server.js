import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import OpenAI from 'openai'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

loadEnvFile(path.join(__dirname, '.env'))

const app = express()
const PORT = Number(process.env.PORT || 8014)
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
      hasApiKey: Boolean(process.env.LLM_API_KEY),
      baseURL: Boolean(process.env.LLM_BASE_URL),
      model: process.env.LLM_MODEL || '',
      status: 'ok'
    }
  })
})

app.post('/api/ai/analyze', async (req, res) => {
  const classroom = normalizeClassroomPayload(req.body)
  const missingEnv = requiredLlmEnv().filter((key) => !process.env[key])

  if (missingEnv.length > 0) {
    return sendJson(res, {
      code: 200,
      message: 'success',
      data: buildMockData(classroom, `缺少环境变量：${missingEnv.join(', ')}`)
    })
  }

  try {
    const { analysis, usage } = await callLlmAnalysis(classroom)
    return sendJson(res, {
      code: 200,
      message: 'success',
      data: {
        mode: 'llm',
        classroom_id: classroom.classroom_id,
        analysis: formatAnalysisText(analysis),
        result: analysis,
        usage
      }
    })
  } catch (error) {
    return sendJson(res, {
      code: 200,
      message: 'success',
      data: buildMockData(classroom, readableError(error))
    })
  }
})

const server = app.listen(PORT, () => {
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

function requiredLlmEnv() {
  return ['LLM_API_KEY', 'LLM_BASE_URL', 'LLM_MODEL']
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

async function callLlmAnalysis(classroom) {
  const client = new OpenAI({
    apiKey: process.env.LLM_API_KEY,
    baseURL: process.env.LLM_BASE_URL,
    timeout: Number(process.env.LLM_TIMEOUT_MS || 30000)
  })

  const response = await client.chat.completions.create({
    model: process.env.LLM_MODEL,
    temperature: 0.2,
    max_tokens: 900,
    messages: [
      {
        role: 'system',
        content: '你是智慧教室环境监测与节能调控专家。必须只输出严格 JSON，不要输出 Markdown、代码块或额外解释。'
      },
      {
        role: 'user',
        content: buildPrompt(classroom)
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

function buildPrompt(classroom) {
  return `请根据 ${classroom.classroom_id} 智慧教室实时数据生成环境分析与节能调控方案。

当前数据：
- 教室：${classroom.classroom_id}
- 温度：${classroom.temperature}℃
- 湿度：${classroom.humidity}%
- CO2：${classroom.co2} ppm
- PM2.5：${classroom.pm25} μg/m³
- 噪声：${classroom.noise} dB
- 人数：${classroom.people_count}
- 灯光状态：${classroom.light_status}
- 空调状态：${classroom.ac_status}
- 新风状态：${classroom.ventilation_status}
- 窗帘状态：${classroom.curtain_status}
- 多媒体状态：${classroom.multimedia_status}

输出 JSON 结构必须为：
{
  "summary": "总体分析，1-2 句话",
  "riskLevel": "低/中/高",
  "problems": ["问题1", "问题2"],
  "suggestions": ["建议1", "建议2"],
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

function buildMockData(classroom, reason) {
  const analysis = normalizeLlmResult({
    summary: `${classroom.classroom_id} 当前 CO2 与温度偏高，建议执行舒适节能平衡策略。`,
    riskLevel: '中',
    problems: [
      `CO2 当前为 ${classroom.co2} ppm，存在空气流通不足风险`,
      `温度为 ${classroom.temperature}℃，舒适度可能下降`,
      '灯光、新风与空调存在联动优化空间'
    ],
    suggestions: [
      '空调设为 26℃',
      '新风开启中速运行',
      '灯光亮度调整为 80%',
      '预计节能 18%'
    ],
    deviceActions: [
      { device: '空调', action: '设为 26℃', reason: '降低温度并维持舒适区间' },
      { device: '新风', action: '开启中速', reason: '降低 CO2 浓度' },
      { device: '灯光', action: '亮度调整为 80%', reason: '减少照明能耗' }
    ]
  })

  return {
    mode: 'mock',
    fallback: true,
    error: reason,
    classroom_id: classroom.classroom_id,
    analysis: formatAnalysisText(analysis),
    result: analysis,
    usage: null
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
