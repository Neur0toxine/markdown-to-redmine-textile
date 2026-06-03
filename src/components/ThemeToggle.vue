<script setup lang="ts">
defineProps<{
  icon: string;
}>();

defineEmits<{
  toggle: [];
}>();
</script>

<template>
  <button class="theme-toggle" type="button" aria-label="Переключить тему" @click="$emit('toggle')">
    {{ icon }}
  </button>
</template>
