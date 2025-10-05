# MeBooks

A custom, browser-based ebook reader inspired by [Readium's Thorium](https://www.edrlab.org/software/thorium-reader/). This application allows users to import EPUB books into a local library and browse online OPDS catalogs. It is built using modern web technologies and focuses on providing a rich, customizable reading experience with robust library management features.

## Key Features

### Library Management
-   **Local-First Storage**: Your books and reading data never leave your computer. Book files are stored in IndexedDB, while settings, catalog lists, and annotations are kept in LocalStorage.
-   **EPUB Import**: Import `.epub` files to build your personal library, displayed with book covers.
-   **Book Details**: View detailed information for each book, including publication details, subjects, and provider IDs.
-   **Library Organization**: Sort your library by title, author, publication date, or the date added.
-   **Delete Books**: Permanently remove books from your local library.

### Online Catalog Support (OPDS)
-   **Browse Remote Libraries**: Add and manage an unlimited number of public OPDS (Open Publication Distribution System) catalogs.
-   **OPDS v1 & v2 Support**: Compatible with both XML-based (Atom) and JSON-based OPDS feeds.
-   **Seamless Navigation**: Navigate catalog hierarchies, categories, and paginated results.
-   **One-Click Import**: Download books directly from a catalog and add them to your local library.

### Advanced Reader Experience
-   **Entirely Browser-Based**: No installation needed. The app runs completely in your web browser.
-   **Customizable Reader**:
    -   Adjust font size and family (Serif, Sans-Serif, Original).
    -   Switch between Light and Dark themes.
    -   Choose your reading mode: `Paginated` (like a physical book) or `Scrolled` (like a webpage).
-   **Rich Reading Tools**:
    -   **Bookmarks**: Save your favorite passages with optional notes.
    -   **Citations**: Create academic citations for specific locations in the book, with support for APA, MLA, and Chicago formats.
    -   **Citation Export**: Export all citations for a book in the standard `.ris` format for use in reference managers like Zotero or EndNote.
    -   **Full-Text Search**: Quickly search the entire contents of a book.
-   **Read Aloud (Text-to-Speech)**:
    -   Listen to your book using your browser's built-in voices.
    -   Control the voice, speed, and pitch.
    -   The currently spoken sentence is highlighted in the text for easy following.

## Technology Stack & Dependencies

The application is a Single Page Application (SPA) built with the following technologies:

-   **React**: The core UI library for building the component-based interface.
-   **TypeScript**: Provides static typing for improved code quality and maintainability.
-   **TailwindCSS**: A utility-first CSS framework for styling the application.
-   **epub.js**: The essential library for parsing, rendering, and interacting with EPUB files. It handles content display, navigation, search, and location tracking (CFIs).
-   **JSZip**: A dependency of `epub.js` for unzipping EPUB packages.

All external dependencies (`React`, `Tailwind`, `epub.js`, `JSZip`) are loaded directly from a CDN in `index.html` for simplicity.

## Application Architecture

### Overall Structure
The application is managed by the root `App.tsx` component, which switches between three primary views:
1.  **Library View**: The main interface for displaying the user's local library or browsing a selected OPDS catalog.
2.  **Book Detail View**: Shows comprehensive metadata for a selected book from either the library or a catalog.
3.  **Reader View**: The immersive view for reading a single selected book from the local library.

### State Management
The app primarily uses React's built-in hooks (`useState`, `useCallback`, etc.). To ensure a seamless user experience, key navigation state (like the active catalog and the user's path within it) is "lifted up" to the `App.tsx` component. This preserves the user's browsing location when they navigate between the library and book detail views.

### Data Persistence
-   **IndexedDB** (`services/db.ts`): Acts as the database for the local library. It stores the full `BookRecord` for each imported book, including the large `epubData` (an `ArrayBuffer` of the book file).
-   **LocalStorage**: Used for storing smaller, key-value data:
    -   The list of saved OPDS catalogs.
    -   Global reader settings (theme, font size, etc.).
    -   Per-book reading progress, bookmarks, and citations.

### OPDS & CORS
To bypass browser CORS (Cross-Origin Resource Sharing) restrictions when fetching data from external OPDS catalogs, the application routes requests through a public CORS proxy (`corsproxy.io`).

## File & Component Breakdown

-   **`index.html` / `index.tsx`**: The entry point for the application.
-   **`App.tsx`**: The top-level component. It manages view switching, holds lifted navigation state, and contains the core logic for processing and saving books.
-   **`types.ts`**: Contains all TypeScript interface definitions used throughout the application.

### Services
-   **`services/db.ts`**: An abstraction layer for all IndexedDB operations (saving, retrieving, deleting books).

### Components
-   **`components/Library.tsx`**: A multi-purpose component that renders either the user's local book library or the OPDS catalog browser. It contains the logic for fetching and parsing OPDS feeds (both XML and JSON formats) and handles user interactions like sorting and initiating file imports.
-   **`components/ReaderView.tsx`**: The most complex component, responsible for the entire reading experience. It initializes `epub.js`, manages reader state, and orchestrates all reading-related UI panels and modals.
-   **`components/BookDetailView.tsx`**: A dedicated view to display detailed information about a book. It adapts its presentation and actions based on whether the book is from the local library or a remote catalog.
-   **`components/ManageCatalogsModal.tsx`**: A modal dialog for users to add, edit, and delete their saved OPDS catalogs.
-   **Panel Components** (`SettingsPanel`, `TocPanel`, `SearchPanel`): Slide-out panels used within the `ReaderView` to provide access to settings, navigation tools (TOC, bookmarks, citations), and search functionality.
-   **Modal Components** (`BookmarkModal`, `CitationModal`, `DuplicateBookModal`, `DeleteConfirmationModal`): Dialogs that handle specific user actions like adding notes, managing import conflicts, and confirming deletions.
-   **Shared Components** (`icons.tsx`, `Spinner.tsx`): Reusable UI elements used across the application.