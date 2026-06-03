<script setup lang="ts">
import type { OutputTab } from '../composables/useTextileWorkspace';

defineProps<{
  activeTab: OutputTab;
}>();

defineEmits<{
  'update:activeTab': [value: OutputTab];
}>();
</script>

<template>
  <header class="tabs" aria-label="Output tabs">
    <button class="tab" :class="{ active: activeTab === 'result' }" type="button" @click="$emit('update:activeTab', 'result')">
      Результат
    </button>
    <button
      class="tab"
      :class="{ active: activeTab === 'resources' }"
      type="button"
      @click="$emit('update:activeTab', 'resources')"
    >
      Ресурсы
    </button>
  </header>
</template>
