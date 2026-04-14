<template>
  <button
    :disabled="disabled"
    :class="[
      'px-6 py-3 rounded-2xl font-medium transition-all duration-200 cursor-pointer active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed select-none flex items-center justify-center gap-3',
      variant === 'primary' 
        ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20' 
        : 'bg-white/5 hover:bg-white/10 text-white border border-white/10',
      $attrs.class
    ]"
    @click="$emit('click')"
  >
    <slot />
  </button>
</template>

<script setup lang="ts">
defineProps<{
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
}>();

defineEmits(['click']);

defineOptions({
  inheritAttrs: false
});
</script>
