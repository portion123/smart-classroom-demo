<template>
  <div class="page settings-page">
    <div class="page-title-row">
      <h2>系统设置</h2>
    </div>

    <section class="settings-layout">
      <div class="settings-main">
        <section class="settings-grid">
          <section class="glass-card setting-card">
            <div class="setting-title"><el-icon><Setting /></el-icon><h3>基础设置</h3></div>
            <el-form label-width="110px" class="dark-form">
              <el-form-item label="系统名称"><el-input v-model="form.systemName" /></el-form-item>
              <el-form-item label="学校名称"><el-input v-model="form.schoolName" /></el-form-item>
              <el-form-item label="教室面积"><el-input v-model="form.area"><template #append>㎡</template></el-input></el-form-item>
              <el-form-item label="系统语言">
                <el-select v-model="form.language"><el-option label="简体中文" value="zh" /></el-select>
              </el-form-item>
              <el-form-item label="时区设置">
                <el-select v-model="form.timezone"><el-option label="(UTC+08:00) 北京，重庆，香港特别行政区" value="Asia/Shanghai" /></el-select>
              </el-form-item>
              <el-form-item label="自动刷新间隔">
                <el-select v-model="form.refresh"><el-option label="30 秒" value="30" /><el-option label="1 分钟" value="60" /></el-select>
              </el-form-item>
              <el-button class="primary-gradient full-button" :loading="savingSettings" @click="saveSettings">保存设置</el-button>
            </el-form>
          </section>

          <section class="glass-card setting-card">
            <div class="setting-title"><el-icon><Bell /></el-icon><h3>报警设置</h3></div>
            <div class="threshold-list">
              <div v-for="item in thresholds" :key="item.key" class="threshold-row">
                <span>{{ item.label }}</span>
                <el-input-number v-model="form[item.field]" :min="item.min" :max="item.max" />
                <b>{{ item.unit }}</b>
                <el-slider v-model="form[item.field]" :min="item.min" :max="item.max" />
                <small>{{ item.min }} - {{ item.max }}</small>
              </div>
            </div>
            <el-button class="primary-gradient full-button" :loading="savingSettings" @click="saveSettings">保存设置</el-button>
          </section>

          <section class="glass-card setting-card">
            <div class="setting-title"><el-icon><UserFilled /></el-icon><h3>用户与权限</h3><el-button size="small" @click="addUser">新增用户</el-button></div>
            <el-table :data="users" height="178" size="small">
              <el-table-column prop="name" label="用户名" />
              <el-table-column prop="role" label="角色" />
              <el-table-column label="状态">
                <template #default="{ row }"><el-tag :type="row.status === '启用' ? 'success' : 'info'" effect="dark">{{ row.status }}</el-tag></template>
              </el-table-column>
              <el-table-column prop="login" label="最后登录" />
              <el-table-column label="操作">
                <template #default="{ row }"><el-button link type="primary" @click="editUser(row)">编辑</el-button><el-button link @click="toggleUser(row)">{{ row.status === '启用' ? '禁用' : '启用' }}</el-button></template>
              </el-table-column>
            </el-table>
            <el-pagination small layout="total, prev, pager, next" :total="users.length" />
          </section>

          <section class="glass-card setting-card">
            <div class="setting-title"><el-icon><Message /></el-icon><h3>通知设置</h3></div>
            <div class="switch-list">
              <label v-for="item in notifications" :key="item.key">
                <span><b>{{ item.label }}</b><small>{{ item.desc }}</small></span>
                <el-switch v-model="form[item.field]" />
              </label>
            </div>
            <el-form label-width="120px" class="dark-form interval-form">
              <el-form-item label="推送提醒间隔">
                <el-select v-model="form.noticeInterval"><el-option label="5 分钟" value="5" /><el-option label="10 分钟" value="10" /></el-select>
              </el-form-item>
              <el-button class="primary-gradient full-button" :loading="savingSettings" @click="saveSettings">保存设置</el-button>
            </el-form>
          </section>

          <section class="glass-card setting-card">
            <div class="setting-title"><el-icon><Document /></el-icon><h3>数据存储设置</h3></div>
            <el-form label-width="120px" class="dark-form">
              <el-form-item label="数据保留天数"><el-input-number v-model="storage.days" :min="30" :max="1095" /><span class="unit-text">天</span></el-form-item>
              <el-form-item label="数据备份周期">
                <el-select v-model="storage.backup"><el-option label="每日备份" value="day" /><el-option label="每周备份" value="week" /></el-select>
                <el-time-picker v-model="storage.time" placeholder="备份时间" style="margin-left: 8px" />
              </el-form-item>
              <el-form-item label="数据导出格式">
                <el-checkbox-group v-model="storage.formats">
                  <el-checkbox label="CSV" />
                  <el-checkbox label="Excel" />
                  <el-checkbox label="JSON" />
                </el-checkbox-group>
              </el-form-item>
              <el-form-item label="自动清理过期数据"><el-switch v-model="storage.autoClean" active-text="开启" /></el-form-item>
              <el-button class="primary-gradient full-button" :loading="savingSettings" @click="saveSettings">保存设置</el-button>
            </el-form>
          </section>

          <section class="glass-card setting-card">
            <div class="setting-title"><el-icon><Tools /></el-icon><h3>系统工具</h3></div>
            <div class="tool-grid">
              <button :disabled="toolLoading === 'cache'" @click="clearCache"><el-icon><Delete /></el-icon><b>{{ toolLoading === 'cache' ? '清理中...' : '清理缓存' }}</b><span>清理系统缓存数据</span></button>
              <button :disabled="toolLoading === 'export'" @click="exportData"><el-icon><Download /></el-icon><b>{{ toolLoading === 'export' ? '导出中...' : '导出数据' }}</b><span>导出系统配置与历史数据</span></button>
              <button class="orange" :disabled="toolLoading === 'restart'" @click="restartService"><el-icon><Refresh /></el-icon><b>重启服务</b><span>重启数据采集与处理服务</span></button>
              <button class="red" @click="restoreDefaults"><el-icon><Setting /></el-icon><b>恢复默认</b><span>恢复系统默认配置</span></button>
            </div>
          </section>
        </section>
      </div>

      <aside class="settings-side">
        <section class="glass-card system-status">
          <div class="setting-title"><el-icon><Cpu /></el-icon><h3>系统状态</h3></div>
          <div class="status-kv"><span>系统版本</span><b>v2.3.1 <em>最新</em></b></div>
          <div class="status-kv"><span>服务器状态</span><b class="green">运行中</b></div>
          <div class="status-kv"><span>数据库状态</span><b class="green">正常</b></div>
          <div class="status-kv"><span>数据采集服务</span><b class="green">运行中</b></div>
        </section>

        <section class="glass-card system-status">
          <div class="setting-title"><el-icon><Document /></el-icon><h3>存储使用情况</h3></div>
          <div class="status-kv"><span>总容量</span><b>500 GB</b></div>
          <div class="status-kv"><span>已使用</span><b>186.7 GB (37.3%)</b></div>
          <el-progress :percentage="37.3" :show-text="false" />
          <div class="status-kv"><span>可用空间</span><b>313.3 GB</b></div>
        </section>

        <section class="glass-card system-status">
          <div class="setting-title"><el-icon><Timer /></el-icon><h3>系统运行时间</h3></div>
          <strong class="uptime">15 天 07 小时 24 分钟</strong>
          <div class="status-kv"><span>最后重启时间</span><b>2025-05-08 02:15:12</b></div>
        </section>

        <el-button class="primary-gradient log-button" :icon="Document" @click="viewLogs">查看系统日志</el-button>
      </aside>
    </section>

    <el-dialog v-model="logDialogVisible" title="系统日志" width="560px">
      <div class="log-list">
        <div v-for="item in mockLogs" :key="item.time" class="log-item">
          <span>{{ item.time }}</span>
          <b>{{ item.level }}</b>
          <p>{{ item.content }}</p>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { ElLoading, ElMessage, ElMessageBox } from 'element-plus'
import { Bell, Cpu, Delete, Document, Download, Message, Refresh, Setting, Timer, Tools, UserFilled } from '@element-plus/icons-vue'

const SYSTEM_SETTINGS_KEY = 'smart_classroom_system_settings'
const SYSTEM_USERS_KEY = 'smart_classroom_users'

const defaultSettings = {
  systemName: '智慧教室环境监测与节能调控平台',
  schoolName: '未来科技大学',
  area: 120,
  language: 'zh',
  timezone: 'Asia/Shanghai',
  refresh: '30',
  co2Threshold: 1000,
  temperatureThreshold: 26,
  humidityThreshold: 60,
  pm25Threshold: 35,
  noiseThreshold: 50,
  smsNotification: true,
  emailNotification: true,
  siteNotification: true,
  wechatNotification: true,
  noticeInterval: '5'
}

const defaultThresholds = [
  { key: 'co2', field: 'co2Threshold', label: 'CO₂阈值', min: 400, max: 2000, unit: 'ppm' },
  { key: 'temperature', field: 'temperatureThreshold', label: '温度阈值', min: 18, max: 35, unit: '℃' },
  { key: 'humidity', field: 'humidityThreshold', label: '湿度阈值', min: 20, max: 80, unit: '%RH' },
  { key: 'pm25', field: 'pm25Threshold', label: 'PM2.5阈值', min: 10, max: 100, unit: 'μg/m³' },
  { key: 'noise', field: 'noiseThreshold', label: '噪声阈值', min: 30, max: 80, unit: 'dB' }
]

const defaultNotifications = [
  { key: 'sms', field: 'smsNotification', label: '短信通知', desc: '通过短信发送报警信息' },
  { key: 'email', field: 'emailNotification', label: '邮件通知', desc: '通过邮件发送报警信息' },
  { key: 'site', field: 'siteNotification', label: '站内通知', desc: '系统站内消息推送' },
  { key: 'wechat', field: 'wechatNotification', label: '微信通知', desc: '通过企业微信推送消息' }
]

const defaultStorage = { days: 180, backup: 'day', time: new Date(2025, 4, 23, 2, 0), formats: ['CSV', 'Excel', 'JSON'], autoClean: true }

const form = reactive({ ...defaultSettings })
const thresholds = defaultThresholds
const notifications = defaultNotifications
const users = reactive(defaultUsers())
const storage = reactive({ ...defaultStorage, formats: [...defaultStorage.formats] })
const savingSettings = ref(false)
const toolLoading = ref('')
const logDialogVisible = ref(false)

const mockLogs = [
  { time: '2026-05-17 13:42:18', level: 'INFO', content: '系统设置页面读取本地配置成功。' },
  { time: '2026-05-17 13:41:06', level: 'INFO', content: '设备控制策略同步完成。' },
  { time: '2026-05-17 13:39:52', level: 'WARN', content: 'AI 分析接口不可用，已启用前端 mock 结果。' },
  { time: '2026-05-17 13:38:30', level: 'INFO', content: '用户权限状态已更新。' }
]

onMounted(() => {
  loadSettings()
  loadUsers()
})

function defaultUsers() {
  return [
    { name: 'admin', role: '超级管理员', status: '启用', login: '2025-05-23 10:12' },
    { name: 'teacher01', role: '教师', status: '启用', login: '2025-05-23 09:48' },
    { name: 'operator01', role: '运维人员', status: '启用', login: '2025-05-22 18:30' },
    { name: 'viewer01', role: '查看者', status: '启用', login: '2025-05-22 16:05' }
  ]
}

function loadSettings() {
  const cached = readStorage(SYSTEM_SETTINGS_KEY)
  Object.assign(form, defaultSettings, cached || {})
}

function loadUsers() {
  const cached = readStorage(SYSTEM_USERS_KEY)
  users.splice(0, users.length, ...(Array.isArray(cached) ? cached : defaultUsers()))
}

async function saveSettings() {
  savingSettings.value = true
  await wait(350)
  writeStorage(SYSTEM_SETTINGS_KEY, currentSettings())
  persistUsers()
  savingSettings.value = false
  ElMessage.success('设置已保存')
}

async function clearCache() {
  try {
    await ElMessageBox.confirm('确认清理系统设置缓存吗？只会清理系统设置和用户权限缓存。', '清理缓存', {
      confirmButtonText: '确认清理',
      cancelButtonText: '取消',
      type: 'warning'
    })
    toolLoading.value = 'cache'
    const loading = ElLoading.service({ text: '正在清理系统设置缓存...', background: 'rgba(2, 10, 24, 0.72)' })
    await wait(800)
    removeStorage(SYSTEM_SETTINGS_KEY)
    removeStorage(SYSTEM_USERS_KEY)
    removeStorage('smart_classroom_system_users')
    Object.assign(form, defaultSettings)
    users.splice(0, users.length, ...defaultUsers())
    loading.close()
    toolLoading.value = ''
    ElMessage.success('缓存已清理')
  } catch (error) {
    toolLoading.value = ''
  }
}

async function exportData() {
  toolLoading.value = 'export'
  await wait(500)
  const payload = {
    exportedAt: new Date().toLocaleString('zh-CN', { hour12: false }).replaceAll('/', '-'),
    settings: currentSettings(),
    users: users.map((item) => ({ ...item }))
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'smart-classroom-system-settings.json'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
  toolLoading.value = ''
  ElMessage.success('数据导出成功')
}

async function restartService() {
  try {
    await ElMessageBox.confirm('确认模拟重启数据采集与处理服务吗？', '重启服务', {
      confirmButtonText: '确认重启',
      cancelButtonText: '取消',
      type: 'warning'
    })
    toolLoading.value = 'restart'
    await wait(700)
    toolLoading.value = ''
    ElMessage.success('服务已模拟重启')
  } catch (error) {
    toolLoading.value = ''
  }
}

async function restoreDefaults() {
  try {
    await ElMessageBox.confirm('确认恢复系统默认配置吗？当前页面设置将被重置。', '恢复默认', {
      confirmButtonText: '确认恢复',
      cancelButtonText: '取消',
      type: 'warning'
    })
    Object.assign(form, defaultSettings)
    Object.assign(storage, { ...defaultStorage, formats: [...defaultStorage.formats], time: new Date(defaultStorage.time) })
    writeStorage(SYSTEM_SETTINGS_KEY, currentSettings())
    users.splice(0, users.length, ...defaultUsers())
    persistUsers()
    ElMessage.success('已恢复默认设置')
  } catch (error) {
    // 用户取消时无需提示
  }
}

async function addUser() {
  try {
    const { value } = await ElMessageBox.prompt('请输入新用户名称', '新增用户', {
      confirmButtonText: '新增',
      cancelButtonText: '取消',
      inputValue: `user${String(users.length + 1).padStart(2, '0')}`,
      inputPattern: /\S+/,
      inputErrorMessage: '用户名不能为空'
    })
    users.push({ name: value.trim(), role: '查看者', status: '启用', login: '未登录' })
    persistUsers()
    ElMessage.success('已新增模拟用户')
  } catch (error) {
    // 用户取消时无需提示
  }
}

async function editUser(row) {
  try {
    const { value } = await ElMessageBox.prompt('可修改用户名和角色，格式：用户名，角色', '编辑用户', {
      confirmButtonText: '保存',
      cancelButtonText: '取消',
      inputValue: `${row.name}，${row.role}`,
      inputPattern: /\S+，\S+|\S+,\S+/,
      inputErrorMessage: '请输入“用户名，角色”'
    })
    const [name, role] = value.split(/[，,]/).map((item) => item.trim())
    row.name = name || row.name
    row.role = role || row.role
    persistUsers()
    ElMessage.success('用户信息已更新')
  } catch (error) {
    // 用户取消时无需提示
  }
}

function toggleUser(row) {
  row.status = row.status === '启用' ? '禁用' : '启用'
  persistUsers()
  ElMessage.success(`${row.name} 已${row.status}`)
}

function viewLogs() {
  logDialogVisible.value = true
}

function currentSettings() {
  return Object.keys(defaultSettings).reduce((result, key) => {
    result[key] = form[key]
    return result
  }, {})
}

function persistUsers() {
  writeStorage(SYSTEM_USERS_KEY, users.map((item) => ({ ...item })))
}

function readStorage(key) {
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch (error) {
    return null
  }
}

function writeStorage(key, value) {
  window.localStorage.setItem(key, JSON.stringify(value))
}

function removeStorage(key) {
  window.localStorage.removeItem(key)
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
</script>

<style scoped>
.settings-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 390px;
  gap: 14px;
}

.settings-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.setting-card {
  min-height: 260px;
  padding: 16px;
}

.setting-title {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
}

.setting-title .el-icon {
  color: var(--cyan);
  font-size: 23px;
}

.setting-title h3 {
  flex: 1;
  margin: 0;
  color: #fff;
  font-size: 18px;
}

.dark-form,
.threshold-list,
.switch-list,
.tool-grid,
.system-status > * {
  position: relative;
  z-index: 1;
}

.full-button {
  width: 100%;
}

.unit-text {
  margin-left: 10px;
  color: #cfe5fa;
}

.threshold-list {
  display: grid;
  gap: 11px;
}

.threshold-row {
  display: grid;
  grid-template-columns: 92px 116px 72px 1fr 80px;
  align-items: center;
  gap: 12px;
  color: #dbeeff;
}

.threshold-row small {
  color: #a8c6e1;
}

.switch-list {
  display: grid;
  gap: 12px;
}

.switch-list label {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  padding: 10px;
  border-bottom: 1px solid rgba(91, 166, 234, 0.12);
}

.switch-list b,
.switch-list small {
  display: block;
}

.switch-list small {
  margin-top: 4px;
  color: #8fb5d9;
}

.interval-form {
  margin-top: 10px;
}

.tool-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.tool-grid button {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: 38px 1fr;
  gap: 2px 10px;
  min-height: 82px;
  padding: 14px;
  border: 1px solid rgba(64, 167, 255, 0.2);
  border-radius: 8px;
  background: rgba(8, 48, 96, 0.58);
  color: #dbeeff;
  text-align: left;
  cursor: pointer;
}

.tool-grid button:disabled {
  cursor: wait;
  opacity: 0.72;
}

.tool-grid .el-icon {
  grid-row: span 2;
  color: var(--cyan);
  font-size: 28px;
}

.tool-grid span {
  color: #8fb5d9;
  font-size: 12px;
}

.tool-grid .orange .el-icon {
  color: var(--orange);
}

.tool-grid .red .el-icon {
  color: var(--red);
}

.settings-side {
  display: grid;
  align-content: start;
  gap: 14px;
}

.system-status {
  padding: 16px;
}

.status-kv {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 0;
  border-bottom: 1px solid rgba(91, 166, 234, 0.12);
  color: #cfe5fa;
}

.status-kv b {
  color: #fff;
}

.status-kv .green {
  color: var(--green);
}

.status-kv em {
  margin-left: 8px;
  padding: 2px 8px;
  border-radius: 4px;
  background: rgba(49, 233, 143, 0.22);
  color: var(--green);
  font-style: normal;
}

.uptime {
  display: block;
  margin: 16px 0;
  color: #fff;
  font-size: 20px;
}

.log-button {
  position: relative;
  z-index: 1;
  height: 48px;
}

.log-list {
  display: grid;
  gap: 10px;
}

.log-item {
  display: grid;
  grid-template-columns: 160px 54px 1fr;
  align-items: center;
  gap: 10px;
  padding: 11px;
  border: 1px solid rgba(64, 167, 255, 0.18);
  border-radius: 8px;
  background: rgba(8, 48, 96, 0.42);
  color: #dbeeff;
}

.log-item span {
  color: var(--text-soft);
  font-size: 12px;
}

.log-item b {
  color: var(--cyan);
}

.log-item p {
  margin: 0;
}
</style>
