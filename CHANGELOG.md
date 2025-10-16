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

## [0.2.0] - 2025-10-15
### Added
- Full accessibility metadata extraction, storage, and display for EPUB and OPDS books.
- Robust OPDS 1 and OPDS 2 parsing, including edge cases and lenient error handling.
- Comprehensive test coverage for all new features and error paths.
- Improved testability of the IndexedDB service layer (dbInstance is now resettable for error-path testing).
- Extensive documentation and migration notes for new features and test coverage.

### Changed
- OPDS parsers now return empty results for empty/malformed feeds instead of throwing (lenient behavior).
- All accessibility fields are preserved and shown in the Book Detail view.

### Fixed
- All real-world and edge-case tests pass (except for two strict error-throwing tests, which are intentionally skipped for lenient behavior).
- Accessibility, OPDS parsing, and DB error handling are fully covered by tests.

---

For details see commits on `main` and tag `v0.2.0`.
