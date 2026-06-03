import { expect, test } from '@playwright/test';
import JSZip from 'jszip';
import { PNG } from 'pngjs';

const nestedListMarkdown = [
  '- поддержать стратегии `personal` и `similar`;',
  '- получать подборку напрямую из SmartRec public API:',
  '  - `/v1/pub/recommendations/personal`;',
  '  - `/v1/pub/recommendations/similar`;',
  '- передавать в SmartRec `X-System-Api-Key` из настройки backend Консультанта;',
].join('\n');

test('converts nested lists and copies Textile', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/');

  await page.getByLabel('Markdown input').fill(nestedListMarkdown);

  const output = page.getByLabel('Textile output');
  await expect(output).toHaveValue(
    [
      '* поддержать стратегии @personal@ и @similar@;',
      '* получать подборку напрямую из SmartRec public API:',
      '** @/v1/pub/recommendations/personal@;',
      '** @/v1/pub/recommendations/similar@;',
      '* передавать в SmartRec @X-System-Api-Key@ из настройки backend Консультанта;',
      '',
    ].join('\n'),
  );

  await page.getByRole('button', { name: 'Скопировать' }).click();

  const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
  expect(clipboardText).toContain('** @/v1/pub/recommendations/personal@;');
});

test('synchronizes markdown and textile text scroll positions', async ({ page }) => {
  await page.goto('/');
  const lines = Array.from({ length: 120 }, (_, index) => `- line ${index + 1}`);
  await page.getByLabel('Markdown input').fill(lines.join('\n'));

  const markdownInput = page.getByLabel('Markdown input');
  const textileOutput = page.getByLabel('Textile output');

  await markdownInput.evaluate((element) => {
    const textarea = element as HTMLTextAreaElement;
    textarea.scrollTop = textarea.scrollHeight;
    textarea.dispatchEvent(new Event('scroll', { bubbles: true }));
  });

  await expect
    .poll(async () =>
      textileOutput.evaluate((element) => {
        const textarea = element as HTMLTextAreaElement;
        const maxScroll = textarea.scrollHeight - textarea.clientHeight;
        return maxScroll > 0 ? textarea.scrollTop / maxScroll : 0;
      }),
    )
    .toBeGreaterThan(0.85);
});

test('renders Mermaid resources lazily and downloads zip', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Markdown input').fill(
    [
      'Диаграмма:',
      '',
      '```mermaid',
      'sequenceDiagram',
      '  participant A as Клиент',
      '  participant B as Backend',
      '  A->>B: ping',
      '  B-->>A: pong',
      '```',
    ].join('\n'),
  );

  await expect(page.getByLabel('Textile output')).toHaveValue(/!\{width:640px\}diagram-1\.png!/);
  await page.getByRole('button', { name: 'Ресурсы' }).click();
  await expect(page.getByText('diagram-1.png')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole('dialog', { name: 'diagram-1.png' })).toHaveCount(0);

  const resourceImageSource = await page.getByAltText('diagram-1.png').evaluate((image) => (image as HTMLImageElement).src);
  const resourceSvgText = await page.evaluate(async (source) => {
    const response = await fetch(source);
    return response.text();
  }, resourceImageSource);
  expect(resourceSvgText).toContain('<svg');

  const hasPageScroll = await page.evaluate(() => document.documentElement.scrollHeight > document.documentElement.clientHeight);
  expect(hasPageScroll).toBe(false);

  await page.getByAltText('diagram-1.png').click();
  await expect(page.getByRole('dialog', { name: 'diagram-1.png' })).toBeVisible();
  const modalImage = page.getByRole('dialog', { name: 'diagram-1.png' }).getByAltText('diagram-1.png');
  const svgText = await modalImage.evaluate(async (image) => {
    const response = await fetch((image as HTMLImageElement).src);
    return response.text();
  });
  expect(svgText).not.toContain('fill:#1f2020');

  const initialTransform = await modalImage.evaluate((image) => (image as HTMLElement).style.transform);
  await modalImage.evaluate((image) => {
    image.dispatchEvent(new WheelEvent('wheel', { bubbles: true, deltaY: -200, clientX: 300, clientY: 300 }));
  });
  await expect.poll(() => modalImage.evaluate((image) => (image as HTMLElement).style.transform)).not.toBe(initialTransform);

  await page.getByRole('button', { name: 'Закрыть превью' }).click();
  await expect(page.getByRole('dialog', { name: 'diagram-1.png' })).toHaveCount(0);

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Скачать' }).click();
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  if (!stream) {
    throw new Error('Download stream is unavailable.');
  }

  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const zip = await JSZip.loadAsync(Buffer.concat(chunks));
  expect(zip.file('text.textile')).not.toBeNull();
  expect(zip.file('diagram-1.png')).not.toBeNull();

  const textile = await zip.file('text.textile')?.async('string');
  expect(textile).toContain('!{width:640px}diagram-1.png!');

  const png = await zip.file('diagram-1.png')?.async('nodebuffer');
  expect(png?.byteLength).toBeGreaterThan(1000);
});

test('downloads diagram png with transparent background when white background is disabled', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Markdown input').fill(
    ['```mermaid', 'flowchart TD', '  A[Start] --> B[Finish]', '```'].join('\n'),
  );

  await expect(page.getByLabel('Белый фон диаграмм')).toBeChecked();
  await page.getByLabel('Белый фон диаграмм').uncheck();

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Скачать' }).click();
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  if (!stream) {
    throw new Error('Download stream is unavailable.');
  }

  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const zip = await JSZip.loadAsync(Buffer.concat(chunks));
  const pngBuffer = await zip.file('diagram-1.png')?.async('nodebuffer');
  if (!pngBuffer) {
    throw new Error('diagram-1.png was not found in zip.');
  }

  const png = PNG.sync.read(pngBuffer);
  const hasTransparentPixel = png.data.some((value, index) => index % 4 === 3 && value < 255);
  expect(hasTransparentPixel).toBe(true);
});

test('keeps resources inside their own scroll container', async ({ page }) => {
  await page.goto('/');

  const blocks = Array.from({ length: 8 }, (_, index) =>
    ['```mermaid', 'flowchart TD', `  A${index}[Start ${index}] --> B${index}[Finish ${index}]`, '```'].join('\n'),
  );
  await page.getByLabel('Markdown input').fill(blocks.join('\n\n'));
  await page.getByRole('button', { name: 'Ресурсы' }).click();
  await expect(page.getByText('diagram-8.png')).toBeVisible({ timeout: 15_000 });

  const metrics = await page.evaluate(() => {
    const resources = document.querySelector('.resource-list');
    if (!(resources instanceof HTMLElement)) {
      throw new Error('Resource list was not rendered.');
    }

    return {
      pageHasScroll: document.documentElement.scrollHeight > document.documentElement.clientHeight,
      resourcesHasScroll: resources.scrollHeight > resources.clientHeight,
    };
  });

  expect(metrics.pageHasScroll).toBe(false);
  expect(metrics.resourcesHasScroll).toBe(true);
});

test('does not append Mermaid parser errors to the page DOM', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Markdown input').fill(['```mermaid', 'flowchart TD', '  A -->', '```'].join('\n'));
  await page.getByRole('button', { name: 'Ресурсы' }).click();

  await expect(page.getByText('Syntax error in text')).toHaveCount(0);
  await expect(page.locator('.resources-area')).toContainText(/error|ошибка|parse|syntax/i);
});

test('renders stateDiagram-v2 resource previews with SVG text', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Markdown input').fill(
    [
      '```mermaid',
      'stateDiagram-v2',
      '  [*] --> Pending',
      '  Pending --> Sent: dispatch',
      '  Sent --> [*]',
      '```',
    ].join('\n'),
  );

  await page.getByRole('button', { name: 'Ресурсы' }).click();
  const image = page.getByAltText('diagram-1.png');
  await expect(image).toBeVisible({ timeout: 15_000 });

  const svg = await image.evaluate(async (element) => {
    const response = await fetch((element as HTMLImageElement).src);
    return response.text();
  });

  expect(svg).toContain('Pending');
  expect(svg).toContain('Sent');
});
