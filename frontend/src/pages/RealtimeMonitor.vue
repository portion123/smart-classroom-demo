<template>
  <div class="page realtime-page">
    <section class="filter-bar">
      <span class="filter-label">教室选择</span>
      <el-select v-model="filters.classroom" style="width: 160px">
        <el-option label="A205 教室" value="A205" />
        <el-option label="B101 教室" value="B101" />
        <el-option label="C301 教室" value="C301" />
      </el-select>
      <span class="filter-label">楼宇选择</span>
      <el-select v-model="filters.building" style="width: 180px">
        <el-option label="教学楼A栋" value="A" />
        <el-option label="教学楼B栋" value="B" />
      </el-select>
      <span class="filter-label">时间范围</span>
      <el-date-picker v-model="filters.range" type="daterange" start-placeholder="开始日期" end-placeholder="结束日期" style="width: 290px" />
      <span class="filter-label">状态筛选</span>
      <el-select v-model="filters.status" style="width: 160px">
        <el-option label="全部状态" value="all" />
        <el-option label="正常" value="normal" />
        <el-option label="预警" value="warning" />
      </el-select>
      <el-button class="primary-gradient" :icon="Refresh" @click="loadData">刷新</el-button>
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
            <h2>A205 教室</h2>
            <p>教学楼A栋 · 2F · 面积 86㎡</p>
          </div>
          <div class="summary-metric">
            <span>环境综合评分</span>
            <strong>92 <small>分</small></strong>
            <em>较昨日 ↑ 6分</em>
          </div>
          <div class="summary-metric">
            <span>当前人数</span>
            <strong>{{ latest.people_count }} <small>人</small></strong>
            <em>额定容量 80人</em>
          </div>
          <div class="summary-metric device-state">
            <span>设备运行状态</span>
            <div><b class="ok">18</b><b class="warn">1</b><b class="bad">1</b></div>
            <em>正常 / 告警 / 离线</em>
          </div>
          <div class="comfort">
            <el-icon><CircleCheck /></el-icon>
            <strong>舒适</strong>
            <span>体感温度 {{ latest.temperature }}℃</span>
          </div>
        </section>

        <section class="chart-matrix">
          <ChartPanel title="温湿度趋势" :option="tempHumidityOption" height="190px" />
          <ChartPanel title="CO₂ 趋势（ppm）" :option="co2Option" height="190px" />
          <ChartPanel title="PM2.5 趋势（μg/m³）" :option="pm25Option" height="190px" />
          <ChartPanel title="噪声趋势（dB）" :option="noiseOption" height="190px" />
          <ChartPanel title="人数热力图（按时间分布）" :option="heatmapOption" height="190px" />
          <ChartPanel title="能耗对比（kWh）" :option="energyOption" height="190px" />
        </section>

        <section class="glass-card">
          <div class="panel-head">
            <div>
              <h3>历史数据记录</h3>
              <p>最近监测采样点</p>
            </div>
          </div>
          <div class="data-table">
            <el-table :data="tableRows" height="205" size="small">
              <el-table-column prop="time" label="时间" />
              <el-table-column prop="room" label="教室" />
              <el-table-column prop="temperature" label="温度(℃)" />
              <el-table-column prop="humidity" label="湿度(%)" />
              <el-table-column prop="co2" label="CO₂(ppm)" />
              <el-table-column prop="pm25" label="PM2.5" />
              <el-table-column prop="noise" label="噪声(dB)" />
              <el-table-column prop="people_count" label="人数" />
              <el-table-column label="状态">
                <template #default>
                  <el-tag type="success" effect="dark" round>正常</el-tag>
                </template>
              </el-table-column>
            </el-table>
            <el-pagination small layout="prev, pager, next, sizes, jumper" :total="240" :page-size="10" />
          </div>
        </section>
      </div>

      <aside class="realtime-side">
        <section class="glass-card">
          <div class="panel-head">
            <div>
              <h3>异常时段（近7天）</h3>
              <p>自动识别高风险区间</p>
            </div>
          </div>
          <div class="mini-list">
            <div v-for="item in abnormalPeriods" :key="item.time" class="mini-list-item">
              <el-icon><Warning /></el-icon>
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
import { computed, onMounted, reactive, ref } from 'vue'
import { CircleCheck, Connection, Download, Refresh, Sunny, Timer, Warning } from '@element-plus/icons-vue'
import ChartPanel from '../components/ChartPanel.vue'
import { getHistoryData, getLatestClassroom } from '../api/request'

const filters = reactive({
  classroom: 'A205',
  building: 'A',
  range: '',
  status: 'all'
})

const latest = ref({ temperature: 26.1, humidity: 62, co2: 980, pm25: 28, noise: 45, people_count: 46 })
const history = ref([])

const abnormalPeriods = [
  { time: '05-21 14:30 ~ 15:10', type: '高 CO₂', value: '1600 ppm' },
  { time: '05-20 10:05 ~ 10:35', type: '高 PM2.5', value: '78 μg/m³' },
  { time: '05-19 09:20 ~ 09:50', type: '高 噪声', value: '72 dB' },
  { time: '05-18 16:45 ~ 17:15', type: '低 湿度', value: '38%' }
]

const suggestions = [
  { title: '优化通风策略', text: 'CO₂ 低于 800 ppm 时降低新风量，可节能约 8%。', icon: Connection },
  { title: '调整空调温度设定', text: '建议夏季设定 26-28℃，可节能约 12%。', icon: Sunny },
  { title: '设备定时管理', text: '设置设备分时段启停，避免非使用时段耗能。', icon: Timer }
]

const weeklyCompare = [
  { name: '环境综合评分', current: '88分', change: '↑ 6分' },
  { name: '能耗(kWh)', current: '412.6', change: '↓ 9.6%' },
  { name: '异常次数', current: '8次', change: '↓ 46.7%' }
]

const tableRows = computed(() =>
  history.value.slice(-8).reverse().map((item, index) => ({
    ...item,
    room: 'A205',
    time: `2025-05-23 ${item.time || `10:${String(index * 5).padStart(2, '0')}:00`}`
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

const co2Option = computed(() => singleLineOption('CO₂', history.value.map((item) => item.co2), '#31e98f', 'ppm'))
const pm25Option = computed(() => singleLineOption('PM2.5', history.value.map((item) => item.pm25), '#ffbf2f', 'μg/m³'))
const noiseOption = computed(() => singleLineOption('噪声', history.value.map((item) => item.noise), '#925cff', 'dB'))

const heatmapOption = computed(() => {
  const days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
  const hours = Array.from({ length: 13 }, (_, i) => `${i * 2}:00`)
  const data = []
  days.forEach((_, dayIndex) => {
    hours.forEach((_, hourIndex) => {
      data.push([hourIndex, dayIndex, Math.round(Math.max(0, 88 - Math.abs(hourIndex - 6) * 12 - Math.abs(dayIndex - 2) * 8))])
    })
  })
  return {
    tooltip: { position: 'top' },
    grid: { left: 42, right: 18, top: 16, bottom: 32 },
    xAxis: { type: 'category', data: hours, axisLabel: { color: '#9fc2df' } },
    yAxis: { type: 'category', data: days, axisLabel: { color: '#9fc2df' } },
    visualMap: { min: 0, max: 100, right: 0, top: 'middle', textStyle: { color: '#9fc2df' }, inRange: { color: ['#0b376f', '#1bd4d0', '#f6e95b'] } },
    series: [{ type: 'heatmap', data }]
  }
})

const energyOption = computed(() => ({
  ...baseOption(['周一', '周二', '周三', '周四', '周五', '周六', '周日']),
  legend: { top: 0, textStyle: { color: '#a9c9e8' } },
  series: [
    { name: '本周', type: 'bar', data: [72, 80, 61, 76, 68, 31, 21], itemStyle: { color: '#147cff' } },
    { name: '上周', type: 'bar', data: [66, 78, 55, 62, 57, 28, 17], itemStyle: { color: 'rgba(180,210,255,.38)' } }
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
  const [latestData, historyData] = await Promise.all([getLatestClassroom(), getHistoryData()])
  latest.value = latestData
  history.value = historyData
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
