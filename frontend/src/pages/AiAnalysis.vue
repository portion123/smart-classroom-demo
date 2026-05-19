<template>
  <div class="page ai-page">
    <div class="page-title-row">
      <h2>AI 智能分析</h2>
      <div class="ai-toolbar">
        <el-select v-model="localClassroom" style="width: 150px">
          <el-option v-for="item in classroomOptions" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
        <el-select v-model="analysisType" style="width: 150px">
          <el-option label="综合分析" value="comprehensive" />
          <el-option label="节能分析" value="energy" />
          <el-option label="环境分析" value="environment" />
        </el-select>
        <el-button :loading="loading" @click="refreshAnalysisData">刷新</el-button>
        <el-button :loading="loading" @click="regenerateAnalysis">重新生成</el-button>
        <el-button @click="copyAnalysis">复制</el-button>
        <el-button @click="exportAnalysis">导出</el-button>
        <el-tag effect="dark" type="primary">数据更新时间：{{ latest.updatedAt || latest.update_time || '-' }}</el-tag>
      </div>
    </div>

    <section class="ai-top-grid">
      <section class="glass-card ai-score-card">
        <div class="panel-head"><h3>环境综合评估</h3></div>
        <div class="ai-orbit">
          <div class="ai-core">AI</div>
          <span v-for="i in 4" :key="i"></span>
        </div>
        <strong class="score-good">{{ scoreText }}</strong>
        <p class="score-subtitle">舒适健康</p>
        <p class="score-desc">{{ roomTitle }} 当前环境评分 {{ environmentScore }} 分，AI 会基于实时数据、历史趋势和报警记录生成建议。</p>
        <div class="eval-time">评估时间：{{ analysisDisplayTime }}</div>
      </section>

      <section class="glass-card digital-twin">
        <div class="panel-head">
          <div>
            <h3>教室环境数字孪生</h3>
            <p>{{ roomTitle }} · {{ latest.building || '-' }} · {{ latest.floor || '-' }}</p>
          </div>
        </div>
        <div class="classroom-3d twin-scene">
          <div class="room-wall">
            <div class="room-light"></div>
            <div class="room-light"></div>
            <div class="room-board"></div>
          </div>
          <div class="room-platform">
            <span v-for="desk in desks" :key="desk.id" class="desk-3d" :style="desk.style"></span>
          </div>
          <div class="metric-chip" style="left: 22px; top: 62px"><small>温度</small><strong>{{ latest.temperature }}℃</strong><em>{{ tempLabel }}</em></div>
          <div class="metric-chip" style="left: 22px; top: 160px"><small>湿度</small><strong>{{ latest.humidity }}%</strong><em>舒适</em></div>
          <div class="metric-chip" style="left: 22px; bottom: 34px"><small>CO2</small><strong>{{ latest.co2 }} ppm</strong><em>{{ co2Label }}</em></div>
          <div class="metric-chip" style="right: 22px; top: 62px"><small>PM2.5</small><strong>{{ latest.pm25 }} ug/m3</strong><em>{{ pm25Label }}</em></div>
          <div class="metric-chip" style="right: 22px; top: 160px"><small>噪声</small><strong>{{ latest.noise }} dB</strong><em>{{ noiseLabel }}</em></div>
          <div class="metric-chip" style="right: 22px; bottom: 34px"><small>人数</small><strong>{{ peopleCount }} 人</strong><em>{{ latest.capacity || '-' }} 容量</em></div>
        </div>
        <div class="twin-score">
          <span>综合指数：{{ environmentScore }}/100</span>
          <el-tag :type="environmentScore >= 80 ? 'success' : 'warning'" effect="dark">{{ scoreText }}</el-tag>
          <el-progress :percentage="environmentScore" :show-text="false" />
        </div>
      </section>

      <section class="glass-card ai-conclusion">
        <div class="panel-head">
          <h3>AI 分析结论</h3>
          <el-button link type="primary" :loading="loading" @click="generate">生成 AI 分析</el-button>
        </div>
        <div class="conclusion-list">
          <article v-for="item in conclusionCards" :key="item.title" :class="item.tone">
            <el-icon><component :is="item.icon" /></el-icon>
            <div>
              <strong>{{ item.title }}</strong>
              <p>{{ item.text }}</p>
            </div>
          </article>
        </div>
        <div v-if="analysis" class="ai-result-panel">
          <div class="result-head">
            <strong>{{ analysisTitle }}</strong>
            <el-tag :type="aiMode === 'llm' ? 'success' : analysisIsCached ? 'info' : 'warning'" effect="dark">
              {{ aiMode === 'llm' ? 'LLM' : analysisIsCached ? '缓存分析' : 'MOCK' }}
            </el-tag>
          </div>
          <p class="analysis-text">{{ analysis }}</p>
          <small v-if="aiMode === 'mock' && aiError" class="ai-debug-tip">{{ aiError }}</small>
          <div v-if="aiResult" class="structured-result">
            <div>
              <b>总体分析</b>
              <span>{{ aiResult.summary || '暂无总体分析' }}</span>
            </div>
            <div>
              <b>风险等级</b>
              <span>{{ aiResult.riskLevel || '中' }}</span>
            </div>
            <div>
              <b>问题列表</b>
              <ul>
                <li v-for="item in structuredProblems" :key="item">{{ item }}</li>
              </ul>
            </div>
            <div>
              <b>优化建议</b>
              <ul>
                <li v-for="item in structuredSuggestions" :key="item">{{ item }}</li>
              </ul>
            </div>
            <div class="device-actions">
              <b>设备动作建议</b>
              <ul>
                <li v-for="item in structuredDeviceActions" :key="`${item.device}-${item.action}`">
                  {{ item.device }}：{{ item.action }}<em v-if="item.reason">（{{ item.reason }}）</em>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </section>

    <section class="ai-bottom-grid">
      <ChartPanel title="关键指标趋势预测（最近采样）" subtitle="来自当前教室历史数据" :option="forecastOption" height="238px" />
      <section class="glass-card energy-advice">
        <div class="panel-head"><h3>能耗优化建议</h3></div>
        <div class="energy-content">
          <ChartPanel title="" :option="savingOption" height="178px" />
          <div class="saving-list">
            <div><b>照明系统</b><span>{{ optimization.light }}</span><em>节能 12%</em></div>
            <div><b>空调系统</b><span>{{ optimization.ac }}</span><em>节能 10%</em></div>
            <div><b>新风系统</b><span>{{ optimization.ventilation }}</span><em>{{ optimization.saving }}</em></div>
          </div>
        </div>
      </section>
      <section class="glass-card basis-card">
        <div class="panel-head"><h3>本次分析主要依据</h3></div>
        <ul>
          <li v-for="item in basis" :key="item.title"><b>{{ item.title }}</b><span>{{ item.text }}</span></li>
        </ul>
      </section>
    </section>

    <section class="glass-card ai-action-bar">
      <div class="ai-mini-core">AI</div>
      <p>
        <b>{{ aiMode === 'llm' ? 'AI 实时分析结果' : analysisIsCached ? '缓存分析结果' : '模拟分析结果' }}</b>
        {{ optimization.summary }}
        <small v-if="aiMode === 'mock' && aiError" class="ai-debug-tip">{{ aiError }}</small>
      </p>
      <el-button class="primary-gradient action-button" :loading="optimizationLoading" :icon="MagicStick" @click="generateOptimization">一键优化方案</el-button>
      <el-button class="preview-button" :icon="View" @click="previewVisible = true">方案预览</el-button>
      <el-button class="preview-button" @click="executeSuggestion">执行建议</el-button>
    </section>

    <el-dialog v-model="previewVisible" title="优化方案预览" width="520px" class="dark-dialog">
      <div class="preview-list">
        <div v-for="item in previewRows" :key="item.name">
          <span>{{ item.name }}</span>
          <strong>{{ item.before }}</strong>
          <b>→</b>
          <em>{{ item.after }}</em>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, inject, onMounted, onUnmounted, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { CircleCheck, Connection, MagicStick, Monitor, View, Warning } from '@element-plus/icons-vue'
import ChartPanel from '../components/ChartPanel.vue'
import { analyzeAi, getHistoryData, getLatestClassroom } from '../api/request'

const appNavigation = inject('appNavigation', null)
const classroomOptions = [
  { label: 'A205 教室', value: 'A205' },
  { label: 'B101 教室', value: 'B101' },
  { label: 'B102 教室', value: 'B102' },
  { label: 'C301 教室', value: 'C301' }
]
const localClassroom = ref(appNavigation?.selectedClassroom?.value || 'A205')
const selectedClassroom = computed(() => localClassroom.value)
const analysisType = ref('comprehensive')

const latest = ref({ classroomId: selectedClassroom.value, classroomName: `${selectedClassroom.value} 教室`, temperature: 26.1, humidity: 62, co2: 980, pm25: 28, noise: 45, people_count: 36, peopleCount: 36, energy: 8.8, update_time: '' })
const history = ref([])
const analysis = ref('')
const aiResult = ref(null)
const aiMode = ref('')
const aiError = ref('')
const analysisTime = ref('')
const analysisIsCached = ref(false)
const loading = ref(false)
const optimizationLoading = ref(false)
const previewVisible = ref(false)
const analysisCache = ref({ key: '', payload: null, analysisTime: '' })
let refreshTimer = null

const optimization = ref({
  ac: '维持 26℃，按需调整',
  ventilation: '按 CO2 自动调节新风',
  light: '按光照自动调光',
  saving: '节能 15%',
  summary: '建议结合人数和 CO2 趋势联动新风、空调与照明，优先保障舒适度并降低空转能耗。'
})

const currentClassroomId = computed(() => latest.value.classroomId || latest.value.classroom_id || selectedClassroom.value)
const roomTitle = computed(() => latest.value.classroomName || latest.value.name || `${currentClassroomId.value} 教室`)
const peopleCount = computed(() => latest.value.peopleCount ?? latest.value.people_count ?? 0)
const analysisDisplayTime = computed(() => analysisTime.value || latest.value.updatedAt || latest.value.update_time || '-')

const environmentScore = computed(() => {
  const penalties = [
    Math.max(0, (Number(latest.value.co2 || 0) - 800) / 25),
    Math.max(0, (Number(latest.value.temperature || 0) - 26) * 3),
    Math.max(0, (Number(latest.value.pm25 || 0) - 35) / 2),
    Math.max(0, (Number(latest.value.noise || 0) - 55) / 1.5)
  ]
  return Math.max(60, Math.round(96 - penalties.reduce((sum, value) => sum + value, 0)))
})
const scoreText = computed(() => environmentScore.value >= 86 ? '良好' : environmentScore.value >= 75 ? '可控' : '需关注')
const tempLabel = computed(() => latest.value.temperature > 28 ? '偏高' : '舒适')
const co2Label = computed(() => latest.value.co2 > 1000 ? '偏高' : '良好')
const pm25Label = computed(() => latest.value.pm25 > 55 ? '偏高' : '优')
const noiseLabel = computed(() => latest.value.noise > 68 ? '偏高' : '安静')

const analysisTitle = computed(() => (aiMode.value === 'llm' ? 'AI 实时分析结果' : analysisIsCached.value ? '缓存分析结果' : '模拟分析结果'))
const structuredProblems = computed(() => normalizeTextList(aiResult.value?.problems, '暂无明显问题'))
const structuredSuggestions = computed(() => normalizeTextList(aiResult.value?.suggestions, '保持当前策略并持续观察'))
const structuredDeviceActions = computed(() => (Array.isArray(aiResult.value?.deviceActions) && aiResult.value.deviceActions.length
  ? aiResult.value.deviceActions
  : [{ device: '设备', action: '暂无需要立即执行的动作', reason: '' }]))

const mockAnalysisText = computed(() =>
  `${roomTitle.value} 当前由本地模拟 AI 生成分析。\n\n` +
  `当前环境：温度 ${latest.value.temperature}℃，CO2 ${latest.value.co2} ppm，能耗 ${latest.value.energy} kW。\n\n` +
  `调控建议：${latest.value.co2 > 1000 ? '优先提高新风档位；' : '新风低速巡航；'}空调保持舒适区间；照明按光照自动调整。\n\n` +
  '节能建议：课后自动关闭多媒体、照明和空调，减少空转能耗。'
)

const currentClassroomPayload = computed(() => ({
  classroomId: currentClassroomId.value,
  classroom_id: currentClassroomId.value,
  analysisType: analysisType.value,
  classroomData: {
    classroomId: currentClassroomId.value,
    classroom_id: currentClassroomId.value,
    room: currentClassroomId.value,
    classroomName: roomTitle.value,
    building: latest.value.building,
    floor: latest.value.floor,
    area: latest.value.area,
    capacity: latest.value.capacity,
    temperature: latest.value.temperature ?? 28.6,
    humidity: latest.value.humidity ?? 68,
    co2: latest.value.co2 ?? 1450,
    light: latest.value.light ?? 720,
    pm25: latest.value.pm25 ?? 42,
    noise: latest.value.noise ?? 56,
    people_count: peopleCount.value,
    energy: latest.value.energy ?? 12.8,
    light_status: latest.value.light_status || 'on',
    ac_status: latest.value.ac_status || 'on',
    ventilation_status: latest.value.ventilation_status || 'off',
    curtain_status: latest.value.curtain_status || 'on',
    multimedia_status: latest.value.multimedia_status || 'on'
  }
}))

function buildAnalysisCacheKey() {
  return [
    currentClassroomId.value,
    analysisType.value,
    latest.value.temperature,
    latest.value.humidity,
    latest.value.co2,
    latest.value.energy,
    latest.value.update_time || latest.value.updatedAt
  ].join('|')
}

async function refreshRealtimeData() {
  const id = selectedClassroom.value
  const [latestData, historyData] = await Promise.all([getLatestClassroom(id), getHistoryData(id)])
  latest.value = latestData
  history.value = historyData
}

const desks = Array.from({ length: 15 }, (_, index) => {
  const row = Math.floor(index / 5)
  const col = index % 5
  return {
    id: index,
    style: {
      left: `${72 + col * 54}px`,
      top: `${88 + row * 44}px`
    }
  }
})

const conclusionCards = computed(() => {
  const result = aiResult.value
  const paragraphs = analysis.value.split(/\n+/).filter(Boolean)
  return [
    { title: '当前判断', text: result?.summary || extract(paragraphs, 0, `${roomTitle.value} 当前环境评分 ${environmentScore.value} 分。`), icon: CircleCheck, tone: 'ok' },
    { title: '存在问题', text: structuredProblems.value.join('；'), icon: Warning, tone: 'warn' },
    { title: '调控建议', text: structuredDeviceActions.value.map((item) => `${item.device}${item.action}`).join('；'), icon: Monitor, tone: 'blue' },
    { title: '节能建议', text: structuredSuggestions.value.join('；'), icon: Connection, tone: 'green' }
  ]
})

const previewRows = computed(() => [
  { name: 'CO2', before: `${latest.value.co2} ppm`, after: latest.value.co2 > 1000 ? '900 ppm 以下' : '保持稳定' },
  { name: '温度', before: `${latest.value.temperature}℃`, after: latest.value.temperature > 28 ? '26℃' : '保持当前' },
  { name: '新风', before: latest.value.ventilation_status || '-', after: latest.value.co2 > 1000 ? '中速运行' : '低速巡航' },
  { name: '照明亮度', before: `${latest.value.light || '-'} lux`, after: '按自然光调节' },
  { name: '预计节能', before: '-', after: optimization.value.saving }
])

const basis = computed(() => [
  { title: '实时环境数据', text: `${roomTitle.value} 最新动态模拟数据。` },
  { title: '历史趋势数据', text: '最近一段时间的温湿度、CO2、光照、人数与能耗曲线。' },
  { title: '设备运行状态', text: '空调、新风、照明、窗帘、多媒体等设备状态。' },
  { title: '教室使用情况', text: `当前人数 ${peopleCount.value} / 容量 ${latest.value.capacity || '-'}。` },
  { title: '节能模型', text: 'AI 节能模型与多维度规则分析。' }
])

const forecastOption = computed(() => {
  const points = history.value.slice(-18)
  const x = points.map((item) => item.time)
  return {
    color: ['#31e98f', '#ff4d5f', '#147cff'],
    tooltip: { trigger: 'axis', backgroundColor: 'rgba(4,18,42,.92)', borderColor: '#1a9cff', textStyle: { color: '#eaf6ff' } },
    legend: { top: 0, textStyle: { color: '#a9c9e8' } },
    grid: { left: 42, right: 42, top: 36, bottom: 28 },
    xAxis: { type: 'category', data: x, axisLabel: { color: '#9fc2df' }, axisLine: { lineStyle: { color: 'rgba(152,204,255,.28)' } } },
    yAxis: [
      { type: 'value', axisLabel: { color: '#9fc2df' }, splitLine: { lineStyle: { color: 'rgba(120,180,255,.12)', type: 'dashed' } } },
      { type: 'value', axisLabel: { color: '#9fc2df' }, splitLine: { show: false } }
    ],
    series: [
      { name: '温度(℃)', type: 'line', smooth: true, data: points.map((item) => item.temperature), lineStyle: { width: 3 } },
      { name: 'CO2(ppm)', type: 'line', smooth: true, yAxisIndex: 1, data: points.map((item) => item.co2), lineStyle: { width: 3 } },
      { name: '人数(人)', type: 'line', smooth: true, data: points.map((item) => item.peopleCount ?? item.people_count), lineStyle: { width: 3 } }
    ]
  }
})

const savingOption = computed(() => ({
  color: ['#147cff', '#20d8ff', '#ffcf3d', '#2ee58f'],
  series: [
    {
      type: 'pie',
      radius: ['50%', '78%'],
      center: ['50%', '52%'],
      label: { show: false },
      data: [
        { value: 28, name: '照明' },
        { value: 30, name: '空调' },
        { value: 24, name: '新风' },
        { value: 18, name: '预计节能' }
      ]
    }
  ],
  graphic: [{ type: 'text', left: 'center', top: '42%', style: { text: `预计节能\n${optimization.value.saving.replace('节能 ', '')}`, fill: '#fff', fontSize: 20, fontWeight: 800, align: 'center' } }]
}))

function extract(paragraphs, index, fallback) {
  return (paragraphs[index] || fallback).replace(/^.*?[：:]/, '')
}

function normalizeTextList(value, fallback) {
  return Array.isArray(value) && value.length ? value : [fallback]
}

async function generate() {
  loading.value = true
  try {
    const cacheKey = buildAnalysisCacheKey()
    if (analysisCache.value.payload && analysisCache.value.key === cacheKey) {
      analysisIsCached.value = true
      applyAiResult(analysisCache.value.payload, { showSuccess: true, fromCache: true })
      analysisTime.value =
        analysisCache.value.analysisTime ||
        analysisCache.value.payload?.analysisTime ||
        latest.value.update_time ||
        latest.value.updatedAt
      return
    }

    const result = await analyzeAi(currentClassroomPayload.value)
    analysisCache.value = {
      key: cacheKey,
      payload: result,
      analysisTime: result.analysisTime || result.update_time || result.updatedAt || latest.value.update_time
    }
    analysisIsCached.value = false
    applyAiResult(result, { showSuccess: true, fromCache: false })
  } catch (error) {
    analysis.value = mockAnalysisText.value
    aiResult.value = null
    aiMode.value = 'mock'
    analysisIsCached.value = false
    aiError.value = error?.message || '前端调用 AI 分析失败'
    analysisTime.value = latest.value.updatedAt || latest.value.update_time || ''
    ElMessage.error('AI 分析失败，已使用本地 mock 结果')
  } finally {
    loading.value = false
  }
}

async function refreshAnalysisData() {
  await refreshRealtimeData()
  ElMessage.success(`${roomTitle.value} AI 分析数据已刷新`)
}

async function regenerateAnalysis() {
  analysisCache.value = { key: '', payload: null, analysisTime: '' }
  analysis.value = ''
  aiResult.value = null
  analysisTime.value = ''
  await refreshRealtimeData()
  await generate()
}

async function copyAnalysis() {
  const text = [
    analysisTitle.value,
    `教室：${roomTitle.value}`,
    `分析时间：${analysisDisplayTime.value}`,
    analysis.value || optimization.value.summary
  ].join('\n')
  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success('AI 分析内容已复制')
  } catch (error) {
    ElMessage.warning('当前浏览器不支持自动复制，请在弹窗中手动复制')
    ElMessageBox.alert(text, 'AI 分析内容', { confirmButtonText: '知道了' })
  }
}

function exportAnalysis() {
  const payload = {
    classroomId: currentClassroomId.value,
    analysisType: analysisType.value,
    analysisTime: analysisDisplayTime.value,
    mode: aiMode.value,
    cached: analysisIsCached.value,
    analysis: analysis.value,
    result: aiResult.value,
    optimization: optimization.value
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${currentClassroomId.value}-ai-analysis.json`
  link.click()
  URL.revokeObjectURL(url)
  ElMessage.success('AI 分析 JSON 已导出')
}

function executeSuggestion() {
  appNavigation?.navigateToPage?.('device', { classroom: currentClassroomId.value })
  ElMessage.success(`已跳转到 ${roomTitle.value} 设备控制页，可执行 AI 建议`)
}

async function generateOptimization() {
  optimizationLoading.value = true
  try {
    const result = await analyzeAi(currentClassroomPayload.value)
    analysisIsCached.value = false
    applyAiResult(result)
    applyOptimizationFromAi(result?.result)
    await ElMessageBox.alert(`${roomTitle.value} 优化方案已生成：空调、新风、照明按当前指标联动调节。`, '优化方案已生成', {
      confirmButtonText: '知道了',
      type: 'success'
    })
    ElMessage.success('优化方案已生成，可前往设备控制页执行')
  } catch (error) {
    analysis.value = mockAnalysisText.value
    aiResult.value = null
    aiMode.value = 'mock'
    aiError.value = error?.message || '前端调用 AI 优化失败'
    applyOptimizationFromAi()
    ElMessage.error('AI 分析接口不可用，已使用本地 mock 优化结果')
  } finally {
    optimizationLoading.value = false
  }
}

function applyAiResult(result, options = {}) {
  const structured = result?.result || null
  aiResult.value = structured
  aiMode.value = result?.mode || (result?.fallback ? 'mock' : '')
  aiError.value = result?.error || result?.errorMessage || ''
  analysis.value = result?.analysis || formatStructuredAnalysis(structured) || mockAnalysisText.value
  if (options.fromCache && !analysis.value.startsWith('【缓存分析】')) {
    analysis.value = `【缓存分析】\n${analysis.value}`
  }
  const resolvedTime =
    result?.analysisTime ||
    result?.updatedAt ||
    result?.update_time ||
    latest.value.updatedAt ||
    latest.value.update_time
  if (resolvedTime) {
    analysisTime.value = resolvedTime
    latest.value = {
      ...latest.value,
      updatedAt: resolvedTime,
      update_time: resolvedTime,
      currentTime: resolvedTime,
      generatedAt: resolvedTime
    }
  }
  if (options.showSuccess && options.fromCache) {
    ElMessage.info('已使用缓存分析')
  } else if (result?.mode === 'llm') {
    ElMessage.success('AI 实时分析结果已生成')
  } else if (result?.fallback || result?.mode === 'mock') {
    ElMessage.warning(aiError.value ? `模拟分析结果：${aiError.value}` : '已使用模拟分析结果')
  } else if (options.showSuccess) {
    ElMessage.success('AI 分析已完成')
  }
}

function applyOptimizationFromAi(result = aiResult.value) {
  const actionText = (device) => {
    const item = result?.deviceActions?.find((entry) => entry.device?.includes(device))
    return item ? item.action : ''
  }
  optimization.value = {
    ac: actionText('空调') || (latest.value.temperature > 28 ? '空调设为 26℃' : '保持当前设定'),
    ventilation: actionText('新风') || (latest.value.co2 > 1000 ? '新风中速运行' : '新风低速巡航'),
    light: actionText('灯光') || '按自然光自动调光',
    saving: '节能 15%',
    summary: result?.summary || `${roomTitle.value} 建议按 CO2、温度和人数联动调节设备，预计可降低空转能耗。`
  }
}

function formatStructuredAnalysis(result) {
  if (!result) return ''
  return [
    `总体分析：${result.summary || '当前教室环境需要持续观察。'} 风险等级：${result.riskLevel || '中'}。`,
    `存在问题：${result.problems?.join('；') || '暂无明显异常。'}`,
    `调控建议：${result.suggestions?.join('；') || '保持当前策略。'}`,
    `设备动作：${result.deviceActions?.map((item) => `${item.device}${item.action}`).join('；') || '暂无设备动作。'}`
  ].join('\n\n')
}

watch(localClassroom, (value) => {
  if (appNavigation?.selectedClassroom && appNavigation.selectedClassroom.value !== value) {
    appNavigation.selectedClassroom.value = value
  }
})

if (appNavigation?.selectedClassroom) {
  watch(appNavigation.selectedClassroom, (value) => {
    if (value && value !== localClassroom.value) localClassroom.value = value
  })
}

watch([selectedClassroom, analysisType], async () => {
  analysisCache.value = { key: '', payload: null, analysisTime: '' }
  analysis.value = ''
  aiResult.value = null
  analysisTime.value = ''
  await refreshRealtimeData()
  await generate()
})

onMounted(async () => {
  await refreshRealtimeData()
  await generate()
  refreshTimer = window.setInterval(refreshRealtimeData, 5000)
})

onUnmounted(() => {
  window.clearInterval(refreshTimer)
})
</script>

<style scoped>
.ai-top-grid {
  display: grid;
  grid-template-columns: 300px minmax(0, 1fr) 430px;
  gap: 14px;
}

.page-title-row {
  align-items: center;
}

.ai-toolbar {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  align-items: center;
  gap: 8px;
}

.ai-score-card {
  min-height: 410px;
  padding-bottom: 18px;
  text-align: center;
}

.ai-orbit {
  position: relative;
  z-index: 1;
  width: 170px;
  height: 170px;
  margin: 26px auto 12px;
  border: 1px dashed rgba(32, 216, 255, 0.45);
  border-radius: 50%;
  background: radial-gradient(circle, rgba(20, 124, 255, 0.16), transparent 62%);
}

.ai-core,
.ai-mini-core {
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: radial-gradient(circle, #29d9ff, #075dff 65%, #03265c);
  color: #fff;
  font-weight: 900;
  box-shadow: 0 0 30px rgba(20, 164, 255, 0.9);
}

.ai-core {
  position: absolute;
  inset: 34px;
  font-size: 42px;
}

.ai-orbit span {
  position: absolute;
  inset: 18px;
  border: 1px solid rgba(25, 167, 255, 0.22);
  border-radius: 50%;
}

.score-good {
  position: relative;
  z-index: 1;
  display: block;
  color: var(--green);
  font-size: 34px;
}

.score-subtitle,
.score-desc,
.eval-time {
  position: relative;
  z-index: 1;
  color: #b8d4ec;
}

.score-desc {
  padding: 0 26px;
  line-height: 1.8;
}

.eval-time {
  width: calc(100% - 36px);
  margin: 16px auto 0;
  padding: 11px;
  border: 1px solid rgba(66, 167, 255, 0.2);
  border-radius: 8px;
  background: rgba(8, 48, 98, 0.5);
}

.digital-twin {
  min-height: 410px;
}

.twin-scene {
  height: 330px;
}

.twin-score {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: auto 70px 1fr;
  align-items: center;
  gap: 12px;
  padding: 0 28px 18px;
}

.ai-conclusion {
  min-height: 410px;
}

.conclusion-list {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 10px;
  padding: 16px;
}

.conclusion-list article {
  display: flex;
  gap: 12px;
  padding: 14px;
  border: 1px solid rgba(67, 164, 255, 0.18);
  border-radius: 8px;
  background: rgba(7, 44, 91, 0.6);
}

.conclusion-list .el-icon {
  flex: 0 0 auto;
  color: var(--accent);
  font-size: 26px;
}

.conclusion-list strong {
  color: var(--accent);
}

.conclusion-list p {
  margin: 7px 0 0;
  color: #d7eaff;
  line-height: 1.65;
}

.ai-result-panel {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 10px;
  margin: 0 16px 16px;
  padding: 12px;
  border: 1px solid rgba(64, 167, 255, 0.18);
  border-radius: 8px;
  background: rgba(8, 48, 96, 0.42);
}

.result-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.result-head strong,
.structured-result b {
  color: #eaf6ff;
}

.analysis-text {
  max-height: 92px;
  margin: 0;
  overflow: auto;
  white-space: pre-wrap;
  color: #b8d4ec;
  font-size: 12px;
  line-height: 1.7;
}

.structured-result {
  display: grid;
  gap: 8px;
  color: #b8d4ec;
  font-size: 12px;
}

.structured-result div {
  display: grid;
  gap: 4px;
}

.structured-result ul {
  display: grid;
  gap: 4px;
  margin: 0;
  padding-left: 16px;
}

.structured-result em {
  color: #8fb5d9;
  font-style: normal;
}

.conclusion-list .ok { --accent: var(--green); }
.conclusion-list .warn { --accent: var(--orange); }
.conclusion-list .blue { --accent: var(--cyan); }
.conclusion-list .green { --accent: var(--green); }

.ai-bottom-grid {
  display: grid;
  grid-template-columns: 1.2fr 0.85fr 0.85fr;
  gap: 14px;
}

.energy-content {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: 190px 1fr;
  gap: 12px;
  padding: 0 14px 12px;
}

.energy-content .chart-panel {
  border: 0;
  background: transparent;
  box-shadow: none;
}

.energy-content .chart-panel::before {
  display: none;
}

.saving-list {
  display: grid;
  gap: 10px;
  align-content: center;
}

.saving-list div {
  display: grid;
  grid-template-columns: 86px 1fr 70px;
  gap: 8px;
  padding: 11px;
  border-radius: 8px;
  background: rgba(8, 48, 96, 0.58);
  color: #cfe5fa;
}

.saving-list em {
  color: var(--green);
  font-style: normal;
}

.basis-card ul {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 16px 18px 18px;
  list-style: none;
}

.basis-card li {
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(88, 165, 234, 0.14);
  color: #acc7df;
}

.basis-card b {
  color: #eaf6ff;
}

.ai-action-bar {
  display: grid;
  grid-template-columns: 74px 1fr 190px 130px 130px;
  align-items: center;
  gap: 18px;
  padding: 18px 22px;
}

.ai-mini-core {
  position: relative;
  z-index: 1;
  width: 56px;
  height: 56px;
}

.ai-action-bar p,
.ai-action-bar .el-button {
  position: relative;
  z-index: 1;
}

.ai-action-bar p {
  margin: 0;
  color: #d9ecff;
  font-size: 16px;
}

.ai-debug-tip {
  display: block;
  margin-top: 4px;
  color: #8fb5d9;
  font-size: 12px;
}

.action-button {
  height: 48px;
  font-size: 18px;
  font-weight: 800;
}

.preview-button {
  height: 48px;
  border-color: rgba(72, 168, 255, 0.3);
  background: rgba(7, 43, 91, 0.66);
  color: #dbeeff;
}

.preview-list {
  display: grid;
  gap: 12px;
}

.preview-list div {
  display: grid;
  grid-template-columns: 110px 1fr 24px 1fr;
  align-items: center;
  gap: 10px;
  padding: 12px;
  border: 1px solid rgba(64, 167, 255, 0.18);
  border-radius: 8px;
  background: rgba(8, 48, 96, 0.42);
  color: #dbeeff;
}

.preview-list strong {
  color: var(--orange);
}

.preview-list b {
  color: var(--cyan);
  text-align: center;
}

.preview-list em {
  color: var(--green);
  font-style: normal;
  font-weight: 800;
}
</style>
