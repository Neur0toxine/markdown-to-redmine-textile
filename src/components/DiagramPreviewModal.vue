<script setup lang="ts">
import { nextTick, ref, watch } from 'vue';
import type { RenderedDiagram } from '../utils/mermaidRenderer';

const props = defineProps<{
  diagram: RenderedDiagram | null;
}>();

defineEmits<{
  close: [];
}>();

const bodyRef = ref<HTMLElement | null>(null);
const scale = ref(1);
const offsetX = ref(0);
const offsetY = ref(0);
const isDragging = ref(false);
const dragStart = ref({ pointerX: 0, pointerY: 0, offsetX: 0, offsetY: 0 });

const fitToView = async () => {
  await nextTick();

  if (!props.diagram || !bodyRef.value) {
    return;
  }

  const { clientWidth, clientHeight } = bodyRef.value;
  const fitScale = Math.min((clientWidth - 48) / props.diagram.width, (clientHeight - 48) / props.diagram.height, 1);
  scale.value = Math.max(fitScale * 0.82, 0.12);
  offsetX.value = (clientWidth - props.diagram.width * scale.value) / 2;
  offsetY.value = (clientHeight - props.diagram.height * scale.value) / 2;
};

watch(
  () => props.diagram,
  () => {
    void fitToView();
  },
);

const handleWheel = (event: WheelEvent) => {
  if (!bodyRef.value) {
    return;
  }

  event.preventDefault();
  const rect = bodyRef.value.getBoundingClientRect();
  const pointerX = event.clientX - rect.left;
  const pointerY = event.clientY - rect.top;
  const previousScale = scale.value;
  const zoomFactor = event.deltaY > 0 ? 0.88 : 1.14;
  const nextScale = Math.min(Math.max(previousScale * zoomFactor, 0.08), 4);

  offsetX.value = pointerX - ((pointerX - offsetX.value) / previousScale) * nextScale;
  offsetY.value = pointerY - ((pointerY - offsetY.value) / previousScale) * nextScale;
  scale.value = nextScale;
};

const startDrag = (event: MouseEvent) => {
  isDragging.value = true;
  dragStart.value = {
    pointerX: event.clientX,
    pointerY: event.clientY,
    offsetX: offsetX.value,
    offsetY: offsetY.value,
  };
};

const drag = (event: MouseEvent) => {
  if (!isDragging.value) {
    return;
  }

  offsetX.value = dragStart.value.offsetX + event.clientX - dragStart.value.pointerX;
  offsetY.value = dragStart.value.offsetY + event.clientY - dragStart.value.pointerY;
};

const stopDrag = () => {
  isDragging.value = false;
};
</script>

<template>
  <div v-if="diagram" class="preview-modal" role="dialog" aria-modal="true" :aria-label="diagram.filename" @click="$emit('close')">
    <div class="preview-dialog" @click.stop>
      <header class="preview-header">
        <span>{{ diagram.filename }}</span>
        <button type="button" aria-label="Закрыть превью" @click="$emit('close')">×</button>
      </header>
      <div
        ref="bodyRef"
        class="preview-body"
        :class="{ dragging: isDragging }"
        @wheel="handleWheel"
        @mousedown="startDrag"
        @mousemove="drag"
        @mouseup="stopDrag"
        @mouseleave="stopDrag"
      >
        <img
          :src="diagram.svgUrl"
          :alt="diagram.filename"
          :width="diagram.width"
          :height="diagram.height"
          :style="{ transform: `translate(${offsetX}px, ${offsetY}px) scale(${scale})` }"
          draggable="false"
        />
      </div>
    </div>
  </div>
</template>
