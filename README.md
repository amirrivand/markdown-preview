# Locale MarkDown Viewer

A Vite + React + TypeScript Markdown viewer with first-class right-to-left (Persian / Arabic / Hebrew) support, aimed at matching the Cursor IDE Markdown preview.

## Scripts

```bash
npm install      # install dependencies
npm run dev      # start the dev server (http://localhost:5173)
npm run build    # type-check (tsc -b) and build to dist/
npm run preview  # serve the production build locally
```

## Features

- Split view: Markdown source editor + live preview, with scroll sync and hover highlighting between them
- Per-block direction detection (Auto) or forced RTL / LTR, with optional direction guides
- GFM: tables (with alignment), task lists, strikethrough, autolinks, reference links
- GitHub alerts (`[!NOTE]`, `[!TIP]`, `[!IMPORTANT]`, `[!WARNING]`, `[!CAUTION]`)
- Math via KaTeX (`$inline$` and `$$display$$`)
- Mermaid subset rendered as SVG: `flowchart` / `graph` and `sequenceDiagram`
- Footnotes, emoji shortcodes, Cursor citation fences (`12:18:path/to/file`), YAML front matter
- `<details>`, `<div dir="rtl" lang="fa">`, `<bdi>`, `<kbd>`, `<br>`
- Paste / Clear / Copy / Print to PDF; source and panel state persisted in `localStorage`

## Project structure

```
index.html                 Vite entry (fonts + #root)
src/
  main.tsx                 React bootstrap, KaTeX + app CSS
  App.tsx                  Shell, toolbar, state, scroll sync
  viewer.css               All styles
  lib/markdown.ts          Parser, block/inline model, Mermaid SVG renderers
  components/
    Preview.tsx            Preview pane (blocks + footnotes)
    Block.tsx              Block wrapper + per-block JSX renderers
    Segments.tsx           Inline segments (text, code, links, math, bdi, ...)
```
