# MeBooks

A local-first, browser-based ebook reader that supports EPUB and PDF. MeBooks is built as a Single Page Application using React + TypeScript and focuses on a smooth reading experience, per-book persistence, and offline-first behavior.

<!-- Trigger Pages rebuild: 2025-10-18T21:40:00Z -->

# MeBooks

A local-first, browser-based ebook reader that supports EPUB and PDF. MeBooks is built as a Single Page Application using React + TypeScript and focuses on a smooth reading experience, per-book persistence, and offline-first behavior.

This README summarizes the current state (features implemented), developer setup, build instructions, and a short changelog for this release.

## Current features (highlight)

- Library: import EPUB and PDF files and store them locally in IndexedDB.
- EPUB reader: paginated and scrolled flows, font-family and font-size customization, themes (light/dark), bookmarks, citations, full-text search, and read-aloud (TTS).
- PDF reader: DOM-based PDF rendering using react-pdf/pdfjs (lazy-loaded) with per-book zoom and fit controls and a TOC mapped from PDF outlines. Note: PDFs are supported — the project ships with a bundle-friendly pdf.worker import and the app requires compatible `pdfjs-dist`/worker versions; the dev environment pins compatible versions to avoid the worker/API mismatch.
- Keyboard shortcuts: navigation and reader controls are available via keyboard (help overlay lists shortcuts).
- Accessibility: focus management and aria attributes on modals and the help overlay; keyboard-trappable help dialog.
- Persistence: per-book last-read positions, per-book view state (PDF zoom / EPUB font-size), bookmarks, and citations saved in LocalStorage and IndexedDB.
- **Book Details Page**: Restored and enhanced layout with two-column design, top-aligned cover and title, accessible font sizes and spacing, format badges (EPUB, PDF, Audiobook) matching catalog views, and citation format support (APA, MLA, Chicago). Includes backup and type updates for reliability.
# Book Details Page

The Book Details page provides a visually clear, accessible, and feature-rich view for each book:

- **Layout**: Two-column design with top-aligned book cover and title/details. Book title is large and accessible, with spacing and alignment for clarity.
- **Format Badges**: Book format (EPUB, PDF, Audiobook), media type, and publication type are shown as colored badges using a shared badge component (`BookBadges.tsx`). This ensures consistent badge logic and UI in both the catalog/grid view (`BookCard.tsx`) and the Book Detail view (`BookDetailView.tsx`).
  - Badges are only shown if the relevant metadata (e.g., format, mediaType, publicationTypeLabel) is present in the book object. Imported books may not display badges if metadata is missing.
- **Accessibility**: Font sizes, spacing, and color contrast are chosen for readability. Title font is large but balanced, and all interactive elements have clear focus states.
- **Citation Format Support**: Citations can be created and exported in APA or MLA style, with the format tracked per citation.
- **Backup**: The original BookDetailView.tsx is backed up for reference and rollback.
 - **Publisher ID (ISBN)**: If the book's metadata includes an ISBN, it is displayed as the Publisher ID directly under the Publication Date for clear provenance and cataloging.

See `components/BookDetailView.tsx` and `components/BookDetailView.tsx.backup` for implementation and backup. Type updates for citations are in `domain/reader/types.ts` and service logic in `domain/reader/citation-service.ts`.

## Notable implementation details

- EPUB rendering: uses the embedded `epub.js` runtime available in the browser environment for DOM-based EPUB rendering and interaction.
- PDF rendering: uses `react-pdf` and `pdfjs-dist`; the worker file is statically imported to ensure correct MIME and bundler handling.
- Bundling & dev server: the project uses Vite for development and production builds.
- **Architecture** (Phase 2): Domain-driven design with service layer providing type-safe operations, Result pattern error handling, and comprehensive logging.

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

Run the test suite:

```bash
npm run test
```

- **Test Status**: ✅ All tests passing locally (200 passed, 0 failed)

Current test coverage:
- OPDS 1 & 2 parsing
- Collection detection and organization
- Credential handling
- Book detail views
- Import flows

Recent test updates: additional OPDS2 unit tests were added to cover:
- Publications-only OPDS2 feeds (feeds that omit top-level metadata but contain publications)
- Registry navigation inference (treat navigation items with type `application/opds+json` as catalog entries so registries like Fulcrum show their catalogs correctly in the UI)

Linting:

```bash
npm run lint        # Check for issues
npm run lint:fix    # Auto-fix issues
```

## Architecture (Phase 2 - Service Layer)

MeBooks now includes a comprehensive service layer with domain-driven architecture:

### Services Available

1. **BookRepository** (`domain/book`) - Book persistence with CRUD operations
2. **OPDS Services** (`domain/catalog`) - OPDS 1/2 parsing and acquisition resolution
3. **BookmarkService** (`domain/reader`) - Bookmark management and organization
4. **CitationService** (`domain/reader`) - Citations and bibliographic formatting (APA, MLA)
5. **PositionTracker** (`domain/reader`) - Reading position and progress tracking

### Key Features

- **Result Pattern**: Type-safe error handling without exceptions
- **Comprehensive Logging**: All operations tracked for debugging
- **Backward Compatible**: Services coexist with existing code
- **Full TypeScript**: Complete type safety and IntelliSense support
- **Easy Testing**: Simple to mock and test

### Documentation

- `PHASE_2_COMPLETE.md` - Complete Phase 2 summary and metrics
- `PHASE_2_MIGRATION_GUIDE.md` - Comprehensive migration patterns and examples
- `PHASE_2_PROGRESS.md` - Detailed progress tracking

See the migration guide for usage examples and best practices.

## Short changelog (this release)

### Phase 2 - Service Layer (October 2025)
- ✅ Created 5 domain services (2,274 lines of code)
- ✅ Implemented Result pattern for type-safe error handling
- ✅ Added comprehensive logging to all domain operations
- ✅ Full backward compatibility maintained
- ✅ 89/89 tests passing
 - ✅ Full backward compatibility maintained
 - ✅ Tests updated and expanded for OPDS2 parsing and registry handling (current suite: 200 tests locally)
 - ✅ OPDS2 parsing: accept publications-only feeds and infer registry navigation items (type=application/opds+json) as terminal catalog entries so registries surface properly in the UI

### Previous Features
- Added EPUB font-size zoom and per-book persistence.
- Implemented a shared keyboard help modal with accessible focus trapping.
- Reworked PDF viewer to use `react-pdf` with bundle-friendly worker import and added PDF TOC mapping.
- Added a small HUD that displays zoom/font-size changes and custom tooltips in the help modal.

## OPDS2 PoC

This release includes a proof-of-concept OPDS2 client and a basic borrow flow for testing with catalogs that require Basic authentication (for example, small library demo servers like Palace Manager).

- The app can detect OPDS2 acquisition links with rel `http://opds-spec.org/acquisition/borrow` and will show a "Borrow" button in the Book Detail view.
- Borrowing is performed with a POST request to the provided borrow href. If the catalog requires Basic auth, the app will prompt for credentials and can persist them (localStorage) for convenience.
- This is a PoC: the current flow saves a metadata-only BookRecord into the local IndexedDB on successful borrow. Full acquisition download/import is a planned follow-up.

How to test the PoC locally:

1. Start the dev server: `npm run dev`.
2. Open the Library settings menu and use the "Add Palace OPDS2 Sample" quick-add entry to add a sample OPDS2 catalog used in tests.
3. Browse the catalog, open a borrowable entry, and click "Borrow". If the server requires Basic auth you will be prompted to enter credentials (optionally save them).
4. After a successful borrow the book metadata will appear in the library. Importing the full content is not yet automatic and requires the follow-up work described below.

Planned follow-ups:

- Implement acquisition handling (indirect acquisitions) and the download/import pipeline to convert borrow operations into saved EPUB/PDF content.
- Add caching/ETag support and robust error handling for OPDS2 fetches.
- Improve UI for managing stored OPDS credentials.


## Contributing

Contributions welcome. Open an issue or submit a PR with a short description of the change. For larger work, create a feature branch and open a PR when ready.

## License

This repository does not currently include a license file. Consider adding an appropriate open-source license if you plan to publish the project.

## Release

This README was updated as part of the v1.0.0 release tagging in this repository. See the Git tags for release history.
