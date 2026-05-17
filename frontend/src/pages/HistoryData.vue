<template>
  <div class="page history-page">
    <section class="filter-bar">
      <span class="filter-label">教室选择</span>
      <el-select v-model="filters.classroom" style="width: 170px">
        <el-option label="A205 教室" value="A205" />
        <el-option label="B101 教室" value="B101" />
      </el-select>
      <span class="filter-label">时间范围</span>
      <el-date-picker v-model="filters.range" type="daterange" start-placeholder="开始日期" end-placeholder="结束日期" style="width: 300px" />
      <span class="filter-label">时间粒度</span>
      <el-select v-model="filters.granularity" style="width: 160px">
        <el-option label="15分钟" value="15m" />
        <el-option label="小时" value="hour" />
        <el-option label="天" value="day" />
      </el-select>
    </section>

    <section class="history-layout">
      <div class="history-main">
        <section class="stat-grid history-stats">
          <StatCard v-for="item in stats" :key="item.label" v-bind="item" />
        </section>

        <section class="history-chart-grid">
          <ChartPanel title="温湿度历史曲线" :option="tempHumidityOption" height="190px" />
          <ChartPanel title="CO₂历史曲线（ppm）" :option="co2Option" height="190px" />
          <ChartPanel title="PM2.5历史曲线（μg/m³）" :option="pm25Option" height="190px" />
          <ChartPanel title="噪声历史曲线（dB）" :option="noiseOption" height="190px" />
          <ChartPanel title="人数历史曲线（人）" :option="peopleOption" height="190px" />
          <ChartPanel title="周能耗对比（kWh）" :option="energyOption" height="190px" />
          <ChartPanel class="wide-chart" title="教室使用强度热力图（小时分布）" :option="heatmapOption" height="190px" />
        </section>

        <section class="glass-card">
          <div class="panel-head">
            <div>
              <h3>历史数据记录</h3>
              <p>共 6,720 条</p>
            </div>
          </div>
          <div class="data-table">
            <el-table :data="tableRows" height="220" size="small">
              <el-table-column prop="time" label="时间" />
              <el-table-column prop="temperature" label="温度(℃)" />
              <el-table-column prop="humidity" label="湿度(%)" />
              <el-table-column prop="co2" label="CO₂(ppm)" />
              <el-table-column prop="pm25" label="PM2.5(μg/m³)" />
              <el-table-column prop="noise" label="噪声(dB)" />
              <el-table-column prop="people_count" label="人数(人)" />
              <el-table-column label="状态">
                <template #default>
                  <el-tag type="success" effect="dark" round>正常</el-tag>
                </template>
              </el-table-column>
            </el-table>
            <el-pagination small layout="total, prev, pager, next, sizes, jumper" :total="6720" :page-size="15" />
          </div>
        </section>
      </div>

      <aside class="history-side">
        <section class="glass-card room-info">
          <div class="side-room-photo"></div>
          <h2>A205 教室</h2>
          <p>教学楼A栋 · 2F</p>
          <ul>
            <li>容纳人数：50人</li>
            <li>面积：86㎡</li>
            <li>设备数量：18台</li>
          </ul>
          <el-button class="primary-gradient" @click="openDeviceDetail">查看设备详情</el-button>
        </section>

        <section class="glass-card">
          <div class="panel-head"><h3>历史趋势总结</h3></div>
          <div class="mini-list">
            <div v-for="item in summary" :key="item.title" class="mini-list-item">
              <el-icon><component :is="item.icon" /></el-icon>
              <div><strong>{{ item.title }}</strong><span>{{ item.text }}</span></div>
            </div>
          </div>
        </section>

        <section class="glass-card compare-card">
          <div class="panel-head"><h3>本周数据对比</h3></div>
          <div class="compare-row" v-for="item in compare" :key="item.name">
            <span>{{ item.name }}</span>
            <b>{{ item.current }}</b>
            <small>{{ item.change }}</small>
          </div>
        </section>

        <section class="glass-card">
          <div class="panel-head"><h3>节能分析</h3></div>
          <div class="mini-list">
            <div class="mini-list-item"><el-icon><Connection /></el-icon><div><strong>能耗环比下降</strong><span>本周总能耗 412.6 kWh，较上周下降 9.6%。</span></div></div>
            <div class="mini-list-item"><el-icon><Timer /></el-icon><div><strong>最佳节能时段</strong><span>每日 12:00-14:00 可重点优化设备运行策略。</span></div></div>
            <div class="mini-list-item"><el-icon><Sunny /></el-icon><div><strong>节能建议</strong><span>非使用时段自动降低空调设定与照明亮度。</span></div></div>
          </div>
        </section>
      </aside>
    </section>
  </div>
</template>

<script setup>
import { computed, inject, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Connection, Histogram, Monitor, Sunny, Timer, TrendCharts, UserFilled } from '@element-plus/icons-vue'
import ChartPanel from '../components/ChartPanel.vue'
import StatCard from '../components/StatCard.vue'
import { getHistoryData } from '../api/request'

const filters = reactive({ classroom: 'A205', range: '', granularity: '15m' })
const history = ref([])
const appNavigation = inject('appNavigation', null)

const stats = computed(() => [
  { icon: TrendCharts, label: '历史平均温度', value: average('temperature'), unit: '℃', status: 'normal', trend: '较上周 -0.6℃', tone: 'green' },
  { icon: Connection, label: '历史平均湿度', value: average('humidity'), unit: '%', status: 'normal', trend: '较上周 +2.3%', tone: 'blue' },
  { icon: Monitor, label: '历史平均 CO₂', value: average('co2'), unit: 'ppm', status: 'warning', trend: '较上周 -124 ppm', tone: 'red' },
  { icon: Histogram, label: '历史平均 PM2.5', value: average('pm25'), unit: 'μg/m³', status: 'normal', trend: '较上周 -6 μg/m³', tone: 'orange' },
  { icon: UserFilled, label: '历史平均人数', value: average('people_count'), unit: '人', status: 'normal', trend: '较上周 +4人', tone: 'purple' }
])

const tableRows = computed(() =>
  history.value.slice(-9).reverse().map((item, index) => ({
    ...item,
    time: `2025-05-23 ${item.time || `10:${String(index * 15).padStart(2, '0')}`}`
  }))
)

const summary = [
  { title: '温度整体稳定', text: '过去7天平均温度 26.4℃，波动范围 22.1-30.2℃。', icon: TrendCharts },
  { title: 'CO₂整体改善', text: '平均 CO₂ 为 1056 ppm，较上周下降 124 ppm。', icon: Monitor },
  { title: '人数略有上升', text: '平均人数 38 人，使用率增加 10.5%。', icon: UserFilled }
]

const compare = [
  { name: '温度(℃)', current: '26.4', change: '-0.6 ↓' },
  { name: '湿度(%)', current: '58.7', change: '+2.3 ↑' },
  { name: 'CO₂(ppm)', current: '1056', change: '-124 ↓' },
  { name: 'PM2.5', current: '38', change: '-6 ↓' },
  { name: '能耗(kWh)', current: '412.6', change: '-43.7 ↓' }
]

const tempHumidityOption = computed(() => ({
  ...baseOption(labels.value),
  legend: { top: 0, textStyle: { color: '#a9c9e8' } },
  yAxis: [yAxis('℃'), { ...yAxis('%'), splitLine: { show: false } }],
  series: [
    line('温度(℃)', values('temperature'), '#31e98f'),
    { ...line('湿度(%)', values('humidity'), '#147cff'), yAxisIndex: 1 }
  ]
}))
const co2Option = computed(() => singleLine('CO₂', 'co2', '#ff4d5f', 'ppm'))
const pm25Option = computed(() => singleLine('PM2.5', 'pm25', '#ffbf2f', 'μg/m³'))
const noiseOption = computed(() => singleLine('噪声', 'noise', '#20d8ff', 'dB'))
const peopleOption = computed(() => singleLine('人数', 'people_count', '#925cff', '人'))
const energyOption = computed(() => ({
  ...baseOption(['周一', '周二', '周三', '周四', '周五', '周六', '周日']),
  legend: { top: 0, textStyle: { color: '#a9c9e8' } },
  series: [
    { name: '本周', type: 'bar', data: [78, 96, 112, 99, 106, 68, 82], itemStyle: { color: '#147cff' } },
    { name: '上周', type: 'bar', data: [70, 101, 92, 95, 83, 62, 57], itemStyle: { color: 'rgba(170,205,255,.36)' } }
  ]
}))
const heatmapOption = computed(() => heatmap())
const labels = computed(() => history.value.map((item) => item.date || item.time).slice(-28))

function average(key) {
  const list = history.value.length ? history.value : []
  if (!list.length) return '--'
  return Number((list.reduce((sum, item) => sum + Number(item[key] || 0), 0) / list.length).toFixed(key === 'temperature' || key === 'humidity' ? 1 : 0))
}

function values(key) {
  return history.value.map((item) => item[key]).slice(-28)
}

function baseOption(xData) {
  return {
    tooltip: { trigger: 'axis', backgroundColor: 'rgba(4,18,42,.92)', borderColor: '#1a9cff', textStyle: { color: '#eaf6ff' } },
    grid: { left: 42, right: 24, top: 36, bottom: 28 },
    xAxis: { type: 'category', data: xData, boundaryGap: false, axisLine: { lineStyle: { color: 'rgba(152,204,255,.28)' } }, axisLabel: { color: '#9fc2df', hideOverlap: true } },
    yAxis: yAxis('')
  }
}

function yAxis(name) {
  return { type: 'value', name, splitLine: { lineStyle: { color: 'rgba(120,180,255,.12)', type: 'dashed' } }, axisLabel: { color: '#9fc2df' }, nameTextStyle: { color: '#9fc2df' } }
}

function line(name, data, color) {
  return { name, type: 'line', smooth: true, symbolSize: 5, data, lineStyle: { color, width: 3 }, itemStyle: { color }, areaStyle: { color: `${color}1d` } }
}

function singleLine(name, key, color, unit) {
  return { ...baseOption(labels.value), yAxis: yAxis(unit), series: [line(name, values(key), color)] }
}

function heatmap() {
  const days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
  const data = []
  days.forEach((_, day) => {
    hours.forEach((_, hour) => data.push([hour, day, Math.max(0, Math.round(98 - Math.abs(hour - 14) * 7 - Math.abs(day - 3) * 9))]))
  })
  return {
    tooltip: { position: 'top' },
    grid: { left: 42, right: 58, top: 18, bottom: 26 },
    xAxis: { type: 'category', data: hours, axisLabel: { color: '#9fc2df' } },
    yAxis: { type: 'category', data: days, axisLabel: { color: '#9fc2df' } },
    visualMap: { min: 0, max: 100, right: 6, top: 'middle', textStyle: { color: '#9fc2df' }, inRange: { color: ['#0b376f', '#28d4b5', '#ffd44a', '#ff5d5d'] } },
    series: [{ type: 'heatmap', data }]
  }
}

function openDeviceDetail() {
  filters.classroom = 'A205'
  appNavigation?.navigateToPage?.('device', { classroom: 'A205' })
  ElMessage.success('已切换到 A205 教室设备详情')
}

onMounted(async () => {
  history.value = await getHistoryData()
})
</script>

<style scoped>
.history-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 350px;
  gap: 14px;
}

.history-main {
  display: grid;
  gap: 14px;
}

.history-stats {
  grid-template-columns: repeat(5, minmax(0, 1fr));
}

.history-chart-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.wide-chart {
  grid-column: span 2;
}

.history-side {
  display: grid;
  align-content: start;
  gap: 14px;
}

.room-info {
  padding: 16px;
}

.side-room-photo {
  height: 128px;
  border-radius: 8px;
  border: 1px solid rgba(81, 181, 255, 0.28);
  background:
    linear-gradient(90deg, rgba(255,255,255,.16) 1px, transparent 1px),
    linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px),
    linear-gradient(150deg, #c4dbe5, #18406f);
  background-size: 32px 32px;
}

.room-info h2 {
  margin: 14px 0 4px;
  font-size: 25px;
}

.room-info p,
.room-info li {
  color: #a8c6e1;
}

.room-info ul {
  display: grid;
  gap: 8px;
  margin: 12px 0 16px;
  padding: 0;
  list-style: none;
}

.compare-card {
  padding-bottom: 14px;
}

.compare-row {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: 1fr 70px 70px;
  margin: 0 14px;
  padding: 10px 0;
  border-bottom: 1px solid rgba(92, 169, 236, 0.13);
  color: #cfe5fa;
}

.compare-row b {
  color: #fff;
}

.compare-row small {
  color: var(--green);
}
</style>
