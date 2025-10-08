import { expect } from 'vitest';

// Make sure jest-dom finds Vitest's expect implementation when it runs.
// Some versions of @testing-library/jest-dom try to attach to a global `expect`.
// Assign Vitest's expect to globalThis first, then import jest-dom so it can
// extend the matcher set.
(globalThis as any).expect = expect;
import '@testing-library/jest-dom';

// jsdom is the default for Vitest in many setups but ensure globals are present.
// If any global polyfills are needed (DOMParser, etc) they can be added here.
