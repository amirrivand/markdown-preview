import { memo, useEffect, useState, type CSSProperties } from 'react';
import type Katex from 'katex';
import type { Seg } from '../lib/markdown';

type KatexApi = typeof Katex;

let katexPromise: Promise<KatexApi> | null = null;

/** Lazily load KaTeX (JS + CSS). Shared so concurrent math nodes share one fetch. */
function loadKatex(): Promise<KatexApi> {
  if (!katexPromise) {
    katexPromise = Promise.all([import('katex'), import('katex/dist/katex.min.css')]).then(
      ([mod]) => mod.default,
    );
  }
  return katexPromise;
}

function renderTex(katex: KatexApi, tex: string, display: boolean): string {
  try {
    return katex.renderToString(tex, { displayMode: display, throwOnError: false, strict: 'ignore' });
  } catch {
    return '';
  }
}

/** Async KaTeX render: loads the katex chunk on first math node. */
export function KatexMath({
  tex,
  display,
  className,
}: {
  tex: string;
  display: boolean;
  className?: string;
}) {
  const [html, setHtml] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadKatex().then((katex) => {
      if (cancelled) return;
      setHtml(renderTex(katex, tex, display));
    });
    return () => {
      cancelled = true;
    };
  }, [tex, display]);

  if (html) {
    return <span className={className} dir="ltr" dangerouslySetInnerHTML={{ __html: html }} />;
  }
  return (
    <span className={className} dir="ltr">
      {tex}
    </span>
  );
}

function fmtStyle(s: Seg): CSSProperties {
  return {
    fontWeight: s.fmt.b ? 700 : 'inherit',
    fontStyle: s.fmt.i ? 'italic' : 'inherit',
    textDecorationLine: s.fmt.s ? 'line-through' : 'none',
  };
}

function SegNode({ s }: { s: Seg }) {
  switch (s.kind) {
    case 'text':
      return <span style={fmtStyle(s)}>{s.t}</span>;
    case 'code':
      return (
        <code className="ic" dir="ltr">
          {s.t}
        </code>
      );
    case 'link':
      return (
        <a
          href={s.href}
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontWeight: s.fmt.b ? 700 : 'inherit', fontStyle: s.fmt.i ? 'italic' : 'inherit' }}
        >
          {s.t}
        </a>
      );
    case 'img':
      return <img className="im" src={s.src} alt={s.t} />;
    case 'br':
      return <br />;
    case 'bdi':
      return (
        <bdi className="bdi" dir={s.dir}>
          <Segments segs={s.inner} />
        </bdi>
      );
    case 'math':
      return <KatexMath tex={s.t} display={false} className="mathi" />;
    case 'kbd':
      return (
        <kbd className="kbd" dir="ltr">
          {s.t}
        </kbd>
      );
    case 'fn':
      return (
        <a className="fnref" href={'#' + s.href}>
          [{s.t}]
        </a>
      );
    default:
      return null;
  }
}

/** Renders a list of inline segments as real JSX. */
export const Segments = memo(function Segments({ segs }: { segs: Seg[] }) {
  return (
    <>
      {segs.map((s, i) => (
        <SegNode key={i} s={s} />
      ))}
    </>
  );
});
