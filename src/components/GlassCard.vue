<template>
  <div v-bind="$attrs" class="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden">
    <slot />
  </div>
</template>

<script setup lang="ts">
defineOptions({
  inheritAttrs: false
});
</script>
