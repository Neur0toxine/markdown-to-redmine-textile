<script setup lang="ts">
import { ref } from 'vue';

defineProps<{
  modelValue: string;
}>();

defineEmits<{
  'update:modelValue': [value: string];
  scroll: [ratio: number];
}>();

const textareaRef = ref<HTMLTextAreaElement | null>(null);

const getScrollRatio = (element: HTMLTextAreaElement) => {
  const maxScroll = element.scrollHeight - element.clientHeight;
  return maxScroll > 0 ? element.scrollTop / maxScroll : 0;
};

const setScrollRatio = (ratio: number) => {
  const element = textareaRef.value;
  if (!element) {
    return;
  }

  const maxScroll = element.scrollHeight - element.clientHeight;
  element.scrollTop = Math.max(maxScroll, 0) * ratio;
};

defineExpose({
  setScrollRatio,
});
</script>

<template>
  <div class="pane source-pane">
    <header class="pane-header">
      <h1>Markdown</h1>
    </header>
    <textarea
      ref="textareaRef"
      class="editor"
      aria-label="Markdown input"
      spellcheck="false"
      placeholder="Вставьте Markdown..."
      :value="modelValue"
      @input="$emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
      @scroll="$emit('scroll', getScrollRatio($event.target as HTMLTextAreaElement))"
    />
  </div>
</template>
