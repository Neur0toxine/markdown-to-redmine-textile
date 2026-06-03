import { marked } from 'marked';

export interface DiagramResource {
  id: number;
  filename: string;
  source: string;
}

export interface ConversionResult {
  textile: string;
  diagrams: DiagramResource[];
  error: string | null;
}

const escapeHtml = (value = '') =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const renderDiagramImage = (filename: string) => `!{width:640px}${filename}!`;

const escapeCollapseTitle = (value: string) => value.replace(/,/g, '\\,');

const getLanguage = (codeNode: Element | null) => {
  const classValue = codeNode?.getAttribute('class') ?? '';
  const langClass = classValue.split(/\s+/).find((cls) => /^(language-|lang-)/i.test(cls));
  return langClass?.replace(/^language-/i, '').replace(/^lang-/i, '').toLowerCase() ?? '';
};

export const convertMarkdownToTextile = (markdown: string): ConversionResult => {
  try {
    const html = marked.parse(markdown, { gfm: true, breaks: false, async: false });
    const parser = new DOMParser();
    const doc = parser.parseFromString(String(html), 'text/html');
    const diagrams: DiagramResource[] = [];

    const renderInline = (node: ChildNode): string => {
      if (node.nodeType === Node.TEXT_NODE) {
        return node.nodeValue ?? '';
      }

      if (node.nodeType !== Node.ELEMENT_NODE) {
        return '';
      }

      const element = node as Element;
      const tag = element.tagName.toLowerCase();
      const inner = Array.from(element.childNodes).map(renderInline).join('');

      switch (tag) {
        case 'strong':
        case 'b':
          return `*${inner}*`;
        case 'em':
        case 'i':
          return `_${inner}_`;
        case 'code':
          return `@${inner}@`;
        case 'a': {
          const href = element.getAttribute('href') ?? '';
          return href ? `"${inner}":${href}` : inner;
        }
        case 'img': {
          const src = element.getAttribute('src') ?? '';
          const title = element.getAttribute('title') || element.getAttribute('alt') || '';
          return title ? `!${src}(${title})!` : `!${src}!`;
        }
        case 'sub':
          return `~${inner}~`;
        case 'sup':
          return `^${inner}^`;
        case 'del':
          return `-${inner}-`;
        case 'ins':
          return `+${inner}+`;
        case 'br':
          return '\n';
        default:
          return inner;
      }
    };

    const renderList = (listNode: Element, depth: number): string => {
      const ordered = listNode.tagName.toLowerCase() === 'ol';
      const marker = (ordered ? '#' : '*').repeat(depth);
      const lines: string[] = [];

      Array.from(listNode.children).forEach((li) => {
        if (li.tagName.toLowerCase() !== 'li') {
          return;
        }

        const inlineNodes: ChildNode[] = [];
        const nestedLists: Element[] = [];

        Array.from(li.childNodes).forEach((child) => {
          const isNestedList =
            child.nodeType === Node.ELEMENT_NODE &&
            ['ul', 'ol'].includes((child as Element).tagName.toLowerCase());

          if (isNestedList) {
            nestedLists.push(child as Element);
          } else {
            inlineNodes.push(child);
          }
        });

        const inlineText = inlineNodes.map(renderInline).join('').trim();
        if (inlineText) {
          lines.push(`${marker} ${inlineText}`);
        }

        nestedLists.forEach((nestedList) => {
          const nestedText = renderList(nestedList, depth + 1).trimEnd();
          if (nestedText) {
            lines.push(nestedText);
          }
        });
      });

      return `${lines.join('\n')}\n`;
    };

    const renderBlock = (node: ChildNode): string => {
      if (node.nodeType === Node.TEXT_NODE) {
        return node.nodeValue?.trim() ? node.nodeValue : '';
      }

      if (node.nodeType !== Node.ELEMENT_NODE) {
        return '';
      }

      const element = node as Element;
      const tag = element.tagName.toLowerCase();

      if (tag === 'ul' || tag === 'ol') {
        return `${renderList(element, 1)}\n`;
      }

      switch (tag) {
        case 'h1':
        case 'h2':
        case 'h3':
        case 'h4':
        case 'h5':
        case 'h6':
          return `h${tag[1]}. ${renderInline(element)}\n\n`;
        case 'p':
          return `${renderInline(element)}\n\n`;
        case 'blockquote':
          return `bq. ${renderInline(element)}\n\n`;
        case 'details': {
          const summary = Array.from(element.children).find((child) => child.tagName.toLowerCase() === 'summary');
          const title = escapeCollapseTitle(summary ? renderInline(summary).trim() : '');
          const content = Array.from(element.childNodes)
            .filter((child) => child !== summary)
            .map((child) => {
              if (child.nodeType === Node.TEXT_NODE) {
                return child.nodeValue?.trim() ?? '';
              }

              return renderBlock(child).trim();
            })
            .filter(Boolean)
            .join('\n\n');

          return `{{collapse(${title})\n${content}\n}}\n\n`;
        }
        case 'hr':
          return '----\n\n';
        case 'pre': {
          const codeNode = element.querySelector('code');
          const lang = getLanguage(codeNode);
          const text = codeNode?.textContent ?? element.textContent ?? '';

          if (lang === 'mermaid') {
            const id = diagrams.length + 1;
            const filename = `diagram-${id}.png`;
            diagrams.push({ id, filename, source: text.trim() });
            return `${renderDiagramImage(filename)}\n\n`;
          }

          const classAttr = lang ? ` class="${lang}"` : '';
          const escaped = escapeHtml(text.trim()).replace(/\t/g, '  ');
          return `<pre><code${classAttr}>\n${escaped}\n</code></pre>\n\n`;
        }
        case 'table': {
          let out = '';
          Array.from((element as HTMLTableElement).rows).forEach((tr) => {
            let row = '';
            Array.from(tr.cells).forEach((td) => {
              const isHead = td.tagName.toLowerCase() === 'th';
              const content = renderInline(td).trim() || ' ';
              row += `|${isHead ? '_. ' : ''}${content} `;
            });
            out += `${row}|\n`;
          });
          return `${out}\n`;
        }
        default:
          return Array.from(element.childNodes).map(renderBlock).join('');
      }
    };

    const textile = `${Array.from(doc.body.childNodes).map(renderBlock).join('').trim()}\n`;

    return {
      textile,
      diagrams,
      error: null,
    };
  } catch (error) {
    return {
      textile: '',
      diagrams: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
};
