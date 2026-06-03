<script setup lang="ts">
import type { ConversionResult } from '../utils/converter';
import type { RenderedDiagram } from '../utils/mermaidRenderer';
import type { OutputTab } from '../composables/useTextileWorkspace';
import OutputTabs from './OutputTabs.vue';
import OutputToolbar from './OutputToolbar.vue';
import ResourcesPanel from './ResourcesPanel.vue';
import ResultPanel from './ResultPanel.vue';
import { ref } from 'vue';

defineProps<{
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
  'update:activeTab': [value: OutputTab];
  'update:diagramWhiteBackground': [value: boolean];
  preview: [diagram: RenderedDiagram];
  copy: [];
  download: [];
  clear: [];
  toggleTheme: [];
  resultScroll: [ratio: number];
}>();

const resultPanelRef = ref<InstanceType<typeof ResultPanel> | null>(null);

const setResultScrollRatio = (ratio: number) => {
  resultPanelRef.value?.setScrollRatio(ratio);
};

defineExpose({
  setResultScrollRatio,
});
</script>

<template>
  <div class="pane output-pane">
    <OutputTabs :active-tab="activeTab" @update:active-tab="$emit('update:activeTab', $event)" />

    <ResultPanel
      v-if="activeTab === 'result'"
      ref="resultPanelRef"
      :error="conversion.error"
      :textile="conversion.textile"
      @scroll="$emit('resultScroll', $event)"
    />
    <ResourcesPanel
      v-else
      :has-diagrams="hasDiagrams"
      :is-rendering="isRenderingResources"
      :error-text="isErrorStatus ? actionStatus : ''"
      :diagrams="renderedDiagrams"
      @preview="$emit('preview', $event)"
    />

    <OutputToolbar
      :status="actionStatus"
      :is-error-status="isErrorStatus"
      :has-conversion-error="Boolean(conversion.error)"
      :is-downloading="isDownloading"
      :diagram-white-background="diagramWhiteBackground"
      :theme-icon="themeIcon"
      @update:diagram-white-background="$emit('update:diagramWhiteBackground', $event)"
      @copy="$emit('copy')"
      @download="$emit('download')"
      @clear="$emit('clear')"
      @toggle-theme="$emit('toggleTheme')"
    />
  </div>
</template>
