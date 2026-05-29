<template>
  <div class="page history-page">
    <section class="filter-bar">
      <span class="filter-label">教室选择</span>
      <el-select v-model="filters.classroom" style="width: 170px">
        <el-option v-for="item in classroomOptions" :key="item.value" :label="item.label" :value="item.value" />
      </el-select>
      <span class="filter-label">时间范围</span>
      <el-date-picker v-model="filters.range" type="daterange" start-placeholder="开始日期" end-placeholder="结束日期" style="width: 300px" />
      <span class="filter-label">时间粒度</span>
      <el-select v-model="filters.granularity" style="width: 160px">
        <el-option label="15分钟" value="15m" />
        <el-option label="小时" value="hour" />
        <el-option label="天" value="day" />
      </el-select>
      <span class="filter-label">数据类型</span>
      <el-select v-model="filters.metric" style="width: 160px">
        <el-option label="全部指标" value="all" />
        <el-option label="环境指标" value="env" />
        <el-option label="使用/能耗" value="usage" />
      </el-select>
      <el-button class="primary-gradient" :icon="Refresh" @click="queryHistory">查询</el-button>
      <el-button @click="resetHistoryFilters">重置</el-button>
      <el-button class="success-gradient" :icon="Download" @click="exportHistoryData">导出</el-button>
    </section>

    <section class="history-layout">
      <div class="history-main">
        <section class="stat-grid history-stats">
          <StatCard v-for="item in stats" :key="item.label" v-bind="item" />
        </section>

        <section class="history-chart-grid">
          <ChartPanel v-if="showChart('env')" title="温湿度历史曲线" :option="tempHumidityOption" height="190px" />
          <ChartPanel v-if="showChart('env')" title="CO2 历史曲线（ppm）" :option="co2Option" height="190px" />
          <ChartPanel v-if="showChart('env')" title="PM2.5 历史曲线（ug/m3）" :option="pm25Option" height="190px" />
          <ChartPanel v-if="showChart('env')" title="噪声历史曲线（dB）" :option="noiseOption" height="190px" />
          <ChartPanel v-if="showChart('usage')" title="人数历史曲线（人）" :option="peopleOption" height="190px" />
          <ChartPanel v-if="showChart('usage')" title="能耗历史曲线（kW）" :option="energyOption" height="190px" />
          <ChartPanel v-if="showChart('usage')" class="wide-chart" title="教室使用强度热力图（小时分布）" :option="heatmapOption" height="190px" />
        </section>

        <section class="glass-card">
          <div class="panel-head">
            <div>
              <h3>历史数据记录</h3>
              <p>{{ roomTitle }} 最近 {{ history.length }} 条采样</p>
            </div>
          </div>
          <div class="data-table">
            <el-table :data="tableRows" height="220" size="small">
              <el-table-column prop="time" label="时间" min-width="154" />
              <el-table-column prop="temperature" label="温度(℃)" />
              <el-table-column prop="humidity" label="湿度(%)" />
              <el-table-column prop="co2" label="CO2(ppm)" />
              <el-table-column prop="light" label="光照(lux)" />
              <el-table-column prop="pm25" label="PM2.5" />
              <el-table-column prop="noise" label="噪声(dB)" />
              <el-table-column prop="people_count" label="人数" />
              <el-table-column prop="energy" label="能耗(kW)" />
              <el-table-column label="状态">
                <template #default="{ row }">
                  <el-tag :type="row.co2 > 1000 || row.temperature > 30 || row.pm25 > 55 ? 'warning' : 'success'" effect="dark" round>
                    {{ row.co2 > 1000 || row.temperature > 30 || row.pm25 > 55 ? '预警' : '正常' }}
                  </el-tag>
                </template>
              </el-table-column>
            </el-table>
            <el-pagination small layout="total, prev, pager, next, sizes, jumper" :total="history.length" :page-size="15" />
          </div>
        </section>
      </div>

      <aside class="history-side">
        <section class="glass-card room-info">
          <div class="side-room-photo"></div>
          <h2>{{ roomTitle }}</h2>
          <p>{{ latest.building || '-' }} · {{ latest.floor || '-' }}</p>
          <ul>
            <li>容纳人数：{{ latest.capacity || '-' }} 人</li>
            <li>面积：{{ latest.area || '-' }} ㎡</li>
            <li>当前人数：{{ peopleCount }} 人</li>
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
            <div class="mini-list-item"><el-icon><Connection /></el-icon><div><strong>能耗动态跟随</strong><span>{{ roomTitle }} 的能耗曲线已按当前教室重新生成。</span></div></div>
            <div class="mini-list-item"><el-icon><Timer /></el-icon><div><strong>最佳节能时段</strong><span>人数低谷时段自动降低新风和照明档位。</span></div></div>
            <div class="mini-list-item"><el-icon><Sunny /></el-icon><div><strong>节能建议</strong><span>课后联动关闭空调、多媒体和照明设备。</span></div></div>
          </div>
        </section>
      </aside>
    </section>
  </div>
</template>

<script setup>
import { computed, inject, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Connection, Download, Histogram, Monitor, Refresh, Sunny, Timer, TrendCharts, UserFilled } from '@element-plus/icons-vue'
import ChartPanel from '../components/ChartPanel.vue'
import StatCard from '../components/StatCard.vue'
import { getHistoryData, getLatestClassroom } from '../api/request'

const classroomOptions = [
  { label: 'A205 教室', value: 'A205' },
  { label: 'B101 教室', value: 'B101' },
  { label: 'B102 教室', value: 'B102' },
  { label: 'C301 教室', value: 'C301' }
]

const appNavigation = inject('appNavigation', null)
const filters = reactive({ classroom: appNavigation?.selectedClassroom?.value || 'A205', range: '', granularity: '15m', metric: 'all' })
const latest = ref({ classroomId: filters.classroom, classroomName: `${filters.classroom} 教室`, capacity: 0, area: 0, people_count: 0 })
const history = ref([])
let historyTimer = null
const HISTORY_PAGE_LIMIT = 30 * 24 * 4

const currentClassroomId = computed(() => latest.value.classroomId || latest.value.classroom_id || filters.classroom)
const roomTitle = computed(() => latest.value.classroomName || latest.value.name || `${currentClassroomId.value} 教室`)
const peopleCount = computed(() => latest.value.peopleCount ?? latest.value.people_count ?? 0)

const stats = computed(() => [
  { icon: TrendCharts, label: '历史平均温度', value: average('temperature'), unit: '℃', status: 'normal', trend: '动态模拟', tone: 'green' },
  { icon: Connection, label: '历史平均湿度', value: average('humidity'), unit: '%', status: 'normal', trend: '动态模拟', tone: 'blue' },
  { icon: Monitor, label: '历史平均 CO2', value: average('co2'), unit: 'ppm', status: average('co2') > 1000 ? 'warning' : 'normal', trend: '当前教室', tone: 'red' },
  { icon: Histogram, label: '历史平均 PM2.5', value: average('pm25'), unit: 'ug/m3', status: average('pm25') > 55 ? 'warning' : 'normal', trend: '当前教室', tone: 'orange' },
  { icon: UserFilled, label: '历史平均人数', value: average('people_count'), unit: '人', status: 'normal', trend: '当前教室', tone: 'purple' }
])

const tableRows = computed(() =>
  history.value.slice(-9).reverse().map((item, index) => ({
    ...item,
    people_count: item.peopleCount ?? item.people_count ?? 0,
    time: item.generatedAt || item.currentTime || item.updatedAt || item.update_time || item.time || `--:${String(index * 5).padStart(2, '0')}:00`
  }))
)

const summary = computed(() => [
  { title: '温度整体稳定', text: `${roomTitle.value} 平均温度 ${average('temperature')}℃。`, icon: TrendCharts },
  { title: 'CO2 趋势跟随人数', text: `平均 CO2 ${average('co2')} ppm，最后点接近当前时间。`, icon: Monitor },
  { title: '使用强度已切换', text: `当前显示 ${roomTitle.value} 的历史曲线。`, icon: UserFilled }
])

const compare = computed(() => [
  { name: '温度(℃)', current: String(average('temperature')), change: '动态' },
  { name: '湿度(%)', current: String(average('humidity')), change: '动态' },
  { name: 'CO2(ppm)', current: String(average('co2')), change: '动态' },
  { name: 'PM2.5', current: String(average('pm25')), change: '动态' },
  { name: '能耗(kW)', current: String(average('energy')), change: '动态' }
])

const tempHumidityOption = computed(() => ({
  ...baseOption(labels.value),
  legend: { top: 0, textStyle: { color: '#a9c9e8' } },
  yAxis: [yAxis('℃'), { ...yAxis('%'), splitLine: { show: false } }],
  series: [
    line('温度(℃)', values('temperature'), '#31e98f'),
    { ...line('湿度(%)', values('humidity'), '#147cff'), yAxisIndex: 1 }
  ]
}))
const co2Option = computed(() => singleLine('CO2', 'co2', '#ff4d5f', 'ppm'))
const pm25Option = computed(() => singleLine('PM2.5', 'pm25', '#ffbf2f', 'ug/m3'))
const noiseOption = computed(() => singleLine('噪声', 'noise', '#20d8ff', 'dB'))
const peopleOption = computed(() => singleLine('人数', 'people_count', '#925cff', '人'))
const energyOption = computed(() => singleLine('能耗', 'energy', '#20d8ff', 'kW'))
const heatmapOption = computed(() => heatmap())
const labels = computed(() => history.value.map((item) => item.time).slice(-28))

function average(key) {
  const list = history.value.length ? history.value : []
  if (!list.length) return '--'
  const valuesForKey = list.map((item) => Number(key === 'people_count' ? item.peopleCount ?? item.people_count : item[key])).filter(Number.isFinite)
  if (!valuesForKey.length) return '--'
  return Number((valuesForKey.reduce((sum, item) => sum + item, 0) / valuesForKey.length).toFixed(key === 'temperature' || key === 'humidity' || key === 'energy' ? 1 : 0))
}

function values(key) {
  return history.value.map((item) => key === 'people_count' ? item.peopleCount ?? item.people_count : item[key]).slice(-28)
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
    hours.forEach((_, hour) => {
      const sample = history.value[(day * 24 + hour) % Math.max(1, history.value.length)]
      data.push([hour, day, Number(sample?.peopleCount ?? sample?.people_count ?? 0)])
    })
  })
  return {
    tooltip: { position: 'top' },
    grid: { left: 42, right: 58, top: 18, bottom: 26 },
    xAxis: { type: 'category', data: hours, axisLabel: { color: '#9fc2df' } },
    yAxis: { type: 'category', data: days, axisLabel: { color: '#9fc2df' } },
    visualMap: { min: 0, max: latest.value.capacity || 100, right: 6, top: 'middle', textStyle: { color: '#9fc2df' }, inRange: { color: ['#0b376f', '#28d4b5', '#ffd44a', '#ff5d5d'] } },
    series: [{ type: 'heatmap', data }]
  }
}

function openDeviceDetail() {
  appNavigation?.navigateToPage?.('device', { classroom: filters.classroom })
  ElMessage.success(`已切换到 ${roomTitle.value} 设备详情`)
}

async function refreshHistory() {
  const id = filters.classroom
  const [latestData, historyData] = await Promise.all([getLatestClassroom(id), getHistoryData(id, HISTORY_PAGE_LIMIT)])
  latest.value = latestData
  history.value = Array.isArray(historyData) ? historyData : []
}

function showChart(type) {
  return filters.metric === 'all' || filters.metric === type
}

async function queryHistory() {
  await refreshHistory()
  ElMessage.success(`已查询 ${roomTitle.value} 历史数据`)
}

async function resetHistoryFilters() {
  filters.classroom = appNavigation?.selectedClassroom?.value || 'A205'
  filters.range = ''
  filters.granularity = '15m'
  filters.metric = 'all'
  await refreshHistory()
  ElMessage.success('历史数据筛选条件已重置')
}

function exportHistoryData() {
  const header = ['time', 'temperature', 'humidity', 'co2', 'light', 'pm25', 'noise', 'people_count', 'energy']
  const rows = tableRows.value.map((row) => header.map((key) => row[key] ?? '').join(','))
  const csv = [header.join(','), ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${currentClassroomId.value}-history.csv`
  link.click()
  URL.revokeObjectURL(url)
  ElMessage.success('历史数据 CSV 已导出')
}

watch(() => filters.classroom, (value) => {
  if (appNavigation?.selectedClassroom && appNavigation.selectedClassroom.value !== value) {
    appNavigation.selectedClassroom.value = value
  }
  refreshHistory()
})

if (appNavigation?.selectedClassroom) {
  watch(appNavigation.selectedClassroom, (value) => {
    if (value && value !== filters.classroom) filters.classroom = value
  })
}

onMounted(async () => {
  await refreshHistory()
  historyTimer = window.setInterval(refreshHistory, 5000)
})

onUnmounted(() => {
  window.clearInterval(historyTimer)
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
