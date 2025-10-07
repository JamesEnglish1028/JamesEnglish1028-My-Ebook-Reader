
# MeBooks

A local-first, browser-based ebook reader that supports EPUB and PDF. MeBooks is built as a Single Page Application using React + TypeScript and focuses on a smooth reading experience, per-book persistence, and offline-first behavior.

This README summarizes the current state (features implemented), developer setup, build instructions, and a short changelog for this release.

## Current features (highlight)

- Library: import EPUB and PDF files and store them locally in IndexedDB.
- EPUB reader: paginated and scrolled flows, font-family and font-size customization, themes (light/dark), bookmarks, citations, full-text search, and read-aloud (TTS).
- PDF reader: DOM-based PDF rendering using react-pdf/pdfjs (lazy-loaded) with per-book zoom and fit controls and a TOC mapped from PDF outlines.
- Keyboard shortcuts: navigation and reader controls are available via keyboard (help overlay lists shortcuts).
- Accessibility: focus management and aria attributes on modals and the help overlay; keyboard-trappable help dialog.
- Persistence: per-book last-read positions, per-book view state (PDF zoom / EPUB font-size), bookmarks, and citations saved in LocalStorage and IndexedDB.

## Notable implementation details

- EPUB rendering: uses the embedded `epub.js` runtime available in the browser environment for DOM-based EPUB rendering and interaction.
- PDF rendering: uses `react-pdf` and `pdfjs-dist`; the worker file is statically imported to ensure correct MIME and bundler handling.
- Bundling & dev server: the project uses Vite for development and production builds.

## Dependencies

Core dependencies are declared in `package.json`. Key runtime libraries include:

- react, react-dom
- react-router-dom
- react-pdf
- pdfjs-dist

Dev dependencies include Vite, TypeScript, and React type packages.

## Developer setup

Prerequisites:

- Node.js (>= 18 recommended)
- npm (or yarn/pnpm if you prefer)

Quick start:

1. Install dependencies

```bash
npm install
```

2. Development server (hot reload):

```bash
npm run dev
```

3. Production build:

```bash
npm run build
```

4. Preview production build locally:

```bash
npm run preview
```

Notes:

- The PDF worker is imported via Vite (see `components/PdfReaderView.tsx`) to ensure `pdfjs-dist` uses the correct worker URL.
- EPUB features depend on `epub.js` loaded in the browser; ensure your browser environment allows the app to load the runtime.

## Testing & linting

This repo currently doesn't include a full test suite. Running the production build (`npm run build`) and using the dev server are the primary verification steps. Adding unit and accessibility tests (Playwright/axe) is recommended for future work.

## Short changelog (this release)

- Added EPUB font-size zoom and per-book persistence.
- Implemented a shared keyboard help modal with accessible focus trapping.
- Reworked PDF viewer to use `react-pdf` with bundle-friendly worker import and added PDF TOC mapping.
- Added a small HUD that displays zoom/font-size changes and custom tooltips in the help modal.

## Contributing

Contributions welcome. Open an issue or submit a PR with a short description of the change. For larger work, create a feature branch and open a PR when ready.

## License

This repository does not currently include a license file. Consider adding an appropriate open-source license if you plan to publish the project.

## Release

This README was updated as part of the v1.0.0 release tagging in this repository. See the Git tags for release history.