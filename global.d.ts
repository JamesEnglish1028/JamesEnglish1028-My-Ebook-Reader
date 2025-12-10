// This file contains type definitions for global variables exposed by scripts
// loaded in index.html from a CDN.

declare global {
  interface Window {
    /**
     * The main function from epub.js to load a book.
     */
    ePub: (url: string | ArrayBuffer, options?: any) => Book;

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

  // ePub.js type declarations
  interface Book {
    ready: Promise<void>;
    loaded: {
      navigation: Promise<Navigation>;
      metadata: Promise<any>;
    };
    locations: Locations;
    spine: Spine;
    renderTo: (element: HTMLElement, options?: any) => Rendition;
    destroy: () => void;
  }

  interface Navigation {
    toc: TocItem[];
    get: (target: string) => Promise<NavItem>;
  }

  interface NavItem {
    label: string;
    href: string;
    id?: string;
  }

  interface TocItem {
    id: string;
    href: string;
    label: string;
    subitems?: TocItem[];
  }

  interface Locations {
    generate: (chars?: number) => Promise<void>;
    percentage: (target: string) => number;
    percentageFromCfi: (cfi: string) => number;
    cfiFromPercentage: (percentage: number) => string;
    cfiFromLocation: (location: number) => string;
    locationFromCfi: (cfi: string) => number;
    length: () => number;
  }

  interface Spine {
    items: SpineItem[];
  }

  interface SpineItem {
    href: string;
    index: number;
    cfiBase: string;
    id?: string;
    idref?: string;
  }

  interface Rendition {
    display: (target?: string | number) => Promise<void>;
    next: () => Promise<void>;
    prev: () => Promise<void>;
    resize: () => void;
    themes: Themes;
    annotations: Annotations;
    on: (event: string, callback: (...args: any[]) => void) => void;
    off: (event: string, callback: (...args: any[]) => void) => void;
    getContents: () => Contents[];
    currentLocation: () => CurrentLocation;
  }

  interface Themes {
    register: (name: string, styles: any) => void;
    select: (name: string) => void;
    fontSize: (size: string) => void;
    font: (font: string) => void;
  }

  interface Annotations {
    add: (type: string, cfiRange: string, data?: any, callback?: any, className?: string, styles?: any) => void;
    remove: (cfiRange: string, type: string) => void;
  }

  interface Contents {
    document: Document;
    window: Window;
    range: (cfi: string) => Range;
  }

  interface CurrentLocation {
    start: {
      cfi: string;
      displayed: { page: number; total: number };
      percentage: number;
    };
    end: {
      cfi: string;
      displayed: { page: number; total: number };
      percentage: number;
    };
  }
}

// This export statement is required to make this file a module and allow global declarations.
export {};

// Allow importing SVG files as URLs (Vite/webpack will return a string URL)
declare module '*.svg' {
  const src: string;
  export default src;
}
