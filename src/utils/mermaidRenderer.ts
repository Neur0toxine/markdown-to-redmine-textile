import type { DiagramResource } from './converter';

export interface RenderedDiagram extends DiagramResource {
  pngBlob: Blob;
  previewUrl: string;
  svg: string;
  svgUrl: string;
  width: number;
  height: number;
}

export interface RenderDiagramOptions {
  whiteBackground: boolean;
}

type CachedSvg = Pick<RenderedDiagram, 'svg' | 'svgUrl' | 'width' | 'height'>;
type CachedPng = Pick<RenderedDiagram, 'pngBlob' | 'previewUrl'>;

const EXPORT_SCALE = 2;
const svgCache = new Map<string, CachedSvg>();
const pngCache = new Map<string, CachedPng>();
let mermaidModulePromise: Promise<typeof import('mermaid').default> | null = null;

const loadMermaid = async () => {
  if (!mermaidModulePromise) {
    mermaidModulePromise = import('mermaid').then((module) => {
      module.default.initialize({
        startOnLoad: false,
        theme: 'base',
        themeVariables: {
          background: '#ffffff',
          primaryColor: '#ffffff',
          primaryTextColor: '#111111',
          primaryBorderColor: '#555555',
          lineColor: '#555555',
          secondaryColor: '#f7f7f7',
          tertiaryColor: '#ffffff',
          fontFamily: 'Arial, sans-serif',
        },
        securityLevel: 'strict',
      });

      return module.default;
    });
  }

  return mermaidModulePromise;
};

const getSvgSize = (svg: string) => {
  const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
  const svgElement = doc.documentElement;
  const viewBox = svgElement.getAttribute('viewBox')?.split(/\s+/).map(Number) ?? [];
  const widthValue = svgElement.getAttribute('width') ?? '';
  const heightValue = svgElement.getAttribute('height') ?? '';
  const widthAttribute = /%$/.test(widthValue) ? Number.NaN : Number.parseFloat(widthValue);
  const heightAttribute = /%$/.test(heightValue) ? Number.NaN : Number.parseFloat(heightValue);
  const width = Number.isFinite(viewBox[2]) ? viewBox[2] : widthAttribute;
  const height = Number.isFinite(viewBox[3]) ? viewBox[3] : heightAttribute;

  return {
    width: Math.max(Math.ceil(width || 900), 1),
    height: Math.max(Math.ceil(height || 600), 1),
  };
};

const blobFromCanvas = (canvas: HTMLCanvasElement) =>
  new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Не удалось создать PNG из Mermaid-диаграммы.'));
      }
    }, 'image/png');
  });

const createCanvas = (width: number, height: number, whiteBackground: boolean) => {
  const canvas = document.createElement('canvas');
  canvas.width = width * EXPORT_SCALE;
  canvas.height = height * EXPORT_SCALE;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Canvas недоступен для экспорта Mermaid PNG.');
  }

  if (whiteBackground) {
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
  }

  context.scale(EXPORT_SCALE, EXPORT_SCALE);
  return { canvas, context };
};

const rasterizeWithBrowser = async (svg: string, whiteBackground: boolean) => {
  const { width, height } = getSvgSize(svg);
  const { canvas, context } = createCanvas(width, height, whiteBackground);
  const image = new Image();
  image.decoding = 'async';

  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error('Не удалось загрузить SVG Mermaid для экспорта PNG.'));
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });

  context.drawImage(image, 0, 0, width, height);
  return blobFromCanvas(canvas);
};

const rasterizeWithCanvg = async (svg: string, whiteBackground: boolean) => {
  const { Canvg } = await import('canvg');
  const { width, height } = getSvgSize(svg);
  const { canvas, context } = createCanvas(width, height, whiteBackground);

  const renderer = Canvg.fromString(context, svg, {
    ignoreAnimation: true,
    ignoreMouse: true,
  });
  await renderer.render();
  return blobFromCanvas(canvas);
};

const svgToPngBlob = async (svg: string, options: RenderDiagramOptions): Promise<Blob> => {
  try {
    return await rasterizeWithBrowser(svg, options.whiteBackground);
  } catch {
    return rasterizeWithCanvg(svg, options.whiteBackground);
  }
};

const renderDiagramSvg = async (diagram: DiagramResource): Promise<CachedSvg> => {
  const cacheKey = diagram.source;
  const cached = svgCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const mermaid = await loadMermaid();
  const renderId = `mermaid-${diagram.id}-${crypto.randomUUID()}`;
  await mermaid.parse(diagram.source);
  const { svg } = await mermaid.render(renderId, diagram.source);
  const { width, height } = getSvgSize(svg);
  const rendered = {
    svg,
    svgUrl: URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })),
    width,
    height,
  };

  svgCache.set(cacheKey, rendered);
  return rendered;
};

export const renderDiagramPng = async (
  diagram: DiagramResource,
  options: RenderDiagramOptions = { whiteBackground: true },
): Promise<RenderedDiagram> => {
  const svgData = await renderDiagramSvg(diagram);
  const pngCacheKey = `${diagram.source}:${options.whiteBackground ? 'white' : 'transparent'}`;
  const cachedPng = pngCache.get(pngCacheKey);

  if (cachedPng) {
    return {
      ...diagram,
      ...svgData,
      ...cachedPng,
    };
  }

  const pngBlob = await svgToPngBlob(svgData.svg, options);
  const renderedPng = {
    pngBlob,
    previewUrl: URL.createObjectURL(pngBlob),
  };

  pngCache.set(pngCacheKey, renderedPng);
  return {
    ...diagram,
    ...svgData,
    ...renderedPng,
  };
};

export const renderDiagramPngs = (diagrams: DiagramResource[], options: RenderDiagramOptions = { whiteBackground: true }) =>
  Promise.all(diagrams.map((diagram) => renderDiagramPng(diagram, options)));
