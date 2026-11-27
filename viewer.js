class Component extends DCLogic {
  constructor(props) {
    super(props);
    this.state = { src: this.sample(), mode: 'auto', edDir: 'auto', guides: false, srcOpen: true, copied: null, pasteFlash: null, hoverKey: null, edScroll: 0, caretLine: 0 };
    this.onInput = (e) => this.setState({ src: e.target.value, caretLine: this.lineAt(e.target) });
    this.onEdScroll = (e) => {
      this.setState({ edScroll: e.target.scrollTop });
      if (this._syncing === 'pv') return;
      this.syncFromEditor(e.target);
    };
    this.onPvScroll = (e) => {
      if (this._syncing === 'ed') return;
      this.syncFromPreview(e.target);
    };
    this.onEdCaret = (e) => this.setState({ caretLine: this.lineAt(e.target), hoverKey: this.keyAtLine(this.lineAt(e.target)) });
    this.toggleGuides = () => this.setState({ guides: !this.state.guides });
    this.toggleSrc = () => {
      const next = !this.state.srcOpen;
      this.setState({ srcOpen: next });
      try { window.localStorage.setItem('rtl-md-viewer:srcOpen', next ? '1' : '0'); } catch (e) {}
    };
    this.loadSample = () => this.setState({ src: this.sample(), hoverKey: null });
    this.clearAll = () => this.setState({ src: '', hoverKey: null, caretLine: 0 });
    this.copySrc = () => this.copyText(this.state.src || '', 'src');
    this.exportPdf = () => { try { window.print(); } catch (e) {} };
    this.pasteClip = () => this.doPaste();
    this.cycleEdDir = () => {
      const next = { auto: 'rtl', rtl: 'ltr', ltr: 'auto' };
      this.setState({ edDir: next[this.state.edDir] || 'auto' });
    };
    this.picks = {
      auto: () => this.setState({ mode: 'auto' }),
      rtl: () => this.setState({ mode: 'rtl' }),
      ltr: () => this.setState({ mode: 'ltr' })
    };
    this._leave = () => this.setState({ hoverKey: null });
    this._syncing = null;
  }

  componentDidMount() {
    try {
      const saved = window.localStorage.getItem('rtl-md-viewer:v2');
      if (saved !== null && saved.trim() !== '') this.setState({ src: saved });
      const srcOpen = window.localStorage.getItem('rtl-md-viewer:srcOpen');
      if (srcOpen === '0') this.setState({ srcOpen: false });
    } catch (e) {}
    setTimeout(() => this.renderKatex(), 200);
    setTimeout(() => this.renderKatex(), 800);
  }

  componentDidUpdate(pp, ps) {
    if (ps.src !== this.state.src) {
      try { window.localStorage.setItem('rtl-md-viewer:v2', this.state.src); } catch (e) {}
    }
    this.renderKatex();
  }

  renderKatex() {
    if (!window.katex) return;
    const nodes = document.querySelectorAll('.mt[data-tex], .mathi[data-tex]');
    for (let i = 0; i < nodes.length; i++) {
      const el = nodes[i];
      const tex = el.getAttribute('data-tex') || '';
      const display = el.classList.contains('mt');
      const target = display ? (el.querySelector('.mtx') || el) : el;
      if (!tex || !target) continue;
      try {
        window.katex.render(tex, target, { displayMode: display, throwOnError: false, strict: 'ignore' });
      } catch (e) {}
    }
  }

  componentWillUnmount() {
    clearTimeout(this._t);
    clearTimeout(this._pt);
    clearTimeout(this._syncT);
  }

  lineH(ta) {
    const cs = window.getComputedStyle(ta);
    const lh = parseFloat(cs.lineHeight);
    if (lh && !isNaN(lh)) return lh;
    const fs = parseFloat(cs.fontSize) || 14;
    return fs * 1.8;
  }

  padTop(el) {
    return parseFloat(window.getComputedStyle(el).paddingTop) || 0;
  }

  lineAt(el) {
    if (!el) return 0;
    const v = el.value || '';
    const pos = Math.max(0, Math.min(el.selectionStart || 0, v.length));
    return v.slice(0, pos).split('\n').length;
  }

  lineFromScroll(ta, anchorY) {
    const lh = this.lineH(ta);
    const pt = this.padTop(ta);
    const total = Math.max(1, (ta.value || '').split('\n').length);
    const line = Math.floor((anchorY - pt) / lh) + 1;
    return Math.max(1, Math.min(total, line));
  }

  scrollTopForLine(ta, line, ratioInView) {
    const lh = this.lineH(ta);
    const pt = this.padTop(ta);
    const y = pt + (Math.max(1, line) - 1) * lh;
    return Math.max(0, y - ta.clientHeight * (ratioInView == null ? 0.25 : ratioInView));
  }

  blockAtLine(line) {
    const pm = this._pm;
    if (!pm || !pm.blocks || !pm.blocks.length) return null;
    let fallback = pm.blocks[0];
    for (let i = 0; i < pm.blocks.length; i++) {
      const b = pm.blocks[i];
      if (line >= b.from && line <= b.to) return b;
      if (b.from <= line) fallback = b;
    }
    return fallback;
  }

  keyAtLine(line) {
    const b = this.blockAtLine(line);
    return b ? b.key : null;
  }

  endSync() {
    clearTimeout(this._syncT);
    this._syncT = setTimeout(() => { this._syncing = null; }, 100);
  }

  syncFromEditor(ta) {
    const pv = document.getElementById('pv-scroll');
    if (!pv || !this._pm || !this._pm.blocks.length) return;
    const maxE = ta.scrollHeight - ta.clientHeight;
    const maxP = pv.scrollHeight - pv.clientHeight;
    if (maxE <= 0 || maxP <= 0) {
      this._syncing = 'ed';
      pv.scrollTop = 0;
      this.endSync();
      return;
    }
    const anchorRatio = 0.28;
    const anchor = ta.scrollTop + ta.clientHeight * anchorRatio;
    const line = this.lineFromScroll(ta, anchor);
    const b = this.blockAtLine(line);
    const el = b ? pv.querySelector('.blk[data-k="' + b.key + '"]') : null;
    this._syncing = 'ed';
    if (el && b) {
      const span = Math.max(1, b.to - b.from + 1);
      const local = Math.max(0, Math.min(1, (line - b.from) / span));
      const target = el.offsetTop + el.offsetHeight * local - pv.clientHeight * anchorRatio;
      pv.scrollTop = Math.max(0, Math.min(maxP, target));
    } else {
      pv.scrollTop = (ta.scrollTop / maxE) * maxP;
    }
    this.endSync();
  }

  syncFromPreview(pv) {
    const ta = document.getElementById('md-src');
    if (!ta || !this._pm || !this._pm.blocks.length) return;
    const maxE = ta.scrollHeight - ta.clientHeight;
    const maxP = pv.scrollHeight - pv.clientHeight;
    if (maxE <= 0 || maxP <= 0) {
      this._syncing = 'pv';
      ta.scrollTop = 0;
      this.setState({ edScroll: 0 });
      this.endSync();
      return;
    }
    const anchorRatio = 0.28;
    const anchor = pv.scrollTop + pv.clientHeight * anchorRatio;
    const nodes = pv.querySelectorAll('.blk[data-k]');
    let hit = null;
    for (let i = 0; i < nodes.length; i++) {
      const el = nodes[i];
      if (el.offsetTop + el.offsetHeight >= anchor) { hit = el; break; }
      hit = el;
    }
    this._syncing = 'pv';
    if (hit) {
      const key = hit.getAttribute('data-k');
      const from = parseInt(hit.getAttribute('data-from'), 10) || 1;
      const to = parseInt(hit.getAttribute('data-to'), 10) || from;
      const span = Math.max(1, to - from + 1);
      const local = Math.max(0, Math.min(1, (anchor - hit.offsetTop) / Math.max(1, hit.offsetHeight)));
      const line = from + local * (span - 1);
      const next = this.scrollTopForLine(ta, line, anchorRatio);
      ta.scrollTop = Math.max(0, Math.min(maxE, next));
      this.setState({ edScroll: ta.scrollTop });
    } else {
      const next = (pv.scrollTop / maxP) * maxE;
      ta.scrollTop = next;
      this.setState({ edScroll: next });
    }
    this.endSync();
  }

  doPaste() {
    const flash = (ok) => {
      this.setState({ pasteFlash: ok ? 'ok' : 'x' });
      clearTimeout(this._pt);
      this._pt = setTimeout(() => this.setState({ pasteFlash: null }), 1400);
    };
    const apply = (t) => {
      if (typeof t !== 'string') { flash(false); return; }
      this.setState({ src: t, hoverKey: null });
      flash(true);
    };
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        navigator.clipboard.readText().then(apply, () => flash(false));
      } else { flash(false); }
    } catch (e) { flash(false); }
  }

  copyText(text, key) {
    const flash = (k) => {
      this.setState({ copied: k });
      clearTimeout(this._t);
      this._t = setTimeout(() => this.setState({ copied: null }), 1500);
    };
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => flash(key), () => flash(key + ':x'));
      } else { flash(key + ':x'); }
    } catch (e) { flash(key + ':x'); }
  }

  label(key) {
    const c = this.state.copied;
    return c === key ? 'Copied' : c === key + ':x' ? 'Blocked' : 'Copy';
  }

  sample() {
    return [
      '---',
      'title: RTL Markdown Viewer',
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
      '[agents]: ./AGENTS.md'
    ].join('\n');
  }

  strong(t) {
    const s = String(t || '')
      .replace(/`[^`\n]*`/g, ' ')
      .replace(/\]\([^)]*\)/g, ']')
      .replace(/<[^>]*>/g, ' ')
      .replace(/https?:\/\/\S+/g, ' ');
    const m = s.match(/[֐-ࣿיִ-﷿ﹰ-ﻼ]|[A-Za-zÀ-ɏͰ-ϿЀ-ӿ]/);
    if (!m) return null;
    return /[֐-ࣿיִ-﷿ﹰ-ﻼ]/.test(m[0]) ? 'rtl' : 'ltr';
  }

  attr(attrs, name) {
    const re = new RegExp('(?:^|\\s)' + name + '\\s*=\\s*(?:"([^"]*)"|\'([^\']*)\'|([^\\s>]+))', 'i');
    const m = String(attrs || '').match(re);
    return m ? (m[1] || m[2] || m[3] || '') : '';
  }

  seg(kind, t, f) {
    f = f || {};
    return {
      t: t, isText: kind === 'text', isCode: kind === 'code', isLink: kind === 'link', isImg: kind === 'img', isBr: kind === 'br', isBdi: kind === 'bdi',
      isMath: kind === 'math', isKbd: kind === 'kbd', isFn: kind === 'fn',
      fw: f.b ? '700' : 'inherit', fs: f.i ? 'italic' : 'inherit', td: f.s ? 'line-through' : 'none',
      href: '#', src: '', dir: 'auto', inner: []
    };
  }

  href(u) {
    if (/^(https?:|mailto:)/i.test(u) || /^#/.test(u) || /^\.\.?\/|^\/[A-Za-z]/.test(u)) return u;
    return '#';
  }

  emojiMap() {
    return {
      rocket: '🚀', sparkles: '✨', warning: '⚠️', tip: '💡', note: '📝', check: '✅', x: '❌',
      fire: '🔥', tada: '🎉', bug: '🐛', book: '📖', link: '🔗', star: '⭐', heart: '❤️',
      eyes: '👀', wave: '👋', zap: '⚡', memo: '📝', bulb: '💡', heavy_check_mark: '✔️'
    };
  }

  inline(s, f, depth) {
    f = f || {};
    depth = depth || 0;
    s = String(s || '');
    const refs = this._linkRefs || {};
    const fnMap = this._fnMap || {};
    const em = this.emojiMap();
    const out = [];
    const re = /\\(?<esc>[\\`*_{}\[\]()#+\-.!~|>$])|(?<bdiopen><bdi\b(?<bdia>[^>]*)>)(?<bdic>[\s\S]*?)<\/bdi\s*>|(?<kbd><kbd\b[^>]*>(?<kbdc>[\s\S]*?)<\/kbd\s*>)|(?<brtag><br\s*\/?>)|(?<tick>`+)(?<code>[\s\S]*?[^`])\k<tick>(?!`)|!\[(?<alt>[^\]]*)\]\((?<isrc>[^)\s]+)(?:\s+"[^"]*")?\)|\[(?<lt>[^\]]+)\]\((?<lhref>[^)\s]+)(?:\s+"[^"]*")?\)|\[(?<rlt>[^\]]+)\]\[(?<rid>[^\]]*)\]|\[\^(?<fnid>[^\]]+)\]|(?<imath>(?<![\\$])\$(?!\$)(?<imathc>(?:\\.|[^$\\])+?)\$(?!\$))|\*\*\*(?<bi>[\s\S]+?)\*\*\*|\*\*(?<b1>[\s\S]+?)\*\*|__(?<b2>[\s\S]+?)__|~~(?<st>[\s\S]+?)~~|\*(?<i1>[^\s*](?:[\s\S]*?[^\s*])?)\*|(?<![\p{L}\p{N}])_(?<i2>[^\s_](?:[\s\S]*?[^\s_])?)_(?![\p{L}\p{N}])|:(?<emo>[a-z0-9_+-]+):|<(?<al>https?:\/\/[^>\s]+)>|(?<url>https?:\/\/[^\s<]*[^\s<.,;:!?)\]'"،؛])/gu;
    const txt = (t, ff) => {
      if (!t) return;
      t.split(/(?: {2,}|\\)\n/).forEach((p, idx) => {
        if (idx > 0) out.push(this.seg('br', '', {}));
        const v = p.replace(/\n/g, ' ');
        if (v) out.push(this.seg('text', v, ff));
      });
    };
    let last = 0, m;
    while ((m = re.exec(s))) {
      if (m.index > last) txt(s.slice(last, m.index), f);
      const g = m.groups;
      if (g.esc !== undefined) txt(g.esc, f);
      else if (g.bdiopen !== undefined) {
        const dir = (this.attr(g.bdia, 'dir') || 'auto').toLowerCase();
        const x = this.seg('bdi', '', f);
        x.dir = dir === 'ltr' || dir === 'rtl' ? dir : 'auto';
        x.inner = depth < 3 ? this.inline(g.bdic, f, depth + 1) : [this.seg('text', g.bdic.replace(/<[^>]+>/g, ''), f)];
        out.push(x);
      }
      else if (g.kbd !== undefined) out.push(this.seg('kbd', String(g.kbdc || '').replace(/<[^>]+>/g, ''), f));
      else if (g.brtag !== undefined) out.push(this.seg('br', '', {}));
      else if (g.tick !== undefined) {
        let c = g.code.replace(/\n/g, ' ');
        if (c.length > 2 && c[0] === ' ' && c[c.length - 1] === ' ' && c.trim()) c = c.slice(1, -1);
        out.push(this.seg('code', c, f));
      }
      else if (g.alt !== undefined) {
        if (/^(https?:|data:|\.\/|\/)/i.test(g.isrc)) { const x = this.seg('img', g.alt || 'image', f); x.src = g.isrc; out.push(x); }
        else out.push(this.seg('text', g.alt || '[image]', f));
      }
      else if (g.lt !== undefined) { const x = this.seg('link', g.lt.replace(/[*_~`]/g, ''), f); x.href = this.href(g.lhref); out.push(x); }
      else if (g.rlt !== undefined) {
        const id = (g.rid || g.rlt).toLowerCase();
        const dest = refs[id] || '#';
        const x = this.seg('link', g.rlt.replace(/[*_~`]/g, ''), f);
        x.href = this.href(dest);
        out.push(x);
      }
      else if (g.fnid !== undefined) {
        const id = g.fnid.toLowerCase();
        const n = fnMap[id] != null ? fnMap[id] : g.fnid;
        const x = this.seg('fn', String(n), f);
        x.href = 'fn-' + id;
        out.push(x);
      }
      else if (g.imath !== undefined) out.push(this.seg('math', g.imathc, f));
      else if (g.bi !== undefined) out.push.apply(out, this.inline(g.bi, Object.assign({}, f, { b: true, i: true }), depth));
      else if (g.b1 !== undefined || g.b2 !== undefined) out.push.apply(out, this.inline(g.b1 !== undefined ? g.b1 : g.b2, Object.assign({}, f, { b: true }), depth));
      else if (g.st !== undefined) out.push.apply(out, this.inline(g.st, Object.assign({}, f, { s: true }), depth));
      else if (g.i1 !== undefined || g.i2 !== undefined) out.push.apply(out, this.inline(g.i1 !== undefined ? g.i1 : g.i2, Object.assign({}, f, { i: true }), depth));
      else if (g.emo !== undefined) out.push(this.seg('text', em[g.emo] || (':' + g.emo + ':'), f));
      else if (g.al || g.url) { const u = g.al || g.url; const x = this.seg('link', u, f); x.href = u; out.push(x); }
      last = re.lastIndex;
    }
    if (last < s.length) txt(s.slice(last), f);
    return out;
  }

  findClose(L, start, tag) {
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

  escXml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  renderSequence(src) {
    const lines = String(src || '').split('\n').map((l) => l.trim()).filter((l) => l && !/^sequenceDiagram/i.test(l) && !l.startsWith('%%'));
    const actors = [];
    const seen = {};
    const msgs = [];
    const ensure = (id, label) => {
      if (!seen[id]) { seen[id] = true; actors.push({ id: id, label: label || id }); }
      else if (label) {
        const a = actors.find((x) => x.id === id);
        if (a) a.label = label;
      }
    };
    lines.forEach((l) => {
      let m = l.match(/^participant\s+(\w+)(?:\s+as\s+(.+))?$/i);
      if (m) { ensure(m[1], m[2] || m[1]); return; }
      m = l.match(/^actor\s+(\w+)(?:\s+as\s+(.+))?$/i);
      if (m) { ensure(m[1], m[2] || m[1]); return; }
      m = l.match(/^(\w+)\s*(-->>|->>|-->|->)\s*(\w+)\s*:\s*(.+)$/);
      if (m) { ensure(m[1]); ensure(m[3]); msgs.push({ a: m[1], b: m[3], dash: m[2].indexOf('--') >= 0, label: m[4].trim() }); }
    });
    if (!actors.length) return { ok: false, err: src, title: 'SEQUENCE' };
    const colW = 120, pad = 28, top = 36, rowH = 44;
    const W = pad * 2 + actors.length * colW;
    const H = top + 40 + msgs.length * rowH + 24;
    const pos = {};
    actors.forEach((a, i) => { pos[a.id] = pad + colW * i + colW / 2; });
    const parts = ['<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '">'];
    parts.push('<defs><marker id="sarrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#0F766E"/></marker></defs>');
    actors.forEach((a) => {
      const x = pos[a.id];
      parts.push('<line x1="' + x + '" y1="' + (top + 18) + '" x2="' + x + '" y2="' + (H - 16) + '" stroke="#C9C2B4" stroke-dasharray="4 4"/>');
      parts.push('<rect x="' + (x - 48) + '" y="' + (top - 18) + '" width="96" height="32" rx="8" fill="#EAF5F2" stroke="#0F766E"/>');
      parts.push('<text x="' + x + '" y="' + (top + 3) + '" text-anchor="middle" font-family="IBM Plex Mono,monospace" font-size="12" font-weight="600" fill="#134E4A">' + this.escXml(a.label) + '</text>');
    });
    msgs.forEach((msg, i) => {
      const y = top + 48 + i * rowH;
      const x1 = pos[msg.a], x2 = pos[msg.b];
      const dash = msg.dash ? ' stroke-dasharray="5 4"' : '';
      parts.push('<line x1="' + x1 + '" y1="' + y + '" x2="' + x2 + '" y2="' + y + '" stroke="#0F766E" stroke-width="1.7"' + dash + ' marker-end="url(#sarrow)"/>');
      parts.push('<text x="' + ((x1 + x2) / 2) + '" y="' + (y - 6) + '" text-anchor="middle" font-family="Vazirmatn,IBM Plex Mono,sans-serif" font-size="11.5" fill="#0F4C47">' + this.escXml(msg.label) + '</text>');
    });
    parts.push('</svg>');
    return { ok: true, url: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(parts.join('')), title: 'SEQUENCE' };
  }

  renderFlow(src) {
    const raw = String(src || '');
    if (/^\s*sequenceDiagram\b/i.test(raw)) return this.renderSequence(raw);
    const lines = raw.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('%%'));
    if (!lines.length) return { ok: false, err: 'Empty diagram', title: 'MERMAID' };
    if (/^(classDiagram|stateDiagram|erDiagram|xychart)/i.test(lines[0])) {
      return { ok: false, err: 'Supported in Cursor classic Mermaid engine.\nNative subset here: flowchart + sequenceDiagram.\n\n' + raw, title: lines[0].split(/\s/)[0].toUpperCase() };
    }
    let dir = 'TD';
    const nodes = {};
    const edges = [];
    const order = [];
    const head = lines[0].match(/^(?:flowchart|graph)\s+(TD|TB|BT|LR|RL)\b/i);
    let i = 0;
    if (head) { dir = head[1].toUpperCase(); if (dir === 'TB') dir = 'TD'; i = 1; }
    else if (/^(?:flowchart|graph)\b/i.test(lines[0])) i = 1;
    const ensure = (id, label, shape) => {
      if (!nodes[id]) { nodes[id] = { id: id, label: label || id, shape: shape || 'rect' }; order.push(id); }
      else {
        if (label) nodes[id].label = label;
        if (shape) nodes[id].shape = shape;
      }
    };
    const nodeRe = /^([A-Za-z_][\w-]*)\s*(?:\[([^\]]*)\]|\(([^\)]*)\)|\{([^}]*)\}|\(\(([^)]*)\)\))?$/;
    const edgeRe = /^([A-Za-z_][\w-]*)\s*(?:\[([^\]]*)\]|\(([^\)]*)\)|\{([^}]*)\}|\(\(([^)]*)\)\))?\s*(-->|---|-.->|==>)\s*(?:\|([^|]*)\|\s*)?([A-Za-z_][\w-]*)\s*(?:\[([^\]]*)\]|\(([^\)]*)\)|\{([^}]*)\}|\(\(([^)]*)\)\))?$/;
    for (; i < lines.length; i++) {
      const l = lines[i];
      let m = l.match(edgeRe);
      if (m) {
        const a = m[1], b = m[8];
        const al = m[2] || m[3] || m[4] || m[5];
        const bl = m[9] || m[10] || m[11] || m[12];
        const ash = m[4] ? 'diamond' : m[3] ? 'round' : m[5] ? 'circle' : 'rect';
        const bsh = m[11] ? 'diamond' : m[10] ? 'round' : m[12] ? 'circle' : 'rect';
        ensure(a, al, al ? ash : undefined);
        ensure(b, bl, bl ? bsh : undefined);
        edges.push({ a: a, b: b, label: (m[7] || '').trim() });
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
    const children = {};
    ids.forEach((id) => { children[id] = []; });
    edges.forEach((e) => { if (children[e.a]) children[e.a].push(e.b); });
    const rank = {};
    const roots = ids.filter((id) => !edges.some((e) => e.b === id));
    const q = (roots.length ? roots : [ids[0]]).slice();
    q.forEach((id) => { rank[id] = 0; });
    while (q.length) {
      const u = q.shift();
      (children[u] || []).forEach((v) => {
        const nr = (rank[u] || 0) + 1;
        if (rank[v] === undefined || nr > rank[v]) { rank[v] = nr; q.push(v); }
      });
    }
    ids.forEach((id) => { if (rank[id] === undefined) rank[id] = 0; });
    const levels = {};
    ids.forEach((id) => {
      const r = rank[id];
      if (!levels[r]) levels[r] = [];
      levels[r].push(id);
    });
    const isLR = dir === 'LR' || dir === 'RL';
    const nw = 132, nh = 44, gapX = 36, gapY = 54, pad = 28;
    const ranks = Object.keys(levels).map(Number).sort((a, b) => a - b);
    const pos = {};
    let maxX = 0, maxY = 0;
    ranks.forEach((r) => {
      const row = levels[r];
      row.forEach((id, idx) => {
        const x = isLR ? pad + r * (nw + gapX) : pad + idx * (nw + gapX);
        const y = isLR ? pad + idx * (nh + gapY) : pad + r * (nh + gapY);
        pos[id] = { x: x, y: y, cx: x + nw / 2, cy: y + nh / 2 };
        maxX = Math.max(maxX, x + nw);
        maxY = Math.max(maxY, y + nh);
      });
    });
    const W = maxX + pad, H = maxY + pad;
    const parts = [];
    parts.push('<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '">');
    parts.push('<defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#0F766E"/></marker></defs>');
    edges.forEach((e) => {
      const a = pos[e.a], b = pos[e.b];
      if (!a || !b) return;
      let x1 = a.cx, y1 = a.cy, x2 = b.cx, y2 = b.cy;
      if (isLR) { x1 = a.x + nw; x2 = b.x; }
      else { y1 = a.y + nh; y2 = b.y; }
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
      parts.push('<path d="M' + x1 + ' ' + y1 + ' C' + mx + ' ' + y1 + ' ' + mx + ' ' + y2 + ' ' + x2 + ' ' + y2 + '" fill="none" stroke="#0F766E" stroke-width="1.8" marker-end="url(#arrow)"/>');
      if (e.label) parts.push('<rect x="' + (mx - e.label.length * 3.4 - 6) + '" y="' + (my - 10) + '" width="' + (e.label.length * 6.8 + 12) + '" height="18" rx="9" fill="#FFFEFA" stroke="#C9E4DC"/><text x="' + mx + '" y="' + (my + 3) + '" text-anchor="middle" font-family="IBM Plex Mono,monospace" font-size="11" fill="#0F4C47">' + this.escXml(e.label) + '</text>');
    });
    ids.forEach((id) => {
      const n = nodes[id], p = pos[id];
      const label = n.label || id;
      if (n.shape === 'diamond') {
        const cx = p.cx, cy = p.cy, w = nw * .48, h = nh * .62;
        parts.push('<polygon points="' + cx + ',' + (cy - h) + ' ' + (cx + w) + ',' + cy + ' ' + cx + ',' + (cy + h) + ' ' + (cx - w) + ',' + cy + '" fill="#EAF5F2" stroke="#0F766E" stroke-width="1.8"/>');
      } else if (n.shape === 'circle') {
        parts.push('<ellipse cx="' + p.cx + '" cy="' + p.cy + '" rx="' + (nw * .36) + '" ry="' + (nh * .48) + '" fill="#EAF5F2" stroke="#0F766E" stroke-width="1.8"/>');
      } else {
        const rr = n.shape === 'round' ? 18 : 10;
        parts.push('<rect x="' + p.x + '" y="' + p.y + '" width="' + nw + '" height="' + nh + '" rx="' + rr + '" fill="#EAF5F2" stroke="#0F766E" stroke-width="1.8"/>');
      }
      parts.push('<text x="' + p.cx + '" y="' + (p.cy + 4) + '" text-anchor="middle" font-family="Vazirmatn,IBM Plex Mono,sans-serif" font-size="12.5" font-weight="600" fill="#134E4A">' + this.escXml(label) + '</text>');
    });
    parts.push('</svg>');
    const svg = parts.join('');
    return { ok: true, url: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg), title: 'FLOWCHART' };
  }

  parse(src) {
    const L = String(src).replace(/\r\n?/g, '\n').split('\n');
    const out = [];
    const footnotes = [];
    const linkRefs = {};
    let i = 0, force = null;
    const blank = (l) => /^\s*$/.test(l);
    const FENCE = /^ {0,3}(`{3,}|~{3,})[ \t]*([^\n`]*)$/;
    const HEAD = /^ {0,3}(#{1,6})(?:[ \t]+(.*?))?(?:[ \t]+#+)?[ \t]*$/;
    const HR = /^ {0,3}([-*_])(?:[ \t]*\1){2,}[ \t]*$/;
    const LIST = /^([ \t]*)([-*+]|\d{1,9}[.)]|[۰-۹]{1,9}[.)])[ \t]+(.*)$/;
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
    const isTable = (k) => L[k] !== undefined && L[k].indexOf('|') >= 0 && L[k + 1] !== undefined && L[k + 1].indexOf('|') >= 0 && SEP.test(L[k + 1]);
    const isList = (l) => LIST.test(l) && !HR.test(l);
    const starts = (k) => { const l = L[k]; return FENCE.test(l) || HEAD.test(l) || HR.test(l) || QUOTE.test(l) || isList(l) || MATH.test(l) || DIR.test(l) || DIVOPEN.test(l) || DETOPEN.test(l) || FNDEF.test(l) || REFDEF.test(l) || isTable(k); };
    const push = (b, from, to) => { b.force = force; force = null; b.from = from; b.to = to; out.push(b); };
    const cells = (l) => {
      let s = l.trim();
      if (s.startsWith('|')) s = s.slice(1);
      if (s.endsWith('|') && !s.endsWith('\\|')) s = s.slice(0, -1);
      return s.split(/(?<!\\)\|/).map((c) => c.trim());
    };

    if (L[0] === '---') {
      const fm = [];
      let j = 1;
      while (j < L.length && L[j] !== '---') { fm.push(L[j]); j++; }
      if (j < L.length && L[j] === '---') {
        push({ k: 'front', text: fm.join('\n'), raw: '' }, 1, j + 1);
        i = j + 1;
      }
    }

    while (i < L.length) {
      const l = L[i];
      let m;
      if (blank(l)) { i++; continue; }
      if ((m = l.match(FNDEF))) {
        const from = i + 1;
        const buf = [m[2] || ''];
        i++;
        while (i < L.length && /^\s{2,}\S/.test(L[i])) { buf.push(L[i].trim()); i++; }
        footnotes.push({ id: m[1], text: buf.join(' '), from: from, to: i });
        continue;
      }
      if ((m = l.match(REFDEF))) {
        linkRefs[m[1].toLowerCase()] = m[2];
        i++;
        continue;
      }
      if ((m = l.match(DIR))) { force = m[1].toLowerCase(); i++; continue; }
      if ((m = l.match(DETOPEN))) {
        const from = i + 1;
        const end = this.findClose(L, i, 'details');
        if (end < 0) { push({ k: 'p', text: l, raw: l }, from, from); i++; continue; }
        const innerLines = L.slice(i + 1, end);
        let summary = 'Details';
        const body = [];
        innerLines.forEach((line) => {
          const sm = line.match(/^\s*<summary\b[^>]*>([\s\S]*?)<\/summary\s*>\s*$/i);
          if (sm) summary = sm[1].replace(/<[^>]+>/g, '');
          else if (!/^\s*<\/?summary\b/i.test(line)) body.push(line);
        });
        const paras = body.join('\n').split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
        push({ k: 'details', summary: summary, paras: paras.length ? paras : [''], open: /\bopen\b/i.test(m[1] || ''), raw: paras.join(' ') }, from, end + 1);
        i = end + 1;
        continue;
      }
      if ((m = l.match(DIVOPEN))) {
        const from = i + 1;
        const end = this.findClose(L, i, 'div');
        const attrs = m[1] || '';
        const dirAttr = (this.attr(attrs, 'dir') || '').toLowerCase();
        const lang = this.attr(attrs, 'lang') || '';
        if (end < 0) { push({ k: 'p', text: l, raw: l }, from, from); i++; continue; }
        const inner = L.slice(i + 1, end).join('\n');
        const childForce = (dirAttr === 'rtl' || dirAttr === 'ltr') ? dirAttr : (force || null);
        const prevForce = force;
        force = childForce;
        const innerParsed = this.parse(inner);
        const kids = (innerParsed.blocks || innerParsed).map((c) => {
          if (childForce && !c.force) c.force = childForce;
          c.from += i + 1;
          c.to += i + 1;
          return c;
        });
        force = prevForce;
        push({ k: 'wrap', dir: childForce || 'auto', lang: lang, kids: kids, raw: inner }, from, end + 1);
        i = end + 1;
        continue;
      }
      if ((m = l.match(FENCE))) {
        const from = i + 1;
        const fc = m[1];
        const info = String(m[2] || '').trim();
        const close = new RegExp('^ {0,3}' + (fc[0] === '`' ? '`' : '~') + '{' + fc.length + ',}[ \\t]*$');
        const buf = [];
        i++;
        while (i < L.length && !close.test(L[i])) { buf.push(L[i]); i++; }
        const to = i + 1;
        i++;
        const cite = info.match(/^(\d+):(\d+):(.+)$/);
        const lang = (info.split(/\s+/)[0] || '').toLowerCase();
        if (cite) push({ k: 'cite', start: parseInt(cite[1], 10), end: parseInt(cite[2], 10), path: cite[3].trim(), text: buf.join('\n'), raw: '' }, from, to);
        else if (lang === 'mermaid' || lang === 'flowchart') push({ k: 'flow', text: buf.join('\n'), raw: '' }, from, to);
        else push({ k: 'code', lang: info.split(/\s+/)[0] || '', text: buf.join('\n'), raw: '' }, from, to);
        continue;
      }
      if ((m = l.match(MATH))) {
        const from = i + 1;
        const t = m[1].trim();
        if (t.length >= 2 && t.endsWith('$$')) { push({ k: 'math', text: t.slice(0, -2).trim(), raw: '' }, from, from); i++; continue; }
        const buf = [];
        if (t) buf.push(m[1]);
        i++;
        while (i < L.length) {
          const x = L[i], j = x.indexOf('$$');
          if (j >= 0) { if (x.slice(0, j).trim()) buf.push(x.slice(0, j)); i++; break; }
          buf.push(x); i++;
        }
        push({ k: 'math', text: buf.join('\n'), raw: '' }, from, i);
        continue;
      }
      if ((m = l.match(HEAD))) { push({ k: 'h', level: m[1].length, text: m[2] || '', raw: m[2] || '' }, i + 1, i + 1); i++; continue; }
      if (HR.test(l)) { push({ k: 'hr', raw: '' }, i + 1, i + 1); i++; continue; }
      if (isTable(i)) {
        const from = i + 1;
        const head = cells(l);
        const al = cells(L[i + 1]).map((c) => { const a = c.startsWith(':'), b = c.endsWith(':'); return a && b ? 'center' : b ? 'right' : a ? 'left' : 'start'; });
        i += 2;
        const rows = [];
        while (i < L.length && !blank(L[i]) && L[i].indexOf('|') >= 0) { rows.push(cells(L[i])); i++; }
        push({ k: 'table', head: head, al: al, rows: rows, raw: head.join(' ') + ' ' + rows.map((r) => r.join(' ')).join(' ') }, from, i);
        continue;
      }
      if (QUOTE.test(l)) {
        const from = i + 1;
        const buf = [];
        while (i < L.length) {
          const q = L[i].match(QUOTE);
          if (q) { buf.push(q[1]); i++; }
          else if (!blank(L[i]) && buf.length && !blank(buf[buf.length - 1]) && !starts(i)) { buf.push(L[i]); i++; }
          else break;
        }
        const paras = [];
        let cur = [];
        buf.forEach((x) => {
          if (blank(x)) { if (cur.length) { paras.push(cur.join('\n')); cur = []; } }
          else cur.push(x.replace(/^>\s?/, ''));
        });
        if (cur.length) paras.push(cur.join('\n'));
        const alertM = paras[0] && String(paras[0]).trim().match(ALERT);
        if (alertM) {
          const kind = alertM[1].toLowerCase();
          const rest = paras.slice(1);
          if (alertM[2] && alertM[2].trim()) rest.unshift(alertM[2].trim());
          push({ k: 'alert', kind: kind, paras: rest.length ? rest : [''], raw: rest.join(' ') }, from, i);
        } else {
          push({ k: 'quote', paras: paras, raw: paras.join(' ') }, from, i);
        }
        continue;
      }
      if (isList(l)) {
        const from = i + 1;
        const items = [];
        while (i < L.length) {
          const x = L[i];
          const lm = x.match(LIST);
          if (lm && !HR.test(x)) { items.push({ indent: lm[1].replace(/\t/g, '    ').length, mk: lm[2], text: lm[3] }); i++; continue; }
          if (blank(x)) {
            let j = i + 1;
            while (j < L.length && blank(L[j])) j++;
            if (j < L.length && isList(L[j])) { i = j; continue; }
            break;
          }
          if (items.length && (/^[ \t]{2,}\S/.test(x) || !starts(i))) { items[items.length - 1].text += '\n' + x.trim(); i++; continue; }
          break;
        }
        push({ k: 'list', items: items, raw: items.map((x) => x.text).join(' ') }, from, i);
        continue;
      }
      if (INDENT.test(l)) {
        const from = i + 1;
        const buf = [];
        while (i < L.length && (INDENT.test(L[i]) || blank(L[i]))) { buf.push(L[i].replace(INDENT, '')); i++; }
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
          i++; done = true; break;
        }
        if (starts(i)) break;
        buf.push(L[i]); i++;
      }
      if (!done) push({ k: 'p', text: buf.join('\n'), raw: buf.join(' ') }, from, i);
    }
    return { blocks: out, footnotes: footnotes, linkRefs: linkRefs };
  }

  mapBlock(b, idx, mode, prevRef, counts, nest) {
    const locked = b.k === 'code' || b.k === 'math' || b.k === 'flow' || b.k === 'cite' || b.k === 'front';
    let dir, how;
    if (b.k === 'wrap') {
      dir = (b.dir && b.dir !== 'auto') ? b.dir : (mode !== 'auto' ? mode : (this.strong(b.raw) || prevRef.v));
      how = (b.dir && b.dir !== 'auto') ? 'forced' : (mode !== 'auto' ? 'mode' : 'auto');
      prevRef.v = dir;
      counts[dir]++;
    } else if (locked) { dir = 'ltr'; how = 'lock'; counts.lock++; }
    else if (b.force && b.force !== 'auto') { dir = b.force; how = 'forced'; prevRef.v = dir; counts[dir]++; }
    else if (mode !== 'auto') { dir = mode; how = 'mode'; prevRef.v = dir; counts[dir]++; }
    else { dir = this.strong(b.raw) || prevRef.v; how = 'auto'; prevRef.v = dir; counts[dir]++; }

    const fa = (n, d) => d === 'rtl' ? String(n).replace(/\d/g, (x) => '۰۱۲۳۴۵۶۷۸۹'[x]) : String(n);
    const bullets = ['•', '◦', '▪'];
    const alertLabels = { note: 'Note', tip: 'Tip', important: 'Important', warning: 'Warning', caution: 'Caution' };
    const key = (nest || 'b') + idx;
    const v = {
      key: key, from: b.from || 1, to: b.to || b.from || 1, dir: dir, lang: b.lang || '',
      tone: locked ? 'lock' : how === 'forced' ? 'forced' : dir,
      badge: locked ? (b.k === 'flow' ? 'FLOW · LTR' : b.k === 'cite' ? 'CITE · LTR' : b.k === 'front' ? 'YAML' : 'LTR · LOCKED') : how === 'forced' ? dir.toUpperCase() + ' · FORCED' : dir.toUpperCase(),
      isH1: false, isH2: false, isH3: false, isH4: false, isP: false, isList: false, isQuote: false, isCode: false, isMath: false, isTable: false, isHr: false, isFlow: false, isWrap: false,
      isAlert: false, isFront: false, isCite: false, isDetails: false,
      segs: [], items: [], paras: [], lines: [], head: [], rows: [], children: [], ncols: 1, langLabel: '', text: '', copy: null,
      flowOk: false, flowFail: false, svgUrl: '', flowErr: '', flowTitle: 'FLOWCHART',
      alertKind: 'note', alertLabel: 'Note', range: '', path: '', summary: '', openAttr: false
    };
    if (b.k === 'wrap') {
      v.isWrap = true;
      v.lang = b.lang || '';
      v.children = (b.kids || []).map((kid, n) => this.mapBlock(kid, n, mode, { v: dir }, { rtl: 0, ltr: 0, lock: 0 }, key + 'c'));
    } else if (b.k === 'h') {
      v.isH1 = b.level === 1; v.isH2 = b.level === 2; v.isH3 = b.level === 3; v.isH4 = b.level >= 4;
      v.segs = this.inline(b.text);
    } else if (b.k === 'p') {
      v.isP = true; v.segs = this.inline(b.text);
    } else if (b.k === 'list') {
      v.isList = true;
      const stack = [], counters = [];
      v.items = b.items.map((it, n) => {
        while (stack.length && it.indent < stack[stack.length - 1]) stack.pop();
        if (!stack.length || it.indent > stack[stack.length - 1]) stack.push(it.indent);
        const depth = stack.length - 1;
        counters.length = depth + 1;
        const ordered = /[\d۰-۹]/.test(it.mk);
        let marker;
        if (ordered) {
          const seed = parseInt(String(it.mk).replace(/[۰-۹]/g, (ch) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(ch)), 10);
          counters[depth] = counters[depth] === undefined ? (seed || 1) : counters[depth] + 1;
          marker = fa(counters[depth], dir) + '.';
        } else { counters[depth] = undefined; marker = bullets[depth % 3]; }
          const tm = it.text.match(/^\[([ xX]?)\][ \t]*(.*)$/);
          const isTask = !!tm && !ordered;
        const isDone = isTask && tm[1] !== ' ';
        return {
          key: 'i' + n, pad: depth * 26, marker: marker,
          isTask: isTask, notTask: !isTask, isDone: isDone, done: isDone ? 'true' : 'false',
          taskLabel: isDone ? 'Done' : 'Not done',
          segs: this.inline(isTask ? tm[2] : it.text)
        };
      });
    } else if (b.k === 'quote') {
      v.isQuote = true;
      v.paras = b.paras.map((p, n) => ({ key: 'q' + n, segs: this.inline(p) }));
    } else if (b.k === 'alert') {
      v.isAlert = true;
      v.alertKind = b.kind || 'note';
      v.alertLabel = alertLabels[v.alertKind] || 'Note';
      v.paras = (b.paras || []).map((p, n) => ({ key: 'q' + n, segs: this.inline(p) }));
    } else if (b.k === 'front') {
      v.isFront = true;
      v.text = b.text || '';
    } else if (b.k === 'cite') {
      v.isCite = true;
      v.path = b.path || '';
      v.range = 'L' + b.start + '–' + b.end;
      const text = b.text || '', ck = v.key + ':cite:' + text.length;
      v.copyKey = ck;
      v.copy = () => this.copyText(text, ck);
      const start = b.start || 1;
      v.lines = text.split('\n').map((t, n) => ({ key: 'l' + n, n: start + n, t: t === '' ? ' ' : t }));
    } else if (b.k === 'details') {
      v.isDetails = true;
      v.summary = b.summary || 'Details';
      v.openAttr = b.open ? true : false;
      v.paras = (b.paras || []).map((p, n) => ({ key: 'q' + n, segs: this.inline(p) }));
    } else if (b.k === 'code') {
      v.isCode = true;
      v.lang = b.lang || 'text';
      const text = b.text, ck = v.key + ':' + text.length;
      v.copyKey = ck;
      v.copy = () => this.copyText(text, ck);
      v.lines = text.split('\n').map((t, n) => ({ key: 'l' + n, n: n + 1, t: t === '' ? ' ' : t }));
    } else if (b.k === 'flow') {
      v.isFlow = true;
      const flow = this.renderFlow(b.text);
      v.flowOk = flow.ok;
      v.flowFail = !flow.ok;
      v.svgUrl = flow.url || '';
      v.flowErr = flow.err || b.text;
      v.flowTitle = flow.title || 'MERMAID';
    } else if (b.k === 'math') {
      v.isMath = true; v.text = b.text;
    } else if (b.k === 'table') {
      v.isTable = true;
      const nc = Math.max(1, b.head.length);
      v.ncols = nc;
      const alignOf = (c) => b.al[c] || 'start';
      v.head = b.head.map((h, c) => ({ key: 'h' + c, align: alignOf(c), segs: this.inline(h) }));
      v.rows = b.rows.map((r, n) => {
        const cellsArr = [];
        for (let c = 0; c < nc; c++) cellsArr.push({ key: 'c' + c, align: alignOf(c), segs: this.inline(r[c] || '') });
        return { key: 'r' + n, odd: n % 2 === 1 ? 'true' : 'false', cells: cellsArr };
      });
    } else if (b.k === 'hr') {
      v.isHr = true;
    }
    return v;
  }

  model(src, mode) {
    const parsed = this.parse(src);
    const rawBlocks = parsed.blocks || parsed;
    this._linkRefs = parsed.linkRefs || {};
    const fnList = parsed.footnotes || [];
    this._fnMap = {};
    fnList.forEach((fn, i) => { this._fnMap[String(fn.id).toLowerCase()] = i + 1; });
    const docDir = this.strong(src) || 'ltr';
    const prevRef = { v: docDir };
    const counts = { rtl: 0, ltr: 0, lock: 0 };
    const blocks = rawBlocks.map((b, idx) => this.mapBlock(b, idx, mode, prevRef, counts, 'b'));
    const footnotes = fnList.map((fn, i) => ({
      key: 'fn' + i,
      n: i + 1,
      aid: 'fn-' + String(fn.id).toLowerCase(),
      segs: this.inline(fn.text || '')
    }));
    return { blocks: blocks, counts: counts, footnotes: footnotes };
  }

  renderVals() {
    const st = this.state;
    const src = st.src || '';
    const ck = src + '\u0001' + st.mode;
    if (this._ck !== ck) { this._ck = ck; this._pm = this.model(src, st.mode); }
    const pm = this._pm;
    const hover = st.hoverKey;
    const blocks = pm.blocks.map((b) => {
      const enter = () => this.setState({ hoverKey: b.key });
      return Object.assign({}, b, {
        guide: st.guides ? 'on' : 'off',
        showBadge: st.guides,
        hi: hover === b.key ? 'true' : 'false',
        enter: enter,
        leave: this._leave,
        copyLabel: (b.isCode || b.isCite) ? this.label(b.copyKey) : ''
      });
    });
    requestAnimationFrame(() => this.renderKatex());
    const lines = src ? src.split('\n') : [''];
    const hoverBlock = hover ? pm.blocks.find((b) => b.key === hover) : null;
    const hlLines = lines.map((t, n) => {
      const line = n + 1;
      let on = false;
      if (hoverBlock && line >= hoverBlock.from && line <= hoverBlock.to) on = true;
      return { key: 'hl' + n, t: t === '' ? ' ' : t, on: on ? 'true' : 'false' };
    });
    const words = src.trim() ? src.trim().split(/\s+/).length : 0;
    const c = pm.counts;
    const n = pm.blocks.length;
    const modeList = [
      { key: 'auto', label: 'Auto', hint: 'Detect direction per block' },
      { key: 'rtl', label: 'RTL', hint: 'Right-to-left for all text blocks' },
      { key: 'ltr', label: 'LTR', hint: 'Left-to-right for all text blocks' }
    ];
    const edLabels = { auto: 'Auto', rtl: 'RTL', ltr: 'LTR' };
    const pasteLabel = st.pasteFlash === 'ok' ? 'Pasted' : st.pasteFlash === 'x' ? 'Blocked' : 'Paste';
    return {
      src: src,
      onInput: this.onInput,
      onEdScroll: this.onEdScroll,
      onPvScroll: this.onPvScroll,
      onEdCaret: this.onEdCaret,
      hlY: -st.edScroll,
      hlLines: hlLines,
      edDir: st.edDir,
      edDirLabel: edLabels[st.edDir] || 'Auto',
      cycleEdDir: this.cycleEdDir,
      modes: modeList.map((m) => ({ key: m.key, label: m.label, hint: m.hint, on: st.mode === m.key ? 'true' : 'false', pick: this.picks[m.key] })),
      guidesOn: st.guides ? 'true' : 'false',
      guideFlag: st.guides ? 'on' : 'off',
      toggleGuides: this.toggleGuides,
      srcOpen: st.srcOpen !== false,
      srcOpenOn: st.srcOpen === false ? 'true' : 'false',
      srcPane: st.srcOpen !== false ? 'on' : 'off',
      srcHidden: st.srcOpen !== false ? 'false' : 'true',
      srcCollapsed: st.srcOpen === false,
      srcToggleShort: st.srcOpen !== false ? 'Hide' : 'Source',
      srcToggleLabel: st.srcOpen !== false ? 'Collapse source for full preview' : 'Show source panel',
      toggleSrc: this.toggleSrc,
      loadSample: this.loadSample,
      clearAll: this.clearAll,
      pasteClip: this.pasteClip,
      pasteLabel: pasteLabel,
      copySrc: this.copySrc,
      copySrcLabel: this.label('src') === 'Copy' ? 'Copy' : this.label('src'),
      exportPdf: this.exportPdf,
      statSource: lines.length + ' lines · ' + words + ' words · ' + src.length + ' chars',
      statPreview: n + ' blocks · ' + c.rtl + ' RTL · ' + c.ltr + ' LTR · ' + c.lock + ' locked',
      showEmpty: !src.trim(),
      blocks: blocks,
      showFns: !!(pm.footnotes && pm.footnotes.length),
      footnotes: pm.footnotes || []
    };
  }
}
