<template>
  <div class="page ai-page">
    <div class="page-title-row">
      <h2>AI智能分析</h2>
      <el-tag effect="dark" type="primary">数据更新时间：{{ latest.update_time }}</el-tag>
    </div>

    <section class="ai-top-grid">
      <section class="glass-card ai-score-card">
        <div class="panel-head"><h3>环境综合评估</h3></div>
        <div class="ai-orbit">
          <div class="ai-core">AI</div>
          <span v-for="i in 4" :key="i"></span>
        </div>
        <strong class="score-good">良好</strong>
        <p class="score-subtitle">舒适健康</p>
        <p class="score-desc">当前教室环境整体良好，温度、湿度、空气质量等指标均处于舒适范围内，适宜教学活动开展。</p>
        <div class="eval-time">评估时间：{{ latest.update_time }}</div>
      </section>

      <section class="glass-card digital-twin">
        <div class="panel-head">
          <div>
            <h3>教室环境数字孪生</h3>
            <p>A205 教室 · 智能监测点位</p>
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
          <div class="metric-chip" style="left: 22px; top: 62px"><small>温度</small><strong>{{ latest.temperature }}℃</strong><em>舒适</em></div>
          <div class="metric-chip" style="left: 22px; top: 160px"><small>湿度</small><strong>{{ latest.humidity }}%</strong><em>舒适</em></div>
          <div class="metric-chip" style="left: 22px; bottom: 34px"><small>CO₂</small><strong>{{ latest.co2 }} ppm</strong><em>良好</em></div>
          <div class="metric-chip" style="right: 22px; top: 62px"><small>PM2.5</small><strong>{{ latest.pm25 }} μg/m³</strong><em>优</em></div>
          <div class="metric-chip" style="right: 22px; top: 160px"><small>噪声</small><strong>{{ latest.noise }} dB</strong><em>安静</em></div>
          <div class="metric-chip" style="right: 22px; bottom: 34px"><small>人数</small><strong>{{ latest.people_count }} 人</strong><em>正常</em></div>
        </div>
        <div class="twin-score">
          <span>综合指数：84/100</span>
          <el-tag type="success" effect="dark">良好</el-tag>
          <el-progress :percentage="84" :show-text="false" />
        </div>
      </section>

      <section class="glass-card ai-conclusion">
        <div class="panel-head">
          <h3>AI分析结论</h3>
          <el-button link type="primary" :loading="loading" @click="generate">查看详情</el-button>
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
            <el-tag :type="aiMode === 'llm' ? 'success' : 'warning'" effect="dark">
              {{ aiMode === 'llm' ? 'LLM' : 'MOCK' }}
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
      <ChartPanel title="关键指标趋势预测（未来30分钟）" subtitle="预测时间：30分钟" :option="forecastOption" height="238px" />
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
        <b>{{ aiMode === 'llm' ? 'AI 实时分析结果' : aiMode === 'mock' ? '模拟分析结果' : 'AI综合建议' }}</b>
        {{ optimization.summary }}
        <small v-if="aiMode === 'mock' && aiError" class="ai-debug-tip">{{ aiError }}</small>
      </p>
      <el-button class="primary-gradient action-button" :loading="optimizationLoading" :icon="MagicStick" @click="generateOptimization">一键优化方案</el-button>
      <el-button class="preview-button" :icon="View" @click="previewVisible = true">方案预览</el-button>
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
import { computed, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { CircleCheck, Connection, MagicStick, Monitor, View, Warning } from '@element-plus/icons-vue'
import ChartPanel from '../components/ChartPanel.vue'
import { analyzeAi, getHistoryData, getLatestClassroom } from '../api/request'

const latest = ref({ temperature: 26.1, humidity: 62, co2: 980, pm25: 28, noise: 45, people_count: 36, update_time: '2025-05-23 10:24:36' })
const history = ref([])
const analysis = ref('')
const aiResult = ref(null)
const aiMode = ref('')
const aiError = ref('')
const loading = ref(false)
const optimizationLoading = ref(false)
const previewVisible = ref(false)
const optimization = ref({
  ac: '维持26℃，适时调节',
  ventilation: '中档运行，按需通风',
  light: '调光至80%亮度',
  saving: '节能 15%',
  summary: '建议开启新风系统保持空气流通，维持空调26℃，提高空气质量，预计可提升学习专注度。'
})

const analysisTitle = computed(() => (aiMode.value === 'llm' ? 'AI 实时分析结果' : aiMode.value === 'mock' ? '模拟分析结果' : 'AI 分析结果'))
const structuredProblems = computed(() => normalizeTextList(aiResult.value?.problems, '暂无明显问题'))
const structuredSuggestions = computed(() => normalizeTextList(aiResult.value?.suggestions, '保持当前策略并持续观察'))
const structuredDeviceActions = computed(() => (Array.isArray(aiResult.value?.deviceActions) && aiResult.value.deviceActions.length
  ? aiResult.value.deviceActions
  : [{ device: '设备', action: '暂无需要立即执行的动作', reason: '' }]))

const mockAnalysisText =
  '当前环境判断：A205 教室 CO₂ 与温度处于偏高区间，建议执行节能舒适平衡策略。\n\n' +
  '存在问题：CO₂ 达到 1450 ppm，温度 28.6℃，新风关闭且灯光亮度偏高。\n\n' +
  '调控建议：空调设为 26℃；新风开启；灯光亮度调整为 80%。\n\n' +
  '节能建议：执行后预计节能 18%，并将 CO₂ 降至约 1000 ppm。'

const currentClassroomPayload = computed(() => ({
  classroomData: {
    room: latest.value.classroom_id || latest.value.room || 'A205',
    temperature: latest.value.temperature ?? 28.6,
    humidity: latest.value.humidity ?? 68,
    co2: latest.value.co2 ?? 1450,
    light: latest.value.light ?? 720,
    pm25: latest.value.pm25 ?? 42,
    noise: latest.value.noise ?? 56,
    people_count: latest.value.people_count ?? 48,
    energy: latest.value.energy ?? 12.8,
    light_status: latest.value.light_status || 'on',
    ac_status: latest.value.ac_status || 'on',
    ventilation_status: latest.value.ventilation_status || 'off',
    curtain_status: latest.value.curtain_status || 'on',
    multimedia_status: latest.value.multimedia_status || 'on'
  }
}))

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
  const paragraphs = analysis.value.split(/\n+/).filter(Boolean)
  return [
    { title: '当前判断', text: extract(paragraphs, 0, '教室环境整体良好，学生体感舒适，专注度较高，适宜学习。'), icon: CircleCheck, tone: 'ok' },
    { title: '存在问题', text: extract(paragraphs, 1, 'CO₂浓度已接近1000 ppm，下午时段人数增加后可能超标。'), icon: Warning, tone: 'warn' },
    { title: '调控建议', text: extract(paragraphs, 2, '建议开启新风系统，保持空气流通；空调维持26℃，避免温度波动。'), icon: Monitor, tone: 'blue' },
    { title: '节能建议', text: extract(paragraphs, 3, '利用自然通风，减少新风机高档运行时长，休息时段适当调高空调温度。'), icon: Connection, tone: 'green' }
  ]
})

const previewRows = [
  { name: 'CO₂', before: '1450 ppm', after: '1000 ppm' },
  { name: '温度', before: '28.6℃', after: '26℃' },
  { name: '新风', before: '关闭', after: '开启' },
  { name: '灯光亮度', before: '100%', after: '80%' },
  { name: '预计节能', before: '-', after: '18%' }
]

const basis = [
  { title: '实时环境数据', text: '来自后端动态模拟器的实时课堂状态' },
  { title: '历史趋势数据', text: '最近一段时间的温湿度、CO₂、光照、人数与能耗曲线' },
  { title: '设备运行状态', text: '空调、新风、照明、窗帘、多媒体等设备状态' },
  { title: '教室使用情况', text: '当前人数、课程安排与使用时长' },
  { title: '节能模型', text: 'AI节能模型与多维度算法分析' }
]

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
      { name: 'CO₂(ppm)', type: 'line', smooth: true, yAxisIndex: 1, data: points.map((item) => item.co2), lineStyle: { width: 3 } },
      { name: '人数(人)', type: 'line', smooth: true, data: points.map((item) => item.people_count), lineStyle: { width: 3 } }
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
  graphic: [{ type: 'text', left: 'center', top: '42%', style: { text: '预计节能\n18%', fill: '#fff', fontSize: 20, fontWeight: 800, align: 'center' } }]
}))

function extract(paragraphs, index, fallback) {
  return (paragraphs[index] || fallback).replace(/^.*?：/, '')
}

function normalizeTextList(value, fallback) {
  return Array.isArray(value) && value.length ? value : [fallback]
}

async function generate() {
  loading.value = true
  try {
    const result = await analyzeAi(currentClassroomPayload.value)
    applyAiResult(result, { showSuccess: true })
  } catch (error) {
    analysis.value = mockAnalysisText
    aiResult.value = null
    aiMode.value = 'mock'
    aiError.value = error?.message || '前端调用 AI 分析失败'
    ElMessage.error('AI 分析失败，已使用本地 mock 结果')
  } finally {
    loading.value = false
  }
}

async function generateOptimization() {
  optimizationLoading.value = true
  try {
    await new Promise((resolve) => setTimeout(resolve, 1000))
    const result = await analyzeAi(currentClassroomPayload.value)
    applyAiResult(result)
    applyOptimizationFromAi(result?.result)
    await ElMessageBox.alert('空调设为 26℃；新风开启；灯光亮度调整为 80%；预计节能 18%。', '优化方案已生成', {
      confirmButtonText: '知道了',
      type: 'success'
    })
    ElMessage.success('优化方案已生成，可前往设备控制页执行')
  } catch (error) {
    analysis.value = mockAnalysisText
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
  analysis.value = result?.analysis || formatStructuredAnalysis(structured) || mockAnalysisText
  latest.value.update_time = result?.update_time || latest.value.update_time
  if (result?.mode === 'llm') {
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
    ac: actionText('空调') || '空调设为 26℃',
    ventilation: actionText('新风') || '新风开启',
    light: actionText('灯光') || '灯光亮度调整为 80%',
    saving: '预计节能 18%',
    summary: result?.summary || '空调设为 26℃；新风开启；灯光亮度调整为 80%；预计节能 18%。'
  }
  latest.value = {
    ...latest.value,
    temperature: 26,
    co2: 1000,
    ventilation_status: 'on',
    update_time: new Date().toLocaleString('zh-CN', { hour12: false }).replaceAll('/', '-')
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

onMounted(async () => {
  const [latestData, historyData] = await Promise.all([getLatestClassroom(), getHistoryData()])
  latest.value = latestData
  history.value = historyData
  await generate()
})
</script>

<style scoped>
.ai-top-grid {
  display: grid;
  grid-template-columns: 300px minmax(0, 1fr) 430px;
  gap: 14px;
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
  grid-template-columns: 74px 1fr 210px 150px;
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
