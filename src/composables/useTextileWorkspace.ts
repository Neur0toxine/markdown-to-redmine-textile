import { computed, ref, watch } from 'vue';
import { convertMarkdownToTextile } from '../utils/converter';
import { renderDiagramPngs, type RenderedDiagram } from '../utils/mermaidRenderer';
import { buildTextileZip, downloadBlob } from '../utils/zipExport';

export type OutputTab = 'result' | 'resources';

const SUCCESS_STATUSES = new Set(['Скопировано', 'Архив готов']);

export const useTextileWorkspace = () => {
  const markdown = ref('');
  const activeTab = ref<OutputTab>('result');
  const renderedDiagrams = ref<RenderedDiagram[]>([]);
  const isRenderingResources = ref(false);
  const isDownloading = ref(false);
  const actionStatus = ref('');
  const diagramWhiteBackground = ref(true);

  const conversion = computed(() => convertMarkdownToTextile(markdown.value));
  const hasDiagrams = computed(() => conversion.value.diagrams.length > 0);
  const diagramKey = computed(() =>
    conversion.value.diagrams.map((diagram) => `${diagram.filename}:${diagram.source}`).join('|'),
  );
  const isErrorStatus = computed(() => Boolean(actionStatus.value) && !SUCCESS_STATUSES.has(actionStatus.value));

  const ensureResourcesRendered = async () => {
    if (!hasDiagrams.value || conversion.value.error) {
      renderedDiagrams.value = [];
      return [];
    }

    isRenderingResources.value = true;
    actionStatus.value = '';

    const diagrams = conversion.value.diagrams;
    try {
      const rendered = await renderDiagramPngs(diagrams);
      if (diagrams !== conversion.value.diagrams) {
        return renderedDiagrams.value;
      }
      renderedDiagrams.value = rendered;
      return rendered;
    } catch (error) {
      actionStatus.value = error instanceof Error ? error.message : String(error);
      throw error;
    } finally {
      isRenderingResources.value = false;
    }
  };

  watch(diagramKey, () => {
    actionStatus.value = '';
    if (activeTab.value === 'resources') {
      void ensureResourcesRendered();
    }
  });

  watch(activeTab, (tab) => {
    if (tab === 'resources') {
      void ensureResourcesRendered();
    }
  });

  const setMarkdown = (value: string) => {
    markdown.value = value;
  };

  const setActiveTab = (value: OutputTab) => {
    activeTab.value = value;
  };

  const copyTextile = async () => {
    if (conversion.value.error) {
      return;
    }

    await navigator.clipboard.writeText(conversion.value.textile);
    actionStatus.value = 'Скопировано';
  };

  const downloadZip = async () => {
    if (conversion.value.error) {
      return;
    }

    isDownloading.value = true;
    actionStatus.value = '';

    try {
      const diagrams = await renderDiagramPngs(conversion.value.diagrams, {
        whiteBackground: diagramWhiteBackground.value,
      });
      const blob = await buildTextileZip(conversion.value, diagrams);
      downloadBlob(blob, 'redmine-textile.zip');
      actionStatus.value = 'Архив готов';
    } catch (error) {
      actionStatus.value = error instanceof Error ? error.message : String(error);
      activeTab.value = 'result';
    } finally {
      isDownloading.value = false;
    }
  };

  const clearAll = () => {
    markdown.value = '';
    renderedDiagrams.value = [];
    actionStatus.value = '';
  };

  const setDiagramWhiteBackground = (value: boolean) => {
    diagramWhiteBackground.value = value;
  };

  return {
    markdown,
    activeTab,
    renderedDiagrams,
    isRenderingResources,
    isDownloading,
    actionStatus,
    diagramWhiteBackground,
    conversion,
    hasDiagrams,
    isErrorStatus,
    setMarkdown,
    setActiveTab,
    copyTextile,
    downloadZip,
    clearAll,
    setDiagramWhiteBackground,
  };
};
