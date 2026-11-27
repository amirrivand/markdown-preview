import { Preview } from './Preview';
import { SourceEditor } from './SourceEditor';
import { MODES, type ViewerState } from '../hooks/useViewerState';

export function MobileViewer(v: ViewerState) {
  const hlFrom = v.hoverBlock ? v.hoverBlock.from : 0;
  const hlTo = v.hoverBlock ? v.hoverBlock.to : 0;
  const onSource = v.mobileTab === 'source';

  return (
    <div className="shell shell-mob" data-view="mobile" data-tab={v.mobileTab}>
      <header className="mob-top">
        <div className="brand brand-mob">
          <div className="brand-mark" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
              <path
                d="M4 7.5h9M12 5l3 2.5L12 10M16 12.5H7M8 10l-3 2.5L8 15"
                stroke="#fff"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className="brand-text">
            <span className="brand-title">Locale MarkDown</span>
            <span className="brand-sub" dir="rtl" lang="fa">
              نمایشگر مارک‌داون محلی
            </span>
          </div>
        </div>
        <p className="mob-stat" aria-live="polite">
          {onSource ? v.statSource : v.statPreview}
        </p>
      </header>

      <div className="mob-tabs" role="tablist" aria-label="Editor view">
        <button
          type="button"
          role="tab"
          id="tab-source"
          aria-selected={onSource}
          aria-controls="panel-source"
          className="mob-tab"
          data-on={onSource ? 'true' : 'false'}
          onClick={() => v.setMobileTab('source')}
        >
          Source
        </button>
        <button
          type="button"
          role="tab"
          id="tab-preview"
          aria-selected={!onSource}
          aria-controls="panel-preview"
          className="mob-tab"
          data-on={!onSource ? 'true' : 'false'}
          onClick={() => v.setMobileTab('preview')}
        >
          Preview
        </button>
      </div>

      <main className="mob-stage">
        <section
          className="mob-panel pane ed"
          id="panel-source"
          role="tabpanel"
          aria-labelledby="tab-source"
          hidden={!onSource}
          aria-hidden={!onSource}
        >
          <div className="ph mob-ph">
            <span className="pt">Source</span>
            <div className="ph-actions">
              <button type="button" className="tbd" aria-label={`Editor text direction: ${v.edDirLabel}`} onClick={v.cycleEdDir}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M2 5h10M9 2l3 3-3 3M14 11H4M7 8l-3 3 3 3" />
                </svg>
                {v.edDirLabel}
              </button>
            </div>
          </div>
          <SourceEditor
            id="md-src-mob"
            src={v.src}
            edDir={v.edDir}
            edScroll={v.edScroll}
            hlFrom={hlFrom}
            hlTo={hlTo}
            taRef={v.taRef}
            onInput={v.onInput}
            onScroll={v.onEdScrollSolo}
            onCaret={v.onEdCaret}
            readOnly={!!v.editingKey}
          />
        </section>

        <section
          className="mob-panel pane pv"
          id="panel-preview"
          role="tabpanel"
          aria-labelledby="tab-preview"
          hidden={onSource}
          aria-hidden={onSource}
        >
          <Preview
            model={v.model}
            empty={!v.src.trim()}
            guides={v.guides}
            hoverKey={v.hoverKey}
            copied={v.copied}
            scrollRef={v.pvRef}
            onScroll={v.onPvScrollSolo}
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

      <footer className="mob-dock" aria-label="Actions">
        <div className="mob-dir" role="group" aria-label="Preview direction">
          {MODES.map((m) => (
            <button
              key={m.key}
              type="button"
              className="mob-chip"
              data-on={v.mode === m.key ? 'true' : 'false'}
              aria-pressed={v.mode === m.key}
              title={m.hint}
              onClick={() => v.setMode(m.key)}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div className="mob-actions">
          <button type="button" className="mob-btn" aria-label="Paste from clipboard" onClick={v.doPaste}>
            {v.pasteLabel}
          </button>
          <button type="button" className="mob-btn" aria-label="Load sample document" onClick={v.loadSample}>
            Sample
          </button>
          <button type="button" className="mob-btn" aria-label="Copy Markdown source" onClick={v.copySrc}>
            {v.copySrcLabel}
          </button>
          <button
            type="button"
            className="mob-btn"
            data-on={v.guides ? 'true' : 'false'}
            aria-pressed={v.guides}
            aria-label="Show direction guides"
            onClick={v.toggleGuides}
          >
            Guides
          </button>
          <button type="button" className="mob-btn mob-btn-x" aria-label="Clear source" onClick={v.clearAll}>
            Clear
          </button>
          <button type="button" className="mob-btn mob-btn-p" aria-label="Export preview as PDF" onClick={v.exportPdf}>
            PDF
          </button>
        </div>
      </footer>
    </div>
  );
}
