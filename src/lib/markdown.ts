/**
 * Markdown engine for the Locale MarkDown Viewer.
 *
 * Ported from the original `viewer.js` (DCLogic Component). It is framework
 * agnostic: `buildModel(src, mode)` parses Markdown/HTML-ish source into a
 * render model (blocks → inline segments) that React components render.
 *
 * Supported: GFM (tables, task lists, strike, autolinks), GitHub alerts,
 * KaTeX math ($ / $$), Mermaid (flowchart + sequence, custom SVG), footnotes,
 * emoji shortcodes, Cursor citation fences (`start:end:path`), YAML front
 * matter, <details>, HTML <div dir lang>, <bdi>, <kbd>, <br>, reference links,
 * setext headings, indented code, per-block direction detection.
 */

export type Dir = 'ltr' | 'rtl';
export type Mode = 'auto' | 'rtl' | 'ltr';

/* ------------------------------------------------------------------ */
/* Inline segments                                                     */
/* ------------------------------------------------------------------ */

export type SegKind = 'text' | 'code' | 'link' | 'img' | 'br' | 'bdi' | 'math' | 'kbd' | 'fn';

export interface InlineFmt {
  b?: boolean;
  i?: boolean;
  s?: boolean;
}

export interface Seg {
  kind: SegKind;
  t: string;
  fmt: InlineFmt;
  href: string;
  src: string;
  dir: 'auto' | 'ltr' | 'rtl';
  inner: Seg[];
}

/* ------------------------------------------------------------------ */
/* Raw (parsed) blocks                                                 */
/* ------------------------------------------------------------------ */

interface RawItem {
  indent: number;
  mk: string;
  text: string;
}

interface RawBlock {
  k:
    | 'front'
    | 'p'
    | 'h'
    | 'details'
    | 'wrap'
    | 'cite'
    | 'flow'
    | 'code'
    | 'math'
    | 'hr'
    | 'table'
    | 'alert'
    | 'quote'
    | 'list';
  from: number;
  to: number;
  force: Mode | null;
  raw: string;
  text?: string;
  level?: number;
  lang?: string;
  start?: number;
  end?: number;
  path?: string;
  kind?: string;
  paras?: string[];
  summary?: string;
  open?: boolean;
  items?: RawItem[];
  head?: string[];
  al?: string[];
  rows?: string[][];
  dir?: string;
  kids?: RawBlock[];
}

type PushInput = Partial<Omit<RawBlock, 'from' | 'to' | 'force'>> & Pick<RawBlock, 'k' | 'raw'>;

interface Footnote {
  id: string;
  text: string;
  from: number;
  to: number;
}

interface ParseResult {
  blocks: RawBlock[];
  footnotes: Footnote[];
  linkRefs: Record<string, string>;
}

/* ------------------------------------------------------------------ */
/* Render model                                                        */
/* ------------------------------------------------------------------ */

export type BlockKind =
  | 'h'
  | 'p'
  | 'list'
  | 'quote'
  | 'code'
  | 'math'
  | 'table'
  | 'hr'
  | 'flow'
  | 'wrap'
  | 'alert'
  | 'front'
  | 'cite'
  | 'details';

export interface ParaView {
  key: string;
  segs: Seg[];
}

export interface ListItemView {
  key: string;
  pad: number;
  marker: string;
  isTask: boolean;
  isDone: boolean;
  taskLabel: string;
  segs: Seg[];
}

export interface CodeLine {
  key: string;
  n: number;
  t: string;
}

export interface CellView {
  key: string;
  align: string;
  segs: Seg[];
}

export interface RowView {
  key: string;
  odd: boolean;
  cells: CellView[];
}

export type Tone = 'lock' | 'forced' | Dir;

export interface BlockView {
  kind: BlockKind;
  key: string;
  from: number;
  to: number;
  dir: Dir;
  lang: string;
  tone: Tone;
  badge: string;
  level: number;
  segs: Seg[];
  items: ListItemView[];
  paras: ParaView[];
  lines: CodeLine[];
  head: CellView[];
  rows: RowView[];
  children: BlockView[];
  ncols: number;
  text: string;
  copyKey: string;
  flowOk: boolean;
  svgUrl: string;
  flowErr: string;
  flowTitle: string;
  alertKind: string;
  alertLabel: string;
  range: string;
  path: string;
  summary: string;
  open: boolean;
}

export interface FootnoteView {
  key: string;
  n: number;
  aid: string;
  segs: Seg[];
}

export interface DirCounts {
  rtl: number;
  ltr: number;
  lock: number;
}

export interface DocModel {
  blocks: BlockView[];
  counts: DirCounts;
  footnotes: FootnoteView[];
}

/* ------------------------------------------------------------------ */
/* Sample document                                                     */
/* ------------------------------------------------------------------ */

export function sample(): string {
  return [
    '---',
    'title: Locale MarkDown Viewer',
    'cursor: ide-parity',
    '---',
    '',
    '# Cursor-style Markdown',
    '',
    'Matches Cursor IDE preview conditions: GFM, alerts, KaTeX, Mermaid, footnotes, emoji, citations, and RTL HTML.',
    '',
    '> [!NOTE]',
    '> Use <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>V</kbd> in Cursor for classic preview. This viewer aims at the same constructs.',
    '',
    '> [!TIP]',
    '> Inline math like $E=mc^2$ and display math both render with KaTeX.',
    '',
    '> [!WARNING]',
    '> Mermaid in Cursor native preview supports flowchart, sequence, class, state, ER, and XY chart.',
    '',
    '## HTML + BDI (RTL)',
    '',
    '<div dir="rtl" lang="fa">',
    '',
    '۱. اینترفیس‌های <bdi dir="ltr">`AccountJdbc`</bdi> و <bdi dir="ltr">`JdbcClient`</bdi> را به <bdi dir="ltr">`@Repository`</bdi> تبدیل می‌کنم.[^plan]',
    '',
    '۲. شش فایل <bdi dir="ltr">`*JdbcImpl`</bdi> را حذف می‌کنم — تأیید می‌کنید؟ :rocket:',
    '',
    '</div>',
    '',
    '## Task lists & refs',
    '',
    '- [x] Paste / Clear / PDF / scroll sync',
    '- [x] GitHub alerts (`NOTE` `TIP` `IMPORTANT` `WARNING` `CAUTION`)',
    '- [ ] Full Mermaid engine (native subset rendered here)',
    '- See the [Cursor docs][cursor] and local [AGENTS][agents].',
    '',
    '## Math',
    '',
    '$$',
    '\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}',
    '$$',
    '',
    '## Mermaid',
    '',
    '```mermaid',
    'flowchart LR',
    '  A[Source] --> B{Parse}',
    '  B -->|MD| C[Preview]',
    '  B -->|HTML| C',
    '```',
    '',
    '```mermaid',
    'sequenceDiagram',
    '  participant U as User',
    '  participant E as Editor',
    '  participant P as Preview',
    '  U->>E: type / paste',
    '  E->>P: sync scroll + hover',
    '  P-->>U: rendered MD',
    '```',
    '',
    '## Fenced code',
    '',
    '```typescript',
    'export function greet(name: string): string {',
    '  // Locale-aware greeting',
    '  return `سلام، ${name}!`;',
    '}',
    '```',
    '',
    '## Cursor citation fence',
    '',
    '```12:18:src/tds/AccountJdbc.java',
    '@Repository',
    'public class AccountJdbc {',
    '  private final JdbcClient db;',
    '  // ...',
    '}',
    '```',
    '',
    '<details>',
    '<summary>More detail</summary>',
    '',
    'Hidden by default in source; useful for long notes in plans.',
    '',
    '</details>',
    '',
    '| Feature | Cursor | Here |',
    '|:--------|:------:|:----:|',
    '| Tables / strike | yes | yes |',
    '| Alerts | ext / GH | yes |',
    '| KaTeX `$` / `$$` | classic | yes |',
    '| Mermaid subset | native | yes |',
    '',
    '---',
    '',
    'Mixed EN/FA works. Hover or scroll either pane to keep them matched :sparkles:',
    '',
    '[^plan]: Tracked in the TDS consolidation plan.',
    '[cursor]: https://cursor.com/docs',
    '[agents]: ./AGENTS.md',
  ].join('\n');
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const FA_DIGITS = '\u06f0\u06f1\u06f2\u06f3\u06f4\u06f5\u06f6\u06f7\u06f8\u06f9';

const EMOJI: Record<string, string> = {
  rocket: '🚀',
  sparkles: '✨',
  warning: '⚠️',
  tip: '💡',
  note: '📝',
  check: '✅',
  x: '❌',
  fire: '🔥',
  tada: '🎉',
  bug: '🐛',
  book: '📖',
  link: '🔗',
  star: '⭐',
  heart: '❤️',
  eyes: '👀',
  wave: '👋',
  zap: '⚡',
  memo: '📝',
  bulb: '💡',
  heavy_check_mark: '✔️',
};

/** Direction of the first strong character (ignoring code/links/tags/urls). */
export function strongDir(t: unknown): Dir | null {
  const s = String(t || '')
    .replace(/`[^`\n]*`/g, ' ')
    .replace(/\]\([^)]*\)/g, ']')
    .replace(/<[^>]*>/g, ' ')
    .replace(/https?:\/\/\S+/g, ' ');
  const m = s.match(
    /[\u0590-\u08ff\ufb1d-\ufdff\ufe70-\ufefc]|[A-Za-z\u00c0-\u024f\u0370-\u03ff\u0400-\u04ff]/,
  );
  if (!m) return null;
  return /[\u0590-\u08ff\ufb1d-\ufdff\ufe70-\ufefc]/.test(m[0]) ? 'rtl' : 'ltr';
}

function attr(attrs: string, name: string): string {
  const re = new RegExp('(?:^|\\s)' + name + '\\s*=\\s*(?:"([^"]*)"|\'([^\']*)\'|([^\\s>]+))', 'i');
  const m = String(attrs || '').match(re);
  return m ? m[1] || m[2] || m[3] || '' : '';
}

function seg(kind: SegKind, t: string, fmt?: InlineFmt): Seg {
  return { kind, t, fmt: fmt || {}, href: '#', src: '', dir: 'auto', inner: [] };
}

function safeHref(u: string): string {
  if (/^(https?:|mailto:)/i.test(u) || /^#/.test(u) || /^\.\.?\/|^\/[A-Za-z]/.test(u)) return u;
  return '#';
}

function escXml(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function findClose(L: string[], start: number, tag: string): number {
  const open = new RegExp('^\\s*<' + tag + '\\b', 'i');
  const close = new RegExp('</' + tag + '\\s*>', 'i');
  const self = new RegExp('^\\s*<' + tag + '\\b[^>]*/>\\s*$', 'i');
  if (self.test(L[start])) return start;
  let depth = 0;
  for (let i = start; i < L.length; i++) {
    const line = L[i];
    if (open.test(line) && !self.test(line) && !/^\s*<\//.test(line)) depth++;
    if (close.test(line)) {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/* ------------------------------------------------------------------ */
/* Mermaid (custom SVG: flowchart + sequence)                          */
/* ------------------------------------------------------------------ */

interface FlowResult {
  ok: boolean;
  url?: string;
  err?: string;
  title: string;
}

function svgUrl(svg: string): string {
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

export function renderSequence(src: string): FlowResult {
  const lines = String(src || '')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !/^sequenceDiagram/i.test(l) && !l.startsWith('%%'));
  const actors: { id: string; label: string }[] = [];
  const seen: Record<string, boolean> = {};
  const msgs: { a: string; b: string; dash: boolean; label: string }[] = [];
  const ensure = (id: string, label?: string) => {
    if (!seen[id]) {
      seen[id] = true;
      actors.push({ id, label: label || id });
    } else if (label) {
      const a = actors.find((x) => x.id === id);
      if (a) a.label = label;
    }
  };
  lines.forEach((l) => {
    let m = l.match(/^participant\s+(\w+)(?:\s+as\s+(.+))?$/i);
    if (m) {
      ensure(m[1], m[2] || m[1]);
      return;
    }
    m = l.match(/^actor\s+(\w+)(?:\s+as\s+(.+))?$/i);
    if (m) {
      ensure(m[1], m[2] || m[1]);
      return;
    }
    m = l.match(/^(\w+)\s*(-->>|->>|-->|->)\s*(\w+)\s*:\s*(.+)$/);
    if (m) {
      ensure(m[1]);
      ensure(m[3]);
      msgs.push({ a: m[1], b: m[3], dash: m[2].indexOf('--') >= 0, label: m[4].trim() });
    }
  });
  if (!actors.length) return { ok: false, err: src, title: 'SEQUENCE' };
  const colW = 120,
    pad = 28,
    top = 36,
    rowH = 44;
  const W = pad * 2 + actors.length * colW;
  const H = top + 40 + msgs.length * rowH + 24;
  const pos: Record<string, number> = {};
  actors.forEach((a, i) => {
    pos[a.id] = pad + colW * i + colW / 2;
  });
  const parts: string[] = [
    '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '">',
  ];
  parts.push(
    '<defs><marker id="sarrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#0F766E"/></marker></defs>',
  );
  actors.forEach((a) => {
    const x = pos[a.id];
    parts.push(
      '<line x1="' + x + '" y1="' + (top + 18) + '" x2="' + x + '" y2="' + (H - 16) + '" stroke="#C9C2B4" stroke-dasharray="4 4"/>',
    );
    parts.push(
      '<rect x="' + (x - 48) + '" y="' + (top - 18) + '" width="96" height="32" rx="8" fill="#EAF5F2" stroke="#0F766E"/>',
    );
    parts.push(
      '<text x="' + x + '" y="' + (top + 3) + '" text-anchor="middle" font-family="IBM Plex Mono,monospace" font-size="12" font-weight="600" fill="#134E4A">' +
        escXml(a.label) +
        '</text>',
    );
  });
  msgs.forEach((msg, i) => {
    const y = top + 48 + i * rowH;
    const x1 = pos[msg.a],
      x2 = pos[msg.b];
    const dash = msg.dash ? ' stroke-dasharray="5 4"' : '';
    parts.push(
      '<line x1="' + x1 + '" y1="' + y + '" x2="' + x2 + '" y2="' + y + '" stroke="#0F766E" stroke-width="1.7"' + dash + ' marker-end="url(#sarrow)"/>',
    );
    parts.push(
      '<text x="' + (x1 + x2) / 2 + '" y="' + (y - 6) + '" text-anchor="middle" font-family="Vazirmatn,IBM Plex Mono,sans-serif" font-size="11.5" fill="#0F4C47">' +
        escXml(msg.label) +
        '</text>',
    );
  });
  parts.push('</svg>');
  return { ok: true, url: svgUrl(parts.join('')), title: 'SEQUENCE' };
}

interface FlowNode {
  id: string;
  label: string;
  shape: 'rect' | 'round' | 'diamond' | 'circle';
}

export function renderFlow(src: string): FlowResult {
  const raw = String(src || '');
  if (/^\s*sequenceDiagram\b/i.test(raw)) return renderSequence(raw);
  const lines = raw
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('%%'));
  if (!lines.length) return { ok: false, err: 'Empty diagram', title: 'MERMAID' };
  if (/^(classDiagram|stateDiagram|erDiagram|xychart)/i.test(lines[0])) {
    return {
      ok: false,
      err: 'Supported in Cursor classic Mermaid engine.\nNative subset here: flowchart + sequenceDiagram.\n\n' + raw,
      title: lines[0].split(/\s/)[0].toUpperCase(),
    };
  }
  let dir = 'TD';
  const nodes: Record<string, FlowNode> = {};
  const edges: { a: string; b: string; label: string }[] = [];
  const order: string[] = [];
  const head = lines[0].match(/^(?:flowchart|graph)\s+(TD|TB|BT|LR|RL)\b/i);
  let i = 0;
  if (head) {
    dir = head[1].toUpperCase();
    if (dir === 'TB') dir = 'TD';
    i = 1;
  } else if (/^(?:flowchart|graph)\b/i.test(lines[0])) i = 1;
  const ensure = (id: string, label?: string, shape?: FlowNode['shape']) => {
    if (!nodes[id]) {
      nodes[id] = { id, label: label || id, shape: shape || 'rect' };
      order.push(id);
    } else {
      if (label) nodes[id].label = label;
      if (shape) nodes[id].shape = shape;
    }
  };
  const nodeRe = /^([A-Za-z_][\w-]*)\s*(?:\[([^\]]*)\]|\(([^)]*)\)|\{([^}]*)\}|\(\(([^)]*)\)\))?$/;
  const edgeRe =
    /^([A-Za-z_][\w-]*)\s*(?:\[([^\]]*)\]|\(([^)]*)\)|\{([^}]*)\}|\(\(([^)]*)\)\))?\s*(-->|---|-.->|==>)\s*(?:\|([^|]*)\|\s*)?([A-Za-z_][\w-]*)\s*(?:\[([^\]]*)\]|\(([^)]*)\)|\{([^}]*)\}|\(\(([^)]*)\)\))?$/;
  for (; i < lines.length; i++) {
    const l = lines[i];
    let m = l.match(edgeRe);
    if (m) {
      const a = m[1],
        b = m[8];
      const al = m[2] || m[3] || m[4] || m[5];
      const bl = m[9] || m[10] || m[11] || m[12];
      const ash = m[4] ? 'diamond' : m[3] ? 'round' : m[5] ? 'circle' : 'rect';
      const bsh = m[11] ? 'diamond' : m[10] ? 'round' : m[12] ? 'circle' : 'rect';
      ensure(a, al, al ? ash : undefined);
      ensure(b, bl, bl ? bsh : undefined);
      edges.push({ a, b, label: (m[7] || '').trim() });
      continue;
    }
    m = l.match(nodeRe);
    if (m) {
      const lab = m[2] || m[3] || m[4] || m[5];
      const sh = m[4] ? 'diamond' : m[3] ? 'round' : m[5] ? 'circle' : 'rect';
      ensure(m[1], lab, lab ? sh : 'rect');
    }
  }
  const ids = order.length ? order : Object.keys(nodes);
  if (!ids.length) return { ok: false, err: src, title: 'FLOWCHART' };
  const children: Record<string, string[]> = {};
  ids.forEach((id) => {
    children[id] = [];
  });
  edges.forEach((e) => {
    if (children[e.a]) children[e.a].push(e.b);
  });
  const rank: Record<string, number> = {};
  const roots = ids.filter((id) => !edges.some((e) => e.b === id));
  const q = (roots.length ? roots : [ids[0]]).slice();
  q.forEach((id) => {
    rank[id] = 0;
  });
  // Guard against cycles (rank can never legitimately exceed the node count).
  while (q.length) {
    const u = q.shift() as string;
    (children[u] || []).forEach((v) => {
      const nr = (rank[u] || 0) + 1;
      if (nr > ids.length) return;
      if (rank[v] === undefined || nr > rank[v]) {
        rank[v] = nr;
        q.push(v);
      }
    });
  }
  ids.forEach((id) => {
    if (rank[id] === undefined) rank[id] = 0;
  });
  const levels: Record<number, string[]> = {};
  ids.forEach((id) => {
    const r = rank[id];
    if (!levels[r]) levels[r] = [];
    levels[r].push(id);
  });
  const isLR = dir === 'LR' || dir === 'RL';
  const nw = 132,
    nh = 44,
    gapX = 36,
    gapY = 54,
    pad = 28;
  const ranks = Object.keys(levels)
    .map(Number)
    .sort((a, b) => a - b);
  const pos: Record<string, { x: number; y: number; cx: number; cy: number }> = {};
  let maxX = 0,
    maxY = 0;
  ranks.forEach((r) => {
    const row = levels[r];
    row.forEach((id, idx) => {
      const x = isLR ? pad + r * (nw + gapX) : pad + idx * (nw + gapX);
      const y = isLR ? pad + idx * (nh + gapY) : pad + r * (nh + gapY);
      pos[id] = { x, y, cx: x + nw / 2, cy: y + nh / 2 };
      maxX = Math.max(maxX, x + nw);
      maxY = Math.max(maxY, y + nh);
    });
  });
  const W = maxX + pad,
    H = maxY + pad;
  const parts: string[] = [];
  parts.push('<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '">');
  parts.push(
    '<defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#0F766E"/></marker></defs>',
  );
  edges.forEach((e) => {
    const a = pos[e.a],
      b = pos[e.b];
    if (!a || !b) return;
    let x1 = a.cx,
      y1 = a.cy,
      x2 = b.cx,
      y2 = b.cy;
    if (isLR) {
      x1 = a.x + nw;
      x2 = b.x;
    } else {
      y1 = a.y + nh;
      y2 = b.y;
    }
    const mx = (x1 + x2) / 2,
      my = (y1 + y2) / 2;
    parts.push(
      '<path d="M' + x1 + ' ' + y1 + ' C' + mx + ' ' + y1 + ' ' + mx + ' ' + y2 + ' ' + x2 + ' ' + y2 + '" fill="none" stroke="#0F766E" stroke-width="1.8" marker-end="url(#arrow)"/>',
    );
    if (e.label)
      parts.push(
        '<rect x="' + (mx - e.label.length * 3.4 - 6) + '" y="' + (my - 10) + '" width="' + (e.label.length * 6.8 + 12) + '" height="18" rx="9" fill="#FFFEFA" stroke="#C9E4DC"/><text x="' + mx + '" y="' + (my + 3) + '" text-anchor="middle" font-family="IBM Plex Mono,monospace" font-size="11" fill="#0F4C47">' + escXml(e.label) + '</text>',
      );
  });
  ids.forEach((id) => {
    const n = nodes[id],
      p = pos[id];
    const label = n.label || id;
    if (n.shape === 'diamond') {
      const cx = p.cx,
        cy = p.cy,
        w = nw * 0.48,
        h = nh * 0.62;
      parts.push(
        '<polygon points="' + cx + ',' + (cy - h) + ' ' + (cx + w) + ',' + cy + ' ' + cx + ',' + (cy + h) + ' ' + (cx - w) + ',' + cy + '" fill="#EAF5F2" stroke="#0F766E" stroke-width="1.8"/>',
      );
    } else if (n.shape === 'circle') {
      parts.push(
        '<ellipse cx="' + p.cx + '" cy="' + p.cy + '" rx="' + nw * 0.36 + '" ry="' + nh * 0.48 + '" fill="#EAF5F2" stroke="#0F766E" stroke-width="1.8"/>',
      );
    } else {
      const rr = n.shape === 'round' ? 18 : 10;
      parts.push(
        '<rect x="' + p.x + '" y="' + p.y + '" width="' + nw + '" height="' + nh + '" rx="' + rr + '" fill="#EAF5F2" stroke="#0F766E" stroke-width="1.8"/>',
      );
    }
    parts.push(
      '<text x="' + p.cx + '" y="' + (p.cy + 4) + '" text-anchor="middle" font-family="Vazirmatn,IBM Plex Mono,sans-serif" font-size="12.5" font-weight="600" fill="#134E4A">' + escXml(label) + '</text>',
    );
  });
  parts.push('</svg>');
  return { ok: true, url: svgUrl(parts.join('')), title: 'FLOWCHART' };
}

/* ------------------------------------------------------------------ */
/* Engine                                                              */
/* ------------------------------------------------------------------ */

class MarkdownEngine {
  private linkRefs: Record<string, string> = {};
  private fnMap: Record<string, number> = {};

  /* ---------------- inline ---------------- */

  inline(input: string, f?: InlineFmt, depth = 0): Seg[] {
    const fmt: InlineFmt = f || {};
    const s = String(input || '');
    const refs = this.linkRefs;
    const fnMap = this.fnMap;
    const out: Seg[] = [];
    const re =
      /\\(?<esc>[\\`*_{}[\]()#+\-.!~|>$])|(?<bdiopen><bdi\b(?<bdia>[^>]*)>)(?<bdic>[\s\S]*?)<\/bdi\s*>|(?<kbd><kbd\b[^>]*>(?<kbdc>[\s\S]*?)<\/kbd\s*>)|(?<brtag><br\s*\/?>)|(?<tick>`+)(?<code>[\s\S]*?[^`])\k<tick>(?!`)|!\[(?<alt>[^\]]*)\]\((?<isrc>[^)\s]+)(?:\s+"[^"]*")?\)|\[(?<lt>[^\]]+)\]\((?<lhref>[^)\s]+)(?:\s+"[^"]*")?\)|\[(?<rlt>[^\]]+)\]\[(?<rid>[^\]]*)\]|\[\^(?<fnid>[^\]]+)\]|(?<imath>(?<![\\$])\$(?!\$)(?<imathc>(?:\\.|[^$\\])+?)\$(?!\$))|\*\*\*(?<bi>[\s\S]+?)\*\*\*|\*\*(?<b1>[\s\S]+?)\*\*|__(?<b2>[\s\S]+?)__|~~(?<st>[\s\S]+?)~~|\*(?<i1>[^\s*](?:[\s\S]*?[^\s*])?)\*|(?<![\p{L}\p{N}])_(?<i2>[^\s_](?:[\s\S]*?[^\s_])?)_(?![\p{L}\p{N}])|:(?<emo>[a-z0-9_+-]+):|<(?<al>https?:\/\/[^>\s]+)>|(?<url>https?:\/\/[^\s<]*[^\s<.,;:!?)\]'"\u060c\u061b])/gu;

    const txt = (t: string, ff: InlineFmt) => {
      if (!t) return;
      t.split(/(?: {2,}|\\)\n/).forEach((p, idx) => {
        if (idx > 0) out.push(seg('br', '', {}));
        const v = p.replace(/\n/g, ' ');
        if (v) out.push(seg('text', v, ff));
      });
    };

    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(s))) {
      if (m.index > last) txt(s.slice(last, m.index), fmt);
      const g = m.groups as Record<string, string | undefined>;
      if (g.esc !== undefined) txt(g.esc, fmt);
      else if (g.bdiopen !== undefined) {
        const d = (attr(g.bdia || '', 'dir') || 'auto').toLowerCase();
        const x = seg('bdi', '', fmt);
        x.dir = d === 'ltr' || d === 'rtl' ? d : 'auto';
        const content = g.bdic || '';
        x.inner = depth < 3 ? this.inline(content, fmt, depth + 1) : [seg('text', content.replace(/<[^>]+>/g, ''), fmt)];
        out.push(x);
      } else if (g.kbd !== undefined) out.push(seg('kbd', String(g.kbdc || '').replace(/<[^>]+>/g, ''), fmt));
      else if (g.brtag !== undefined) out.push(seg('br', '', {}));
      else if (g.tick !== undefined) {
        let c = (g.code || '').replace(/\n/g, ' ');
        if (c.length > 2 && c[0] === ' ' && c[c.length - 1] === ' ' && c.trim()) c = c.slice(1, -1);
        out.push(seg('code', c, fmt));
      } else if (g.alt !== undefined) {
        const isrc = g.isrc || '';
        if (/^(https?:|data:|\.\/|\/)/i.test(isrc)) {
          const x = seg('img', g.alt || 'image', fmt);
          x.src = isrc;
          out.push(x);
        } else out.push(seg('text', g.alt || '[image]', fmt));
      } else if (g.lt !== undefined) {
        const x = seg('link', g.lt.replace(/[*_~`]/g, ''), fmt);
        x.href = safeHref(g.lhref || '');
        out.push(x);
      } else if (g.rlt !== undefined) {
        const id = (g.rid || g.rlt).toLowerCase();
        const dest = refs[id] || '#';
        const x = seg('link', g.rlt.replace(/[*_~`]/g, ''), fmt);
        x.href = safeHref(dest);
        out.push(x);
      } else if (g.fnid !== undefined) {
        const id = g.fnid.toLowerCase();
        const n = fnMap[id] != null ? fnMap[id] : g.fnid;
        const x = seg('fn', String(n), fmt);
        x.href = 'fn-' + id;
        out.push(x);
      } else if (g.imath !== undefined) out.push(seg('math', g.imathc || '', fmt));
      else if (g.bi !== undefined) out.push(...this.inline(g.bi, { ...fmt, b: true, i: true }, depth));
      else if (g.b1 !== undefined || g.b2 !== undefined)
        out.push(...this.inline((g.b1 !== undefined ? g.b1 : g.b2) as string, { ...fmt, b: true }, depth));
      else if (g.st !== undefined) out.push(...this.inline(g.st, { ...fmt, s: true }, depth));
      else if (g.i1 !== undefined || g.i2 !== undefined)
        out.push(...this.inline((g.i1 !== undefined ? g.i1 : g.i2) as string, { ...fmt, i: true }, depth));
      else if (g.emo !== undefined) out.push(seg('text', EMOJI[g.emo] || ':' + g.emo + ':', fmt));
      else if (g.al || g.url) {
        const u = (g.al || g.url) as string;
        const x = seg('link', u, fmt);
        x.href = u;
        out.push(x);
      }
      last = re.lastIndex;
    }
    if (last < s.length) txt(s.slice(last), fmt);
    return out;
  }

  /* ---------------- block parser ---------------- */

  parse(src: string): ParseResult {
    const L = String(src).replace(/\r\n?/g, '\n').split('\n');
    const out: RawBlock[] = [];
    const footnotes: Footnote[] = [];
    const linkRefs: Record<string, string> = {};
    let i = 0;
    let force: Mode | null = null;
    const blank = (l: string) => /^\s*$/.test(l);
    const FENCE = /^ {0,3}(`{3,}|~{3,})[ \t]*([^\n`]*)$/;
    const HEAD = /^ {0,3}(#{1,6})(?:[ \t]+(.*?))?(?:[ \t]+#+)?[ \t]*$/;
    const HR = /^ {0,3}([-*_])(?:[ \t]*\1){2,}[ \t]*$/;
    const LIST = /^([ \t]*)([-*+]|\d{1,9}[.)]|[\u06f0-\u06f9]{1,9}[.)])[ \t]+(.*)$/;
    const QUOTE = /^ {0,3}>[ \t]?(.*)$/;
    const MATH = /^ {0,3}\$\$(.*)$/;
    const DIR = /^\s*<!--\s*dir\s*[:=]\s*(rtl|ltr|auto)\s*-->\s*$/i;
    const DIVOPEN = /^\s*<div\b([^>]*)>\s*$/i;
    const DETOPEN = /^\s*<details\b([^>]*)>\s*$/i;
    const FNDEF = /^\s*\[\^([^\]]+)\]:\s*(.*)$/;
    const REFDEF = /^\s*\[([^\]]+)\]:\s*(\S+)(?:\s+"([^"]*)")?\s*$/;
    const ALERT = /^\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*(.*)$/i;
    const SEP = /^[ \t]*\|?[ \t]*:?-+:?[ \t]*(?:\|[ \t]*:?-+:?[ \t]*)*\|?[ \t]*$/;
    const INDENT = /^(?: {4}|\t)/;
    const isTable = (k: number) =>
      L[k] !== undefined &&
      L[k].indexOf('|') >= 0 &&
      L[k + 1] !== undefined &&
      L[k + 1].indexOf('|') >= 0 &&
      SEP.test(L[k + 1]);
    const isList = (l: string) => LIST.test(l) && !HR.test(l);
    const starts = (k: number) => {
      const l = L[k];
      return (
        FENCE.test(l) ||
        HEAD.test(l) ||
        HR.test(l) ||
        QUOTE.test(l) ||
        isList(l) ||
        MATH.test(l) ||
        DIR.test(l) ||
        DIVOPEN.test(l) ||
        DETOPEN.test(l) ||
        FNDEF.test(l) ||
        REFDEF.test(l) ||
        isTable(k)
      );
    };
    const push = (b: PushInput, from: number, to: number) => {
      out.push({ ...b, force, from, to } as RawBlock);
      force = null;
    };
    const cells = (l: string) => {
      let s = l.trim();
      if (s.startsWith('|')) s = s.slice(1);
      if (s.endsWith('|') && !s.endsWith('\\|')) s = s.slice(0, -1);
      return s.split(/(?<!\\)\|/).map((c) => c.trim());
    };

    if (L[0] === '---') {
      const fm: string[] = [];
      let j = 1;
      while (j < L.length && L[j] !== '---') {
        fm.push(L[j]);
        j++;
      }
      if (j < L.length && L[j] === '---') {
        push({ k: 'front', text: fm.join('\n'), raw: '' }, 1, j + 1);
        i = j + 1;
      }
    }

    while (i < L.length) {
      const l = L[i];
      let m: RegExpMatchArray | null;
      if (blank(l)) {
        i++;
        continue;
      }
      if ((m = l.match(FNDEF))) {
        const from = i + 1;
        const buf = [m[2] || ''];
        i++;
        while (i < L.length && /^\s{2,}\S/.test(L[i])) {
          buf.push(L[i].trim());
          i++;
        }
        footnotes.push({ id: m[1], text: buf.join(' '), from, to: i });
        continue;
      }
      if ((m = l.match(REFDEF))) {
        linkRefs[m[1].toLowerCase()] = m[2];
        i++;
        continue;
      }
      if ((m = l.match(DIR))) {
        force = m[1].toLowerCase() as Mode;
        i++;
        continue;
      }
      if ((m = l.match(DETOPEN))) {
        const from = i + 1;
        const end = findClose(L, i, 'details');
        if (end < 0) {
          push({ k: 'p', text: l, raw: l }, from, from);
          i++;
          continue;
        }
        const innerLines = L.slice(i + 1, end);
        let summary = 'Details';
        const body: string[] = [];
        innerLines.forEach((line) => {
          const sm = line.match(/^\s*<summary\b[^>]*>([\s\S]*?)<\/summary\s*>\s*$/i);
          if (sm) summary = sm[1].replace(/<[^>]+>/g, '');
          else if (!/^\s*<\/?summary\b/i.test(line)) body.push(line);
        });
        const paras = body
          .join('\n')
          .split(/\n\s*\n/)
          .map((p) => p.trim())
          .filter(Boolean);
        push(
          { k: 'details', summary, paras: paras.length ? paras : [''], open: /\bopen\b/i.test(m[1] || ''), raw: paras.join(' ') },
          from,
          end + 1,
        );
        i = end + 1;
        continue;
      }
      if ((m = l.match(DIVOPEN))) {
        const from = i + 1;
        const end = findClose(L, i, 'div');
        const attrs = m[1] || '';
        const dirAttr = (attr(attrs, 'dir') || '').toLowerCase();
        const lang = attr(attrs, 'lang') || '';
        if (end < 0) {
          push({ k: 'p', text: l, raw: l }, from, from);
          i++;
          continue;
        }
        const inner = L.slice(i + 1, end).join('\n');
        const childForce: Mode | null = dirAttr === 'rtl' || dirAttr === 'ltr' ? dirAttr : force || null;
        const innerParsed = this.parse(inner);
        const offset = i + 1;
        const kids = innerParsed.blocks.map((c) => {
          if (childForce && !c.force) c.force = childForce;
          c.from += offset;
          c.to += offset;
          return c;
        });
        push({ k: 'wrap', dir: childForce || 'auto', lang, kids, raw: inner }, from, end + 1);
        i = end + 1;
        continue;
      }
      if ((m = l.match(FENCE))) {
        const from = i + 1;
        const fc = m[1];
        const info = String(m[2] || '').trim();
        const close = new RegExp('^ {0,3}' + (fc[0] === '`' ? '`' : '~') + '{' + fc.length + ',}[ \\t]*$');
        const buf: string[] = [];
        i++;
        while (i < L.length && !close.test(L[i])) {
          buf.push(L[i]);
          i++;
        }
        const to = i + 1;
        i++;
        const cite = info.match(/^(\d+):(\d+):(.+)$/);
        const lang = (info.split(/\s+/)[0] || '').toLowerCase();
        if (cite)
          push(
            { k: 'cite', start: parseInt(cite[1], 10), end: parseInt(cite[2], 10), path: cite[3].trim(), text: buf.join('\n'), raw: '' },
            from,
            to,
          );
        else if (lang === 'mermaid' || lang === 'flowchart') push({ k: 'flow', text: buf.join('\n'), raw: '' }, from, to);
        else push({ k: 'code', lang: info.split(/\s+/)[0] || '', text: buf.join('\n'), raw: '' }, from, to);
        continue;
      }
      if ((m = l.match(MATH))) {
        const from = i + 1;
        const t = m[1].trim();
        if (t.length >= 2 && t.endsWith('$$')) {
          push({ k: 'math', text: t.slice(0, -2).trim(), raw: '' }, from, from);
          i++;
          continue;
        }
        const buf: string[] = [];
        if (t) buf.push(m[1]);
        i++;
        while (i < L.length) {
          const x = L[i],
            j = x.indexOf('$$');
          if (j >= 0) {
            if (x.slice(0, j).trim()) buf.push(x.slice(0, j));
            i++;
            break;
          }
          buf.push(x);
          i++;
        }
        push({ k: 'math', text: buf.join('\n'), raw: '' }, from, i);
        continue;
      }
      if ((m = l.match(HEAD))) {
        push({ k: 'h', level: m[1].length, text: m[2] || '', raw: m[2] || '' }, i + 1, i + 1);
        i++;
        continue;
      }
      if (HR.test(l)) {
        push({ k: 'hr', raw: '' }, i + 1, i + 1);
        i++;
        continue;
      }
      if (isTable(i)) {
        const from = i + 1;
        const head = cells(l);
        const al = cells(L[i + 1]).map((c) => {
          const a = c.startsWith(':'),
            b = c.endsWith(':');
          return a && b ? 'center' : b ? 'right' : a ? 'left' : 'start';
        });
        i += 2;
        const rows: string[][] = [];
        while (i < L.length && !blank(L[i]) && L[i].indexOf('|') >= 0) {
          rows.push(cells(L[i]));
          i++;
        }
        push({ k: 'table', head, al, rows, raw: head.join(' ') + ' ' + rows.map((r) => r.join(' ')).join(' ') }, from, i);
        continue;
      }
      if (QUOTE.test(l)) {
        const from = i + 1;
        const buf: string[] = [];
        while (i < L.length) {
          const q = L[i].match(QUOTE);
          if (q) {
            buf.push(q[1]);
            i++;
          } else if (!blank(L[i]) && buf.length && !blank(buf[buf.length - 1]) && !starts(i)) {
            buf.push(L[i]);
            i++;
          } else break;
        }
        const paras: string[] = [];
        let cur: string[] = [];
        buf.forEach((x) => {
          if (blank(x)) {
            if (cur.length) {
              paras.push(cur.join('\n'));
              cur = [];
            }
          } else cur.push(x.replace(/^>\s?/, ''));
        });
        if (cur.length) paras.push(cur.join('\n'));
        const alertM = paras[0] && String(paras[0]).trim().match(ALERT);
        if (alertM) {
          const kind = alertM[1].toLowerCase();
          const rest = paras.slice(1);
          if (alertM[2] && alertM[2].trim()) rest.unshift(alertM[2].trim());
          push({ k: 'alert', kind, paras: rest.length ? rest : [''], raw: rest.join(' ') }, from, i);
        } else {
          push({ k: 'quote', paras, raw: paras.join(' ') }, from, i);
        }
        continue;
      }
      if (isList(l)) {
        const from = i + 1;
        const items: RawItem[] = [];
        while (i < L.length) {
          const x = L[i];
          const lm = x.match(LIST);
          if (lm && !HR.test(x)) {
            items.push({ indent: lm[1].replace(/\t/g, '    ').length, mk: lm[2], text: lm[3] });
            i++;
            continue;
          }
          if (blank(x)) {
            let j = i + 1;
            while (j < L.length && blank(L[j])) j++;
            if (j < L.length && isList(L[j])) {
              i = j;
              continue;
            }
            break;
          }
          if (items.length && (/^[ \t]{2,}\S/.test(x) || !starts(i))) {
            items[items.length - 1].text += '\n' + x.trim();
            i++;
            continue;
          }
          break;
        }
        push({ k: 'list', items, raw: items.map((x) => x.text).join(' ') }, from, i);
        continue;
      }
      if (INDENT.test(l)) {
        const from = i + 1;
        const buf: string[] = [];
        while (i < L.length && (INDENT.test(L[i]) || blank(L[i]))) {
          buf.push(L[i].replace(INDENT, ''));
          i++;
        }
        while (buf.length && blank(buf[buf.length - 1])) buf.pop();
        push({ k: 'code', lang: '', text: buf.join('\n'), raw: '' }, from, i);
        continue;
      }
      const from = i + 1;
      const buf = [l];
      i++;
      let done = false;
      while (i < L.length && !blank(L[i])) {
        if (/^ {0,3}=+[ \t]*$/.test(L[i]) || /^ {0,3}-+[ \t]*$/.test(L[i])) {
          const lvl = L[i].trim()[0] === '=' ? 1 : 2;
          push({ k: 'h', level: lvl, text: buf.join(' '), raw: buf.join(' ') }, from, i + 1);
          i++;
          done = true;
          break;
        }
        if (starts(i)) break;
        buf.push(L[i]);
        i++;
      }
      if (!done) push({ k: 'p', text: buf.join('\n'), raw: buf.join(' ') }, from, i);
    }
    return { blocks: out, footnotes, linkRefs };
  }

  /* ---------------- block → view model ---------------- */

  mapBlock(
    b: RawBlock,
    idx: number,
    mode: Mode,
    prevRef: { v: Dir },
    counts: DirCounts,
    nest: string,
  ): BlockView {
    const locked = b.k === 'code' || b.k === 'math' || b.k === 'flow' || b.k === 'cite' || b.k === 'front';
    let dir: Dir;
    let how: 'forced' | 'mode' | 'auto' | 'lock';
    if (b.k === 'wrap') {
      const forced = !!b.dir && b.dir !== 'auto';
      dir = forced ? (b.dir as Dir) : mode !== 'auto' ? mode : strongDir(b.raw) || prevRef.v;
      how = forced ? 'forced' : mode !== 'auto' ? 'mode' : 'auto';
      prevRef.v = dir;
      counts[dir]++;
    } else if (locked) {
      dir = 'ltr';
      how = 'lock';
      counts.lock++;
    } else if (b.force && b.force !== 'auto') {
      dir = b.force;
      how = 'forced';
      prevRef.v = dir;
      counts[dir]++;
    } else if (mode !== 'auto') {
      dir = mode;
      how = 'mode';
      prevRef.v = dir;
      counts[dir]++;
    } else {
      dir = strongDir(b.raw) || prevRef.v;
      how = 'auto';
      prevRef.v = dir;
      counts[dir]++;
    }

    const fa = (n: number, d: Dir) =>
      d === 'rtl' ? String(n).replace(/\d/g, (x) => FA_DIGITS[Number(x)]) : String(n);
    const bullets = ['•', '◦', '▪'];
    const alertLabels: Record<string, string> = {
      note: 'Note',
      tip: 'Tip',
      important: 'Important',
      warning: 'Warning',
      caution: 'Caution',
    };
    const key = nest + idx;
    const v: BlockView = {
      kind: b.k as BlockKind,
      key,
      from: b.from || 1,
      to: b.to || b.from || 1,
      dir,
      lang: b.lang || '',
      tone: locked ? 'lock' : how === 'forced' ? 'forced' : dir,
      badge: locked
        ? b.k === 'flow'
          ? 'FLOW · LTR'
          : b.k === 'cite'
            ? 'CITE · LTR'
            : b.k === 'front'
              ? 'YAML'
              : 'LTR · LOCKED'
        : how === 'forced'
          ? dir.toUpperCase() + ' · FORCED'
          : dir.toUpperCase(),
      level: 0,
      segs: [],
      items: [],
      paras: [],
      lines: [],
      head: [],
      rows: [],
      children: [],
      ncols: 1,
      text: '',
      copyKey: '',
      flowOk: false,
      svgUrl: '',
      flowErr: '',
      flowTitle: 'FLOWCHART',
      alertKind: 'note',
      alertLabel: 'Note',
      range: '',
      path: '',
      summary: '',
      open: false,
    };

    if (b.k === 'wrap') {
      v.lang = b.lang || '';
      v.children = (b.kids || []).map((kid, n) =>
        this.mapBlock(kid, n, mode, { v: dir }, { rtl: 0, ltr: 0, lock: 0 }, key + 'c'),
      );
    } else if (b.k === 'h') {
      v.level = Math.min(4, b.level || 1);
      v.segs = this.inline(b.text || '');
    } else if (b.k === 'p') {
      v.segs = this.inline(b.text || '');
    } else if (b.k === 'list') {
      const stack: number[] = [];
      const counters: (number | undefined)[] = [];
      v.items = (b.items || []).map((it, n) => {
        while (stack.length && it.indent < stack[stack.length - 1]) stack.pop();
        if (!stack.length || it.indent > stack[stack.length - 1]) stack.push(it.indent);
        const depth = stack.length - 1;
        counters.length = depth + 1;
        const ordered = /[\d\u06f0-\u06f9]/.test(it.mk);
        let marker: string;
        if (ordered) {
          const seed = parseInt(
            String(it.mk).replace(/[\u06f0-\u06f9]/g, (ch) => String(FA_DIGITS.indexOf(ch))),
            10,
          );
          const cur = counters[depth];
          const next: number = cur === undefined ? seed || 1 : cur + 1;
          counters[depth] = next;
          marker = fa(next, dir) + '.';
        } else {
          counters[depth] = undefined;
          marker = bullets[depth % 3];
        }
        const tm = it.text.match(/^\[([ xX]?)\][ \t]*(.*)$/);
        const isTask = !!tm && !ordered;
        const isDone = isTask && tm![1] !== ' ';
        return {
          key: 'i' + n,
          pad: depth * 26,
          marker,
          isTask,
          isDone,
          taskLabel: isDone ? 'Done' : 'Not done',
          segs: this.inline(isTask ? tm![2] : it.text),
        };
      });
    } else if (b.k === 'quote') {
      v.paras = (b.paras || []).map((p, n) => ({ key: 'q' + n, segs: this.inline(p) }));
    } else if (b.k === 'alert') {
      v.alertKind = b.kind || 'note';
      v.alertLabel = alertLabels[v.alertKind] || 'Note';
      v.paras = (b.paras || []).map((p, n) => ({ key: 'q' + n, segs: this.inline(p) }));
    } else if (b.k === 'front') {
      v.text = b.text || '';
    } else if (b.k === 'cite') {
      v.path = b.path || '';
      v.range = 'L' + b.start + '–' + b.end;
      const text = b.text || '';
      v.text = text;
      v.copyKey = v.key + ':cite:' + text.length;
      const start = b.start || 1;
      v.lines = text.split('\n').map((t, n) => ({ key: 'l' + n, n: start + n, t: t === '' ? ' ' : t }));
    } else if (b.k === 'details') {
      v.summary = b.summary || 'Details';
      v.open = !!b.open;
      v.paras = (b.paras || []).map((p, n) => ({ key: 'q' + n, segs: this.inline(p) }));
    } else if (b.k === 'code') {
      v.lang = b.lang || 'text';
      const text = b.text || '';
      v.text = text;
      v.copyKey = v.key + ':' + text.length;
      v.lines = text.split('\n').map((t, n) => ({ key: 'l' + n, n: n + 1, t: t === '' ? ' ' : t }));
    } else if (b.k === 'flow') {
      const flow = renderFlow(b.text || '');
      v.flowOk = flow.ok;
      v.svgUrl = flow.url || '';
      v.flowErr = flow.err || b.text || '';
      v.flowTitle = flow.title || 'MERMAID';
    } else if (b.k === 'math') {
      v.text = b.text || '';
    } else if (b.k === 'table') {
      const head = b.head || [];
      const al = b.al || [];
      const nc = Math.max(1, head.length);
      v.ncols = nc;
      const alignOf = (c: number) => al[c] || 'start';
      v.head = head.map((h, c) => ({ key: 'h' + c, align: alignOf(c), segs: this.inline(h) }));
      v.rows = (b.rows || []).map((r, n) => {
        const cellsArr: CellView[] = [];
        for (let c = 0; c < nc; c++) cellsArr.push({ key: 'c' + c, align: alignOf(c), segs: this.inline(r[c] || '') });
        return { key: 'r' + n, odd: n % 2 === 1, cells: cellsArr };
      });
    }
    return v;
  }

  model(src: string, mode: Mode): DocModel {
    const parsed = this.parse(src);
    this.linkRefs = parsed.linkRefs;
    const fnList = parsed.footnotes;
    this.fnMap = {};
    fnList.forEach((fn, i) => {
      this.fnMap[String(fn.id).toLowerCase()] = i + 1;
    });
    const docDir = strongDir(src) || 'ltr';
    const prevRef = { v: docDir };
    const counts: DirCounts = { rtl: 0, ltr: 0, lock: 0 };
    const blocks = parsed.blocks.map((b, idx) => this.mapBlock(b, idx, mode, prevRef, counts, 'b'));
    const footnotes: FootnoteView[] = fnList.map((fn, i) => ({
      key: 'fn' + i,
      n: i + 1,
      aid: 'fn-' + String(fn.id).toLowerCase(),
      segs: this.inline(fn.text || ''),
    }));
    return { blocks, counts, footnotes };
  }
}

/** Parse + map source into the render model used by the React preview. */
export function buildModel(src: string, mode: Mode): DocModel {
  return new MarkdownEngine().model(src, mode);
}
