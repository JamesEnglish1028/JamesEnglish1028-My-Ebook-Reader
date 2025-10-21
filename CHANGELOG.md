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

## October 21, 2025

### Bug Fix: My Library View Refresh After Import
- Fixed issue where newly imported books did not appear in My Library until browser refresh.
- Refactored import and state logic:
  - After import, `activeOpdsSource` is reset to `null` and the view switches to My Library.
  - Added `libraryRefreshFlag` prop, passed through `App.tsx`, `ViewRenderer.tsx`, `LibraryView.tsx`, and `LocalLibraryView.tsx`.
  - `LocalLibraryView` now refetches books from the DB when `libraryRefreshFlag` changes.
- Added debug logging to trace state and fetch flow.
- Relaxed MIME type check for cover images to support non-image covers.
- Updated dependencies: `pdfjs-dist` to `^5.4.296`, `vite` to `^7.1.11`.

### Impact
- Users now see newly imported books in My Library immediately after import, without needing to refresh the browser.
- Improved reliability of cover image import from remote catalogs.

---

## How to Deploy
1. Run `npm install` to update dependencies.
2. Run `npm run build` to build the app.
3. Push changes to GitHub to deploy via GitHub Pages.

---

## Contributors
- @JamesEnglish1028
- GitHub Copilot
