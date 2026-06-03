import JSZip from 'jszip';
import type { ConversionResult } from './converter';
import type { RenderedDiagram } from './mermaidRenderer';

export const buildTextileZip = async (conversion: ConversionResult, diagrams: RenderedDiagram[]) => {
  const zip = new JSZip();

  zip.file('text.textile', conversion.textile);
  diagrams.forEach((diagram) => {
    zip.file(diagram.filename, diagram.pngBlob);
  });

  return zip.generateAsync({ type: 'blob' });
};

export const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};
