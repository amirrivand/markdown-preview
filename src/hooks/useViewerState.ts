import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type SyntheticEvent,
  type UIEvent,
} from 'react';
import { replaceLineRange, sliceLineRange } from '../lib/inlineEdit';
import { buildModel, sample, type BlockView, type Mode } from '../lib/markdown';

export const LS_SRC = 'rtl-md-viewer:v2';
export const LS_SRC_OPEN = 'rtl-md-viewer:srcOpen';
const ANCHOR_RATIO = 0.28;

export type EdDir = 'auto' | 'rtl' | 'ltr';
export type MobileTab = 'source' | 'preview';

export const MODES: { key: Mode; label: string; hint: string }[] = [
  { key: 'auto', label: 'Auto', hint: 'Detect direction per block' },
  { key: 'rtl', label: 'RTL', hint: 'Right-to-left for all text blocks' },
  { key: 'ltr', label: 'LTR', hint: 'Left-to-right for all text blocks' },
];

export const ED_LABELS: Record<EdDir, string> = { auto: 'Auto', rtl: 'RTL', ltr: 'LTR' };
const ED_NEXT: Record<EdDir, EdDir> = { auto: 'rtl', rtl: 'ltr', ltr: 'auto' };

export function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeStorage(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* storage unavailable */
  }
}

function lineHeightOf(ta: HTMLTextAreaElement): number {
  const cs = window.getComputedStyle(ta);
  const lh = parseFloat(cs.lineHeight);
  if (lh && !isNaN(lh)) return lh;
  return (parseFloat(cs.fontSize) || 14) * 1.8;
}

function padTopOf(el: HTMLElement): number {
  return parseFloat(window.getComputedStyle(el).paddingTop) || 0;
}

function lineAt(el: HTMLTextAreaElement): number {
  const v = el.value || '';
  const pos = Math.max(0, Math.min(el.selectionStart || 0, v.length));
  return v.slice(0, pos).split('\n').length;
}

function lineFromScroll(ta: HTMLTextAreaElement, anchorY: number): number {
  const lh = lineHeightOf(ta);
  const pt = padTopOf(ta);
  const total = Math.max(1, (ta.value || '').split('\n').length);
  const line = Math.floor((anchorY - pt) / lh) + 1;
  return Math.max(1, Math.min(total, line));
}

function scrollTopForLine(ta: HTMLTextAreaElement, line: number, ratioInView: number): number {
  const lh = lineHeightOf(ta);
  const pt = padTopOf(ta);
  const y = pt + (Math.max(1, line) - 1) * lh;
  return Math.max(0, y - ta.clientHeight * ratioInView);
}

function blockAtLine(blocks: BlockView[], line: number): BlockView | null {
  if (!blocks.length) return null;
  let fallback = blocks[0];
  for (const b of blocks) {
    if (line >= b.from && line <= b.to) return b;
    if (b.from <= line) fallback = b;
  }
  return fallback;
}

function findBlockByKey(blocks: BlockView[], key: string): BlockView | undefined {
  for (const b of blocks) {
    if (b.key === key) return b;
    if (b.children.length) {
      const hit = findBlockByKey(b.children, key);
      if (hit) return hit;
    }
  }
  return undefined;
}

export function useViewerState() {
  const [src, setSrc] = useState<string>(() => {
    const saved = readStorage(LS_SRC);
    return saved !== null && saved.trim() !== '' ? saved : sample();
  });
  const [mode, setMode] = useState<Mode>('auto');
  const [edDir, setEdDir] = useState<EdDir>('auto');
  const [guides, setGuides] = useState(false);
  const [srcOpen, setSrcOpen] = useState<boolean>(() => readStorage(LS_SRC_OPEN) !== '0');
  const [mobileTab, setMobileTab] = useState<MobileTab>('preview');
  const [copied, setCopied] = useState<string | null>(null);
  const [pasteFlash, setPasteFlash] = useState<'ok' | 'x' | null>(null);
  const [hoverKey, setHoverKey] = useState<string | null>(null);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [edScroll, setEdScroll] = useState(0);

  const taRef = useRef<HTMLTextAreaElement>(null);
  const pvRef = useRef<HTMLDivElement>(null);
  const syncing = useRef<'ed' | 'pv' | null>(null);
  const syncTimer = useRef<number | undefined>(undefined);
  const copyTimer = useRef<number | undefined>(undefined);
  const pasteTimer = useRef<number | undefined>(undefined);
  const srcRef = useRef(src);
  srcRef.current = src;

  const model = useMemo(() => buildModel(src, mode), [src, mode]);
  const modelRef = useRef(model);
  modelRef.current = model;

  useEffect(() => {
    writeStorage(LS_SRC, src);
  }, [src]);

  useEffect(() => {
    if (!editingKey) return;
    if (!findBlockByKey(model.blocks, editingKey)) setEditingKey(null);
  }, [model, editingKey]);

  useEffect(
    () => () => {
      window.clearTimeout(syncTimer.current);
      window.clearTimeout(copyTimer.current);
      window.clearTimeout(pasteTimer.current);
    },
    [],
  );

  // Warm the print chunk so the first PDF click is not blocked on network.
  useEffect(() => {
    const warm = () => {
      void import('../lib/exportPdf');
    };
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(warm, { timeout: 2500 });
      return () => window.cancelIdleCallback(id);
    }
    const t = window.setTimeout(warm, 800);
    return () => window.clearTimeout(t);
  }, []);

  const endSync = useCallback(() => {
    window.clearTimeout(syncTimer.current);
    syncTimer.current = window.setTimeout(() => {
      syncing.current = null;
    }, 100);
  }, []);

  const syncFromEditor = useCallback(
    (ta: HTMLTextAreaElement) => {
      const pv = pvRef.current;
      const blocks = modelRef.current.blocks;
      if (!pv || !blocks.length) return;
      const maxE = ta.scrollHeight - ta.clientHeight;
      const maxP = pv.scrollHeight - pv.clientHeight;
      if (maxE <= 0 || maxP <= 0) {
        syncing.current = 'ed';
        pv.scrollTop = 0;
        endSync();
        return;
      }
      const anchor = ta.scrollTop + ta.clientHeight * ANCHOR_RATIO;
      const line = lineFromScroll(ta, anchor);
      const b = blockAtLine(blocks, line);
      const el = b ? pv.querySelector<HTMLElement>('.blk[data-k="' + b.key + '"]') : null;
      syncing.current = 'ed';
      if (el && b) {
        const span = Math.max(1, b.to - b.from + 1);
        const local = Math.max(0, Math.min(1, (line - b.from) / span));
        const target = el.offsetTop + el.offsetHeight * local - pv.clientHeight * ANCHOR_RATIO;
        pv.scrollTop = Math.max(0, Math.min(maxP, target));
      } else {
        pv.scrollTop = (ta.scrollTop / maxE) * maxP;
      }
      endSync();
    },
    [endSync],
  );

  const syncFromPreview = useCallback(
    (pv: HTMLDivElement) => {
      const ta = taRef.current;
      if (!ta || !modelRef.current.blocks.length) return;
      const maxE = ta.scrollHeight - ta.clientHeight;
      const maxP = pv.scrollHeight - pv.clientHeight;
      if (maxE <= 0 || maxP <= 0) {
        syncing.current = 'pv';
        ta.scrollTop = 0;
        setEdScroll(0);
        endSync();
        return;
      }
      const anchor = pv.scrollTop + pv.clientHeight * ANCHOR_RATIO;
      const nodes = pv.querySelectorAll<HTMLElement>('.blk[data-k]');
      let hit: HTMLElement | null = null;
      for (let i = 0; i < nodes.length; i++) {
        const el = nodes[i];
        if (el.offsetTop + el.offsetHeight >= anchor) {
          hit = el;
          break;
        }
        hit = el;
      }
      syncing.current = 'pv';
      if (hit) {
        const from = parseInt(hit.getAttribute('data-from') || '1', 10) || 1;
        const to = parseInt(hit.getAttribute('data-to') || String(from), 10) || from;
        const span = Math.max(1, to - from + 1);
        const local = Math.max(0, Math.min(1, (anchor - hit.offsetTop) / Math.max(1, hit.offsetHeight)));
        const line = from + local * (span - 1);
        const next = scrollTopForLine(ta, line, ANCHOR_RATIO);
        ta.scrollTop = Math.max(0, Math.min(maxE, next));
        setEdScroll(ta.scrollTop);
      } else {
        const next = (pv.scrollTop / maxP) * maxE;
        ta.scrollTop = next;
        setEdScroll(next);
      }
      endSync();
    },
    [endSync],
  );

  const onEdScroll = useCallback(
    (e: UIEvent<HTMLTextAreaElement>) => {
      const ta = e.currentTarget;
      setEdScroll(ta.scrollTop);
      if (editingKey || syncing.current === 'pv') return;
      syncFromEditor(ta);
    },
    [editingKey, syncFromEditor],
  );

  const onPvScroll = useCallback(
    (e: UIEvent<HTMLDivElement>) => {
      if (editingKey || syncing.current === 'ed') return;
      syncFromPreview(e.currentTarget);
    },
    [editingKey, syncFromPreview],
  );

  /** Mobile: track scroll without syncing to a hidden pane. */
  const onEdScrollSolo = useCallback((e: UIEvent<HTMLTextAreaElement>) => {
    setEdScroll(e.currentTarget.scrollTop);
  }, []);

  const onPvScrollSolo = useCallback((_e: UIEvent<HTMLDivElement>) => {
    /* preview scroll alone — no sync partner on mobile tabs */
  }, []);

  const onInput = useCallback((e: ChangeEvent<HTMLTextAreaElement>) => setSrc(e.target.value), []);

  const onEdCaret = useCallback((e: SyntheticEvent<HTMLTextAreaElement>) => {
    if (editingKey) return;
    const b = blockAtLine(modelRef.current.blocks, lineAt(e.currentTarget));
    setHoverKey(b ? b.key : null);
  }, [editingKey]);

  const setHoverKeySafe = useCallback(
    (key: string | null) => {
      if (editingKey) return;
      setHoverKey(key);
    },
    [editingKey],
  );

  const startInlineEdit = useCallback((key: string) => {
    setEditingKey(key);
    setHoverKey(key);
  }, []);

  const cancelInlineEdit = useCallback(() => {
    setEditingKey(null);
  }, []);

  const commitInlineEdit = useCallback((from: number, to: number, text: string) => {
    setEditingKey(null);
    setSrc((prev) => {
      const next = replaceLineRange(prev, from, to, text);
      return next === prev ? prev : next;
    });
  }, []);

  const getBlockSource = useCallback((from: number, to: number) => sliceLineRange(srcRef.current, from, to), []);

  const toggleSrc = useCallback(() => {
    setSrcOpen((open) => {
      writeStorage(LS_SRC_OPEN, open ? '0' : '1');
      return !open;
    });
  }, []);

  const loadSample = useCallback(() => {
    setSrc(sample());
    setHoverKey(null);
    setEditingKey(null);
  }, []);

  const clearAll = useCallback(() => {
    setSrc('');
    setHoverKey(null);
    setEditingKey(null);
  }, []);

  const flashCopied = useCallback((k: string) => {
    setCopied(k);
    window.clearTimeout(copyTimer.current);
    copyTimer.current = window.setTimeout(() => setCopied(null), 1500);
  }, []);

  const copyText = useCallback(
    (text: string, key: string) => {
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(
            () => flashCopied(key),
            () => flashCopied(key + ':x'),
          );
        } else flashCopied(key + ':x');
      } catch {
        flashCopied(key + ':x');
      }
    },
    [flashCopied],
  );

  const copySrc = useCallback(() => copyText(src, 'src'), [copyText, src]);

  const exportPdf = useCallback(() => {
    // Eager path keeps the call inside the user-gesture turn when possible.
    void import('../lib/exportPdf')
      .then(async ({ exportPreviewPdf }) => {
        try {
          await exportPreviewPdf('Locale MarkDown');
        } catch {
          try {
            document.documentElement.classList.add('is-printing');
            window.print();
          } catch {
            /* printing unavailable */
          } finally {
            window.setTimeout(() => document.documentElement.classList.remove('is-printing'), 1000);
          }
        }
      })
      .catch(() => {
        try {
          document.documentElement.classList.add('is-printing');
          window.print();
        } catch {
          /* printing unavailable */
        } finally {
          window.setTimeout(() => document.documentElement.classList.remove('is-printing'), 1000);
        }
      });
  }, []);

  const doPaste = useCallback(() => {
    const flash = (ok: boolean) => {
      setPasteFlash(ok ? 'ok' : 'x');
      window.clearTimeout(pasteTimer.current);
      pasteTimer.current = window.setTimeout(() => setPasteFlash(null), 1400);
    };
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        navigator.clipboard.readText().then(
          (t) => {
            if (typeof t !== 'string') {
              flash(false);
              return;
            }
            setSrc(t);
            setHoverKey(null);
            setEditingKey(null);
            flash(true);
            setMobileTab('source');
          },
          () => flash(false),
        );
      } else flash(false);
    } catch {
      flash(false);
    }
  }, []);

  const cycleEdDir = useCallback(() => setEdDir((d) => ED_NEXT[d] || 'auto'), []);
  const toggleGuides = useCallback(() => setGuides((g) => !g), []);

  const hoverBlock = hoverKey ? findBlockByKey(model.blocks, hoverKey) : undefined;
  const lines = src ? src.split('\n') : [''];
  const words = src.trim() ? src.trim().split(/\s+/).length : 0;
  const c = model.counts;
  const statSource = `${lines.length} lines · ${words} words · ${src.length} chars`;
  const statPreview = `${model.blocks.length} blocks · ${c.rtl} RTL · ${c.ltr} LTR · ${c.lock} locked`;
  const copySrcLabel = copied === 'src' ? 'Copied' : copied === 'src:x' ? 'Blocked' : 'Copy';
  const pasteLabel = pasteFlash === 'ok' ? 'Pasted' : pasteFlash === 'x' ? 'Blocked' : 'Paste';
  const srcToggleLabel = srcOpen ? 'Collapse source for full preview' : 'Show source panel';
  const edDirLabel = ED_LABELS[edDir] || 'Auto';

  return {
    src,
    mode,
    setMode,
    edDir,
    guides,
    srcOpen,
    mobileTab,
    setMobileTab,
    copied,
    hoverKey,
    setHoverKey: setHoverKeySafe,
    editingKey,
    startInlineEdit,
    cancelInlineEdit,
    commitInlineEdit,
    getBlockSource,
    edScroll,
    taRef,
    pvRef,
    model,
    hoverBlock,
    statSource,
    statPreview,
    copySrcLabel,
    pasteLabel,
    srcToggleLabel,
    edDirLabel,
    onInput,
    onEdScroll,
    onEdScrollSolo,
    onPvScroll,
    onPvScrollSolo,
    onEdCaret,
    toggleSrc,
    loadSample,
    clearAll,
    copyText,
    copySrc,
    exportPdf,
    doPaste,
    cycleEdDir,
    toggleGuides,
  };
}

export type ViewerState = ReturnType<typeof useViewerState>;
