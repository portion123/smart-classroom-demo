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
      <ChartPanel title="温度趋势（℃）" subtitle="实时 / 24H / 7天 / 30天" :option="temperatureOption" height="252px" />
      <ChartPanel title="CO₂趋势（ppm）" subtitle="实时 / 24H / 7天 / 30天" :option="co2Option" height="252px" />
      <ChartPanel title="人数趋势（人）" subtitle="实时 / 24H / 7天 / 30天" :option="peopleOption" height="252px" />

      <section class="glass-card classroom-card">
        <div class="panel-head">
          <div>
            <h3>教室状态（A205）</h3>
            <p>运行状态 / 使用时段 / 楼层信息</p>
          </div>
          <el-button link type="primary">更多</el-button>
        </div>
        <div class="classroom-preview">
          <div class="preview-window"></div>
          <div class="preview-board"></div>
          <span v-for="i in 14" :key="i" class="preview-seat" :style="seatStyle(i)"></span>
        </div>
        <div class="status-list">
          <span><i class="dot green"></i>运行状态 <b>正常</b></span>
          <span><i class="dot blue"></i>使用时段 <b>08:00 - 22:00</b></span>
          <span><i class="dot cyan"></i>当前人数 <b>{{ latest.people_count }} 人</b></span>
          <span><i class="dot orange"></i>所在楼层 <b>2F</b></span>
        </div>
      </section>

      <section class="glass-card ai-advice">
        <div class="panel-head">
          <div>
            <h3>AI分析建议</h3>
            <p>{{ aiModeText }}</p>
          </div>
        </div>
        <div class="ai-content">
          <el-button class="primary-gradient" :loading="aiLoading" :icon="MagicStick" @click="generateAnalysis">
            生成AI分析
          </el-button>
          <p>{{ aiSummary }}</p>
          <small>分析时间：{{ latest.update_time }}</small>
        </div>
      </section>
    </section>

    <section class="dashboard-bottom">
      <section class="glass-card alarm-table-card">
        <div class="panel-head">
          <div>
            <h3>异常报警记录</h3>
            <p>最近 {{ alarms.length }} 条</p>
          </div>
          <el-button link type="primary">更多</el-button>
        </div>
        <div class="data-table">
          <el-table :data="alarms.slice(0, 5)" height="210" size="small">
            <el-table-column prop="time" label="时间" min-width="154" />
            <el-table-column prop="classroom_id" label="教室" width="82" />
            <el-table-column prop="type" label="类型" width="102" />
            <el-table-column label="级别" width="88">
              <template #default="{ row }">
                <el-tag :type="row.level === 'danger' ? 'danger' : row.level === 'warning' ? 'warning' : 'primary'" effect="dark" round>
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
            <h3>设备控制（A205）</h3>
            <p>灯光 / 空调 / 新风</p>
          </div>
          <el-button link type="primary">更多</el-button>
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
import { computed, onMounted, onUnmounted, ref } from 'vue'
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

const latest = ref({
  temperature: 28.6,
  humidity: 72,
  co2: 1450,
  pm25: 36,
  noise: 58,
  people_count: 46,
  update_time: '2025-05-23 10:24:36',
  light_status: 'on',
  ac_status: 'on',
  ventilation_status: 'on'
})
const history = ref([])
const alarms = ref([])
const aiText = ref('当前教室CO₂浓度接近预警阈值，建议开启新风或切换为中速通风；当前温度舒适，可维持空调 26℃，避免频繁启停。')
const aiMode = ref('mock')
const aiLoading = ref(false)
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
  { key: 'co2', label: 'CO₂', unit: 'ppm', icon: Monitor, tone: 'red' },
  { key: 'pm25', label: 'PM2.5', unit: 'μg/m³', icon: Histogram, tone: 'orange' },
  { key: 'noise', label: '噪声', unit: 'dB', icon: Bell, tone: 'green' },
  { key: 'people_count', label: '人数', unit: '人', icon: UserFilled, tone: 'blue' }
]

const metrics = computed(() =>
  metricConfig.map((item) => ({
    ...item,
    value: latest.value[item.key],
    status: metricStatus(item.key, latest.value[item.key])
  }))
)

const quickDevices = computed(() => [
  { key: 'light', name: '灯光', icon: Sunny, on: latest.value.light_status === 'on', desc: '亮度 80%' },
  { key: 'ac', name: '空调', icon: Monitor, on: latest.value.ac_status === 'on', desc: '制冷 26℃' },
  { key: 'ventilation', name: '新风', icon: Connection, on: latest.value.ventilation_status === 'on', desc: '中速通风' }
])

const aiModeText = computed(() => (['llm', 'deepseek'].includes(aiMode.value) ? 'DeepSeek 实时分析' : '后端本地 AI 模拟分析'))
const aiSummary = computed(() => aiText.value.replace(/\n+/g, ' ').slice(0, 170))

const temperatureOption = computed(() => makeLineOption('温度', history.value.map((item) => item.time), history.value.map((item) => item.temperature), '#31e98f', '℃'))
const co2Option = computed(() => makeLineOption('CO₂', history.value.map((item) => item.time), history.value.map((item) => item.co2), '#ff4d5f', 'ppm'))
const peopleOption = computed(() => makeLineOption('人数', history.value.map((item) => item.time), history.value.map((item) => item.people_count), '#147cff', '人'))

function metricStatus(key, value) {
  const [warning, danger] = rules[key]
  if (value >= danger) return 'danger'
  if (value >= warning) return 'warning'
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
  return level === 'danger' ? '偏高' : level === 'warning' ? '黄色' : '提示'
}

function seatStyle(index) {
  const row = Math.floor((index - 1) / 5)
  const col = (index - 1) % 5
  return { left: `${22 + col * 46}px`, top: `${92 + row * 29}px` }
}

async function loadLatest() {
  latest.value = await getLatestClassroom()
}

async function loadDashboard() {
  const [latestData, historyData, alarmData] = await Promise.all([getLatestClassroom(), getHistoryData(), getAlarmList()])
  latest.value = latestData
  history.value = historyData
  alarms.value = alarmData
}

async function generateAnalysis() {
  aiLoading.value = true
  const result = await analyzeAi({ classroom_id: 'A205' })
  aiText.value = result.analysis
  aiMode.value = result.mode
  aiLoading.value = false
}

async function toggleDevice(device, value) {
  const result = await controlDevice({ classroom_id: 'A205', device, action: value ? 'on' : 'off' })
  latest.value = result.latest || latest.value
}

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
