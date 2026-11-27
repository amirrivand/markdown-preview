import { memo, type RefObject, type UIEvent } from 'react';
import type { DocModel } from '../lib/markdown';
import { Block, type InlineEditHandlers } from './Block';
import { Segments } from './Segments';

export function copyLabelFor(copied: string | null, key: string): string {
  return copied === key ? 'Copied' : copied === key + ':x' ? 'Blocked' : 'Copy';
}

interface PreviewProps extends InlineEditHandlers {
  model: DocModel;
  empty: boolean;
  guides: boolean;
  hoverKey: string | null;
  copied: string | null;
  scrollRef: RefObject<HTMLDivElement | null>;
  onScroll: (e: UIEvent<HTMLDivElement>) => void;
  onHover: (key: string | null) => void;
  onCopy: (text: string, key: string) => void;
}

export const Preview = memo(function Preview({
  model,
  empty,
  guides,
  hoverKey,
  copied,
  scrollRef,
  onScroll,
  onHover,
  onCopy,
  editingKey,
  onStartEdit,
  onCommitEdit,
  onCancelEdit,
  getBlockSource,
}: PreviewProps) {
  return (
    <div className="scroll" id="pv-scroll" ref={scrollRef} onScroll={onScroll}>
      <article className="md" data-guide={guides ? 'on' : 'off'} data-editing={editingKey ? 'true' : 'false'}>
        {empty && (
          <div className="empty">
            <svg width="42" height="42" viewBox="0 0 34 34" fill="none" aria-hidden="true">
              <rect x="1" y="1" width="32" height="32" rx="9" stroke="#C9C2B4" strokeWidth="1.5" />
              <path
                d="M8 13h14M18.5 9.5L22 13l-3.5 3.5M26 21H12M15.5 17.5L12 21l3.5 3.5"
                stroke="#8A938A"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <div>Nothing to preview yet. Paste Markdown, load the sample, or start typing.</div>
            <div dir="rtl" lang="fa">
              هنوز چیزی برای نمایش نیست — Paste یا Sample را بزنید.
            </div>
          </div>
        )}
        {model.blocks.map((b) => (
          <Block
            key={b.key}
            b={b}
            guides={guides}
            hi={hoverKey === b.key || (editingKey != null && (editingKey === b.key || editingKey.startsWith(b.key + 'c')))}
            copyLabel={b.copyKey ? copyLabelFor(copied, b.copyKey) : ''}
            onHover={onHover}
            onCopy={onCopy}
            editingKey={editingKey}
            onStartEdit={onStartEdit}
            onCommitEdit={onCommitEdit}
            onCancelEdit={onCancelEdit}
            getBlockSource={getBlockSource}
          />
        ))}
        {model.footnotes.length > 0 && (
          <section className="fn" aria-label="Footnotes">
            <div className="fn-title">Footnotes</div>
            {model.footnotes.map((fn) => (
              <div key={fn.key} className="fn-item" id={fn.aid}>
                <span className="fn-mark">[{fn.n}]</span>
                <span>
                  <Segments segs={fn.segs} />
                </span>
              </div>
            ))}
          </section>
        )}
      </article>
    </div>
  );
});
