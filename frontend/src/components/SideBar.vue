<template>
  <aside class="sidebar" :class="{ collapsed }">
    <div class="brand">
      <div class="brand-cube">
        <span></span>
        <span></span>
        <span></span>
      </div>
      <strong>智慧教室</strong>
      <button class="collapse-toggle" type="button" @click="toggleCollapse" :title="collapsed ? '展开导航' : '折叠导航'">
        <el-icon><Menu /></el-icon>
      </button>
    </div>

    <nav class="nav-list">
      <button
        v-for="item in menuItems"
        :key="item.key"
        class="nav-item"
        :class="{ active: item.key === activePage }"
        @click="$emit('change-page', item.key)"
      >
        <el-icon><component :is="item.icon" /></el-icon>
        <span v-show="!collapsed">{{ item.label }}</span>
        <i v-if="item.key === 'alarm' && unhandledAlarmCount > 0" class="nav-badge" @click.stop="openAlarmPage">{{ badgeText }}</i>
        <b v-show="!collapsed"></b>
      </button>
    </nav>

    <div v-show="!collapsed" class="campus-illustration">
      <div class="iso-stage">
        <div class="screen"></div>
        <div v-for="i in 12" :key="i" class="desk" :style="deskStyle(i)"></div>
      </div>
      <p>绿色校园 · 智慧节能</p>
    </div>
  </aside>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Bell,
  House,
  MagicStick,
  Menu,
  Monitor,
  Operation,
  Setting,
  Timer
} from '@element-plus/icons-vue'

const props = defineProps({
  activePage: {
    type: String,
    required: true
  },
  collapsed: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['change-page', 'toggle-collapse'])
const ALERT_RECORDS_KEY = 'smart_classroom_alert_records'
const unhandledAlarmCount = ref(3)

const badgeText = computed(() => (unhandledAlarmCount.value > 9 ? '9+' : String(unhandledAlarmCount.value)))

const menuItems = [
  { key: 'dashboard', label: '首页总览', icon: House },
  { key: 'realtime', label: '实时监测', icon: Monitor },
  { key: 'history', label: '历史数据', icon: Timer },
  { key: 'alarm', label: '异常预警', icon: Bell },
  { key: 'ai', label: 'AI分析', icon: MagicStick },
  { key: 'device', label: '设备控制', icon: Operation },
  { key: 'settings', label: '系统设置', icon: Setting }
]

onMounted(() => {
  syncAlarmBadge()
  window.addEventListener('smart-classroom-alerts-updated', handleAlertUpdate)
})

onUnmounted(() => {
  window.removeEventListener('smart-classroom-alerts-updated', handleAlertUpdate)
})

function openAlarmPage() {
  emit('change-page', 'alarm')
  ElMessage.success('已切换到异常预警')
}

function toggleCollapse() {
  emit('toggle-collapse')
  ElMessage.success(props.collapsed ? '导航已展开' : '导航已折叠')
}

function handleAlertUpdate(event) {
  unhandledAlarmCount.value = Number(event.detail?.unhandledCount || 0)
}

function syncAlarmBadge() {
  try {
    const raw = window.localStorage.getItem(ALERT_RECORDS_KEY)
    if (!raw) return
    const records = JSON.parse(raw)
    unhandledAlarmCount.value = Array.isArray(records) ? records.filter((item) => item.status === '未处理').length : 3
  } catch (error) {
    unhandledAlarmCount.value = 3
  }
}

function deskStyle(index) {
  const row = Math.floor((index - 1) / 4)
  const col = (index - 1) % 4
  return {
    left: `${24 + col * 35}px`,
    top: `${86 + row * 25}px`
  }
}
</script>
