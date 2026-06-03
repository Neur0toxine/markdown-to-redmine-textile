<script setup lang="ts">
import { ref } from 'vue';
import type { ConversionResult } from '../utils/converter';
import type { RenderedDiagram } from '../utils/mermaidRenderer';
import type { OutputTab } from '../composables/useTextileWorkspace';
import MarkdownPane from './MarkdownPane.vue';
import OutputPane from './OutputPane.vue';

defineProps<{
  markdown: string;
  activeTab: OutputTab;
  conversion: ConversionResult;
  renderedDiagrams: RenderedDiagram[];
  hasDiagrams: boolean;
  isRenderingResources: boolean;
  isDownloading: boolean;
  actionStatus: string;
  isErrorStatus: boolean;
  diagramWhiteBackground: boolean;
  themeIcon: string;
}>();

defineEmits<{
  'update:markdown': [value: string];
  'update:activeTab': [value: OutputTab];
  'update:diagramWhiteBackground': [value: boolean];
  preview: [diagram: RenderedDiagram];
  copy: [];
  download: [];
  clear: [];
  toggleTheme: [];
}>();

const markdownPaneRef = ref<InstanceType<typeof MarkdownPane> | null>(null);
const outputPaneRef = ref<InstanceType<typeof OutputPane> | null>(null);
let isSyncingScroll = false;

const syncScroll = (target: 'markdown' | 'result', ratio: number) => {
  if (isSyncingScroll) {
    return;
  }

  isSyncingScroll = true;
  if (target === 'markdown') {
    markdownPaneRef.value?.setScrollRatio(ratio);
  } else {
    outputPaneRef.value?.setResultScrollRatio(ratio);
  }
  window.setTimeout(() => {
    isSyncingScroll = false;
  }, 0);
};
</script>

<template>
  <section class="workspace" aria-label="Markdown to Redmine Textile converter">
    <MarkdownPane
      ref="markdownPaneRef"
      :model-value="markdown"
      @update:model-value="$emit('update:markdown', $event)"
      @scroll="syncScroll('result', $event)"
    />
    <OutputPane
      ref="outputPaneRef"
      :active-tab="activeTab"
      :conversion="conversion"
      :rendered-diagrams="renderedDiagrams"
      :has-diagrams="hasDiagrams"
      :is-rendering-resources="isRenderingResources"
      :is-downloading="isDownloading"
      :action-status="actionStatus"
      :is-error-status="isErrorStatus"
      :diagram-white-background="diagramWhiteBackground"
      :theme-icon="themeIcon"
      @update:active-tab="$emit('update:activeTab', $event)"
      @update:diagram-white-background="$emit('update:diagramWhiteBackground', $event)"
      @preview="$emit('preview', $event)"
      @copy="$emit('copy')"
      @download="$emit('download')"
      @clear="$emit('clear')"
      @toggle-theme="$emit('toggleTheme')"
      @result-scroll="syncScroll('markdown', $event)"
    />
  </section>
</template>
