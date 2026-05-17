<template>
  <article class="stat-card" :class="[status, tone]">
    <div class="stat-icon">
      <el-icon><component :is="icon" /></el-icon>
    </div>
    <div class="stat-body">
      <span class="stat-label">{{ label }}</span>
      <div class="stat-value">
        {{ value }}
        <small>{{ unit }}</small>
      </div>
      <div class="stat-foot">
        <el-tag size="small" :type="tagType" effect="dark" round>{{ statusText }}</el-tag>
        <span v-if="trend">{{ trend }}</span>
      </div>
    </div>
  </article>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  icon: {
    type: [Object, Function],
    required: true
  },
  label: {
    type: String,
    required: true
  },
  value: {
    type: [String, Number],
    required: true
  },
  unit: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    default: 'normal'
  },
  trend: {
    type: String,
    default: ''
  },
  tone: {
    type: String,
    default: ''
  }
})

const tagType = computed(() => {
  if (props.status === 'danger') return 'danger'
  if (props.status === 'warning') return 'warning'
  return 'success'
})

const statusText = computed(() => {
  if (props.status === 'danger') return '严重'
  if (props.status === 'warning') return '偏高'
  return '正常'
})
</script>
