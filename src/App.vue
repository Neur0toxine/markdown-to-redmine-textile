<script setup lang="ts">
import { ref } from 'vue';
import ConverterWorkspace from './components/ConverterWorkspace.vue';
import DiagramPreviewModal from './components/DiagramPreviewModal.vue';
import { useTextileWorkspace } from './composables/useTextileWorkspace';
import { useTheme } from './composables/useTheme';
import type { RenderedDiagram } from './utils/mermaidRenderer';

const workspace = useTextileWorkspace();
const themeState = useTheme();
const previewDiagram = ref<RenderedDiagram | null>(null);
</script>

<template>
  <main class="app-shell" :data-theme="themeState.theme.value">
    <ConverterWorkspace
      :markdown="workspace.markdown.value"
      :active-tab="workspace.activeTab.value"
      :conversion="workspace.conversion.value"
      :rendered-diagrams="workspace.renderedDiagrams.value"
      :has-diagrams="workspace.hasDiagrams.value"
      :is-rendering-resources="workspace.isRenderingResources.value"
      :is-downloading="workspace.isDownloading.value"
      :action-status="workspace.actionStatus.value"
      :is-error-status="workspace.isErrorStatus.value"
      :diagram-white-background="workspace.diagramWhiteBackground.value"
      :theme-icon="themeState.themeIcon.value"
      @update:markdown="workspace.setMarkdown"
      @update:active-tab="workspace.setActiveTab"
      @update:diagram-white-background="workspace.setDiagramWhiteBackground"
      @preview="previewDiagram = $event"
      @copy="workspace.copyTextile"
      @download="workspace.downloadZip"
      @clear="workspace.clearAll"
      @toggle-theme="themeState.toggleTheme"
    />
    <DiagramPreviewModal :diagram="previewDiagram" @close="previewDiagram = null" />
  </main>
</template>
