/**
 * Cross-browser preview → PDF/print.
 *
 * Uses a full A4-width off-screen iframe with a self-contained print
 * stylesheet. Importing the live app CSS (100vh / flex shells) into a
 * 0×0 iframe made Chromium scale the whole page to a tiny strip.
 */

const PRINT_CSS = `
  @page { size: A4; margin: 14mm; }
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    width: 100%;
    background: #fff !important;
    color: #1a1f1c;
    font-family: Vazirmatn, "Segoe UI", Tahoma, sans-serif;
    font-size: 11pt;
    line-height: 1.55;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  .print-doc {
    width: 100%;
    max-width: 100%;
    margin: 0;
    padding: 0;
    overflow: visible !important;
  }
  .print-doc .empty,
  .print-doc .badge,
  .print-doc .cpy,
  .print-doc .inline-edit,
  .print-doc .blk-edit,
  .print-doc .blk-edit-host textarea,
  .print-doc button {
    display: none !important;
  }
  .print-doc .blk {
    background: transparent !important;
    box-shadow: none !important;
    outline: none !important;
    margin: 0 0 0.85em;
    position: static !important;
  }
  .print-doc h1 {
    font-size: 1.7em;
    font-weight: 800;
    line-height: 1.3;
    margin: 0.15em 0 0.5em;
    color: #134e4a;
  }
  .print-doc h2 {
    font-size: 1.35em;
    font-weight: 800;
    margin: 1.2em 0 0.4em;
    padding-bottom: 0.25em;
    border-bottom: 1px solid #d5cfc3;
    color: #1a3d39;
  }
  .print-doc h3 {
    font-size: 1.15em;
    font-weight: 700;
    margin: 1em 0 0.35em;
  }
  .print-doc h4 {
    font-size: 1.05em;
    font-weight: 700;
    margin: 0.9em 0 0.3em;
  }
  .print-doc p { margin: 0 0 0.85em; }
  .print-doc .wrap { margin: 0 0 0.9em; }
  .print-doc .ls { list-style: none; margin: 0 0 0.9em; padding: 0; }
  .print-doc .li {
    display: flex;
    gap: 0.55em;
    align-items: baseline;
    margin: 0.1em 0;
  }
  .print-doc .mk {
    flex-shrink: 0;
    min-width: 1.2em;
    color: #6b726b;
    font-weight: 700;
    text-align: center;
  }
  .print-doc .cbx {
    flex-shrink: 0;
    width: 0.95em;
    height: 0.95em;
    border: 1.4px solid #8a938a;
    border-radius: 3px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  .print-doc .cbx[data-done="true"] {
    background: #0f766e;
    border-color: #0f766e;
    color: #fff;
  }
  .print-doc .lt[data-done="true"] {
    color: #6b726b;
    text-decoration: line-through;
  }
  .print-doc .bq {
    margin: 0 0 0.9em;
    padding: 0.45em 0.95em;
    border-inline-start: 3px solid #0f766e;
    background: #eef2f0;
  }
  .print-doc .bq p { margin: 0.25em 0; }
  .print-doc .alert {
    margin: 0 0 1em;
    padding: 10px 12px;
    border: 1px solid;
    border-radius: 10px;
    border-inline-start-width: 4px;
    break-inside: avoid;
    page-break-inside: avoid;
  }
  .print-doc .alert-h {
    font-weight: 700;
    font-size: 0.85em;
    text-transform: uppercase;
    margin: 0 0 0.4em;
  }
  .print-doc .alert[data-kind="note"] { background: #eef6ff; border-color: #b6d4fe; color: #0b3a6e; }
  .print-doc .alert[data-kind="tip"] { background: #eaf8f0; border-color: #a7e3c0; color: #0f5132; }
  .print-doc .alert[data-kind="important"] { background: #f3eeff; border-color: #d0bcff; color: #432874; }
  .print-doc .alert[data-kind="warning"] { background: #fff8e8; border-color: #f0d48a; color: #6b4e00; }
  .print-doc .alert[data-kind="caution"] { background: #fff0ee; border-color: #f0b4ac; color: #8a2e22; }
  .print-doc .ic {
    font-family: "IBM Plex Mono", ui-monospace, monospace;
    font-size: 0.9em;
    background: #eef1ee;
    padding: 0.1em 0.35em;
    border-radius: 4px;
    direction: ltr;
    unicode-bidi: isolate;
  }
  .print-doc .kbd {
    font-family: "IBM Plex Mono", ui-monospace, monospace;
    font-size: 0.82em;
    border: 1px solid #c9c2b4;
    border-bottom-width: 2px;
    border-radius: 4px;
    padding: 0.05em 0.35em;
    background: #fff;
    direction: ltr;
    unicode-bidi: isolate;
  }
  .print-doc .bdi { unicode-bidi: isolate; }
  .print-doc .cb,
  .print-doc .cite,
  .print-doc .fm,
  .print-doc .flow {
    margin: 0 0 1em;
    border: 1px solid #d5cfc3;
    border-radius: 10px;
    overflow: hidden;
    background: #fff;
    direction: ltr;
    unicode-bidi: isolate;
    text-align: left;
    break-inside: avoid;
    page-break-inside: avoid;
  }
  .print-doc .cbh,
  .print-doc .citeh,
  .print-doc .fmh,
  .print-doc .flowh {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 10px;
    border-bottom: 1px solid #d5cfc3;
    background: #e8f4f1;
    font: 600 10pt/1.2 "IBM Plex Mono", ui-monospace, monospace;
    color: #134e4a;
  }
  .print-doc .cbb { overflow: visible; }
  .print-doc .cbi { padding: 8px 0; }
  .print-doc .cl {
    display: grid;
    grid-template-columns: 3em 1fr;
    gap: 0.6em;
    padding: 0 10px;
    font: 9.5pt/1.55 "IBM Plex Mono", ui-monospace, monospace;
    white-space: pre-wrap;
    word-break: break-word;
  }
  .print-doc .cn {
    color: #8a938a;
    text-align: right;
    user-select: none;
  }
  .print-doc .ct { min-width: 0; }
  .print-doc .fmb {
    margin: 0;
    padding: 10px 12px;
    font: 9.5pt/1.55 "IBM Plex Mono", ui-monospace, monospace;
    white-space: pre-wrap;
  }
  .print-doc .flowb { padding: 10px; }
  .print-doc .flowb img,
  .print-doc .flowb svg,
  .print-doc img.im {
    max-width: 100% !important;
    height: auto !important;
  }
  .print-doc .mt {
    margin: 0 0 1em;
    padding: 10px 12px;
    border: 1px solid #d5cfc3;
    border-radius: 10px;
    direction: ltr;
    unicode-bidi: isolate;
    break-inside: avoid;
  }
  .print-doc .mlab {
    display: block;
    font: 700 9pt/1 "IBM Plex Mono", ui-monospace, monospace;
    color: #6b726b;
    margin-bottom: 0.4em;
  }
  .print-doc .tw { margin: 0 0 1em; overflow: visible; }
  .print-doc .tg {
    display: grid;
    width: 100%;
    border: 1px solid #d5cfc3;
    border-radius: 8px;
    overflow: hidden;
  }
  .print-doc .th,
  .print-doc .td {
    padding: 6px 8px;
    border-bottom: 1px solid #e4e0d8;
    font-size: 0.95em;
  }
  .print-doc .th {
    background: #e8f4f1;
    font-weight: 700;
  }
  .print-doc .hr {
    border: 0;
    border-top: 1px solid #d5cfc3;
    margin: 1.2em 0;
  }
  .print-doc .det {
    margin: 0 0 0.9em;
    border: 1px solid #d5cfc3;
    border-radius: 8px;
    padding: 0.4em 0.8em;
  }
  .print-doc .det > summary { font-weight: 700; cursor: default; }
  .print-doc .fn {
    margin: 1.5em 0 0;
    padding-top: 0.8em;
    border-top: 1px solid #d5cfc3;
  }
  .print-doc .fn-title {
    font-weight: 700;
    font-size: 0.85em;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    margin-bottom: 0.5em;
  }
  .print-doc .fn-item { margin: 0.35em 0; }
  .print-doc .fn-mark { font-weight: 700; margin-inline-end: 0.35em; }
  .print-doc .fnref { color: #0f766e; }
  .print-doc a { color: #0f766e; }
  /* Keep syntax colors if highlight.js classes are present */
  .print-doc .hljs-keyword,
  .print-doc .hljs-selector-tag,
  .print-doc .hljs-built_in { color: #7dd3c0; }
  .print-doc .hljs-string,
  .print-doc .hljs-attr { color: #f0c674; }
  .print-doc .hljs-number,
  .print-doc .hljs-literal { color: #d19a66; }
  .print-doc .hljs-comment { color: #7e8f86; font-style: italic; }
  .print-doc .cb .cbb,
  .print-doc .cite .cbb {
    background: #121816;
    color: #e7ede9;
  }
  .print-doc .cb .cn,
  .print-doc .cite .cn { color: #5f736a; }
`;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | void> {
  return new Promise((resolve) => {
    const t = window.setTimeout(() => resolve(undefined), ms);
    p.then(
      (v) => {
        window.clearTimeout(t);
        resolve(v);
      },
      () => {
        window.clearTimeout(t);
        resolve(undefined);
      },
    );
  });
}

function waitForDocumentReady(doc: Document): Promise<void> {
  const imgs = Array.from(doc.images);
  const imgWait = Promise.all(
    imgs.map((img) =>
      img.complete
        ? Promise.resolve()
        : new Promise<void>((resolve) => {
            img.addEventListener('load', () => resolve(), { once: true });
            img.addEventListener('error', () => resolve(), { once: true });
          }),
    ),
  );
  const fontWait =
    doc.fonts && typeof doc.fonts.ready !== 'undefined'
      ? doc.fonts.ready.then(() => undefined).catch(() => undefined)
      : Promise.resolve();
  // Never block print on slow/blocked webfonts (common cause of "nothing happens").
  return withTimeout(Promise.all([imgWait, fontWait]), 1800).then(
    () =>
      new Promise((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      }),
  );
}

function fallbackWindowPrint() {
  const root = document.documentElement;
  root.classList.add('is-printing');
  const cleanup = () => {
    root.classList.remove('is-printing');
    window.removeEventListener('afterprint', cleanup);
  };
  window.addEventListener('afterprint', cleanup);
  window.setTimeout(cleanup, 60_000);
  window.print();
}

function appFontStylesheetHrefs(): string[] {
  return (Array.from(document.querySelectorAll('link[rel="stylesheet"]')) as HTMLLinkElement[])
    .map((l) => l.href)
    .filter((href) => /fonts\.googleapis|Vazirmatn|IBM\+Plex|katex/i.test(href));
}

function buildPrintHtml(title: string, bodyHtml: string): string {
  const fontLinks = appFontStylesheetHrefs()
    .map((href) => `<link rel="stylesheet" href="${href.replace(/"/g, '&quot;')}">`)
    .join('\n');
  const escTitle = String(title).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  const lang = document.documentElement.lang || 'fa';
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=794">
<title>${escTitle}</title>
${fontLinks}
<style>${PRINT_CSS}</style>
</head>
<body>${bodyHtml}</body>
</html>`;
}

/**
 * Print only the rendered Markdown preview as a clean A4 document.
 */
export async function exportPreviewPdf(title = 'Locale MarkDown'): Promise<void> {
  const source =
    (document.getElementById('md-print-root') as HTMLElement | null) ||
    (document.querySelector('article.md') as HTMLElement | null);

  if (!source || !source.innerHTML.trim() || source.querySelector('.empty')) {
    fallbackWindowPrint();
    return;
  }

  const clone = source.cloneNode(true) as HTMLElement;
  clone.id = 'md-print-root';
  clone.className = 'md print-doc';
  clone.removeAttribute('data-editing');
  clone.removeAttribute('data-guide');
  clone.querySelectorAll('.badge, .cpy, textarea, .blk-edit, button').forEach((el) => el.remove());
  // Open closed details so print includes their body.
  clone.querySelectorAll('details').forEach((d) => {
    (d as HTMLDetailsElement).open = true;
  });

  const iframe = document.createElement('iframe');
  iframe.setAttribute('title', 'Print preview');
  iframe.setAttribute('aria-hidden', 'true');
  // Must be a real page width — 0×0 iframes make Chromium shrink content to a speck.
  const pageWidthPx = 794; // ~A4 at 96dpi
  Object.assign(iframe.style, {
    position: 'fixed',
    left: `-${pageWidthPx + 40}px`,
    top: '0',
    width: `${pageWidthPx}px`,
    height: '1123px',
    border: '0',
    margin: '0',
    padding: '0',
    opacity: '0',
    pointerEvents: 'none',
    background: '#fff',
  } as CSSStyleDeclaration);
  document.body.appendChild(iframe);

  const win = iframe.contentWindow;
  const doc = iframe.contentDocument;
  if (!win || !doc) {
    iframe.remove();
    fallbackWindowPrint();
    return;
  }

  doc.open();
  doc.write(buildPrintHtml(title, clone.outerHTML));
  doc.close();

  const cleanup = () => {
    try {
      iframe.remove();
    } catch {
      /* already gone */
    }
  };

  try {
    await waitForDocumentReady(doc);
    // Expand iframe height to full content so pagination uses real layout height.
    const body = doc.body;
    const contentH = Math.max(body.scrollHeight, body.offsetHeight, 1123);
    iframe.style.height = `${contentH + 32}px`;
    await new Promise((r) => setTimeout(r, 80));

    const onAfter = () => {
      win.removeEventListener('afterprint', onAfter);
      cleanup();
    };
    win.addEventListener('afterprint', onAfter);
    window.setTimeout(cleanup, 120_000);

    win.focus();
    win.print();
  } catch {
    cleanup();
    fallbackWindowPrint();
  }
}
