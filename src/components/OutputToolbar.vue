<script setup lang="ts">
defineProps<{
  status: string;
  isErrorStatus: boolean;
  hasConversionError: boolean;
  isDownloading: boolean;
  diagramWhiteBackground: boolean;
  themeIcon: string;
}>();

defineEmits<{
  'update:diagramWhiteBackground': [value: boolean];
  copy: [];
  download: [];
  clear: [];
  toggleTheme: [];
}>();
</script>

<template>
  <footer class="toolbar">
    <span class="status" :class="{ danger: isErrorStatus }">{{ status }}</span>
    <button type="button" :disabled="hasConversionError" @click="$emit('copy')">Скопировать</button>
    <button type="button" :disabled="hasConversionError || isDownloading" @click="$emit('download')">
      {{ isDownloading ? 'Скачивание...' : 'Скачать' }}
    </button>
    <button type="button" @click="$emit('clear')">Очистить</button>
    <label class="toolbar-check">
      <input
        type="checkbox"
        :checked="diagramWhiteBackground"
        @change="$emit('update:diagramWhiteBackground', ($event.target as HTMLInputElement).checked)"
      />
      <span>Белый фон диаграмм</span>
    </label>
    <button class="theme-toolbar-button" type="button" aria-label="Переключить тему" @click="$emit('toggleTheme')">
      {{ themeIcon }}
    </button>
  </footer>
</template>
