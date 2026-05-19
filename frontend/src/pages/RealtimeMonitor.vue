<template>
  <div class="page realtime-page">
    <section class="filter-bar">
      <span class="filter-label">教室选择</span>
      <el-select v-model="selectedClassroom" style="width: 160px">
        <el-option v-for="item in classroomOptions" :key="item.value" :label="item.label" :value="item.value" />
      </el-select>
      <span class="filter-label">楼宇选择</span>
      <el-select v-model="filters.building" style="width: 180px">
        <el-option label="全部楼宇" value="all" />
        <el-option label="教学楼 A 栋" value="A" />
        <el-option label="教学楼 B 栋" value="B" />
        <el-option label="综合楼 C 栋" value="C" />
      </el-select>
      <span class="filter-label">时间范围</span>
      <el-date-picker v-model="filters.range" type="daterange" start-placeholder="开始日期" end-placeholder="结束日期" style="width: 290px" />
      <span class="filter-label">状态筛选</span>
      <el-select v-model="filters.status" style="width: 160px">
        <el-option label="全部状态" value="all" />
        <el-option label="正常" value="normal" />
        <el-option label="预警" value="warning" />
      </el-select>
      <el-button class="primary-gradient" :icon="Refresh" :loading="loading" @click="loadData">刷新</el-button>
      <el-button class="success-gradient" :icon="Download">导出</el-button>
    </section>

    <section class="realtime-layout">
      <div class="realtime-main">
        <section class="glass-card classroom-summary">
          <div class="room-photo">
            <div class="window"></div>
            <div class="board"></div>
            <span v-for="i in 12" :key="i" :style="seatStyle(i)"></span>
          </div>
          <div class="summary-title">
            <h2>{{ roomTitle }}</h2>
            <p>{{ roomMeta }}</p>
          </div>
          <div class="summary-metric">
            <span>环境综合评分</span>
            <strong>{{ environmentScore }} <small>分</small></strong>
            <em>{{ latestStatusText }}</em>
          </div>
          <div class="summary-metric">
            <span>当前人数</span>
            <strong>{{ peopleCount }} <small>人</small></strong>
            <em>额定容量 {{ latest.capacity || '-' }} 人</em>
          </div>
          <div class="summary-metric device-state">
            <span>设备运行状态</span>
            <div><b class="ok">{{ deviceSummary.online }}</b><b class="warn">{{ deviceSummary.warning }}</b><b class="bad">{{ deviceSummary.offline }}</b></div>
            <em>运行 / 告警 / 离线</em>
          </div>
          <div class="comfort">
            <el-icon><CircleCheck /></el-icon>
            <strong>{{ comfortText }}</strong>
            <span>体感温度 {{ latest.temperature ?? '-' }}℃</span>
          </div>
        </section>

        <section class="chart-matrix">
          <ChartPanel :key="`temp-${currentClassroomId}`" title="温湿度趋势" :option="tempHumidityOption" height="190px" />
          <ChartPanel :key="`co2-${currentClassroomId}`" title="CO2 趋势（ppm）" :option="co2Option" height="190px" />
          <ChartPanel :key="`pm25-${currentClassroomId}`" title="PM2.5 趋势（ug/m3）" :option="pm25Option" height="190px" />
          <ChartPanel :key="`noise-${currentClassroomId}`" title="噪声趋势（dB）" :option="noiseOption" height="190px" />
          <ChartPanel :key="`heat-${currentClassroomId}`" title="人数热力图（按时间分布）" :option="heatmapOption" height="190px" />
          <ChartPanel :key="`energy-${currentClassroomId}`" title="能耗趋势（kW）" :option="energyOption" height="190px" />
        </section>

        <section class="glass-card">
          <div class="panel-head">
            <div>
              <h3>历史数据记录</h3>
              <p>{{ roomTitle }} 最近监测采样点</p>
            </div>
          </div>
          <div class="data-table">
            <el-table :data="tableRows" height="205" size="small">
              <el-table-column prop="time" label="时间" />
              <el-table-column prop="room" label="教室" />
              <el-table-column prop="temperature" label="温度(℃)" />
              <el-table-column prop="humidity" label="湿度(%)" />
              <el-table-column prop="co2" label="CO2(ppm)" />
              <el-table-column prop="pm25" label="PM2.5" />
              <el-table-column prop="noise" label="噪声(dB)" />
              <el-table-column prop="people_count" label="人数" />
              <el-table-column label="状态">
                <template #default="{ row }">
                  <el-tag :type="row.co2 > 1000 || row.temperature > 30 || row.pm25 > 55 ? 'warning' : 'success'" effect="dark" round>
                    {{ row.co2 > 1000 || row.temperature > 30 || row.pm25 > 55 ? '预警' : '正常' }}
                  </el-tag>
                </template>
              </el-table-column>
            </el-table>
            <el-pagination small layout="prev, pager, next, sizes, jumper" :total="history.length" :page-size="10" />
          </div>
        </section>
      </div>

      <aside class="realtime-side">
        <section class="glass-card">
          <div class="panel-head">
            <div>
              <h3>异常时段（当前教室）</h3>
              <p>{{ roomTitle }} 自动识别风险区间</p>
            </div>
          </div>
          <div class="mini-list">
            <div v-for="item in abnormalPeriods" :key="item.id || item.time" class="mini-list-item">
              <el-icon><component :is="item.icon" /></el-icon>
              <div><strong>{{ item.time }}</strong><span>{{ item.type }} · {{ item.value }}</span></div>
            </div>
          </div>
        </section>

        <section class="glass-card">
          <div class="panel-head"><h3>节能建议</h3></div>
          <div class="mini-list">
            <div v-for="item in suggestions" :key="item.title" class="mini-list-item">
              <el-icon><component :is="item.icon" /></el-icon>
              <div><strong>{{ item.title }}</strong><span>{{ item.text }}</span></div>
            </div>
          </div>
        </section>

        <section class="glass-card compare-card">
          <div class="panel-head"><h3>本周数据对比分析</h3></div>
          <div class="compare-row" v-for="item in weeklyCompare" :key="item.name">
            <span>{{ item.name }}</span>
            <b>{{ item.current }}</b>
            <small>{{ item.change }}</small>
          </div>
        </section>
      </aside>
    </section>
  </div>
</template>

<script setup>
import { computed, inject, onMounted, reactive, ref, watch } from 'vue'
import { CircleCheck, Connection, Download, Refresh, Sunny, Timer, Warning } from '@element-plus/icons-vue'
import ChartPanel from '../components/ChartPanel.vue'
import { getAlarmList, getHistoryData, getLatestClassroom } from '../api/request'

const classroomOptions = [
  { label: 'A205 教室', value: 'A205' },
  { label: 'B101 教室', value: 'B101' },
  { label: 'B102 教室', value: 'B102' },
  { label: 'C301 教室', value: 'C301' }
]

const appNavigation = inject('appNavigation', null)
const selectedClassroom = ref(appNavigation?.selectedClassroom?.value || 'A205')
const filters = reactive({
  building: 'all',
  range: '',
  status: 'all'
})

const latest = ref({ classroomId: selectedClassroom.value, classroomName: `${selectedClassroom.value} 教室`, temperature: 26.1, humidity: 62, co2: 980, pm25: 28, noise: 45, people_count: 46, peopleCount: 46, capacity: 80, energy: 8.5, devices: {} })
const history = ref([])
const alarms = ref([])
const loading = ref(false)

const currentClassroomId = computed(() => latest.value.classroomId || latest.value.classroom_id || selectedClassroom.value)
const roomTitle = computed(() => latest.value.classroomName || latest.value.name || `${currentClassroomId.value} 教室`)
const roomMeta = computed(() => `${latest.value.building || '-'} · ${latest.value.floor || '-'} · 面积 ${latest.value.area || '-'}㎡`)
const peopleCount = computed(() => latest.value.peopleCount ?? latest.value.people_count ?? 0)
const latestStatusText = computed(() => latest.value.status === 'warning' || latest.value.status === 'danger' ? '存在指标预警' : '运行稳定')
const comfortText = computed(() => latest.value.status === 'warning' || latest.value.status === 'danger' ? '需关注' : '舒适')
const environmentScore = computed(() => {
  const penalties = [
    Math.max(0, (Number(latest.value.co2 || 0) - 800) / 25),
    Math.max(0, (Number(latest.value.temperature || 0) - 26) * 3),
    Math.max(0, (Number(latest.value.pm25 || 0) - 35) / 2),
    Math.max(0, (Number(latest.value.noise || 0) - 55) / 1.5)
  ]
  return Math.max(60, Math.round(96 - penalties.reduce((sum, value) => sum + value, 0)))
})

const deviceSummary = computed(() => {
  const devices = Object.values(latest.value.devices || {})
  if (!devices.length) return { online: 0, warning: 0, offline: 0 }
  return devices.reduce((result, device) => {
    if (device.online === false) result.offline += 1
    else if (device.status) result.online += 1
    else result.warning += 1
    return result
  }, { online: 0, warning: 0, offline: 0 })
})

const abnormalPeriods = computed(() => {
  if (!alarms.value.length) {
    return [{ id: 'none', time: '暂无异常', type: roomTitle.value, value: '当前无报警', icon: CircleCheck }]
  }
  return alarms.value.slice(0, 4).map((item) => ({
    ...item,
    icon: Warning,
    time: String(item.time || item.generatedAt || '').slice(5, 16),
    type: item.type || '异常预警',
    value: item.message || item.content || item.value || '请处理'
  }))
})

const suggestions = computed(() => [
  {
    title: latest.value.co2 > 1000 ? '提高新风档位' : '保持低速新风',
    text: latest.value.co2 > 1000 ? `当前 CO2 ${latest.value.co2} ppm，建议优先通风。` : '空气质量稳定，保持低速巡航可降低能耗。',
    icon: Connection
  },
  {
    title: latest.value.temperature > 28 ? '优化空调温度' : '维持空调策略',
    text: latest.value.temperature > 28 ? '建议空调设为 26℃，温度稳定后切换节能模式。' : '当前温度舒适，避免频繁启停。',
    icon: Sunny
  },
  {
    title: '设备定时管理',
    text: `${roomTitle.value} 下课后联动关闭多媒体、照明和空调，可减少空转能耗。`,
    icon: Timer
  }
])

const weeklyCompare = computed(() => [
  { name: '环境综合评分', current: `${environmentScore.value}分`, change: latest.value.status === 'normal' ? '稳定' : '需关注' },
  { name: '当前能耗(kW)', current: String(latest.value.energy ?? '-'), change: latest.value.energy > 10 ? '偏高' : '正常' },
  { name: '当前报警数', current: `${alarms.value.length}次`, change: alarms.value.length ? '需处理' : '无异常' }
])

const tableRows = computed(() =>
  history.value.slice(-8).reverse().map((item) => ({
    ...item,
    room: item.classroomName || item.classroomId || item.classroom_id || currentClassroomId.value,
    time: item.updatedAt || item.update_time || item.time
  }))
)

const tempHumidityOption = computed(() => ({
  ...baseOption(history.value.map((item) => item.time)),
  legend: { top: 0, textStyle: { color: '#a9c9e8' } },
  yAxis: [
    yAxis('℃'),
    { ...yAxis('%'), splitLine: { show: false } }
  ],
  series: [
    line('温度(℃)', history.value.map((item) => item.temperature), '#31e98f'),
    { ...line('湿度(%)', history.value.map((item) => item.humidity), '#147cff'), yAxisIndex: 1 }
  ]
}))

const co2Option = computed(() => singleLineOption('CO2', history.value.map((item) => item.co2), '#31e98f', 'ppm'))
const pm25Option = computed(() => singleLineOption('PM2.5', history.value.map((item) => item.pm25), '#ffbf2f', 'ug/m3'))
const noiseOption = computed(() => singleLineOption('噪声', history.value.map((item) => item.noise), '#925cff', 'dB'))

const heatmapOption = computed(() => {
  const days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
  const hours = Array.from({ length: 13 }, (_, i) => `${i * 2}:00`)
  const data = []
  days.forEach((_, dayIndex) => {
    hours.forEach((_, hourIndex) => {
      const sample = history.value[(dayIndex * 13 + hourIndex) % Math.max(1, history.value.length)]
      data.push([hourIndex, dayIndex, Number(sample?.peopleCount || sample?.people_count || 0)])
    })
  })
  return {
    tooltip: { position: 'top' },
    grid: { left: 42, right: 18, top: 16, bottom: 32 },
    xAxis: { type: 'category', data: hours, axisLabel: { color: '#9fc2df' } },
    yAxis: { type: 'category', data: days, axisLabel: { color: '#9fc2df' } },
    visualMap: { min: 0, max: latest.value.capacity || 100, right: 0, top: 'middle', textStyle: { color: '#9fc2df' }, inRange: { color: ['#0b376f', '#1bd4d0', '#f6e95b'] } },
    series: [{ type: 'heatmap', data }]
  }
})

const energyOption = computed(() => ({
  ...baseOption(history.value.slice(-24).map((item) => item.time)),
  series: [
    { name: '能耗', type: 'bar', data: history.value.slice(-24).map((item) => item.energy), itemStyle: { color: '#147cff' } }
  ]
}))

function baseOption(xData) {
  return {
    color: ['#31e98f', '#147cff'],
    tooltip: { trigger: 'axis', backgroundColor: 'rgba(4, 18, 42, 0.92)', borderColor: '#1a9cff', textStyle: { color: '#eaf6ff' } },
    grid: { left: 42, right: 24, top: 36, bottom: 28 },
    xAxis: { type: 'category', data: xData, boundaryGap: false, axisLine: { lineStyle: { color: 'rgba(152,204,255,.28)' } }, axisLabel: { color: '#9fc2df', hideOverlap: true } },
    yAxis: yAxis('')
  }
}

function yAxis(name) {
  return { type: 'value', name, splitLine: { lineStyle: { color: 'rgba(120,180,255,.12)', type: 'dashed' } }, axisLabel: { color: '#9fc2df' }, nameTextStyle: { color: '#9fc2df' } }
}

function line(name, data, color) {
  return { name, type: 'line', smooth: true, symbolSize: 5, data, lineStyle: { color, width: 3 }, itemStyle: { color }, areaStyle: { color: `${color}1f` } }
}

function singleLineOption(name, data, color, unit) {
  return { ...baseOption(history.value.map((item) => item.time)), yAxis: yAxis(unit), series: [line(name, data, color)] }
}

function seatStyle(index) {
  const row = Math.floor((index - 1) / 4)
  const col = (index - 1) % 4
  return { left: `${22 + col * 42}px`, top: `${88 + row * 24}px` }
}

async function loadData() {
  loading.value = true
  try {
    const id = selectedClassroom.value
    const [latestData, historyData, alarmData] = await Promise.all([
      getLatestClassroom(id),
      getHistoryData(id),
      getAlarmList(id)
    ])
    latest.value = latestData
    history.value = historyData
    alarms.value = alarmData
  } finally {
    loading.value = false
  }
}

watch(selectedClassroom, (value) => {
  if (appNavigation?.selectedClassroom && appNavigation.selectedClassroom.value !== value) {
    appNavigation.selectedClassroom.value = value
  }
  loadData()
})

if (appNavigation?.selectedClassroom) {
  watch(appNavigation.selectedClassroom, (value) => {
    if (value && value !== selectedClassroom.value) selectedClassroom.value = value
  })
}

onMounted(loadData)
</script>

<style scoped>
.realtime-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: 14px;
}

.realtime-main {
  display: grid;
  gap: 14px;
}

.classroom-summary {
  display: grid;
  grid-template-columns: 164px 1fr 1.2fr 1.2fr 1.3fr 1.1fr;
  align-items: center;
  gap: 14px;
  padding: 16px;
}

.room-photo {
  position: relative;
  z-index: 1;
  height: 132px;
  overflow: hidden;
  border-radius: 8px;
  background:
    linear-gradient(90deg, rgba(255,255,255,.15) 1px, transparent 1px),
    linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px),
    linear-gradient(150deg, #b7d8e4, #193e67);
  background-size: 32px 32px;
}

.room-photo .window {
  position: absolute;
  left: 12px;
  top: 16px;
  width: 36px;
  height: 90px;
  background: rgba(224, 246, 255, 0.54);
}

.room-photo .board {
  position: absolute;
  left: 78px;
  top: 25px;
  width: 80px;
  height: 30px;
  background: #2a5259;
}

.room-photo span {
  position: absolute;
  width: 28px;
  height: 14px;
  border-radius: 2px;
  background: linear-gradient(180deg, #b58b56, #55361d);
}

.summary-title h2 {
  margin: 0;
  font-size: 24px;
}

.summary-title p,
.summary-metric span,
.summary-metric em,
.comfort span {
  color: var(--text-soft);
  font-style: normal;
}

.summary-metric,
.comfort {
  position: relative;
  z-index: 1;
  min-height: 86px;
  padding: 14px;
  border: 1px solid rgba(65, 164, 255, 0.18);
  border-radius: 8px;
  background: rgba(10, 57, 113, 0.5);
}

.summary-metric strong,
.comfort strong {
  display: block;
  margin-top: 8px;
  color: #fff;
  font-size: 28px;
}

.summary-metric small {
  font-size: 14px;
}

.summary-metric em {
  display: block;
  margin-top: 8px;
  font-size: 12px;
}

.device-state div {
  display: flex;
  gap: 26px;
  margin-top: 14px;
  font-size: 20px;
}

.ok { color: var(--green); }
.warn { color: var(--orange); }
.bad { color: var(--red); }

.comfort {
  text-align: center;
}

.comfort .el-icon {
  color: var(--green);
  font-size: 38px;
}

.comfort strong {
  color: var(--green);
}

.chart-matrix {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.realtime-side {
  display: grid;
  align-content: start;
  gap: 14px;
}

.compare-card {
  padding-bottom: 14px;
}

.compare-row {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: 1fr 80px 70px;
  gap: 10px;
  margin: 0 14px;
  padding: 14px 0;
  border-bottom: 1px solid rgba(92, 169, 236, 0.13);
  color: #cfe5fa;
}

.compare-row b {
  color: #fff;
}

.compare-row small {
  color: var(--green);
  font-size: 14px;
}
</style>
