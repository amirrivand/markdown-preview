import type { HLJSApi } from 'highlight.js';

type HljsMod = { default: HLJSApi };

let hljsPromise: Promise<HLJSApi> | null = null;

/** Lazily load highlight.js common languages (code-split chunk). */
function loadHljs(): Promise<HLJSApi> {
  if (!hljsPromise) {
    hljsPromise = import('highlight.js/lib/common').then((m: HljsMod) => m.default);
  }
  return hljsPromise;
}

const ALIASES: Record<string, string> = {
  js: 'javascript',
  jsx: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  py: 'python',
  rb: 'ruby',
  rs: 'rust',
  sh: 'bash',
  shell: 'bash',
  zsh: 'bash',
  bash: 'bash',
  yml: 'yaml',
  yaml: 'yaml',
  md: 'markdown',
  markdown: 'markdown',
  htm: 'xml',
  html: 'xml',
  svg: 'xml',
  vue: 'xml',
  cs: 'csharp',
  kt: 'kotlin',
  kts: 'kotlin',
  text: 'plaintext',
  txt: 'plaintext',
  plain: 'plaintext',
  plaintext: 'plaintext',
  mermaid: 'plaintext',
  flowchart: 'plaintext',
  '': 'plaintext',
};

const EXT_LANG: Record<string, string> = {
  js: 'javascript',
  jsx: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  py: 'python',
  rb: 'ruby',
  rs: 'rust',
  go: 'go',
  java: 'java',
  kt: 'kotlin',
  kts: 'kotlin',
  cs: 'csharp',
  cpp: 'cpp',
  cxx: 'cpp',
  cc: 'cpp',
  c: 'c',
  h: 'c',
  hpp: 'cpp',
  css: 'css',
  scss: 'scss',
  less: 'less',
  html: 'xml',
  htm: 'xml',
  xml: 'xml',
  svg: 'xml',
  vue: 'xml',
  json: 'json',
  md: 'markdown',
  markdown: 'markdown',
  sh: 'bash',
  bash: 'bash',
  zsh: 'bash',
  yml: 'yaml',
  yaml: 'yaml',
  sql: 'sql',
  php: 'php',
  swift: 'swift',
  r: 'r',
  lua: 'lua',
  toml: 'ini',
  ini: 'ini',
  conf: 'ini',
  diff: 'diff',
  patch: 'diff',
};

/** Resolve fence info / path extension to a highlight.js language id. */
export function resolveLang(langOrPath: string): string {
  const raw = (langOrPath || '').trim().toLowerCase();
  if (!raw) return 'plaintext';

  if (raw.includes('/') || raw.includes('\\') || raw.includes('.')) {
    const base = raw.split(/[/\\]/).pop() || raw;
    const ext = base.includes('.') ? base.split('.').pop() || '' : '';
    if (ext && EXT_LANG[ext]) return EXT_LANG[ext];
  }

  const alias = ALIASES[raw];
  if (alias) return alias;
  return raw.replace(/^\./, '') || 'plaintext';
}

/**
 * Split highlight.js HTML into lines while re-opening spans across newlines
 * so each line stays independently valid markup for per-line gutters.
 */
export function splitHighlightedHtml(html: string): string[] {
  const lines: string[] = [''];
  const stack: string[] = [];
  let i = 0;

  while (i < html.length) {
    if (html[i] === '<') {
      const end = html.indexOf('>', i);
      if (end === -1) {
        lines[lines.length - 1] += html.slice(i);
        break;
      }
      const tag = html.slice(i, end + 1);
      if (tag.startsWith('</')) {
        stack.pop();
        lines[lines.length - 1] += tag;
      } else if (!tag.endsWith('/>')) {
        stack.push(tag);
        lines[lines.length - 1] += tag;
      } else {
        lines[lines.length - 1] += tag;
      }
      i = end + 1;
    } else if (html[i] === '\n') {
      for (let s = stack.length - 1; s >= 0; s--) {
        const name = stack[s].match(/^<\/?([a-zA-Z0-9]+)/)?.[1] || 'span';
        lines[lines.length - 1] += `</${name}>`;
      }
      lines.push('');
      for (const open of stack) lines[lines.length - 1] += open;
      i += 1;
    } else {
      lines[lines.length - 1] += html[i];
      i += 1;
    }
  }

  return lines;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Highlight full source; returns one HTML string per line (escaped on failure). */
export async function highlightLines(code: string, langHint: string): Promise<string[]> {
  const lang = resolveLang(langHint);
  const plain = () => code.split('\n').map((t) => (t === '' ? ' ' : escapeHtml(t)));

  try {
    const hljs = await loadHljs();
    const resolved = hljs.getLanguage(lang) ? lang : 'plaintext';
    const { value } = hljs.highlight(code, { language: resolved, ignoreIllegals: true });
    return splitHighlightedHtml(value).map((line) => (line === '' ? ' ' : line));
  } catch {
    return plain();
  }
}
