<script setup lang="ts">
import { ref } from 'vue';

defineProps<{
  error: string | null;
  textile: string;
}>();

defineEmits<{
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
  <section class="result-area" aria-label="Textile result">
    <pre v-if="error" class="error-output">{{ error }}</pre>
    <textarea
      ref="textareaRef"
      v-else
      class="editor output"
      readonly
      spellcheck="false"
      aria-label="Textile output"
      :value="textile"
      placeholder="Textile появится здесь..."
      @scroll="$emit('scroll', getScrollRatio($event.target as HTMLTextAreaElement))"
    />
  </section>
</template>
