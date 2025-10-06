// This file contains type definitions for global variables exposed by scripts
// loaded in index.html from a CDN.

declare global {
  interface Window {
    /**
     * The main function from epub.js to load a book.
     */
    ePub: (url: string | ArrayBuffer, options?: any) => any;

    /**
     * JSZip library, a dependency of epub.js.
     */
    JSZip: any;

    /**
     * Google Identity Services library.
     */
    google: any;

    /**
     * Google API Client Library for JavaScript.
     */
    gapi: any;
  }
}

// This export statement is required to make this file a module and allow global declarations.
export {};
