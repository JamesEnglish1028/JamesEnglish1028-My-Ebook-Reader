# Changelog

All notable changes to this project will be documented in this file.

## [0.1.0] - 2025-10-07
### Added
- Fallback TOC builder for older EPUBs (EPUB2/NCX) when navigation is missing.
- `safeDisplay` navigation helper that retries and resolves hrefs/CFIs against the spine.
- Small dismissible banner in the reader UI that notifies when a fallback TOC is used and offers "Open first content".
- Lightweight analytics helper `trackEvent` and emission of `toc_fallback` events.
- Vitest + React Testing Library and tests for `TocPanel` (label vs chevron, keyboard activation, nested TOC behavior).

### Changed
- Reduced noisy console.debug logs and added `isDebug()` flag to enable local debug output (via `window.__MEBOOKS_DEBUG__` or `VITE_DEBUG`).
- Hardened `findFirstChapter` to safely handle landmarks, packaging guides, and spine scanning.

### Fixed
- Prevent uncaught "No Section Found" errors when navigating from TOC entries that reference missing or malformed sections; the reader now falls back gracefully.

---

For details see commits on `main` and tag `v0.1.0`.
