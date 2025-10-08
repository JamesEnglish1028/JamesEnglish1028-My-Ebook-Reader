import '@testing-library/jest-dom';

// Provide a DOMParser polyfill for Node/JSDOM environment if not present
if (typeof (globalThis as any).DOMParser === 'undefined') {
  // Use jsdom's DOMParser when available
  const { JSDOM } = require('jsdom');
  (globalThis as any).DOMParser = new JSDOM().window.DOMParser;
}
