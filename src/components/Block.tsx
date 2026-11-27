import {
  memo,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from 'react';
import { isInlineEditable } from '../lib/inlineEdit';
import type { BlockView } from '../lib/markdown';
import { CodeLines, HighlightedPre } from './CodeLines';
import { KatexMath, Segments } from './Segments';

interface BodyProps {
  b: BlockView;
  copyLabel: string;
  onCopy: (text: string, key: string) => void;
  editingKey: string | null;
  onStartEdit: (key: string) => void;
  onCommitEdit: (from: number, to: number, text: string) => void;
  onCancelEdit: () => void;
  getBlockSource: (from: number, to: number) => string;
}

const COPY_ICON = (
  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true">
    <rect x="5.2" y="5.2" width="8.6" height="8.6" rx="1.6" />
    <path d="M10.8 5.2V3.6c0-.9-.7-1.6-1.6-1.6H3.6C2.7 2 2 2.7 2 3.6v5.6c0 .9.7 1.6 1.6 1.6h1.6" />
  </svg>
);

function Paras({ paras }: { paras: BlockView['paras'] }) {
  return (
    <>
      {paras.map((q) => (
        <p key={q.key}>
          <Segments segs={q.segs} />
        </p>
      ))}
    </>
  );
}

interface InlineEditorProps {
  initial: string;
  dir: BlockView['dir'];
  singleLineCommit: boolean;
  onCommit: (text: string) => void;
  onCancel: () => void;
}

function InlineEditor({ initial, dir, singleLineCommit, onCommit, onCancel }: InlineEditorProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [value, setValue] = useState(initial);
  const done = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
    el.style.height = 'auto';
    el.style.height = `${Math.max(el.scrollHeight, 40)}px`;
  }, []);

  const finish = (fn: () => void) => {
    if (done.current) return;
    done.current = true;
    fn();
  };

  const commit = () => finish(() => onCommit(value));
  const cancel = () => finish(onCancel);

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      cancel();
      return;
    }
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      commit();
      return;
    }
    if (singleLineCommit && e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      commit();
    }
  };

  return (
    <textarea
      ref={ref}
      className="blk-edit"
      dir={dir}
      value={value}
      rows={Math.max(1, value.split('\n').length)}
      spellCheck
      aria-label="Edit markdown block"
      onChange={(e) => {
        setValue(e.target.value);
        const el = e.currentTarget;
        el.style.height = 'auto';
        el.style.height = `${Math.max(el.scrollHeight, 40)}px`;
      }}
      onBlur={commit}
      onKeyDown={onKeyDown}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
    />
  );
}

function EditableShell({
  b,
  editing,
  onStartEdit,
  onCommitEdit,
  onCancelEdit,
  getBlockSource,
  children,
}: {
  b: BlockView;
  editing: boolean;
  onStartEdit: (key: string) => void;
  onCommitEdit: (from: number, to: number, text: string) => void;
  onCancelEdit: () => void;
  getBlockSource: (from: number, to: number) => string;
  children: ReactNode;
}) {
  const editable = isInlineEditable(b.kind);

  const onDoubleClick = (e: MouseEvent) => {
    if (!editable || editing) return;
    const t = e.target as HTMLElement;
    if (t.closest('a, button, input, textarea, .cpy, .cbx')) return;
    e.preventDefault();
    e.stopPropagation();
    onStartEdit(b.key);
  };

  if (editing) {
    return (
      <InlineEditor
        initial={getBlockSource(b.from, b.to)}
        dir={b.dir}
        singleLineCommit={b.kind === 'h' && b.from === b.to}
        onCommit={(text) => onCommitEdit(b.from, b.to, text)}
        onCancel={onCancelEdit}
      />
    );
  }

  return (
    <div
      className={editable ? 'blk-edit-host' : undefined}
      data-editable={editable ? 'true' : undefined}
      title={editable ? 'Double-click to edit · Esc cancel · ⌘/Ctrl+Enter save' : undefined}
      onDoubleClick={onDoubleClick}
    >
      {children}
    </div>
  );
}

/** The rendered content of a block, without the `.blk` hover/guide wrapper. */
export function BlockBody({
  b,
  copyLabel,
  onCopy,
  editingKey,
  onStartEdit,
  onCommitEdit,
  onCancelEdit,
  getBlockSource,
}: BodyProps) {
  const editing = editingKey === b.key;
  const shell = (node: ReactNode) => (
    <EditableShell
      b={b}
      editing={editing}
      onStartEdit={onStartEdit}
      onCommitEdit={onCommitEdit}
      onCancelEdit={onCancelEdit}
      getBlockSource={getBlockSource}
    >
      {node}
    </EditableShell>
  );

  switch (b.kind) {
    case 'h': {
      const content = <Segments segs={b.segs} />;
      if (b.level === 1) return shell(<h1>{content}</h1>);
      if (b.level === 2) return shell(<h2>{content}</h2>);
      if (b.level === 3) return shell(<h3>{content}</h3>);
      return shell(<h4>{content}</h4>);
    }
    case 'p':
      return shell(
        <p>
          <Segments segs={b.segs} />
        </p>,
      );
    case 'wrap':
      return (
        <div className="wrap" dir={b.dir} lang={b.lang || undefined}>
          {b.children.map((c) => (
            <BlockBody
              key={c.key}
              b={c}
              copyLabel={copyLabel}
              onCopy={onCopy}
              editingKey={editingKey}
              onStartEdit={onStartEdit}
              onCommitEdit={onCommitEdit}
              onCancelEdit={onCancelEdit}
              getBlockSource={getBlockSource}
            />
          ))}
        </div>
      );
    case 'list':
      return shell(
        <ul className="ls">
          {b.items.map((it) => (
            <li key={it.key} className="li" style={{ paddingInlineStart: it.pad }}>
              {!it.isTask && <span className="mk">{it.marker}</span>}
              {it.isTask && (
                <span className="cbx" data-done={it.isDone ? 'true' : 'false'} role="img" aria-label={it.taskLabel}>
                  {it.isDone && (
                    <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M3.5 8.5l3 3 6-7" />
                    </svg>
                  )}
                </span>
              )}
              <span className="lt" data-done={it.isDone ? 'true' : 'false'}>
                <Segments segs={it.segs} />
              </span>
            </li>
          ))}
        </ul>,
      );
    case 'quote':
      return shell(
        <blockquote className="bq">
          <Paras paras={b.paras} />
        </blockquote>,
      );
    case 'alert':
      return shell(
        <aside className="alert" data-kind={b.alertKind}>
          <div className="alert-h">{b.alertLabel}</div>
          <Paras paras={b.paras} />
        </aside>,
      );
    case 'front':
      return (
        <figure className="fm">
          <div className="fmh">YAML FRONT MATTER</div>
          <HighlightedPre className="fmb" text={b.text} lang="yaml" />
        </figure>
      );
    case 'cite':
      return (
        <figure className="cite" dir="ltr">
          <div className="citeh">
            <span>{b.range}</span>
            <span className="citepath">{b.path}</span>
            <button type="button" className="cpy" aria-label="Copy code" onClick={() => onCopy(b.text, b.copyKey)}>
              {copyLabel}
            </button>
          </div>
          <div className="cbb">
            <CodeLines
              text={b.text}
              lang={b.path}
              start={b.lines[0]?.n ?? 1}
              lineKeys={b.lines.map((ln) => ln.key)}
            />
          </div>
        </figure>
      );
    case 'details':
      return shell(
        <details className="det" open={b.open || undefined}>
          <summary>{b.summary}</summary>
          <Paras paras={b.paras} />
        </details>,
      );
    case 'code':
      return (
        <figure className="cb" dir="ltr" style={{ margin: '0 0 1.25em' }}>
          <div className="cbh">
            <span>{b.lang}</span>
            <span className="lock">LTR</span>
            <button type="button" className="cpy" aria-label="Copy code" onClick={() => onCopy(b.text, b.copyKey)}>
              {COPY_ICON}
              {copyLabel}
            </button>
          </div>
          <div className="cbb">
            <CodeLines text={b.text} lang={b.lang || 'text'} lineKeys={b.lines.map((ln) => ln.key)} />
          </div>
        </figure>
      );
    case 'flow':
      return (
        <figure className="flow">
          <div className="flowh">{b.flowTitle} · LTR</div>
          <div className="flowb">
            {b.flowOk ? (
              <img className="im" src={b.svgUrl} alt="Diagram" />
            ) : (
              <HighlightedPre className="flow-err" text={b.flowErr} lang="plaintext" />
            )}
          </div>
        </figure>
      );
    case 'math':
      return (
        <div className="mt" dir="ltr">
          <span className="mlab">KaTeX · LTR</span>
          <div className="mtx">
            <KatexMath tex={b.text} display={true} />
          </div>
        </div>
      );
    case 'table':
      return (
        <div className="tw">
          <div className="tg" role="table" style={{ gridTemplateColumns: `repeat(${b.ncols}, minmax(min-content, auto))` }}>
            <div role="row" style={{ display: 'contents' }}>
              {b.head.map((c) => (
                <div key={c.key} role="columnheader" className="th" style={{ textAlign: c.align as CSSProperties['textAlign'] }}>
                  <Segments segs={c.segs} />
                </div>
              ))}
            </div>
            {b.rows.map((r) => (
              <div key={r.key} role="row" style={{ display: 'contents' }}>
                {r.cells.map((c) => (
                  <div
                    key={c.key}
                    role="cell"
                    className="td"
                    data-odd={r.odd ? 'true' : 'false'}
                    style={{ textAlign: c.align as CSSProperties['textAlign'] }}
                  >
                    <Segments segs={c.segs} />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      );
    case 'hr':
      return <hr className="hr" />;
    default:
      return null;
  }
}

export interface InlineEditHandlers {
  editingKey: string | null;
  onStartEdit: (key: string) => void;
  onCommitEdit: (from: number, to: number, text: string) => void;
  onCancelEdit: () => void;
  getBlockSource: (from: number, to: number) => string;
}

interface BlockProps extends InlineEditHandlers {
  b: BlockView;
  guides: boolean;
  hi: boolean;
  copyLabel: string;
  onHover: (key: string | null) => void;
  onCopy: (text: string, key: string) => void;
}

/** A top-level block with the hover/guide wrapper used for source ↔ preview sync. */
export const Block = memo(function Block({
  b,
  guides,
  hi,
  copyLabel,
  onHover,
  onCopy,
  editingKey,
  onStartEdit,
  onCommitEdit,
  onCancelEdit,
  getBlockSource,
}: BlockProps) {
  const editing = editingKey === b.key || (editingKey != null && editingKey.startsWith(b.key + 'c'));

  return (
    <div
      className="blk"
      dir={b.dir}
      lang={b.kind === 'wrap' ? b.lang || undefined : undefined}
      data-k={b.key}
      data-from={b.from}
      data-to={b.to}
      data-guide={guides ? 'on' : 'off'}
      data-hi={hi || editing ? 'true' : 'false'}
      data-editing={editing ? 'true' : 'false'}
      onMouseEnter={() => onHover(b.key)}
      onMouseLeave={() => onHover(null)}
    >
      {guides && (
        <span className="badge" data-tone={b.tone} aria-hidden="true">
          {b.badge}
        </span>
      )}
      <BlockBody
        b={b}
        copyLabel={copyLabel}
        onCopy={onCopy}
        editingKey={editingKey}
        onStartEdit={onStartEdit}
        onCommitEdit={onCommitEdit}
        onCancelEdit={onCancelEdit}
        getBlockSource={getBlockSource}
      />
    </div>
  );
});
