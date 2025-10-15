import React from 'react';

import { LeftArrowIcon } from './icons';

interface AboutPageProps {
  onBack: () => void;
}

const AboutPage: React.FC<AboutPageProps> = ({ onBack }) => {
  return (
    <div className="container mx-auto p-4 md:p-8 text-white min-h-screen">
      <header className="mb-8">
        <button onClick={onBack} className="inline-flex items-center gap-2 text-slate-300 hover:text-sky-400 transition-colors">
          <LeftArrowIcon className="w-5 h-5" />
          <span>Back to Library</span>
        </button>
      </header>

      <main className="max-w-4xl mx-auto prose prose-invert prose-headings:text-sky-300 prose-headings:font-semibold prose-a:text-sky-400 hover:prose-a:text-sky-300 prose-strong:text-slate-100 prose-code:bg-slate-700 prose-code:rounded prose-code:px-1.5 prose-code:py-1 prose-code:font-mono prose-li:marker:text-sky-400">
        <h1>About MeBooks</h1>
        <p className="text-lg text-slate-300">
          MeBooks is a custom, browser-based ebook reader inspired by Readium's Thorium. This application allows users to import EPUB and PDF books into a local library and browse online OPDS catalogs. It is built using modern web technologies and focuses on providing a rich, customizable reading experience with robust library management features.
        </p>

        <h2>Key Features</h2>

        <h3>Accessibility & A11Y</h3>
        <ul>
          <li><strong>WCAG 2.1 AA Compliance:</strong> All UI and content meet or exceed Level AA requirements.</li>
          <li><strong>Keyboard Navigation:</strong> Every feature is accessible via keyboard, with logical tab order and visible focus indicators.</li>
          <li><strong>Screen Reader Support:</strong> ARIA labels, live regions, and dynamic announcements for all major actions.</li>
          <li><strong>High Contrast & Color Blind Friendly:</strong> All text and UI elements use a high-contrast palette and are tested for color blindness.</li>
          <li><strong>Skip Links & Landmarks:</strong> Quickly jump to main content or navigation.</li>
          <li><strong>Accessible Modals & Dialogs:</strong> Focus is managed and restored, with ARIA roles and announcements.</li>
          <li><strong>Global Keyboard Shortcuts:</strong> Discoverable, accessible shortcuts for power users.</li>
          <li><strong>Adjustable Font Size & Family:</strong> Reader settings allow for easy text customization.</li>
          <li><strong>Responsive Design:</strong> Works on all devices and screen sizes.</li>
        </ul>

        <p className="mt-4">
          <a href="/VPAT.md" target="_blank" rel="noopener noreferrer" className="underline text-sky-400 hover:text-sky-300 font-semibold">View the Accessibility VPAT (Voluntary Product Accessibility Template)</a>
        </p>

        <h3>Library Management</h3>
        <ul>
          <li><strong>Local-First Storage:</strong> Your books and reading data never leave your computer. Book files are stored in IndexedDB, while settings, catalog lists, and annotations are kept in LocalStorage.</li>
          <li><strong>EPUB &amp; PDF Import:</strong> Import <code>.epub</code> and <code>.pdf</code> files to build your personal library.</li>
          <li><strong>Book Details:</strong> View detailed information for each book, including publication details, subjects, and provider IDs.</li>
          <li><strong>Library Organization:</strong> Sort your library by title, author, publication date, or the date added.</li>
        </ul>

        <h3>Online Catalog Support (OPDS)</h3>
        <ul>
            <li><strong>Browse Remote Libraries:</strong> Add and manage an unlimited number of public OPDS (Open Publication Distribution System) catalogs.</li>
            <li><strong>OPDS v1 & v2 Support:</strong> Compatible with both XML-based (Atom) and JSON-based OPDS feeds.</li>
            <li><strong>One-Click Import:</strong> Download books directly from a catalog and add them to your local library.</li>
        </ul>

        <h3>Advanced Reader Experience</h3>
        <ul>
            <li><strong>Entirely Browser-Based:</strong> No installation needed. The app runs completely in your web browser.</li>
            <li><strong>Multi-Format Support:</strong> Reads both EPUB and PDF files. EPUBs are rendered using a sophisticated JavaScript engine, while PDFs are displayed using your browser's native, built-in PDF viewer for speed and reliability.</li>
            <li><strong>Customizable Reader (EPUB only):</strong> Adjust font size, font family, theme, and reading mode (paginated or scrolled).</li>
            <li><strong>Rich Reading Tools (EPUB only):</strong> Create bookmarks with notes, generate academic citations (APA, MLA, Chicago), and perform full-text searches.</li>
            <li><strong>Citation Export (EPUB only):</strong> Export all citations for a book in the standard <code>.ris</code> format for use in reference managers like Zotero or EndNote.</li>
            <li><strong>Read Aloud (Text-to-Speech for EPUB only):</strong> Listen to your book with synchronized sentence highlighting.</li>
        </ul>

        <h2>Technology Stack</h2>
        <p>The application is a Single Page Application (SPA) built with the following technologies:</p>
        <ul>
          <li><strong>React:</strong> The core UI library for building the component-based interface.</li>
          <li><strong>TypeScript:</strong> Provides static typing for improved code quality and maintainability.</li>
          <li><strong>TailwindCSS:</strong> A utility-first CSS framework for styling the application.</li>
          <li><strong>epub.js:</strong> The essential library for parsing, rendering, and interacting with EPUB files.</li>
          <li><strong>JSZip:</strong> A dependency of <code>epub.js</code> for unzipping EPUB packages.</li>
        </ul>
        <p>All external dependencies are loaded directly from a CDN for simplicity.</p>
      </main>
    </div>
  );
};

export default AboutPage;