import { describe, expect, it } from 'vitest';
import { convertMarkdownToTextile } from '../src/utils/converter';

describe('convertMarkdownToTextile', () => {
  it('converts inline code to Redmine Textile code spans', () => {
    const result = convertMarkdownToTextile('Use `personal` strategy.');

    expect(result.error).toBeNull();
    expect(result.textile).toBe('Use @personal@ strategy.\n');
  });

  it('keeps two-level unordered lists contiguous', () => {
    const markdown = [
      '- поддержать стратегии `personal` и `similar`;',
      '- получать подборку напрямую из SmartRec public API:',
      '  - `/v1/pub/recommendations/personal`;',
      '  - `/v1/pub/recommendations/similar`;',
      '- передавать в SmartRec `X-System-Api-Key` из настройки backend Консультанта;',
    ].join('\n');

    const result = convertMarkdownToTextile(markdown);

    expect(result.error).toBeNull();
    expect(result.textile).toBe(
      [
        '* поддержать стратегии @personal@ и @similar@;',
        '* получать подборку напрямую из SmartRec public API:',
        '** @/v1/pub/recommendations/personal@;',
        '** @/v1/pub/recommendations/similar@;',
        '* передавать в SmartRec @X-System-Api-Key@ из настройки backend Консультанта;',
        '',
      ].join('\n'),
    );
  });

  it('keeps ordered and unordered nested list markers', () => {
    const markdown = ['1. one', '2. two', '   1. inner', '   2. second inner', '- item', '  - child'].join('\n');

    const result = convertMarkdownToTextile(markdown);

    expect(result.textile).toBe(['# one', '# two', '## inner', '## second inner', '', '* item', '** child', ''].join('\n'));
  });

  it('replaces Mermaid fences with attachment image references', () => {
    const markdown = [
      'Before',
      '',
      '```mermaid',
      'flowchart TD',
      '  A-->B',
      '```',
      '',
      '```mermaid',
      'sequenceDiagram',
      '  A->>B: ping',
      '```',
    ].join('\n');

    const result = convertMarkdownToTextile(markdown);

    expect(result.textile).toContain('!{width:640px}diagram-1.png!');
    expect(result.textile).toContain('!{width:640px}diagram-2.png!');
    expect(result.diagrams).toEqual([
      { id: 1, filename: 'diagram-1.png', source: 'flowchart TD\n  A-->B' },
      { id: 2, filename: 'diagram-2.png', source: 'sequenceDiagram\n  A->>B: ping' },
    ]);
  });

  it('keeps non-Mermaid code fences as Redmine-compatible pre blocks', () => {
    const result = convertMarkdownToTextile(['```ts', 'const value = 1 < 2;', '```'].join('\n'));

    expect(result.textile).toBe('<pre><code class="ts">\nconst value = 1 &lt; 2;\n</code></pre>\n');
    expect(result.diagrams).toHaveLength(0);
  });

  it('converts GitHub details spoilers to Redmine collapse blocks', () => {
    const result = convertMarkdownToTextile(
      ['<details>', '  <summary>Reveal Spoiler</summary>', '  The hidden spoiler text goes here.', '</details>'].join('\n'),
    );

    expect(result.textile).toBe('{{collapse(Reveal Spoiler)\nThe hidden spoiler text goes here.\n}}\n');
  });

  it('escapes commas in Redmine collapse titles', () => {
    const result = convertMarkdownToTextile(
      ['<details>', '  <summary>One, two, three</summary>', '  Hidden text.', '</details>'].join('\n'),
    );

    expect(result.textile).toBe('{{collapse(One\\, two\\, three)\nHidden text.\n}}\n');
  });
});
