# Custom Ebook Reader

A custom, browser-based ebook reader inspired by [Readium's Thorium](https://www.edrlab.org/software/thorium-reader/). This application allows users to import and read EPUB books directly in their browser, with all data stored locally. It is built using modern web technologies and focuses on providing a rich, customizable reading experience.

## Key Features

-   **Entirely Browser-Based**: No installation needed. The app runs completely in your web browser.
-   **Local-First Storage**: Your books and reading data never leave your computer. Book files are stored in IndexedDB, while settings and annotations are kept in LocalStorage.
-   **EPUB Library**: Import `.epub` files to build your personal library, displayed with book covers.
-   **Customizable Reader**:
    -   Adjust font size and family (Serif, Sans-Serif).
    -   Switch between Light and Dark themes.
    -   Choose your reading mode: `Paginated` (like a physical book) or `Scrolled` (like a webpage).
-   **Advanced Reading Tools**:
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
The application is managed by the root `App.tsx` component, which switches between two primary views:
1.  **Library View**: The default view that displays all imported books.
2.  **Reader View**: The immersive view for reading a single selected book.

### Data Persistence
Data is stored entirely within the user's browser using two storage mechanisms:

-   **IndexedDB** (`services/db.ts`): Used to store the full `BookRecord`, including the large `epubData` (an `ArrayBuffer` of the book file). IndexedDB is ideal for storing large amounts of structured data, including binary blobs. The `db.ts` file provides a simple service to interact with the database.
-   **LocalStorage** (`components/ReaderView.tsx`): Used for storing smaller, key-value data such as user preferences, reading progress, bookmarks, and citations. This data is persisted across browser sessions.

## File & Component Breakdown

Here is a summary of the major files and their roles in the application:

-   **`index.html`**: The main HTML file. It sets up the page structure and loads all necessary scripts and styles from CDNs.
-   **`index.tsx`**: The entry point for the React application, which renders the `App` component into the DOM.
-   **`App.tsx`**: The top-level React component. It manages the current view (library or reader) and handles the transition between them.
-   **`types.ts`**: Contains all TypeScript interface definitions used throughout the application, ensuring type safety.

### Services

-   **`services/db.ts`**: An abstraction layer for all IndexedDB operations. It handles creating the database, adding new books, and retrieving book data and metadata.

### Components

-   **`components/Library.tsx`**: Renders the user's book library. Its primary responsibilities include:
    -   Fetching and displaying book metadata from IndexedDB.
    -   Handling the file input and import process for new EPUBs.
    -   Using `epub.js` to parse the metadata and cover of an imported file before saving it.
-   **`components/ReaderView.tsx`**: The most complex component, responsible for the entire reading experience.
    -   Initializes `epub.js` to render the selected book.
    -   Manages all reader state, including the current location, settings, and panel visibility.
    -   Implements all major features like navigation, read-aloud (TTS), and event handling (clicks, swipes).
    -   Orchestrates the settings, navigation, search, and modal components.
-   **`components/SettingsPanel.tsx`**: A slide-out panel for adjusting display settings (font, theme, etc.) and text-to-speech preferences (voice, rate, pitch).
-   **`components/TocPanel.tsx`**: A tabbed slide-out panel for navigation. It displays the book's Table of Contents, user-created Bookmarks, and Citations. It also contains the logic for exporting citations.
-   **`components/SearchPanel.tsx`**: A slide-out panel that provides an interface for full-text search within the book and displays the results.
-   **`components/BookmarkModal.tsx` & `components/CitationModal.tsx`**: Simple modal dialogs for adding notes when creating a new bookmark or citation.
-   **`components/icons.tsx`**: A collection of SVG icons used throughout the UI, exported as React components.
-   **`components/Spinner.tsx`**: A reusable loading spinner component.