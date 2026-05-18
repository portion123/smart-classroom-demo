<template>
  <div class="page device-page">
    <div class="page-title-row">
      <h2>设备控制 / A205 教室</h2>
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
          <div><el-icon><Monitor /></el-icon><strong>空调系统</strong><span>{{ devices.ac.on ? `${acModeLabel} ${devices.ac.temperature}℃` : '关闭' }}</span></div>
          <el-switch v-model="devices.ac.on" @change="(value) => toggleDevice('ac', value)" />
        </div>
        <label>设定温度</label>
        <div class="temp-stepper">
          <el-button @click="adjustAcTemperature(-1)">-</el-button>
          <strong>{{ devices.ac.temperature }}℃</strong>
          <el-button @click="adjustAcTemperature(1)">+</el-button>
        </div>
        <el-radio-group v-model="devices.ac.mode" class="segmented" @change="setAcMode">
          <el-radio-button label="cool">制冷</el-radio-button>
          <el-radio-button label="heat">制热</el-radio-button>
          <el-radio-button label="dry">除湿</el-radio-button>
          <el-radio-button label="fan">送风</el-radio-button>
        </el-radio-group>
      </article>

      <article class="glass-card control-card">
        <div class="control-head">
          <div><el-icon><Connection /></el-icon><strong>新风系统</strong><span>{{ devices.ventilation.on ? `${ventSpeedLabel} · ${ventModeLabel}` : '关闭' }}</span></div>
          <el-switch v-model="devices.ventilation.on" @change="(value) => toggleDevice('ventilation', value)" />
        </div>
        <label>风速调节</label>
        <el-radio-group v-model="devices.ventilation.speed" class="segmented" @change="setVentilationSpeed">
          <el-radio-button label="low">低</el-radio-button>
          <el-radio-button label="mid">中</el-radio-button>
          <el-radio-button label="high">高</el-radio-button>
          <el-radio-button label="auto">自动</el-radio-button>
        </el-radio-group>
        <label>模式</label>
        <el-radio-group v-model="devices.ventilation.mode" class="segmented" @change="setVentilationMode">
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
          <div><el-icon><VideoPlay /></el-icon><strong>多媒体设备</strong><span>{{ devices.media.on ? `${sourceLabel} · ${devices.media.volume}%` : '关闭' }}</span></div>
          <el-switch v-model="devices.media.on" @change="toggleMedia" />
        </div>
        <label>信号源</label>
        <el-radio-group v-model="devices.media.source" class="segmented" @change="setMediaSource">
          <el-radio-button label="pc">电脑</el-radio-button>
          <el-radio-button label="hdmi">HDMI</el-radio-button>
          <el-radio-button label="cast">无线投屏</el-radio-button>
          <el-radio-button label="video">视频</el-radio-button>
        </el-radio-group>
        <label>音量调节</label>
        <el-slider v-model="devices.media.volume" @change="setMediaVolume" />
      </article>
    </section>

    <section class="device-main-grid">
      <section class="glass-card device-overview">
        <div class="panel-head"><h3>教室设备状态总览</h3></div>
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
          <h2>A205 <small>教室</small></h2>
          <b>环境状态：{{ environmentStatus }}</b>
          <div class="metric-mini-row">
            <span>温度<br />{{ metrics.temperature }}℃</span><span>湿度<br />{{ metrics.humidity }}%</span><span>CO₂<br />{{ metrics.co2 }}ppm</span><span>PM2.5<br />{{ metrics.pm25 }}</span><span>噪声<br />{{ metrics.noise }}dB</span>
          </div>
        </section>
        <section class="glass-card side-info">
          <h3>设备状态</h3>
          <p>运行设备 <b>{{ runningDeviceCount }} / 5</b> <el-tag :type="deviceTagType" effect="dark">{{ deviceModeText }}</el-tag></p>
        </section>
        <section class="glass-card side-info energy-side">
          <h3>今日能耗</h3>
          <strong>{{ todayEnergy }} <small>kWh</small></strong>
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
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { CircleCheck, Connection, Monitor, Operation, Sunny, SwitchButton, UserFilled, VideoPlay } from '@element-plus/icons-vue'
import { controlDevice, getLatestClassroom } from '../api/request'

const DEVICE_STATE_KEY = 'smart_classroom_device_control_state'
const actionLoading = ref('')
const operationMode = ref('normal')

const devices = reactive({
  light: { on: true, brightness: 70, mode: 'auto' },
  ac: { on: true, temperature: 26, mode: 'cool' },
  ventilation: { on: true, speed: 'auto', mode: 'fresh' },
  curtain: { on: true, opening: 60 },
  media: { on: true, source: 'pc', volume: 60 }
})

const strategies = reactive([
  { title: '人走灯灭', text: '检测到教室无人时，自动关闭灯光', icon: UserFilled, enabled: true },
  { title: 'CO₂超标联动', text: 'CO₂浓度超过1000ppm时，自动开启新风系统', icon: Connection, enabled: true },
  { title: '高温联动', text: '室温高于28℃时，自动开启空调制冷', icon: Monitor, enabled: true },
  { title: '节能模式联动', text: '节能模式开启时，自动调整设备运行状态', icon: Sunny, enabled: true }
])

const logs = ref([
  { time: '2025-05-23 10:22:18', device: '空调系统', content: '将温度设置为 26℃，模式：制冷', operator: '管理员', result: '成功' },
  { time: '2025-05-23 10:20:05', device: '灯光系统', content: '调节亮度至 70%', operator: '管理员', result: '成功' },
  { time: '2025-05-23 10:18:47', device: '新风系统', content: '切换模式为 自动', operator: '管理员', result: '成功' },
  { time: '2025-05-23 09:45:12', device: '窗帘系统', content: '调整开合程度至 60%', operator: '管理员', result: '成功' },
  { time: '2025-05-23 09:30:33', device: '多媒体设备', content: '切换信号源至 电脑，音量调节至 60%', operator: '管理员', result: '成功' }
])

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

const acModeLabel = computed(() => acModeMap[devices.ac.mode])
const ventSpeedLabel = computed(() => speedMap[devices.ventilation.speed])
const ventModeLabel = computed(() => ventModeMap[devices.ventilation.mode])
const sourceLabel = computed(() => sourceMap[devices.media.source])

const lightOverview = computed(() => (devices.light.on ? `开启 · ${devices.light.brightness}% · ${devices.light.mode === 'auto' ? '自动' : '手动'}` : '关闭 · 0%'))
const acOverview = computed(() => (devices.ac.on ? `${acModeLabel.value} · ${devices.ac.temperature}℃` : '关闭'))
const ventilationOverview = computed(() => (devices.ventilation.on ? `运行中 · ${ventSpeedLabel.value} · ${ventModeLabel.value}` : '关闭'))
const curtainOverview = computed(() => `${devices.curtain.opening > 0 ? '开启' : '关闭'} · ${devices.curtain.opening}%`)
const mediaOverview = computed(() => (devices.media.on ? `使用中 · ${sourceLabel.value} · ${devices.media.volume}%` : `关闭 · ${devices.media.volume}%`))

const runningDeviceCount = computed(() => [devices.light.on, devices.ac.on, devices.ventilation.on, devices.curtain.opening > 0, devices.media.on].filter(Boolean).length)
const deviceModeText = computed(() => (operationMode.value === 'leave' ? '节能待机' : operationMode.value === 'energy' ? '节能运行' : '全部正常'))
const deviceTagType = computed(() => (operationMode.value === 'leave' ? 'warning' : 'success'))
const environmentStatus = computed(() => (operationMode.value === 'leave' ? '节能待机' : '良好'))

const metrics = computed(() => {
  if (operationMode.value === 'leave') {
    return { temperature: 26.3, humidity: 58, co2: 820, pm25: 22, noise: 35 }
  }
  if (operationMode.value === 'energy') {
    return { temperature: 26, humidity: 60, co2: 1000, pm25: 26, noise: 42 }
  }
  return {
    temperature: devices.ac.on ? devices.ac.temperature : 28.6,
    humidity: 62,
    co2: devices.ventilation.on ? 980 : 1450,
    pm25: devices.ventilation.on ? 28 : 42,
    noise: devices.media.on ? 45 : 38
  }
})

const todayEnergy = computed(() => {
  if (operationMode.value === 'energy') return 10.3
  if (operationMode.value === 'leave') return 8.9
  const load = devices.light.brightness * 0.012 + (devices.ac.on ? 2.8 : 0.7) + (devices.ventilation.on ? 1.3 : 0.3) + (devices.media.on ? devices.media.volume * 0.01 : 0.2) + devices.curtain.opening * 0.004 + 6.1
  return Number(load.toFixed(1))
})
const weekEnergy = computed(() => (operationMode.value === 'leave' ? 80.4 : operationMode.value === 'energy' ? 82.7 : 86.3))
const todayEnergyNote = computed(() => (operationMode.value === 'energy' ? '预计节能 18%' : operationMode.value === 'leave' ? '节能待机中' : '较昨日 ↓ 8.2%'))
const weekEnergyNote = computed(() => (operationMode.value === 'energy' ? '较上周 ↓ 10.8%' : operationMode.value === 'leave' ? '待机策略已生效' : '较上周 ↓ 6.7%'))

onMounted(async () => {
  await loadDeviceStateFromBackend()
})

async function enableEnergyMode() {
  actionLoading.value = 'energy'
  try {
    Object.assign(devices.light, { on: true, brightness: 60, mode: 'manual' })
    Object.assign(devices.ac, { on: true, temperature: 26, mode: 'cool' })
    Object.assign(devices.ventilation, { on: true, speed: 'mid', mode: 'eco' })
    Object.assign(devices.curtain, { on: true, opening: 50 })
    Object.assign(devices.media, { on: false, source: devices.media.source, volume: 30 })
    operationMode.value = 'energy'
    persistDeviceState()
    await Promise.allSettled([
      postDeviceControl('light', 'on', { brightness: 60 }),
      postDeviceControl('ac', 'on', { temperature: 26, mode: 'cool' }),
      postDeviceControl('ventilation', 'on', { speed: 'mid' }),
      postDeviceControl('curtain', 'on', { opening: 50 }),
      postDeviceControl('media', 'off', { volume: 30 })
    ])
    addLog('全局策略', '启用一键节能模式')
    ElMessage.success('已启用一键节能模式')
  } finally {
    actionLoading.value = ''
  }
}

async function enableLeaveMode() {
  actionLoading.value = 'leave'
  try {
    Object.assign(devices.light, { on: false, brightness: 0, mode: 'manual' })
    Object.assign(devices.ac, { on: false })
    Object.assign(devices.ventilation, { on: false })
    Object.assign(devices.curtain, { on: false, opening: 0 })
    Object.assign(devices.media, { on: false, volume: 0 })
    operationMode.value = 'leave'
    persistDeviceState()
    await Promise.allSettled([
      postDeviceControl('light', 'off', { brightness: 0 }),
      postDeviceControl('ac', 'off'),
      postDeviceControl('ventilation', 'off'),
      postDeviceControl('curtain', 'off', { opening: 0 }),
      postDeviceControl('media', 'off', { volume: 0 })
    ])
    addLog('全局策略', '启用一键离开模式')
    ElMessage.success('已启用一键离开模式')
  } finally {
    actionLoading.value = ''
  }
}

async function toggleDevice(device, value) {
  markManualMode()
  if (device === 'light' && !value) devices.light.brightness = 0
  if (device === 'light' && value && devices.light.brightness === 0) devices.light.brightness = 60
  persistDeviceState()
  await postDeviceControl(device, value ? 'on' : 'off')
  addLog(deviceName(device), `${value ? '开启' : '关闭'}${deviceName(device)}`)
  ElMessage.success('设备状态已更新')
}

function syncLightFromBrightness(value) {
  devices.light.on = value > 0
  persistDeviceState()
}

function setLightBrightness(value) {
  markManualMode()
  devices.light.on = value > 0
  persistDeviceState()
  postDeviceControl('light', value > 0 ? 'on' : 'off', { brightness: value })
  addLog('灯光系统', `调节亮度至 ${value}%`)
  ElMessage.success('灯光亮度已更新')
}

function setLightAllOn() {
  markManualMode()
  Object.assign(devices.light, { on: true, brightness: 100, mode: 'manual' })
  persistDeviceState()
  postDeviceControl('light', 'on', { brightness: 100 })
  addLog('灯光系统', '全开灯光，亮度 100%')
  ElMessage.success('灯光已全开')
}

function setLightAllOff() {
  markManualMode()
  Object.assign(devices.light, { on: false, brightness: 0, mode: 'manual' })
  persistDeviceState()
  postDeviceControl('light', 'off', { brightness: 0 })
  addLog('灯光系统', '全关灯光，亮度 0%')
  ElMessage.success('灯光已全关')
}

function setLightAuto() {
  markManualMode()
  Object.assign(devices.light, { on: true, mode: 'auto' })
  if (devices.light.brightness === 0) devices.light.brightness = 60
  persistDeviceState()
  postDeviceControl('light', 'on', { brightness: devices.light.brightness })
  addLog('灯光系统', '切换为自动模式')
  ElMessage.success('灯光已切换为自动模式')
}

function adjustAcTemperature(delta) {
  markManualMode()
  devices.ac.on = true
  devices.ac.temperature = Math.min(30, Math.max(18, devices.ac.temperature + delta))
  persistDeviceState()
  postDeviceControl('ac', 'on', { temperature: devices.ac.temperature, mode: devices.ac.mode })
  addLog('空调系统', `将温度设置为 ${devices.ac.temperature}℃`)
  ElMessage.success('空调温度已更新')
}

function setAcMode(value) {
  markManualMode()
  devices.ac.on = true
  persistDeviceState()
  postDeviceControl('ac', 'on', { temperature: devices.ac.temperature, mode: value })
  addLog('空调系统', `切换模式为 ${acModeMap[value]}`)
  ElMessage.success(`空调已切换为${acModeMap[value]}模式`)
}

function setVentilationSpeed(value) {
  markManualMode()
  devices.ventilation.on = true
  persistDeviceState()
  postDeviceControl('ventilation', 'on', { speed: value, mode: devices.ventilation.mode })
  addLog('新风系统', `切换风速为 ${speedMap[value]}`)
  ElMessage.success(`新风风速已切换为${speedMap[value]}`)
}

function setVentilationMode(value) {
  markManualMode()
  devices.ventilation.on = true
  persistDeviceState()
  postDeviceControl('ventilation', 'on', { speed: devices.ventilation.speed, mode: value })
  addLog('新风系统', `切换模式为 ${ventModeMap[value]}`)
  ElMessage.success(`新风已切换为${ventModeMap[value]}模式`)
}

function syncCurtainFromOpening(value) {
  devices.curtain.on = value > 0
  persistDeviceState()
}

async function toggleCurtain(value) {
  markManualMode()
  if (!value) devices.curtain.opening = 0
  if (value && devices.curtain.opening === 0) devices.curtain.opening = 50
  persistDeviceState()
  await postDeviceControl('curtain', value ? 'on' : 'off', { opening: devices.curtain.opening })
  addLog('窗帘系统', value ? `打开窗帘至 ${devices.curtain.opening}%` : '关闭窗帘')
  ElMessage.success('窗帘状态已更新')
}

function setCurtainOpening(value) {
  markManualMode()
  devices.curtain.on = value > 0
  persistDeviceState()
  postDeviceControl('curtain', value > 0 ? 'on' : 'off', { opening: value })
  addLog('窗帘系统', `调整开合程度至 ${value}%`)
  ElMessage.success('窗帘开合度已更新')
}

function openCurtain() {
  markManualMode()
  Object.assign(devices.curtain, { on: true, opening: 100 })
  persistDeviceState()
  postDeviceControl('curtain', 'on', { opening: 100 })
  addLog('窗帘系统', '打开窗帘至 100%')
  ElMessage.success('窗帘已打开')
}

function closeCurtain() {
  markManualMode()
  Object.assign(devices.curtain, { on: false, opening: 0 })
  persistDeviceState()
  postDeviceControl('curtain', 'off', { opening: 0 })
  addLog('窗帘系统', '关闭窗帘至 0%')
  ElMessage.success('窗帘已关闭')
}

function stopCurtain() {
  markManualMode()
  devices.curtain.on = false
  persistDeviceState()
  postDeviceControl('curtain', 'off', { opening: devices.curtain.opening })
  addLog('窗帘系统', `停止窗帘移动，保持 ${devices.curtain.opening}%`)
  ElMessage.success('窗帘已停止')
}

async function toggleMedia(value) {
  markManualMode()
  if (value && devices.media.volume === 0) devices.media.volume = 30
  persistDeviceState()
  await postDeviceControl('media', value ? 'on' : 'off', { volume: devices.media.volume, source: devices.media.source })
  addLog('多媒体设备', value ? `开启多媒体设备，信号源：${sourceLabel.value}` : '关闭多媒体设备')
  ElMessage.success('多媒体状态已更新')
}

function setMediaSource(value) {
  markManualMode()
  devices.media.on = true
  persistDeviceState()
  postDeviceControl('media', 'on', { source: value, volume: devices.media.volume })
  addLog('多媒体设备', `切换信号源至 ${sourceMap[value]}`)
  ElMessage.success(`信号源已切换为${sourceMap[value]}`)
}

function setMediaVolume(value) {
  markManualMode()
  persistDeviceState()
  postDeviceControl('media', value > 0 ? 'on' : 'off', { volume: value, source: devices.media.source })
  addLog('多媒体设备', `音量调节至 ${value}%`)
  ElMessage.success('多媒体音量已更新')
}

function toggleStrategy(item, value) {
  persistDeviceState()
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
  if (operationMode.value !== 'normal') {
    operationMode.value = 'normal'
    persistDeviceState()
  }
}

async function postDeviceControl(device, action, extra = {}) {
  try {
    const result = await controlDevice({ classroom_id: 'A205', device, action, ...extra })
    if (result?.latest) applyBackendState(result.latest)
    return result
  } catch (error) {
    return { mode: 'mock', device, action }
  }
}

async function loadDeviceStateFromBackend() {
  try {
    applyBackendState(await getLatestClassroom())
  } catch (error) {
    ElMessage.warning('后端设备状态暂不可用，页面保留当前演示状态')
  }
}

function applyBackendState(latest) {
  if (!latest?.devices) return
  const backendDevices = latest.devices
  if (backendDevices.light) {
    Object.assign(devices.light, {
      on: Boolean(backendDevices.light.on && backendDevices.light.online),
      brightness: Math.round(backendDevices.light.brightness ?? devices.light.brightness)
    })
  }
  if (backendDevices.airConditioner) {
    Object.assign(devices.ac, {
      on: Boolean(backendDevices.airConditioner.on && backendDevices.airConditioner.online),
      temperature: Math.round(backendDevices.airConditioner.targetTemperature ?? devices.ac.temperature),
      mode: backendDevices.airConditioner.mode || devices.ac.mode
    })
  }
  if (backendDevices.freshAir) {
    Object.assign(devices.ventilation, {
      on: Boolean(backendDevices.freshAir.on && backendDevices.freshAir.online),
      speed: backendDevices.freshAir.speed || devices.ventilation.speed
    })
  }
  if (backendDevices.curtain) {
    Object.assign(devices.curtain, {
      on: Boolean(backendDevices.curtain.on && backendDevices.curtain.online),
      opening: Math.round(backendDevices.curtain.opening ?? devices.curtain.opening)
    })
  }
  if (backendDevices.multimedia) {
    Object.assign(devices.media, {
      on: Boolean(backendDevices.multimedia.on && backendDevices.multimedia.online),
      volume: Math.round(backendDevices.multimedia.volume ?? devices.media.volume)
    })
  }
}

function addLog(device, content) {
  logs.value.unshift({
    time: new Date().toLocaleString('zh-CN', { hour12: false }).replaceAll('/', '-'),
    device,
    content,
    operator: '管理员',
    result: '成功'
  })
  logs.value = logs.value.slice(0, 50)
  persistDeviceState()
}

function loadDeviceState() {
  const saved = readDeviceState()
  if (!saved) return
  if (saved.devices) {
    Object.keys(devices).forEach((key) => {
      if (saved.devices[key]) Object.assign(devices[key], saved.devices[key])
    })
  }
  if (Array.isArray(saved.strategies)) {
    strategies.forEach((item, index) => {
      const savedItem = saved.strategies.find((entry) => entry.title === item.title) || saved.strategies[index]
      if (savedItem && typeof savedItem.enabled === 'boolean') item.enabled = savedItem.enabled
    })
  }
  if (saved.operationMode) operationMode.value = saved.operationMode
  if (Array.isArray(saved.logs)) logs.value = saved.logs
}

function persistDeviceState() {
  // 设备主状态由后端动态模拟器维护，前端不再把它作为 localStorage 主数据源。
}

function readDeviceState() {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(DEVICE_STATE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch (error) {
    return null
  }
}

function deviceName(key) {
  return {
    light: '灯光系统',
    ac: '空调系统',
    ventilation: '新风系统',
    curtain: '窗帘系统',
    media: '多媒体设备'
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
