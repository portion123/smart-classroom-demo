<template>
  <div class="layout">
    <SideBar :active-page="activePage" @change-page="$emit('change-page', $event)" />
    <section class="workspace">
      <TopBar @change-page="$emit('change-page', $event)" />
      <main class="page-scroll">
        <slot />
      </main>
    </section>
  </div>
</template>

<script setup>
import SideBar from './SideBar.vue'
import TopBar from './TopBar.vue'

defineProps({
  activePage: {
    type: String,
    required: true
  }
})

defineEmits(['change-page'])
</script>
