<template>
  <Layout :active-page="activePage" @change-page="setActivePage">
    <component :is="currentComponent" />
  </Layout>
</template>

<script setup>
import { computed, provide, ref } from 'vue'
import Layout from './components/Layout.vue'
import Dashboard from './pages/Dashboard.vue'
import RealtimeMonitor from './pages/RealtimeMonitor.vue'
import HistoryData from './pages/HistoryData.vue'
import AlarmWarning from './pages/AlarmWarning.vue'
import AiAnalysis from './pages/AiAnalysis.vue'
import DeviceControl from './pages/DeviceControl.vue'
import SystemSettings from './pages/SystemSettings.vue'

const activePage = ref('dashboard')
const selectedClassroom = ref('A205')

const pages = {
  dashboard: Dashboard,
  realtime: RealtimeMonitor,
  history: HistoryData,
  alarm: AlarmWarning,
  ai: AiAnalysis,
  device: DeviceControl,
  settings: SystemSettings
}

const currentComponent = computed(() => pages[activePage.value] || Dashboard)

function setActivePage(page) {
  activePage.value = page
}

function navigateToPage(page, options = {}) {
  if (options.classroom) {
    selectedClassroom.value = options.classroom
  }
  setActivePage(page)
}

provide('appNavigation', {
  activePage,
  selectedClassroom,
  setActivePage,
  navigateToPage
})
</script>
