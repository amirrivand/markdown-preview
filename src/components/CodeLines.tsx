import { memo, useEffect, useState } from 'react';
import { highlightLines } from '../lib/highlight';

interface CodeLinesProps {
  text: string;
  lang: string;
  /** 1-based starting line number (citations use source range start). */
  start?: number;
  /** Stable keys from the block model when available. */
  lineKeys?: string[];
}

/** Line-numbered code body with async highlight.js coloring. */
export const CodeLines = memo(function CodeLines({ text, lang, start = 1, lineKeys }: CodeLinesProps) {
  const [htmlLines, setHtmlLines] = useState<string[] | null>(null);
  const plain = text.split('\n');

  useEffect(() => {
    let cancelled = false;
    setHtmlLines(null);
    highlightLines(text, lang).then((lines) => {
      if (!cancelled) setHtmlLines(lines);
    });
    return () => {
      cancelled = true;
    };
  }, [text, lang]);

  const count = htmlLines?.length ?? plain.length;

  return (
    <div className="cbi">
      {Array.from({ length: count }, (_, n) => {
        const key = lineKeys?.[n] ?? 'l' + n;
        const plainText = plain[n] === '' || plain[n] === undefined ? ' ' : plain[n];
        return (
          <div key={key} className="cl">
            <span className="cn" aria-hidden="true">
              {start + n}
            </span>
            {htmlLines ? (
              <span className="ct hljs" dangerouslySetInnerHTML={{ __html: htmlLines[n] || ' ' }} />
            ) : (
              <span className="ct">{plainText}</span>
            )}
          </div>
        );
      })}
    </div>
  );
});

/** Single `<pre>` with language-aware highlight (front matter / flow errors). */
export const HighlightedPre = memo(function HighlightedPre({
  text,
  lang,
  className,
}: {
  text: string;
  lang: string;
  className?: string;
}) {
  const [html, setHtml] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setHtml(null);
    highlightLines(text, lang).then((lines) => {
      if (!cancelled) setHtml(lines.join('\n'));
    });
    return () => {
      cancelled = true;
    };
  }, [text, lang]);

  if (html) {
    return <pre className={className ? `${className} hljs` : 'hljs'} dangerouslySetInnerHTML={{ __html: html }} />;
  }
  return <pre className={className}>{text}</pre>;
});
