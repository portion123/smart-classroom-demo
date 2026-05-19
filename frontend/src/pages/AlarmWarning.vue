<template>
  <div class="page alarm-page">
    <section class="alarm-layout">
      <div class="alarm-main">
        <section class="alarm-stat-grid">
          <article v-for="item in alarmStats" :key="item.label" class="glass-card alarm-stat" :class="item.tone">
            <el-icon><component :is="item.icon" /></el-icon>
            <div>
              <strong>{{ item.value }}</strong>
              <span>{{ item.label }}</span>
              <small>{{ item.trend }}</small>
            </div>
          </article>
        </section>

        <section class="alarm-chart-grid">
          <ChartPanel title="报警类型分布" :option="typeOption" height="270px" />
          <ChartPanel title="报警趋势（最近数据）" :option="trendOption" height="270px" />
        </section>

        <section class="filter-bar alarm-filter">
          <el-select v-model="filters.type" style="width: 190px">
            <el-option label="全部类型" value="all" />
            <el-option label="空气质量" value="空气" />
            <el-option label="温度" value="温度" />
            <el-option label="能耗" value="能耗" />
            <el-option label="设备" value="设备" />
          </el-select>
          <el-select v-model="filters.status" style="width: 190px">
            <el-option label="全部状态" value="all" />
            <el-option label="未处理" value="未处理" />
            <el-option label="已处理" value="已处理" />
          </el-select>
          <el-date-picker v-model="filters.date" type="date" placeholder="选择日期" style="width: 190px" />
          <el-button class="primary-gradient" :icon="Download" @click="exportAlarms">导出记录</el-button>
        </section>

        <section ref="alarmTableRef" class="glass-card">
          <div class="data-table">
            <el-table :data="filteredAlarms" height="330" size="small" empty-text="暂无异常">
              <el-table-column prop="time" label="报警时间" min-width="160" />
              <el-table-column prop="classroom_id" label="教室" width="110" />
              <el-table-column prop="type" label="报警类型" width="130" />
              <el-table-column label="报警等级" width="120">
                <template #default="{ row }">
                  <el-tag :type="levelTag(row.level)" effect="dark" round>{{ levelText(row.level) }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="content" label="报警内容" min-width="320" show-overflow-tooltip />
              <el-table-column label="状态" width="120">
                <template #default="{ row }">
                  <el-tag
                    :class="{ 'status-clickable': isUnhandled(row.status) }"
                    :type="isUnhandled(row.status) ? 'danger' : 'success'"
                    effect="dark"
                    round
                    @click="handleStatusClick(row)"
                  >
                    {{ row.status }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="150">
                <template #default="{ row }">
                  <el-button link type="primary" @click="showAlarmDetail(row)">详情</el-button>
                  <el-button v-if="isUnhandled(row.status)" link type="primary" @click="confirmProcessAlarm(row)">处理</el-button>
                  <el-button v-else link type="primary" @click="showAlarmDetail(row)">查看</el-button>
                </template>
              </el-table-column>
            </el-table>
            <el-pagination small layout="total, prev, pager, next, jumper" :total="filteredAlarms.length" :page-size="10" />
          </div>
        </section>
      </div>

      <aside class="alarm-side">
        <section class="glass-card current-room">
          <div class="panel-head"><h3>当前教室</h3></div>
          <div class="current-room-body">
            <h2>{{ roomTitle }}</h2>
            <div class="side-room-photo"></div>
            <div class="room-kv"><span>楼栋楼层</span><b>{{ latest.building || '-' }} · {{ latest.floor || '-' }}</b></div>
            <div class="room-kv"><span>整体舒适度</span><b>{{ comfortText }}</b></div>
            <div class="room-kv"><span>温度</span><b>{{ latest.temperature ?? '-' }}℃</b></div>
            <div class="room-kv"><span>CO2 浓度</span><b>{{ latest.co2 ?? '-' }} ppm</b></div>
            <div class="room-kv"><span>能耗</span><b>{{ latest.energy ?? '-' }} kW</b></div>
          </div>
        </section>

        <section class="glass-card">
          <div class="panel-head"><h3>今日报警概览</h3></div>
          <div class="donut-summary">
            <div class="donut-ring"><strong>{{ totalCount }}</strong><span>总数</span></div>
            <div>
              <p><i class="red-dot"></i>未处理 {{ unhandledCount }} ({{ unhandledPercent }}%)</p>
              <p><i class="green-dot"></i>已处理 {{ handledCount }} ({{ handledPercent }}%)</p>
            </div>
          </div>
        </section>

        <section class="glass-card quick-entry">
          <div class="panel-head"><h3>快速查看</h3></div>
          <div class="quick-grid">
            <button @click="quickView('alarm')"><el-icon><Bell /></el-icon>报警记录</button>
            <button @click="quickView('realtime')"><el-icon><Monitor /></el-icon>实时监测</button>
            <button @click="quickView('history')"><el-icon><Timer /></el-icon>历史数据</button>
            <button @click="quickView('device')"><el-icon><Operation /></el-icon>设备状态</button>
          </div>
        </section>
      </aside>
    </section>
  </div>
</template>

<script setup>
import { computed, inject, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Bell, Download, Monitor, Operation, Timer, WarningFilled } from '@element-plus/icons-vue'
import ChartPanel from '../components/ChartPanel.vue'
import { getAlarmList, getLatestClassroom } from '../api/request'

const appNavigation = inject('appNavigation', null)
const selectedClassroom = computed(() => appNavigation?.selectedClassroom?.value || 'A205')
const alarms = ref([])
const latest = ref({ classroomId: selectedClassroom.value, classroomName: `${selectedClassroom.value} 教室`, temperature: '--', co2: '--', energy: '--' })
const alarmTableRef = ref(null)
const filters = reactive({ type: 'all', status: 'all', date: '' })
let alarmTimer = null

const currentClassroomId = computed(() => latest.value.classroomId || latest.value.classroom_id || selectedClassroom.value)
const roomTitle = computed(() => latest.value.classroomName || latest.value.name || `${currentClassroomId.value} 教室`)
const comfortText = computed(() => latest.value.status === 'warning' || latest.value.status === 'danger' ? '需关注' : '舒适')

const totalCount = computed(() => alarms.value.length)
const unhandledCount = computed(() => alarms.value.filter((item) => isUnhandled(item.status)).length)
const handledCount = computed(() => totalCount.value - unhandledCount.value)
const handledPercent = computed(() => (totalCount.value ? Math.round((handledCount.value / totalCount.value) * 100) : 0))
const unhandledPercent = computed(() => (totalCount.value ? Math.round((unhandledCount.value / totalCount.value) * 100) : 0))

const alarmStats = computed(() => [
  { label: '当前报警总数', value: totalCount.value, trend: roomTitle.value, icon: Bell, tone: 'red' },
  { label: '未处理报警', value: unhandledCount.value, trend: unhandledCount.value ? '需要处理' : '暂无异常', icon: WarningFilled, tone: 'orange' },
  { label: '已处理报警', value: handledCount.value, trend: '当前页面状态', icon: WarningFilled, tone: 'yellow' },
  { label: '处理及时率', value: `${handledPercent.value}%`, trend: '动态统计', icon: Timer, tone: 'blue' }
])

const filteredAlarms = computed(() =>
  alarms.value.filter((item) => {
    const typeMatched = filters.type === 'all' || String(item.type || '').includes(filters.type)
    const statusMatched = filters.status === 'all' || item.status === filters.status
    return typeMatched && statusMatched
  })
)

const alarmTypeData = computed(() => {
  const counts = alarms.value.reduce((result, item) => {
    result[item.type || '未知报警'] = (result[item.type || '未知报警'] || 0) + 1
    return result
  }, {})
  const data = Object.entries(counts).map(([name, value]) => ({ name, value }))
  return data.length ? data : [{ value: 1, name: '暂无报警' }]
})

const typeOption = computed(() => ({
  color: ['#ff4d5f', '#ff7a2f', '#ffd34d', '#20d8ff', '#675cff'],
  tooltip: { trigger: 'item', backgroundColor: 'rgba(4,18,42,.92)', borderColor: '#1a9cff', textStyle: { color: '#eaf6ff' } },
  legend: { right: 20, top: 'middle', orient: 'vertical', textStyle: { color: '#cfe5fa' } },
  series: [
    {
      type: 'pie',
      radius: ['48%', '72%'],
      center: ['36%', '52%'],
      label: { color: '#eaf6ff', formatter: '{b}\n{d}%' },
      data: alarmTypeData.value
    }
  ],
  graphic: [{ type: 'text', left: '31%', top: '47%', style: { text: `${totalCount.value}\n总数`, fill: '#fff', fontSize: 24, fontWeight: 800, align: 'center' } }]
}))

const trendOption = computed(() => ({
  color: ['#1497ff'],
  tooltip: { trigger: 'axis', backgroundColor: 'rgba(4,18,42,.92)', borderColor: '#1a9cff', textStyle: { color: '#eaf6ff' } },
  grid: { left: 42, right: 26, top: 38, bottom: 32 },
  xAxis: { type: 'category', data: trendLabels.value, axisLabel: { color: '#9fc2df' }, axisLine: { lineStyle: { color: 'rgba(152,204,255,.28)' } } },
  yAxis: { type: 'value', minInterval: 1, splitLine: { lineStyle: { color: 'rgba(120,180,255,.12)', type: 'dashed' } }, axisLabel: { color: '#9fc2df' } },
  series: [{ name: '报警数量', type: 'line', smooth: true, symbolSize: 10, data: trendValues.value, lineStyle: { width: 3 }, areaStyle: { color: 'rgba(20,151,255,.18)' } }]
}))

const trendLabels = computed(() => alarms.value.slice().reverse().map((item) => String(item.time || '').slice(5, 16)))
const trendValues = computed(() => trendLabels.value.map((_, index) => index + 1))

function isUnhandled(status) {
  return !/已处理|handled|resolved|done/i.test(String(status || '未处理'))
}

function levelTag(level) {
  if (level === 'danger' || level === 'high') return 'danger'
  if (level === 'warning' || level === 'medium') return 'warning'
  return 'primary'
}

function levelText(level) {
  if (level === 'danger' || level === 'high') return '严重'
  if (level === 'warning' || level === 'medium') return '警告'
  return '提示'
}

async function confirmProcessAlarm(row) {
  try {
    await ElMessageBox.confirm('确认将该报警标记为已处理吗？', '处理报警', {
      confirmButtonText: '确认处理',
      cancelButtonText: '取消',
      type: 'warning'
    })
    processAlarm(row)
  } catch (error) {
    // user canceled
  }
}

function processAlarm(row) {
  row.status = '已处理'
  notifyAlertCount()
  ElMessage.success('报警已标记为已处理')
}

function showAlarmDetail(row) {
  ElMessageBox.alert(
    `报警时间：${row.time}<br />教室：${row.classroom_id}<br />报警类型：${row.type}<br />报警等级：${levelText(row.level)}<br />报警内容：${row.content}<br />当前状态：${row.status}<br />处理建议：${alarmAdvice(row)}`,
    '报警详情',
    {
      confirmButtonText: '知道了',
      dangerouslyUseHTMLString: true
    }
  )
}

function handleStatusClick(row) {
  if (isUnhandled(row.status)) confirmProcessAlarm(row)
  else ElMessage.success('该报警已处理')
}

function exportAlarms() {
  const payload = {
    classroomId: currentClassroomId.value,
    exportedAt: latest.value.updatedAt || latest.value.update_time || latest.value.currentTime || latest.value.generatedAt || '--',
    filters: { ...filters },
    records: filteredAlarms.value
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `smart-classroom-${currentClassroomId.value}-alarm-records.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
  ElMessage.success('报警记录已导出')
}

function quickView(page) {
  if (page === 'alarm') {
    filters.type = 'all'
    filters.status = 'all'
    alarmTableRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    ElMessage.success('已定位到报警记录')
    return
  }
  appNavigation?.navigateToPage?.(page, { classroom: currentClassroomId.value })
  const pageName = {
    realtime: '实时监测',
    history: '历史数据',
    device: `${roomTitle.value} 设备状态`
  }[page]
  ElMessage.success(`已切换到${pageName}`)
}

async function loadAlarmData() {
  const id = selectedClassroom.value
  const [latestData, alarmData] = await Promise.all([getLatestClassroom(id), getAlarmList(id)])
  latest.value = latestData
  alarms.value = alarmData.map(normalizeAlarm)
  notifyAlertCount()
}

function normalizeAlarm(item, index) {
  return {
    id: item.id || `${item.time}-${item.type}-${index}`,
    ...item,
    time: item.time || item.generatedAt || latest.value.updatedAt || latest.value.update_time || '--',
    classroom_id: item.classroomId || item.classroom_id || currentClassroomId.value,
    status: item.status || '未处理',
    content: item.message || item.content || `${item.type || '报警'} ${item.value ?? ''}`
  }
}

function alarmAdvice(row) {
  if (row.type?.includes('CO') || row.type?.includes('空气')) return '建议立即开启新风并观察 CO2 下降趋势。'
  if (row.type?.includes('温度')) return '建议检查空调策略，并将设定温度调整到舒适区间。'
  if (row.type?.includes('能耗')) return '建议联动关闭空置设备，并检查空调与照明运行状态。'
  if (row.type?.includes('设备')) return '建议运维人员复核设备网关、供电和在线状态。'
  return '建议运维人员复核现场状态并记录处理结果。'
}

function notifyAlertCount() {
  window.dispatchEvent(new CustomEvent('smart-classroom-alerts-updated', {
    detail: { unhandledCount: unhandledCount.value }
  }))
}

watch(selectedClassroom, () => {
  loadAlarmData()
})

onMounted(async () => {
  await loadAlarmData()
  alarmTimer = window.setInterval(loadAlarmData, 5000)
})

onUnmounted(() => {
  window.clearInterval(alarmTimer)
})
</script>

<style scoped>
.alarm-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 350px;
  gap: 14px;
}

.alarm-main,
.alarm-side {
  display: grid;
  align-content: start;
  gap: 14px;
}

.alarm-stat-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.alarm-stat {
  display: flex;
  align-items: center;
  min-height: 132px;
  gap: 22px;
  padding: 22px;
}

.alarm-stat .el-icon {
  position: relative;
  z-index: 1;
  color: var(--accent);
  font-size: 54px;
  filter: drop-shadow(0 0 18px var(--accent));
}

.alarm-stat div {
  position: relative;
  z-index: 1;
}

.alarm-stat strong {
  display: block;
  color: var(--accent);
  font-size: 32px;
}

.alarm-stat span,
.alarm-stat small {
  display: block;
  color: #dceeff;
}

.alarm-stat small {
  margin-top: 8px;
  color: var(--green);
}

.alarm-stat.red { --accent: var(--red); }
.alarm-stat.orange { --accent: #ff7a2f; }
.alarm-stat.yellow { --accent: #ffd34d; }
.alarm-stat.blue { --accent: var(--cyan); }

.alarm-chart-grid {
  display: grid;
  grid-template-columns: 0.9fr 1.1fr;
  gap: 14px;
}

.alarm-filter {
  justify-content: flex-start;
}

.current-room-body {
  position: relative;
  z-index: 1;
  padding: 14px 18px 18px;
}

.current-room h2 {
  margin: 0 0 12px;
  font-size: 24px;
}

.side-room-photo {
  height: 130px;
  margin-bottom: 12px;
  border-radius: 8px;
  background:
    linear-gradient(90deg, rgba(255,255,255,.16) 1px, transparent 1px),
    linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px),
    linear-gradient(150deg, #c4dbe5, #18406f);
  background-size: 32px 32px;
}

.room-kv {
  display: flex;
  justify-content: space-between;
  padding: 9px 0;
  border-bottom: 1px solid rgba(93, 169, 236, 0.13);
  color: #a8c6e1;
}

.room-kv b {
  color: #fff;
}

.donut-summary {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: 130px 1fr;
  align-items: center;
  gap: 18px;
  padding: 22px;
}

.donut-ring {
  display: grid;
  width: 120px;
  height: 120px;
  place-items: center;
  border-radius: 50%;
  background: conic-gradient(var(--red) 0 25%, var(--green) 25% 100%);
  box-shadow: 0 0 26px rgba(25, 220, 150, 0.22);
}

.donut-ring::before {
  content: "";
  position: absolute;
  width: 78px;
  height: 78px;
  border-radius: 50%;
  background: #06234d;
}

.donut-ring strong,
.donut-ring span {
  position: relative;
  z-index: 1;
  grid-column: 1;
  grid-row: 1;
}

.donut-ring strong {
  margin-top: -16px;
  font-size: 27px;
}

.donut-ring span {
  margin-top: 34px;
  font-size: 13px;
}

.donut-summary p {
  color: #dbeeff;
}

.red-dot,
.green-dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  margin-right: 8px;
  border-radius: 50%;
}

.red-dot { background: var(--red); }
.green-dot { background: var(--green); }

.quick-grid {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  padding: 18px;
}

.quick-grid button {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 66px;
  border: 1px solid rgba(64, 167, 255, 0.22);
  border-radius: 8px;
  background: rgba(6, 46, 95, 0.64);
  color: #cde7ff;
  cursor: pointer;
}

.status-clickable {
  cursor: pointer;
}
</style>
