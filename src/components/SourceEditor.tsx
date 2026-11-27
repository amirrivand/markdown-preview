import { memo, type ChangeEvent, type RefObject, type SyntheticEvent, type UIEvent } from 'react';
import type { EdDir } from '../hooks/useViewerState';

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Lightweight Markdown tint for the source overlay (not full language highlighting). */
function colorizeSourceLines(src: string): string[] {
  const lines = src ? src.split('\n') : [''];
  let inFence = false;
  return lines.map((raw) => {
    const line = raw === '' ? ' ' : raw;
    if (/^```/.test(raw)) {
      inFence = !inFence;
      return `<span class="ed-fence">${escapeHtml(line)}</span>`;
    }
    if (inFence) {
      return `<span class="ed-code">${escapeHtml(line)}</span>`;
    }
    if (/^#{1,6}[ \t]/.test(raw) || raw === '#') {
      return `<span class="ed-h">${escapeHtml(line)}</span>`;
    }
    if (/^>\s?/.test(raw)) {
      return `<span class="ed-quote">${escapeHtml(line)}</span>`;
    }
    if (/^(\s*[-*+]|\s*\d+[.)])\s/.test(raw)) {
      return escapeHtml(line).replace(
        /^(\s*)([-*+]|\d+[.)])(\s)/,
        '$1<span class="ed-mark">$2</span>$3',
      );
    }
    return escapeHtml(line).replace(/`([^`]+)`/g, '<span class="ed-ic">`$1`</span>');
  });
}

const HlLines = memo(function HlLines({
  src,
  from,
  to,
}: {
  src: string;
  from: number;
  to: number;
}) {
  const htmlLines = colorizeSourceLines(src);
  return (
    <>
      {htmlLines.map((html, n) => (
        <div
          key={n}
          className="hl-line"
          data-on={from > 0 && n + 1 >= from && n + 1 <= to ? 'true' : 'false'}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ))}
    </>
  );
});

export interface SourceEditorProps {
  id: string;
  src: string;
  edDir: EdDir;
  edScroll: number;
  hlFrom: number;
  hlTo: number;
  taRef: RefObject<HTMLTextAreaElement | null>;
  onInput: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  onScroll: (e: UIEvent<HTMLTextAreaElement>) => void;
  onCaret: (e: SyntheticEvent<HTMLTextAreaElement>) => void;
  /** When true, source is locked (e.g. while preview inline-edit is active). */
  readOnly?: boolean;
}

export const SourceEditor = memo(function SourceEditor({
  id,
  src,
  edDir,
  edScroll,
  hlFrom,
  hlTo,
  taRef,
  onInput,
  onScroll,
  onCaret,
  readOnly = false,
}: SourceEditorProps) {
  return (
    <div className="ed-body">
      <label htmlFor={id} className="sr">
        Markdown source
      </label>
      <div className="hl-layer" aria-hidden="true" style={{ transform: `translateY(${-edScroll}px)` }}>
        <HlLines src={src} from={hlFrom} to={hlTo} />
      </div>
      <textarea
        id={id}
        ref={taRef}
        className="ta"
        dir={edDir}
        spellCheck={false}
        readOnly={readOnly}
        aria-readonly={readOnly || undefined}
        placeholder="Write or paste Markdown / HTML here…  مارک‌داون یا HTML را اینجا بنویسید"
        value={src}
        onChange={onInput}
        onScroll={onScroll}
        onClick={onCaret}
        onKeyUp={onCaret}
        onSelect={onCaret}
      />
    </div>
  );
});
