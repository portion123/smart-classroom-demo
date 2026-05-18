<template>
  <header class="topbar">
    <div class="topbar-left">
      <el-icon><Menu /></el-icon>
    </div>

    <div class="title-wrap">
      <span class="title-wing left"></span>
      <h1>智慧教室环境监测与节能调控平台</h1>
      <span class="title-wing right"></span>
    </div>

    <div class="topbar-right">
      <div class="weather"><el-icon><Cloudy /></el-icon> 多云 26℃</div>

      <el-popover v-model:visible="noticeVisible" placement="bottom-end" width="330" trigger="click" popper-class="topbar-popover">
        <template #reference>
          <button class="icon-action notice-action" aria-label="通知">
            <el-badge :value="unreadCount" :hidden="unreadCount === 0" class="notice-badge">
              <el-icon><Bell /></el-icon>
            </el-badge>
          </button>
        </template>
        <div class="notice-panel">
          <div class="notice-head">
            <strong>最近报警通知</strong>
            <el-button link type="primary" @click="markAllRead">全部标记为已读</el-button>
          </div>
          <div v-for="item in notifications" :key="item.id" class="notice-item" :class="{ read: item.read }">
            <b>{{ item.title }}</b>
            <span>{{ item.content }}</span>
          </div>
        </div>
      </el-popover>

      <el-dropdown trigger="click" @command="handleUserCommand">
        <button class="admin admin-action">
          <el-avatar :size="30" class="admin-avatar">
            <el-icon><UserFilled /></el-icon>
          </el-avatar>
          <span>管理员</span>
        </button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="profile">个人资料</el-dropdown-item>
            <el-dropdown-item command="settings">系统设置</el-dropdown-item>
            <el-dropdown-item divided command="logout">退出登录</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>

      <div class="clock">
        <el-icon><Calendar /></el-icon>
        <span>{{ currentTime }}</span>
      </div>
    </div>
  </header>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Bell, Calendar, Cloudy, Menu, UserFilled } from '@element-plus/icons-vue'
import { getLatestClassroom } from '../api/request'
import { SIM_TIME_EVENT, formatClockTime, nowDateTime, parseTimeMs, resolveSimulationTime } from '../utils/simulationTime'

const NOTIFICATION_KEY = 'smart_classroom_notifications'
const BACKEND_SYNC_MS = 3000
const CLOCK_TICK_MS = 1000

const emit = defineEmits(['change-page'])
const currentTime = ref(formatClockTime(nowDateTime()))
const noticeVisible = ref(false)
const notifications = ref(defaultNotifications())

let clockTimer = null
let syncTimer = null
let backendAnchorMs = NaN
let anchorCapturedAt = 0

const unreadCount = computed(() => notifications.value.filter((item) => !item.read).length)

function setClockAnchor(timeText) {
  const ms = parseTimeMs(timeText)
  if (!Number.isFinite(ms)) return false
  backendAnchorMs = ms
  anchorCapturedAt = Date.now()
  renderClock()
  return true
}

function renderClock() {
  const useBackendAnchor = Number.isFinite(backendAnchorMs)
  const ms = useBackendAnchor ? backendAnchorMs + (Date.now() - anchorCapturedAt) : Date.now()
  currentTime.value = formatClockTime(ms)
}

async function syncClockFromBackend() {
  try {
    const latest = await getLatestClassroom()
    const updatedAt = resolveSimulationTime(latest)
    if (!setClockAnchor(updatedAt)) {
      backendAnchorMs = NaN
      renderClock()
    }
  } catch (error) {
    if (!Number.isFinite(backendAnchorMs)) {
      currentTime.value = formatClockTime(nowDateTime())
    }
  }
}

function handleSimulationTime(event) {
  const updatedAt = event.detail?.updatedAt
  if (!updatedAt) return
  setClockAnchor(updatedAt)
}

onMounted(() => {
  const hasStoredNotifications = loadNotifications()
  if (!hasStoredNotifications) syncUnreadFromStoredAlerts()

  window.addEventListener('smart-classroom-alerts-updated', syncUnreadFromAlerts)
  window.addEventListener(SIM_TIME_EVENT, handleSimulationTime)

  renderClock()
  syncClockFromBackend()
  clockTimer = window.setInterval(renderClock, CLOCK_TICK_MS)
  syncTimer = window.setInterval(syncClockFromBackend, BACKEND_SYNC_MS)
})

onUnmounted(() => {
  window.clearInterval(clockTimer)
  window.clearInterval(syncTimer)
  window.removeEventListener('smart-classroom-alerts-updated', syncUnreadFromAlerts)
  window.removeEventListener(SIM_TIME_EVENT, handleSimulationTime)
})

function defaultNotifications() {
  return [
    { id: 'co2', title: 'CO2提醒', content: 'A205 教室 CO2 浓度偏高，请关注通风。', read: false },
    { id: 'pm25', title: 'PM2.5提醒', content: 'PM2.5 接近阈值，建议检查空气质量。', read: false },
    { id: 'people', title: '人数提醒', content: 'A205 当前人数较高，通风负荷上升。', read: false },
    { id: 'humidity', title: '湿度提醒', content: '湿度偏高，建议检查除湿策略。', read: false }
  ]
}

function loadNotifications() {
  try {
    const raw = window.localStorage.getItem(NOTIFICATION_KEY)
    notifications.value = raw ? JSON.parse(raw) : defaultNotifications()
    return Boolean(raw)
  } catch (error) {
    notifications.value = defaultNotifications()
    return false
  }
}

function persistNotifications() {
  window.localStorage.setItem(NOTIFICATION_KEY, JSON.stringify(notifications.value))
}

function markAllRead() {
  notifications.value = notifications.value.map((item) => ({ ...item, read: true }))
  persistNotifications()
  ElMessage.success('全部通知已标记为已读')
}

function syncUnreadFromAlerts(event) {
  const count = Number(event.detail?.unhandledCount || 0)
  applyUnreadCount(count)
}

function syncUnreadFromStoredAlerts() {
  try {
    const raw = window.localStorage.getItem('smart_classroom_alert_records')
    if (!raw) return
    const records = JSON.parse(raw)
    if (!Array.isArray(records)) return
    const count = records.filter((item) => !/已|handled|resolved|done/i.test(String(item.status || ''))).length
    applyUnreadCount(count)
  } catch (error) {
    // ignore local parse errors
  }
}

function applyUnreadCount(count) {
  const base = notifications.value.length ? notifications.value : defaultNotifications()
  notifications.value = base.map((item, index) => ({
    ...item,
    read: index >= count
  }))
  persistNotifications()
}

async function handleUserCommand(command) {
  if (command === 'profile') {
    await ElMessageBox.alert('姓名：管理员<br />角色：系统管理员<br />负责教室：A205<br />登录状态：在线', '个人资料', {
      confirmButtonText: '知道了',
      dangerouslyUseHTMLString: true
    })
  }

  if (command === 'settings') {
    emit('change-page', 'settings')
    ElMessage.success('已切换到系统设置')
  }

  if (command === 'logout') {
    try {
      await ElMessageBox.confirm('确认退出登录吗？', '退出登录', {
        confirmButtonText: '确认退出',
        cancelButtonText: '取消',
        type: 'warning'
      })
      ElMessage.success('已退出登录（模拟）')
    } catch (error) {
      // user canceled
    }
  }
}
</script>

<style scoped>
.icon-action,
.admin-action {
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
}

.notice-action {
  display: inline-grid;
  place-items: center;
  padding: 0;
}

.notice-panel {
  display: grid;
  gap: 10px;
}

.notice-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.notice-item {
  display: grid;
  gap: 4px;
  padding: 10px;
  border-radius: 8px;
  background: rgba(8, 48, 96, 0.42);
  color: #dbeeff;
}

.notice-item.read {
  opacity: 0.62;
}

.notice-item span {
  color: #8fb5d9;
  font-size: 12px;
}

.admin-action {
  display: inline-flex;
  align-items: center;
  gap: 7px;
}
</style>
