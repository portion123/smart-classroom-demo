<template>
  <div class="page device-page">
    <div class="page-title-row">
      <h2>设备控制 / {{ roomTitle }}</h2>
      <div class="top-actions">
        <el-button class="primary-gradient" :icon="Connection" :loading="actionLoading === 'energy'" @click="enableEnergyMode">一键节能模式</el-button>
        <el-button class="success-gradient" :icon="SwitchButton" :loading="actionLoading === 'leave'" @click="enableLeaveMode">一键离开模式</el-button>
      </div>
    </div>

    <section class="device-card-grid">
      <article class="glass-card control-card">
        <div class="control-head">
          <div><el-icon><Sunny /></el-icon><strong>灯光系统</strong><span>{{ devices.light.on ? `开启 · ${devices.light.brightness}%` : '关闭' }}</span></div>
          <el-switch v-model="devices.light.on" @change="(value) => toggleDevice('light', value)" />
        </div>
        <label>亮度调节</label>
        <el-slider v-model="devices.light.brightness" @input="syncLightFromBrightness" @change="setLightBrightness" />
        <div class="mode-row">
          <el-button @click="setLightAllOn">全开</el-button>
          <el-button @click="setLightAllOff">全关</el-button>
          <el-button type="primary" @click="setLightAuto">自动</el-button>
        </div>
      </article>

      <article class="glass-card control-card">
        <div class="control-head">
          <div><el-icon><Monitor /></el-icon><strong>空调系统</strong><span>{{ devices.airConditioner.on ? `${acModeLabel} ${devices.airConditioner.temperature}℃` : '关闭' }}</span></div>
          <el-switch v-model="devices.airConditioner.on" @change="(value) => toggleDevice('airConditioner', value)" />
        </div>
        <label>设定温度</label>
        <div class="temp-stepper">
          <el-button @click="adjustAcTemperature(-1)">-</el-button>
          <strong>{{ devices.airConditioner.temperature }}℃</strong>
          <el-button @click="adjustAcTemperature(1)">+</el-button>
        </div>
        <el-radio-group v-model="devices.airConditioner.mode" class="segmented" @change="setAcMode">
          <el-radio-button label="cool">制冷</el-radio-button>
          <el-radio-button label="heat">制热</el-radio-button>
          <el-radio-button label="dry">除湿</el-radio-button>
          <el-radio-button label="fan">送风</el-radio-button>
        </el-radio-group>
      </article>

      <article class="glass-card control-card">
        <div class="control-head">
          <div><el-icon><Connection /></el-icon><strong>新风系统</strong><span>{{ devices.freshAir.on ? `${ventSpeedLabel} · ${ventModeLabel}` : '关闭' }}</span></div>
          <el-switch v-model="devices.freshAir.on" @change="(value) => toggleDevice('freshAir', value)" />
        </div>
        <label>风速调节</label>
        <el-radio-group v-model="devices.freshAir.speed" class="segmented" @change="setVentilationSpeed">
          <el-radio-button label="low">低</el-radio-button>
          <el-radio-button label="mid">中</el-radio-button>
          <el-radio-button label="high">高</el-radio-button>
          <el-radio-button label="auto">自动</el-radio-button>
        </el-radio-group>
        <label>模式</label>
        <el-radio-group v-model="devices.freshAir.mode" class="segmented" @change="setVentilationMode">
          <el-radio-button label="fresh">通风</el-radio-button>
          <el-radio-button label="clean">净化</el-radio-button>
          <el-radio-button label="eco">节能</el-radio-button>
        </el-radio-group>
      </article>

      <article class="glass-card control-card">
        <div class="control-head">
          <div><el-icon><Operation /></el-icon><strong>窗帘系统</strong><span>{{ devices.curtain.opening }}% · {{ devices.curtain.on ? '运行' : '停止' }}</span></div>
          <el-switch v-model="devices.curtain.on" @change="toggleCurtain" />
        </div>
        <label>开合程度</label>
        <el-slider v-model="devices.curtain.opening" @input="syncCurtainFromOpening" @change="setCurtainOpening" />
        <div class="mode-row">
          <el-button @click="openCurtain">打开</el-button>
          <el-button @click="closeCurtain">关闭</el-button>
          <el-button @click="stopCurtain">停止</el-button>
        </div>
      </article>

      <article class="glass-card control-card">
        <div class="control-head">
          <div><el-icon><VideoPlay /></el-icon><strong>多媒体设备</strong><span>{{ devices.multimedia.on ? `${sourceLabel} · ${devices.multimedia.volume}%` : '关闭' }}</span></div>
          <el-switch v-model="devices.multimedia.on" @change="toggleMedia" />
        </div>
        <label>信号源</label>
        <el-radio-group v-model="devices.multimedia.source" class="segmented" @change="setMediaSource">
          <el-radio-button label="pc">电脑</el-radio-button>
          <el-radio-button label="hdmi">HDMI</el-radio-button>
          <el-radio-button label="cast">无线投屏</el-radio-button>
          <el-radio-button label="video">视频</el-radio-button>
        </el-radio-group>
        <label>音量调节</label>
        <el-slider v-model="devices.multimedia.volume" @change="setMediaVolume" />
      </article>
    </section>

    <section class="device-main-grid">
      <section class="glass-card device-overview">
        <div class="panel-head"><h3>{{ roomTitle }} 设备状态总览</h3></div>
        <div class="device-scene">
          <div class="classroom-3d">
            <div class="room-wall">
              <div class="room-light"></div>
              <div class="room-light"></div>
              <div class="room-board"></div>
            </div>
            <div class="room-platform">
              <span v-for="desk in desks" :key="desk.id" class="desk-3d" :style="desk.style"></span>
            </div>
          </div>
          <div class="device-marker left top"><el-icon><Sunny /></el-icon><b>灯光系统</b><span>{{ lightOverview }}</span></div>
          <div class="device-marker left mid"><el-icon><Operation /></el-icon><b>窗帘系统</b><span>{{ curtainOverview }}</span></div>
          <div class="device-marker left bottom"><el-icon><VideoPlay /></el-icon><b>多媒体设备</b><span>{{ mediaOverview }}</span></div>
          <div class="device-marker right top"><el-icon><Monitor /></el-icon><b>空调系统</b><span>{{ acOverview }}</span></div>
          <div class="device-marker right mid"><el-icon><Connection /></el-icon><b>新风系统</b><span>{{ ventilationOverview }}</span></div>
          <div class="device-marker right bottom"><el-icon><CircleCheck /></el-icon><b>设备状态</b><span>{{ deviceModeText }}</span></div>
        </div>
      </section>

      <section class="glass-card strategy-card">
        <div class="panel-head">
          <h3>设备联动策略</h3>
          <el-button link type="primary" @click="manageStrategies">管理策略</el-button>
        </div>
        <div class="strategy-list">
          <div v-for="item in strategies" :key="item.title">
            <el-icon><component :is="item.icon" /></el-icon>
            <div><strong>{{ item.title }}</strong><span>{{ item.text }}</span></div>
            <el-switch v-model="item.enabled" @change="(value) => toggleStrategy(item, value)" />
          </div>
        </div>
      </section>

      <aside class="device-side">
        <section class="glass-card side-info">
          <h3>教室信息</h3>
          <h2>{{ currentClassroomId }} <small>教室</small></h2>
          <b>环境状态：{{ environmentStatus }}</b>
          <div class="metric-mini-row">
            <span>温度<br />{{ metrics.temperature }}℃</span><span>湿度<br />{{ metrics.humidity }}%</span><span>CO2<br />{{ metrics.co2 }}ppm</span><span>PM2.5<br />{{ metrics.pm25 }}</span><span>噪声<br />{{ metrics.noise }}dB</span>
          </div>
        </section>
        <section class="glass-card side-info">
          <h3>设备状态</h3>
          <p>运行设备 <b>{{ runningDeviceCount }} / 5</b> <el-tag :type="deviceTagType" effect="dark">{{ deviceModeText }}</el-tag></p>
        </section>
        <section class="glass-card side-info energy-side">
          <h3>当前能耗</h3>
          <strong>{{ todayEnergy }} <small>kW</small></strong>
          <p>{{ todayEnergyNote }}</p>
          <div class="mini-bars"><i v-for="i in 10" :key="i" :style="{ height: `${energyBarHeight(i)}px` }"></i></div>
        </section>
        <section class="glass-card side-info energy-side">
          <h3>本周能耗</h3>
          <strong>{{ weekEnergy }} <small>kWh</small></strong>
          <p>{{ weekEnergyNote }}</p>
          <div class="mini-line"></div>
        </section>
      </aside>
    </section>

    <section class="glass-card">
      <div class="panel-head">
        <h3>设备操作记录</h3>
        <el-button link type="primary" @click="showAllLogs">查看全部</el-button>
      </div>
      <div class="data-table">
        <el-table :data="logs" height="210" size="small">
          <el-table-column prop="time" label="操作时间" />
          <el-table-column prop="device" label="设备名称" />
          <el-table-column prop="content" label="操作内容" min-width="320" />
          <el-table-column prop="operator" label="操作人" />
          <el-table-column prop="result" label="结果">
            <template #default="{ row }">
              <el-tag type="success" effect="dark">{{ row.result }}</el-tag>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, inject, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { CircleCheck, Connection, Monitor, Operation, Sunny, SwitchButton, UserFilled, VideoPlay } from '@element-plus/icons-vue'
import { controlDevice, getLatestClassroom } from '../api/request'

const actionLoading = ref('')
const operationMode = ref('normal')
const appNavigation = inject('appNavigation', null)
const selectedClassroom = computed(() => appNavigation?.selectedClassroom?.value || 'A205')
const latest = ref({ classroomId: selectedClassroom.value, classroomName: `${selectedClassroom.value} 教室`, temperature: 26, humidity: 56, co2: 800, pm25: 24, noise: 48, energy: 7.5, devices: {} })

const devices = reactive({
  light: { on: true, brightness: 70, mode: 'auto' },
  airConditioner: { on: true, temperature: 26, mode: 'cool' },
  freshAir: { on: true, speed: 'auto', mode: 'fresh' },
  curtain: { on: true, opening: 60 },
  multimedia: { on: true, source: 'pc', volume: 60 }
})

const strategies = reactive([
  { title: '人走灯灭', text: '检测到教室无人时，自动关闭灯光', icon: UserFilled, enabled: true },
  { title: 'CO2 超标联动', text: 'CO2 浓度超过 1000ppm 时，自动开启新风系统', icon: Connection, enabled: true },
  { title: '高温联动', text: '室温高于 28℃ 时，自动开启空调制冷', icon: Monitor, enabled: true },
  { title: '节能模式联动', text: '节能模式开启时，自动调整设备运行状态', icon: Sunny, enabled: true }
])

const logs = ref([])

const desks = Array.from({ length: 15 }, (_, index) => {
  const row = Math.floor(index / 5)
  const col = index % 5
  return {
    id: index,
    style: { left: `${72 + col * 54}px`, top: `${88 + row * 44}px` }
  }
})

const acModeMap = { cool: '制冷', heat: '制热', dry: '除湿', fan: '送风' }
const speedMap = { low: '低速', mid: '中速', high: '高速', auto: '自动' }
const ventModeMap = { fresh: '通风', clean: '净化', eco: '节能' }
const sourceMap = { pc: '电脑', hdmi: 'HDMI', cast: '无线投屏', video: '视频' }

const currentClassroomId = computed(() => latest.value.classroomId || latest.value.classroom_id || selectedClassroom.value)
const roomTitle = computed(() => latest.value.classroomName || latest.value.name || `${currentClassroomId.value} 教室`)
const acModeLabel = computed(() => acModeMap[devices.airConditioner.mode])
const ventSpeedLabel = computed(() => speedMap[devices.freshAir.speed])
const ventModeLabel = computed(() => ventModeMap[devices.freshAir.mode])
const sourceLabel = computed(() => sourceMap[devices.multimedia.source])

const lightOverview = computed(() => (devices.light.on ? `开启 · ${devices.light.brightness}% · ${devices.light.mode === 'auto' ? '自动' : '手动'}` : '关闭 · 0%'))
const acOverview = computed(() => (devices.airConditioner.on ? `${acModeLabel.value} · ${devices.airConditioner.temperature}℃` : '关闭'))
const ventilationOverview = computed(() => (devices.freshAir.on ? `运行中 · ${ventSpeedLabel.value} · ${ventModeLabel.value}` : '关闭'))
const curtainOverview = computed(() => `${devices.curtain.opening > 0 ? '开启' : '关闭'} · ${devices.curtain.opening}%`)
const mediaOverview = computed(() => (devices.multimedia.on ? `使用中 · ${sourceLabel.value} · ${devices.multimedia.volume}%` : `关闭 · ${devices.multimedia.volume}%`))

const runningDeviceCount = computed(() => [devices.light.on, devices.airConditioner.on, devices.freshAir.on, devices.curtain.opening > 0, devices.multimedia.on].filter(Boolean).length)
const deviceModeText = computed(() => (operationMode.value === 'leave' ? '节能待机' : operationMode.value === 'energy' ? '节能运行' : '正常运行'))
const deviceTagType = computed(() => (operationMode.value === 'leave' ? 'warning' : 'success'))
const environmentStatus = computed(() => (latest.value.status === 'warning' || latest.value.status === 'danger' ? '需关注' : '良好'))

const metrics = computed(() => ({
  temperature: latest.value.temperature ?? devices.airConditioner.temperature,
  humidity: latest.value.humidity ?? 56,
  co2: latest.value.co2 ?? (devices.freshAir.on ? 900 : 1200),
  pm25: latest.value.pm25 ?? 24,
  noise: latest.value.noise ?? 48
}))

const todayEnergy = computed(() => Number(Number(latest.value.energy || 0).toFixed(1)))
const weekEnergy = computed(() => Number((todayEnergy.value * 6.8).toFixed(1)))
const todayEnergyNote = computed(() => (operationMode.value === 'energy' ? '预计节能 15%' : operationMode.value === 'leave' ? '节能待机中' : '动态模拟能耗'))
const weekEnergyNote = computed(() => (operationMode.value === 'normal' ? '随教室负载变化' : '策略已生效'))

onMounted(async () => {
  await loadDeviceStateFromBackend()
})

watch(selectedClassroom, async () => {
  operationMode.value = 'normal'
  logs.value = []
  await loadDeviceStateFromBackend()
})

async function enableEnergyMode() {
  actionLoading.value = 'energy'
  try {
    Object.assign(devices.light, { on: true, brightness: 60, mode: 'manual' })
    Object.assign(devices.airConditioner, { on: true, temperature: 26, mode: 'cool' })
    Object.assign(devices.freshAir, { on: true, speed: 'mid', mode: 'eco' })
    Object.assign(devices.curtain, { on: true, opening: 50 })
    Object.assign(devices.multimedia, { on: false, volume: 30 })
    operationMode.value = 'energy'
    await Promise.allSettled([
      postDeviceControl('light', true, { brightness: 60 }),
      postDeviceControl('airConditioner', true, { temperature: 26, mode: 'cool' }),
      postDeviceControl('freshAir', true, { speed: 'mid' }),
      postDeviceControl('curtain', true, { position: 50 }),
      postDeviceControl('multimedia', false, { volume: 30 })
    ])
    addLog('全局策略', `启用 ${roomTitle.value} 一键节能模式`)
    ElMessage.success('已启用一键节能模式')
  } finally {
    actionLoading.value = ''
  }
}

async function enableLeaveMode() {
  actionLoading.value = 'leave'
  try {
    Object.assign(devices.light, { on: false, brightness: 0, mode: 'manual' })
    Object.assign(devices.airConditioner, { on: false })
    Object.assign(devices.freshAir, { on: false })
    Object.assign(devices.curtain, { on: false, opening: 0 })
    Object.assign(devices.multimedia, { on: false, volume: 0 })
    operationMode.value = 'leave'
    await Promise.allSettled([
      postDeviceControl('light', false, { brightness: 0 }),
      postDeviceControl('airConditioner', false),
      postDeviceControl('freshAir', false),
      postDeviceControl('curtain', false, { position: 0 }),
      postDeviceControl('multimedia', false, { volume: 0 })
    ])
    addLog('全局策略', `启用 ${roomTitle.value} 一键离开模式`)
    ElMessage.success('已启用一键离开模式')
  } finally {
    actionLoading.value = ''
  }
}

async function toggleDevice(device, value) {
  markManualMode()
  if (device === 'light' && !value) devices.light.brightness = 0
  if (device === 'light' && value && devices.light.brightness === 0) devices.light.brightness = 60
  await postDeviceControl(device, value)
  addLog(deviceName(device), `${value ? '开启' : '关闭'}${deviceName(device)}`)
  ElMessage.success('设备状态已更新')
}

function syncLightFromBrightness(value) {
  devices.light.on = value > 0
}

function setLightBrightness(value) {
  markManualMode()
  devices.light.on = value > 0
  postDeviceControl('light', value > 0, { brightness: value })
  addLog('灯光系统', `调节亮度至 ${value}%`)
  ElMessage.success('灯光亮度已更新')
}

function setLightAllOn() {
  markManualMode()
  Object.assign(devices.light, { on: true, brightness: 100, mode: 'manual' })
  postDeviceControl('light', true, { brightness: 100 })
  addLog('灯光系统', '全开灯光，亮度 100%')
  ElMessage.success('灯光已全开')
}

function setLightAllOff() {
  markManualMode()
  Object.assign(devices.light, { on: false, brightness: 0, mode: 'manual' })
  postDeviceControl('light', false, { brightness: 0 })
  addLog('灯光系统', '全关灯光，亮度 0%')
  ElMessage.success('灯光已全关')
}

function setLightAuto() {
  markManualMode()
  Object.assign(devices.light, { on: true, mode: 'auto' })
  if (devices.light.brightness === 0) devices.light.brightness = 60
  postDeviceControl('light', true, { brightness: devices.light.brightness })
  addLog('灯光系统', '切换为自动模式')
  ElMessage.success('灯光已切换为自动模式')
}

function adjustAcTemperature(delta) {
  markManualMode()
  devices.airConditioner.on = true
  devices.airConditioner.temperature = Math.min(30, Math.max(18, devices.airConditioner.temperature + delta))
  postDeviceControl('airConditioner', true, { temperature: devices.airConditioner.temperature, mode: devices.airConditioner.mode })
  addLog('空调系统', `将温度设置为 ${devices.airConditioner.temperature}℃`)
  ElMessage.success('空调温度已更新')
}

function setAcMode(value) {
  markManualMode()
  devices.airConditioner.on = true
  postDeviceControl('airConditioner', true, { temperature: devices.airConditioner.temperature, mode: value })
  addLog('空调系统', `切换模式为 ${acModeMap[value]}`)
  ElMessage.success(`空调已切换为${acModeMap[value]}模式`)
}

function setVentilationSpeed(value) {
  markManualMode()
  devices.freshAir.on = true
  postDeviceControl('freshAir', true, { speed: value, mode: devices.freshAir.mode })
  addLog('新风系统', `切换风速为 ${speedMap[value]}`)
  ElMessage.success(`新风风速已切换为${speedMap[value]}`)
}

function setVentilationMode(value) {
  markManualMode()
  devices.freshAir.on = true
  postDeviceControl('freshAir', true, { speed: devices.freshAir.speed, mode: value })
  addLog('新风系统', `切换模式为 ${ventModeMap[value]}`)
  ElMessage.success(`新风已切换为${ventModeMap[value]}模式`)
}

function syncCurtainFromOpening(value) {
  devices.curtain.on = value > 0
}

async function toggleCurtain(value) {
  markManualMode()
  if (!value) devices.curtain.opening = 0
  if (value && devices.curtain.opening === 0) devices.curtain.opening = 50
  await postDeviceControl('curtain', value, { position: devices.curtain.opening })
  addLog('窗帘系统', value ? `打开窗帘至 ${devices.curtain.opening}%` : '关闭窗帘')
  ElMessage.success('窗帘状态已更新')
}

function setCurtainOpening(value) {
  markManualMode()
  devices.curtain.on = value > 0
  postDeviceControl('curtain', value > 0, { position: value })
  addLog('窗帘系统', `调整开合程度至 ${value}%`)
  ElMessage.success('窗帘开合度已更新')
}

function openCurtain() {
  markManualMode()
  Object.assign(devices.curtain, { on: true, opening: 100 })
  postDeviceControl('curtain', true, { position: 100 })
  addLog('窗帘系统', '打开窗帘至 100%')
  ElMessage.success('窗帘已打开')
}

function closeCurtain() {
  markManualMode()
  Object.assign(devices.curtain, { on: false, opening: 0 })
  postDeviceControl('curtain', false, { position: 0 })
  addLog('窗帘系统', '关闭窗帘至 0%')
  ElMessage.success('窗帘已关闭')
}

function stopCurtain() {
  markManualMode()
  devices.curtain.on = false
  postDeviceControl('curtain', false, { position: devices.curtain.opening })
  addLog('窗帘系统', `停止窗帘移动，保持 ${devices.curtain.opening}%`)
  ElMessage.success('窗帘已停止')
}

async function toggleMedia(value) {
  markManualMode()
  if (value && devices.multimedia.volume === 0) devices.multimedia.volume = 30
  await postDeviceControl('multimedia', value, { volume: devices.multimedia.volume, source: devices.multimedia.source })
  addLog('多媒体设备', value ? `开启多媒体设备，信号源：${sourceLabel.value}` : '关闭多媒体设备')
  ElMessage.success('多媒体状态已更新')
}

function setMediaSource(value) {
  markManualMode()
  devices.multimedia.on = true
  postDeviceControl('multimedia', true, { source: value, volume: devices.multimedia.volume })
  addLog('多媒体设备', `切换信号源至 ${sourceMap[value]}`)
  ElMessage.success(`信号源已切换为${sourceMap[value]}`)
}

function setMediaVolume(value) {
  markManualMode()
  postDeviceControl('multimedia', value > 0, { volume: value, source: devices.multimedia.source })
  addLog('多媒体设备', `音量调节至 ${value}%`)
  ElMessage.success('多媒体音量已更新')
}

function toggleStrategy(item, value) {
  addLog('联动策略', `${value ? '启用' : '停用'}策略：${item.title}`)
  ElMessage.success(`${item.title}已${value ? '启用' : '停用'}`)
}

function manageStrategies() {
  ElMessage.success('联动策略状态已同步')
}

function showAllLogs() {
  ElMessage.success(`当前共 ${logs.value.length} 条操作记录`)
}

function markManualMode() {
  if (operationMode.value !== 'normal') operationMode.value = 'normal'
}

async function postDeviceControl(device, status, extra = {}) {
  try {
    const result = await controlDevice({
      classroomId: selectedClassroom.value,
      classroom_id: selectedClassroom.value,
      device,
      deviceId: device,
      action: status ? 'on' : 'off',
      status,
      ...extra
    })
    if (result?.latest) applyBackendState(result.latest)
    return result
  } catch (error) {
    return { mode: 'mock', device, status }
  }
}

async function loadDeviceStateFromBackend() {
  try {
    applyBackendState(await getLatestClassroom(selectedClassroom.value))
  } catch (error) {
    ElMessage.warning('后端设备状态暂不可用，页面保留当前演示状态')
  }
}

function applyBackendState(data) {
  if (!data) return
  latest.value = data
  const backendDevices = data.devices || {}
  if (backendDevices.light) {
    Object.assign(devices.light, {
      on: Boolean((backendDevices.light.status ?? backendDevices.light.on) && backendDevices.light.online !== false),
      brightness: Math.round(backendDevices.light.brightness ?? devices.light.brightness)
    })
  }
  if (backendDevices.airConditioner) {
    Object.assign(devices.airConditioner, {
      on: Boolean((backendDevices.airConditioner.status ?? backendDevices.airConditioner.on) && backendDevices.airConditioner.online !== false),
      temperature: Math.round(backendDevices.airConditioner.temperature ?? backendDevices.airConditioner.targetTemperature ?? devices.airConditioner.temperature),
      mode: backendDevices.airConditioner.mode || devices.airConditioner.mode
    })
  }
  if (backendDevices.freshAir) {
    Object.assign(devices.freshAir, {
      on: Boolean((backendDevices.freshAir.status ?? backendDevices.freshAir.on) && backendDevices.freshAir.online !== false),
      speed: backendDevices.freshAir.speed || devices.freshAir.speed
    })
  }
  if (backendDevices.curtain) {
    Object.assign(devices.curtain, {
      on: Boolean((backendDevices.curtain.status ?? backendDevices.curtain.on) && backendDevices.curtain.online !== false),
      opening: Math.round(backendDevices.curtain.position ?? backendDevices.curtain.opening ?? devices.curtain.opening)
    })
  }
  if (backendDevices.multimedia) {
    Object.assign(devices.multimedia, {
      on: Boolean((backendDevices.multimedia.status ?? backendDevices.multimedia.on) && backendDevices.multimedia.online !== false),
      volume: Math.round(backendDevices.multimedia.volume ?? devices.multimedia.volume)
    })
  }
}

function addLog(device, content) {
  logs.value.unshift({
    time: latest.value.updatedAt || latest.value.update_time || new Date().toLocaleString('zh-CN', { hour12: false }).replaceAll('/', '-'),
    device,
    content,
    operator: '管理员',
    result: '成功'
  })
  logs.value = logs.value.slice(0, 50)
}

function deviceName(key) {
  return {
    light: '灯光系统',
    airConditioner: '空调系统',
    freshAir: '新风系统',
    curtain: '窗帘系统',
    multimedia: '多媒体设备'
  }[key]
}

function energyBarHeight(index) {
  const scale = operationMode.value === 'normal' ? 8 : operationMode.value === 'energy' ? 6 : 4
  return 16 + (index % 5) * scale
}
</script>

<style scoped>
.top-actions {
  display: flex;
  gap: 12px;
}

.device-card-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 14px;
}

.control-card {
  min-height: 200px;
  padding: 16px;
}

.control-head {
  position: relative;
  z-index: 1;
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.control-head div {
  display: grid;
  grid-template-columns: 34px 1fr;
  gap: 2px 10px;
  align-items: center;
}

.control-head .el-icon {
  grid-row: span 2;
  color: var(--cyan);
  font-size: 28px;
}

.control-head strong {
  color: #fff;
  font-size: 17px;
}

.control-head span,
.control-card label {
  color: #91b9d8;
  font-size: 12px;
}

.control-card label {
  position: relative;
  z-index: 1;
  display: block;
  margin-top: 16px;
}

.mode-row,
.temp-stepper,
.segmented {
  position: relative;
  z-index: 1;
}

.mode-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin-top: 12px;
}

.temp-stepper {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 18px;
  margin: 8px 0 16px;
}

.temp-stepper strong {
  color: #fff;
  font-size: 30px;
}

.segmented {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.device-main-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 420px 330px;
  gap: 14px;
}

.device-overview {
  min-height: 380px;
}

.device-scene {
  position: relative;
  z-index: 1;
  height: 330px;
}

.device-scene .classroom-3d {
  position: absolute;
  inset: 20px 120px;
}

.device-marker {
  position: absolute;
  display: grid;
  grid-template-columns: 28px 1fr;
  gap: 2px 10px;
  width: 150px;
  padding: 12px;
  border: 1px solid rgba(62, 166, 255, 0.28);
  border-radius: 8px;
  background: rgba(7, 47, 96, 0.74);
}

.device-marker .el-icon {
  grid-row: span 2;
  color: var(--cyan);
  font-size: 24px;
}

.device-marker b {
  color: #fff;
}

.device-marker span {
  color: var(--green);
  font-size: 12px;
}

.device-marker.left { left: 16px; }
.device-marker.right { right: 16px; }
.device-marker.top { top: 50px; }
.device-marker.mid { top: 132px; }
.device-marker.bottom { top: 214px; }

.strategy-list {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 12px;
  padding: 16px;
}

.strategy-list > div {
  display: grid;
  grid-template-columns: 42px 1fr 58px;
  gap: 12px;
  align-items: center;
  padding: 14px;
  border-radius: 8px;
  background: rgba(8, 48, 96, 0.58);
}

.strategy-list .el-icon {
  color: var(--cyan);
  font-size: 26px;
}

.strategy-list strong,
.strategy-list span {
  display: block;
}

.strategy-list span {
  margin-top: 4px;
  color: var(--text-soft);
  font-size: 12px;
}

.device-side {
  display: grid;
  gap: 14px;
}

.side-info {
  padding: 16px;
}

.side-info h3,
.side-info h2,
.side-info p,
.side-info b,
.side-info strong {
  position: relative;
  z-index: 1;
}

.side-info h3 {
  margin: 0 0 12px;
}

.side-info h2 {
  margin: 0 0 14px;
  font-size: 28px;
}

.side-info small,
.side-info p {
  color: var(--text-soft);
}

.metric-mini-row {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
  margin-top: 16px;
}

.metric-mini-row span {
  color: #dbeeff;
  font-size: 12px;
  text-align: center;
}

.energy-side strong {
  display: block;
  color: #fff;
  font-size: 30px;
}

.mini-bars {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: end;
  height: 56px;
  gap: 5px;
}

.mini-bars i {
  width: 10px;
  background: linear-gradient(180deg, #20d8ff, #147cff);
}

.mini-line {
  position: relative;
  z-index: 1;
  height: 52px;
  border-bottom: 2px solid rgba(32, 216, 255, 0.35);
  background: linear-gradient(145deg, transparent 45%, rgba(32, 216, 255, 0.35) 46%, transparent 52%);
}
</style>
