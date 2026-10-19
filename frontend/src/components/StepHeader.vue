<script setup>
defineProps({ badge: String, title: String })
</script>

<template>
  <div class="pt-6 pb-4">
    <span class="badge">{{ badge }}</span>
    <h2 class="mt-3 mb-2 text-2xl font-bold">{{ title }}</h2>
    <p class="leading-relaxed text-muted"><slot /></p>
  </div>
</template>
