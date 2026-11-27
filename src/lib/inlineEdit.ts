import type { BlockKind } from './markdown';

/** Block kinds that support double-click inline editing in the preview. */
export const INLINE_EDITABLE: ReadonlySet<BlockKind> = new Set([
  'p',
  'h',
  'list',
  'quote',
  'alert',
  'details',
]);

export function isInlineEditable(kind: BlockKind): boolean {
  return INLINE_EDITABLE.has(kind);
}

/** Extract 1-indexed inclusive line range from source. */
export function sliceLineRange(src: string, from: number, to: number): string {
  const lines = src.split('\n');
  const start = Math.max(0, from - 1);
  const end = Math.max(start, Math.min(lines.length, to));
  return lines.slice(start, end).join('\n');
}

/** Replace 1-indexed inclusive line range with `replacement` (may be multi-line). */
export function replaceLineRange(src: string, from: number, to: number, replacement: string): string {
  const lines = src.split('\n');
  const start = Math.max(0, from - 1);
  const end = Math.max(start, Math.min(lines.length, to));
  const mid = replacement.split('\n');
  return [...lines.slice(0, start), ...mid, ...lines.slice(end)].join('\n');
}
