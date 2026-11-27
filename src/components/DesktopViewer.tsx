import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { Preview } from './Preview';
import { SourceEditor } from './SourceEditor';
import { MODES, readStorage, writeStorage, type ViewerState } from '../hooks/useViewerState';

const LS_SPLIT = 'locale-md-viewer:split';
const DEFAULT_SPLIT = 50;
const MIN_PANE_PX = 260;
const SASH_PX = 8;

function loadSplit(): number {
  const raw = readStorage(LS_SPLIT);
  if (raw == null) return DEFAULT_SPLIT;
  const n = Number(raw);
  if (!Number.isFinite(n)) return DEFAULT_SPLIT;
  return Math.min(80, Math.max(20, n));
}

const BrandMark = () => (
  <div className="brand-mark" aria-hidden="true">
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
      <path
        d="M4 7.5h9M12 5l3 2.5L12 10M16 12.5H7M8 10l-3 2.5L8 15"
        stroke="#fff"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  </div>
);

export function DesktopViewer(v: ViewerState) {
  const hlFrom = v.hoverBlock ? v.hoverBlock.from : 0;
  const hlTo = v.hoverBlock ? v.hoverBlock.to : 0;

  const panesRef = useRef<HTMLElement>(null);
  const [splitPct, setSplitPct] = useState(loadSplit);
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef(false);

  useEffect(() => {
    writeStorage(LS_SPLIT, String(splitPct));
  }, [splitPct]);

  useEffect(() => {
    if (!dragging) return;
    const prev = document.body.style.cursor;
    const prevSelect = document.body.style.userSelect;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    return () => {
      document.body.style.cursor = prev;
      document.body.style.userSelect = prevSelect;
    };
  }, [dragging]);

  const applySplitFromClientX = useCallback((clientX: number) => {
    const el = panesRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const usable = rect.width - SASH_PX;
    if (usable <= MIN_PANE_PX * 2) return;
    const raw = ((clientX - rect.left) / usable) * 100;
    const minPct = (MIN_PANE_PX / usable) * 100;
    const maxPct = 100 - minPct;
    setSplitPct(Math.min(maxPct, Math.max(minPct, raw)));
  }, []);

  const onSashPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (!v.srcOpen || e.button !== 0) return;
      e.preventDefault();
      dragRef.current = true;
      setDragging(true);
      e.currentTarget.setPointerCapture(e.pointerId);
      applySplitFromClientX(e.clientX);
    },
    [applySplitFromClientX, v.srcOpen],
  );

  const onSashPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (!dragRef.current) return;
      applySplitFromClientX(e.clientX);
    },
    [applySplitFromClientX],
  );

  const endDrag = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    dragRef.current = false;
    setDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
  }, []);

  const gridTemplate = v.srcOpen
    ? `minmax(0, ${splitPct}fr) ${SASH_PX}px minmax(0, ${100 - splitPct}fr)`
    : undefined;

  return (
    <div className="shell shell-desk" data-view="desktop">
      <header className="top">
        <div className="brand">
          <BrandMark />
          <div className="brand-text">
            <span className="brand-title">Locale MarkDown</span>
            <span className="brand-sub" dir="rtl" lang="fa">
              نمایشگر مارک‌داون محلی
            </span>
          </div>
        </div>

        <div className="tools">
          <div className="seg" role="group" aria-label="Preview direction">
            <span className="segl">Direction</span>
            {MODES.map((m) => (
              <button
                key={m.key}
                type="button"
                data-on={v.mode === m.key ? 'true' : 'false'}
                aria-pressed={v.mode === m.key}
                title={m.hint}
                onClick={() => v.setMode(m.key)}
              >
                {m.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            className="tb"
            data-on={v.srcOpen ? 'false' : 'true'}
            aria-pressed={!v.srcOpen}
            aria-label={v.srcToggleLabel}
            title={v.srcToggleLabel}
            onClick={v.toggleSrc}
          >
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="2.5" y="3" width="5" height="10" rx="1.2" />
              <path d="M9.5 5.5L13 8l-3.5 2.5" />
            </svg>
            <span className="lb">{v.srcOpen ? 'Hide' : 'Source'}</span>
          </button>

          <button
            type="button"
            className="tb"
            data-on={v.guides ? 'true' : 'false'}
            aria-pressed={v.guides}
            aria-label="Show direction guides"
            onClick={v.toggleGuides}
          >
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
              <rect x="2.5" y="2.5" width="11" height="11" rx="1.5" strokeDasharray="2.2 2.2" />
              <path d="M5.5 8h5" />
            </svg>
            <span className="lb">Guides</span>
          </button>

          <span className="vr" aria-hidden="true" />

          <button type="button" className="tb" aria-label="Load sample document" onClick={v.loadSample}>
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 1.8h5l3 3v9.4H4z" />
              <path d="M9 1.8v3h3M6.3 8.5h3.4M6.3 11h3.4" />
            </svg>
            <span className="lb">Sample</span>
          </button>

          <button type="button" className="tb" aria-label="Paste from clipboard" onClick={v.doPaste}>
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" aria-hidden="true">
              <rect x="5" y="2.5" width="6" height="2.2" rx="1" />
              <path d="M4 4.5h8v9.2H4z" />
            </svg>
            <span className="lb">{v.pasteLabel}</span>
          </button>

          <button type="button" className="tb tbx" aria-label="Clear source" onClick={v.clearAll}>
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M2.8 4.2h10.4M6 4.2V2.5h4v1.7M4.4 4.2l.6 9.3h6l.6-9.3" />
            </svg>
            <span className="lb">Clear</span>
          </button>

          <button type="button" className="tb" aria-label="Copy Markdown source" onClick={v.copySrc}>
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" aria-hidden="true">
              <rect x="5.2" y="5.2" width="8.6" height="8.6" rx="1.6" />
              <path d="M10.8 5.2V3.6c0-.9-.7-1.6-1.6-1.6H3.6C2.7 2 2 2.7 2 3.6v5.6c0 .9.7 1.6 1.6 1.6h1.6" />
            </svg>
            <span className="lb">{v.copySrcLabel}</span>
          </button>

          <button type="button" className="tb tbp" aria-label="Export preview as PDF" onClick={v.exportPdf}>
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3.5 2.5h6L12.5 5v8.5h-9z" />
              <path d="M9.5 2.5V5h2.5M5.5 9h5M5.5 11.5h3.5" />
            </svg>
            <span className="lb">PDF</span>
          </button>
        </div>
      </header>

      <main
        ref={panesRef}
        className="panes"
        data-src={v.srcOpen ? 'on' : 'off'}
        data-dragging={dragging ? 'true' : 'false'}
        style={gridTemplate ? { gridTemplateColumns: gridTemplate } : undefined}
      >
        <section className="pane ed" aria-label="Markdown source" aria-hidden={!v.srcOpen}>
          <div className="ph">
            <span className="pt">Source</span>
            <span className="pm">
              <span className="pm-long">{v.statSource}</span>
            </span>
            <div className="ph-actions">
              <button type="button" className="tbd" aria-label={`Editor text direction: ${v.edDirLabel}`} onClick={v.cycleEdDir}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M2 5h10M9 2l3 3-3 3M14 11H4M7 8l-3 3 3 3" />
                </svg>
                {v.edDirLabel}
              </button>
              <button type="button" className="tbd" aria-label="Collapse source panel" title="Collapse source" onClick={v.toggleSrc}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M10 4l-4 4 4 4" />
                </svg>
              </button>
            </div>
          </div>
          <SourceEditor
            id="md-src-desk"
            src={v.src}
            edDir={v.edDir}
            edScroll={v.edScroll}
            hlFrom={hlFrom}
            hlTo={hlTo}
            taRef={v.taRef}
            onInput={v.onInput}
            onScroll={v.onEdScroll}
            onCaret={v.onEdCaret}
            readOnly={!!v.editingKey}
          />
        </section>

        <div
          className="pane-sash"
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize source and preview"
          aria-valuemin={20}
          aria-valuemax={80}
          aria-valuenow={Math.round(splitPct)}
          aria-hidden={!v.srcOpen}
          tabIndex={v.srcOpen ? 0 : -1}
          onPointerDown={onSashPointerDown}
          onPointerMove={onSashPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onKeyDown={(e) => {
            if (!v.srcOpen) return;
            const step = e.shiftKey ? 5 : 2;
            if (e.key === 'ArrowLeft') {
              e.preventDefault();
              setSplitPct((p) => Math.max(20, p - step));
            } else if (e.key === 'ArrowRight') {
              e.preventDefault();
              setSplitPct((p) => Math.min(80, p + step));
            } else if (e.key === 'Home') {
              e.preventDefault();
              setSplitPct(DEFAULT_SPLIT);
            }
          }}
        />

        <section className="pane pv" aria-label="Rendered preview">
          <div className="ph">
            <span className="pt">Preview</span>
            <span className="pm">
              <span className="pm-long">{v.statPreview}</span>
            </span>
            <div className="ph-actions">
              {!v.srcOpen && (
                <button type="button" className="tbd light" data-on="true" aria-label="Show source panel" title="Show source" onClick={v.toggleSrc}>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M6 4l4 4-4 4" />
                    <rect x="2.5" y="3" width="4.5" height="10" rx="1" />
                  </svg>
                  <span className="lb">Source</span>
                </button>
              )}
            </div>
          </div>
          <Preview
            model={v.model}
            empty={!v.src.trim()}
            guides={v.guides}
            hoverKey={v.hoverKey}
            copied={v.copied}
            scrollRef={v.pvRef}
            onScroll={v.onPvScroll}
            onHover={v.setHoverKey}
            onCopy={v.copyText}
            editingKey={v.editingKey}
            onStartEdit={v.startInlineEdit}
            onCommitEdit={v.commitInlineEdit}
            onCancelEdit={v.cancelInlineEdit}
            getBlockSource={v.getBlockSource}
          />
        </section>
      </main>
    </div>
  );
}
