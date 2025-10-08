import { expect } from 'vitest';

// Ensure Vitest's expect is available on globalThis before jest-dom loads.
// Use a dynamic import (top-level await) because static imports are hoisted
// and would execute before our assignment.
(globalThis as any).expect = expect;

// Load jest-dom after setting global expect so it can extend the matcher set.
// Top-level await is supported in this environment.
await import('@testing-library/jest-dom');

// jsdom is the default for Vitest in many setups but ensure globals are present.
// If any global polyfills are needed (DOMParser, etc) they can be added here.
