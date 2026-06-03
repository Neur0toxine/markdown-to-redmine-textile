<script setup lang="ts">
import type { RenderedDiagram } from '../utils/mermaidRenderer';

defineProps<{
  hasDiagrams: boolean;
  isRendering: boolean;
  errorText: string;
  diagrams: RenderedDiagram[];
}>();

defineEmits<{
  preview: [diagram: RenderedDiagram];
}>();
</script>

<template>
  <section class="resources-area" aria-label="Diagram resources">
    <p v-if="!hasDiagrams" class="empty-state">PNG-диаграмм нет</p>
    <p v-else-if="isRendering && diagrams.length === 0" class="empty-state">Рендеринг диаграмм...</p>
    <p v-else-if="errorText" class="error-output compact">{{ errorText }}</p>
    <ul v-if="diagrams.length > 0" class="resource-list" :aria-busy="isRendering">
      <li v-for="diagram in diagrams" :key="diagram.filename" class="resource-item" @click="$emit('preview', diagram)">
        <img :src="diagram.svgUrl" :alt="diagram.filename" />
        <span>{{ diagram.filename }}</span>
      </li>
    </ul>
  </section>
</template>
