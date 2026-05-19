<template>
  <div class="layout" :style="{ '--sidebar-width': sidebarCollapsed ? '86px' : '252px' }">
    <SideBar
      :active-page="activePage"
      :collapsed="sidebarCollapsed"
      @toggle-collapse="sidebarCollapsed = !sidebarCollapsed"
      @change-page="$emit('change-page', $event)"
    />
    <section class="workspace">
      <TopBar @change-page="$emit('change-page', $event)" />
      <main class="page-scroll">
        <slot />
      </main>
    </section>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import SideBar from './SideBar.vue'
import TopBar from './TopBar.vue'

defineProps({
  activePage: {
    type: String,
    required: true
  }
})

defineEmits(['change-page'])

const sidebarCollapsed = ref(false)
</script>
