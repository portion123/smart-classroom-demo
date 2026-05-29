<template>
  <div class="page dashboard-page">
    <section class="stat-grid">
      <StatCard
        v-for="metric in metrics"
        :key="metric.key"
        :icon="metric.icon"
        :label="metric.label"
        :value="metric.value"
        :unit="metric.unit"
        :status="metric.status"
        :tone="metric.tone"
      />
    </section>

    <section class="dashboard-main">
      <ChartPanel title="温度趋势（℃）" subtitle="当前教室历史曲线" :option="temperatureOption" height="252px" />
      <ChartPanel title="CO2 趋势（ppm）" subtitle="当前教室历史曲线" :option="co2Option" height="252px" />
      <ChartPanel title="人数趋势（人）" subtitle="当前教室历史曲线" :option="peopleOption" height="252px" />

      <section class="glass-card classroom-card">
        <div class="panel-head">
          <div>
            <h3>教室状态（{{ currentClassroomId }}）</h3>
            <p>{{ roomMeta }}</p>
          </div>
          <el-button link type="primary" @click="goRealtime">更多</el-button>
        </div>
        <div class="classroom-preview">
          <div class="preview-window"></div>
          <div class="preview-board"></div>
          <span v-for="i in 14" :key="i" class="preview-seat" :style="seatStyle(i)"></span>
        </div>
        <div class="status-list">
          <span><i class="dot green"></i>运行状态 <b>{{ latestStatusText }}</b></span>
          <span><i class="dot blue"></i>使用时段 <b>08:00 - 22:00</b></span>
          <span><i class="dot cyan"></i>当前人数 <b>{{ peopleCount }} 人</b></span>
          <span><i class="dot orange"></i>所在楼层 <b>{{ latest.floor || '-' }}</b></span>
        </div>
      </section>

      <section class="glass-card ai-advice">
        <div class="panel-head">
          <div>
            <h3>AI 分析建议</h3>
            <p>{{ aiModeText }}</p>
          </div>
        </div>
        <div class="ai-content">
          <el-button class="primary-gradient" :loading="aiLoading" :icon="MagicStick" @click="generateAnalysis">
            生成 AI 分析
          </el-button>
          <p>{{ aiSummary }}</p>
          <small>分析时间：{{ analysisTime || latest.updatedAt || latest.update_time || '-' }}</small>
        </div>
      </section>
    </section>

    <section class="dashboard-bottom">
      <section class="glass-card alarm-table-card">
        <div class="panel-head">
          <div>
            <h3>异常报警记录</h3>
            <p>{{ roomTitle }} 最近 {{ alarms.length }} 条</p>
          </div>
          <el-button link type="primary" @click="goAlarm">更多</el-button>
        </div>
        <div class="data-table">
          <el-table :data="alarms.slice(0, 5)" height="210" size="small" empty-text="暂无异常">
            <el-table-column prop="time" label="时间" min-width="154" />
            <el-table-column prop="classroom_id" label="教室" width="82" />
            <el-table-column prop="type" label="类型" width="118" />
            <el-table-column label="级别" width="88">
              <template #default="{ row }">
                <el-tag :type="row.level === 'danger' || row.level === 'high' ? 'danger' : row.level === 'warning' || row.level === 'medium' ? 'warning' : 'primary'" effect="dark" round>
                  {{ levelText(row.level) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="content" label="内容" min-width="260" show-overflow-tooltip />
          </el-table>
        </div>
      </section>

      <section class="glass-card compact-control">
        <div class="panel-head">
          <div>
            <h3>设备控制（{{ currentClassroomId }}）</h3>
            <p>灯光 / 空调 / 新风</p>
          </div>
          <el-button link type="primary" @click="goDevice">更多</el-button>
        </div>
        <div class="compact-device-grid">
          <article v-for="device in quickDevices" :key="device.key" class="quick-device">
            <div>
              <el-icon><component :is="device.icon" /></el-icon>
              <strong>{{ device.name }}</strong>
            </div>
            <el-switch :model-value="device.on" @change="(value) => toggleDevice(device.key, value)" />
            <small>{{ device.desc }}</small>
          </article>
        </div>
      </section>
    </section>
  </div>
</template>

<script setup>
import { computed, inject, onMounted, onUnmounted, ref, watch } from 'vue'
import {
  Bell,
  Connection,
  Histogram,
  MagicStick,
  Monitor,
  Sunny,
  TrendCharts,
  UserFilled
} from '@element-plus/icons-vue'
import ChartPanel from '../components/ChartPanel.vue'
import StatCard from '../components/StatCard.vue'
import { analyzeAi, controlDevice, getAlarmList, getHistoryData, getLatestClassroom } from '../api/request'

const appNavigation = inject('appNavigation', null)
const selectedClassroom = computed(() => appNavigation?.selectedClassroom?.value || 'A205')

const latest = ref({
  classroomId: selectedClassroom.value,
  classroomName: `${selectedClassroom.value} 教室`,
  temperature: 26,
  humidity: 56,
  co2: 800,
  pm25: 24,
  noise: 48,
  people_count: 0,
  peopleCount: 0,
  energy: 0,
  light_status: 'on',
  ac_status: 'on',
  ventilation_status: 'on',
  devices: {}
})
const history = ref([])
const alarms = ref([])
const aiText = ref('请选择教室后生成 AI 分析，系统会基于当前动态模拟数据给出环境评价、异常原因和设备调度建议。')
const aiMode = ref('mock')
const aiLoading = ref(false)
const analysisTime = ref('')
let latestTimer = null
let historyTimer = null

const rules = {
  temperature: [28, 30],
  humidity: [70, 75],
  co2: [1000, 1500],
  pm25: [55, 75],
  noise: [60, 70],
  people_count: [50, 55]
}

const metricConfig = [
  { key: 'temperature', label: '温度', unit: '℃', icon: TrendCharts, tone: 'green' },
  { key: 'humidity', label: '湿度', unit: '%', icon: Connection, tone: 'blue' },
  { key: 'co2', label: 'CO2', unit: 'ppm', icon: Monitor, tone: 'red' },
  { key: 'pm25', label: 'PM2.5', unit: 'ug/m3', icon: Histogram, tone: 'orange' },
  { key: 'noise', label: '噪声', unit: 'dB', icon: Bell, tone: 'green' },
  { key: 'people_count', label: '人数', unit: '人', icon: UserFilled, tone: 'blue' }
]

const currentClassroomId = computed(() => latest.value.classroomId || latest.value.classroom_id || selectedClassroom.value)
const roomTitle = computed(() => latest.value.classroomName || latest.value.name || `${currentClassroomId.value} 教室`)
const roomMeta = computed(() => `${latest.value.building || '-'} / ${latest.value.floor || '-'} / 面积 ${latest.value.area || '-'}㎡`)
const peopleCount = computed(() => latest.value.peopleCount ?? latest.value.people_count ?? 0)
const latestStatusText = computed(() => latest.value.status === 'warning' || latest.value.status === 'danger' ? '预警' : '正常')

const metrics = computed(() =>
  metricConfig.map((item) => ({
    ...item,
    value: item.key === 'people_count' ? peopleCount.value : latest.value[item.key],
    status: metricStatus(item.key, item.key === 'people_count' ? peopleCount.value : latest.value[item.key])
  }))
)

const quickDevices = computed(() => {
  const devices = latest.value.devices || {}
  return [
    { key: 'light', name: '灯光', icon: Sunny, on: Boolean(devices.light?.status ?? latest.value.light_status === 'on' ?? true), desc: `照度 ${latest.value.light ?? '-'} lux` },
    { key: 'airConditioner', name: '空调', icon: Monitor, on: Boolean(devices.airConditioner?.status ?? latest.value.ac_status === 'on' ?? true), desc: `${latest.value.temperature ?? '-'}℃` },
    { key: 'freshAir', name: '新风', icon: Connection, on: Boolean(devices.freshAir?.status ?? latest.value.ventilation_status === 'on' ?? true), desc: `CO2 ${latest.value.co2 ?? '-'} ppm` }
  ]
})

const aiModeText = computed(() => (['llm', 'deepseek'].includes(aiMode.value) ? 'DeepSeek 实时分析' : '后端本地 AI 模拟分析'))
const aiSummary = computed(() => aiText.value.replace(/\n+/g, ' ').slice(0, 170))

const temperatureOption = computed(() => makeLineOption('温度', history.value.map((item) => item.time), history.value.map((item) => item.temperature), '#31e98f', '℃'))
const co2Option = computed(() => makeLineOption('CO2', history.value.map((item) => item.time), history.value.map((item) => item.co2), '#ff4d5f', 'ppm'))
const peopleOption = computed(() => makeLineOption('人数', history.value.map((item) => item.time), history.value.map((item) => item.peopleCount ?? item.people_count), '#147cff', '人'))

function metricStatus(key, value) {
  const [warning, danger] = rules[key]
  const number = Number(value || 0)
  if (number >= danger) return 'danger'
  if (number >= warning) return 'warning'
  return 'normal'
}

function makeLineOption(name, xData, data, color, unit) {
  return {
    color: [color],
    tooltip: { trigger: 'axis', backgroundColor: 'rgba(4, 18, 42, 0.92)', borderColor: '#1a9cff', textStyle: { color: '#eaf6ff' } },
    grid: { left: 42, right: 18, top: 34, bottom: 30 },
    xAxis: { type: 'category', data: xData, boundaryGap: false, axisLine: { lineStyle: { color: 'rgba(152, 204, 255, .28)' } }, axisLabel: { color: '#9fc2df', hideOverlap: true } },
    yAxis: { type: 'value', name: unit, splitLine: { lineStyle: { color: 'rgba(120, 180, 255, .12)', type: 'dashed' } }, axisLabel: { color: '#9fc2df' }, nameTextStyle: { color: '#9fc2df' } },
    series: [{ name, type: 'line', smooth: true, symbolSize: 7, data, lineStyle: { width: 3 }, areaStyle: { color: `${color}22` } }]
  }
}

function levelText(level) {
  return level === 'danger' || level === 'high' ? '高' : level === 'warning' || level === 'medium' ? '中' : '提示'
}

function seatStyle(index) {
  const row = Math.floor((index - 1) / 5)
  const col = (index - 1) % 5
  return { left: `${22 + col * 46}px`, top: `${92 + row * 29}px` }
}

function normalizeAlarm(item) {
  return {
    ...item,
    classroom_id: item.classroomId || item.classroom_id || currentClassroomId.value,
    content: item.message || item.content || `${item.type || '异常'} ${item.value ?? ''}`,
    time: item.time || item.generatedAt || item.updatedAt || latest.value.updatedAt || '--'
  }
}

async function loadLatest() {
  latest.value = await getLatestClassroom(selectedClassroom.value)
}

async function loadDashboard() {
  const id = selectedClassroom.value
  const [latestData, historyData, alarmData] = await Promise.all([getLatestClassroom(id), getHistoryData(id, 96), getAlarmList(id)])
  latest.value = latestData
  history.value = historyData
  alarms.value = alarmData.map(normalizeAlarm)
}

async function generateAnalysis() {
  aiLoading.value = true
  try {
    const result = await analyzeAi({ classroomId: selectedClassroom.value })
    aiText.value = result.analysis
    aiMode.value = result.mode
    analysisTime.value = result.analysisTime || result.updatedAt || result.update_time || latest.value.updatedAt || latest.value.update_time || ''
  } finally {
    aiLoading.value = false
  }
}

async function toggleDevice(device, value) {
  const result = await controlDevice({ classroomId: selectedClassroom.value, device, action: value ? 'on' : 'off' })
  latest.value = result.latest || latest.value
}

function goRealtime() {
  appNavigation?.navigateToPage?.('realtime', { classroom: selectedClassroom.value })
}

function goAlarm() {
  appNavigation?.navigateToPage?.('alarm', { classroom: selectedClassroom.value })
}

function goDevice() {
  appNavigation?.navigateToPage?.('device', { classroom: selectedClassroom.value })
}

watch(selectedClassroom, () => {
  loadDashboard()
})

onMounted(async () => {
  await loadDashboard()
  latestTimer = window.setInterval(loadLatest, 3000)
  historyTimer = window.setInterval(loadDashboard, 5000)
})

onUnmounted(() => {
  window.clearInterval(latestTimer)
  window.clearInterval(historyTimer)
})
</script>

<style scoped>
.dashboard-main {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 220px 260px;
  gap: 14px;
}

.classroom-card,
.ai-advice {
  min-height: 330px;
}

.classroom-preview {
  position: relative;
  z-index: 1;
  height: 118px;
  margin: 14px;
  overflow: hidden;
  border-radius: 8px;
  border: 1px solid rgba(90, 190, 255, 0.28);
  background:
    linear-gradient(90deg, rgba(255,255,255,.16) 1px, transparent 1px),
    linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px),
    linear-gradient(160deg, rgba(194, 226, 241, 0.7), rgba(22, 67, 99, 0.55));
  background-size: 34px 34px;
}

.preview-window {
  position: absolute;
  left: 14px;
  top: 18px;
  width: 42px;
  height: 78px;
  background: rgba(198, 238, 255, 0.58);
}

.preview-board {
  position: absolute;
  left: 86px;
  top: 22px;
  width: 104px;
  height: 34px;
  background: #28555d;
}

.preview-seat {
  position: absolute;
  width: 30px;
  height: 16px;
  border-radius: 3px;
  background: linear-gradient(180deg, #b68b56, #58391f);
  box-shadow: 0 8px 0 rgba(24, 37, 48, 0.65);
}

.status-list {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 8px;
  padding: 0 16px 14px;
}

.status-list span {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #bdd7f0;
  font-size: 13px;
}

.status-list b {
  color: #58f1b0;
}

.dot {
  width: 9px;
  height: 9px;
  margin-right: 7px;
  border-radius: 50%;
  background: var(--green);
}

.dot.blue { background: var(--blue); }
.dot.cyan { background: var(--cyan); }
.dot.orange { background: var(--orange); }

.ai-content {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 16px;
  padding: 18px;
  color: #dbeeff;
  line-height: 1.8;
}

.ai-content p {
  margin: 0;
}

.ai-content small {
  color: #81a9c9;
}

.dashboard-bottom {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 14px;
}

.compact-device-grid {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  padding: 18px;
}

.quick-device {
  display: grid;
  gap: 14px;
  min-height: 146px;
  padding: 16px;
  border: 1px solid rgba(57, 164, 255, 0.22);
  border-radius: 8px;
  background: rgba(6, 43, 91, 0.58);
}

.quick-device div {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 17px;
  font-weight: 800;
}

.quick-device .el-icon {
  color: var(--cyan);
  font-size: 28px;
}

.quick-device small {
  color: #9ec5e3;
}
</style>
