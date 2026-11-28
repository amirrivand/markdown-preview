/**
 * Cross-browser preview → PDF/print.
 * Prints a standalone iframe clone of the preview so app shell
 * (flex, 100vh, overflow:hidden) cannot clip or break pagination.
 */

const PRINT_CSS = `
  @page { margin: 14mm; size: auto; }
  html, body {
    margin: 0;
    padding: 0;
    background: #fff !important;
    color: #1A1F1C;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  body {
    font-family: Vazirmatn, system-ui, sans-serif;
    line-height: 1.55;
  }
  .print-doc {
    max-width: none;
    margin: 0;
    padding: 0;
  }
  .print-doc .empty { display: none !important; }
  .print-doc .badge,
  .print-doc .cpy,
  .print-doc .inline-edit,
  .print-doc .blk-edit {
    display: none !important;
  }
  .print-doc .blk {
    background: transparent !important;
    box-shadow: none !important;
    outline: none !important;
  }
  .print-doc .blk[data-hi] {
    background: transparent !important;
  }
  .print-doc .cb,
  .print-doc .cite,
  .print-doc .flow,
  .print-doc .fm,
  .print-doc .alert,
  .print-doc .tw,
  .print-doc .mt,
  .print-doc .det,
  .print-doc .bq {
    break-inside: avoid;
    page-break-inside: avoid;
  }
  .print-doc img,
  .print-doc svg {
    max-width: 100% !important;
    height: auto !important;
    break-inside: avoid;
    page-break-inside: avoid;
  }
  .print-doc a {
    color: inherit;
    text-decoration: underline;
  }
  .print-doc .cbb,
  .print-doc .cb,
  .print-doc .cite {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
`;

function collectHeadAssets(): string {
  const parts: string[] = [];
  document.querySelectorAll('link[rel="stylesheet"]').forEach((node) => {
    const href = (node as HTMLLinkElement).href;
    if (href) parts.push(`<link rel="stylesheet" href="${href.replace(/"/g, '&quot;')}">`);
  });
  document.querySelectorAll('style').forEach((node) => {
    parts.push(`<style>${node.textContent || ''}</style>`);
  });
  return parts.join('\n');
}

function waitForDocumentReady(doc: Document): Promise<void> {
  const imgs = Array.from(doc.images);
  const imgWait = Promise.all(
    imgs.map(
      (img) =>
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
  return Promise.all([imgWait, fontWait]).then(() => {
    return new Promise((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });
  });
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

/**
 * Print only the rendered Markdown preview as a clean document.
 */
export async function exportPreviewPdf(title = 'Locale MarkDown'): Promise<void> {
  const source =
    (document.getElementById('md-print-root') as HTMLElement | null) ||
    (document.querySelector('article.md') as HTMLElement | null);

  if (!source || !source.innerHTML.trim()) {
    fallbackWindowPrint();
    return;
  }

  const clone = source.cloneNode(true) as HTMLElement;
  clone.id = 'md-print-root';
  clone.classList.add('print-doc');
  clone.removeAttribute('data-editing');
  clone.querySelectorAll('.badge, .cpy, textarea, .blk-edit').forEach((el) => el.remove());

  const iframe = document.createElement('iframe');
  iframe.setAttribute('title', 'Print preview');
  iframe.setAttribute('aria-hidden', 'true');
  Object.assign(iframe.style, {
    position: 'fixed',
    right: '0',
    bottom: '0',
    width: '0',
    height: '0',
    border: '0',
    opacity: '0',
    pointerEvents: 'none',
  } as CSSStyleDeclaration);
  document.body.appendChild(iframe);

  const win = iframe.contentWindow;
  const doc = iframe.contentDocument;
  if (!win || !doc) {
    iframe.remove();
    fallbackWindowPrint();
    return;
  }

  const html = `<!DOCTYPE html>
<html lang="${document.documentElement.lang || 'en'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${String(title).replace(/</g, '&lt;')}</title>
${collectHeadAssets()}
<style>${PRINT_CSS}</style>
</head>
<body>
${clone.outerHTML}
</body>
</html>`;

  doc.open();
  doc.write(html);
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
    // Give layout engines (esp. Safari/WebKit) a beat after fonts/images.
    await new Promise((r) => setTimeout(r, 50));

    const onAfter = () => {
      win.removeEventListener('afterprint', onAfter);
      cleanup();
    };
    win.addEventListener('afterprint', onAfter);
    // Browsers that never fire afterprint (some mobile): timed cleanup.
    window.setTimeout(cleanup, 120_000);

    win.focus();
    win.print();
  } catch {
    cleanup();
    fallbackWindowPrint();
  }
}
