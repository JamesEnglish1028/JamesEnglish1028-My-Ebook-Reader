import { expect } from 'vitest';

// Ensure Vitest's expect is available on globalThis before jest-dom loads.
// Use a dynamic import (top-level await) because static imports are hoisted
// and would execute before our assignment.
// Make expect available globally for jest-dom to extend
(globalThis as any).expect = expect;

// Try to require jest-dom at runtime. Use a dynamic require so the TypeScript
// compiler doesn't attempt to resolve it as an ES module at type-check time.
try {
	// eslint-disable-next-line @typescript-eslint/no-var-requires
	const jestDom = require('@testing-library/jest-dom');
	// If the module exposes default/attach behaviour, it's executed on require.
} catch (e) {
	// Ignore — during type checking require may not behave the same; runtime will load it.
}

// jsdom is the default for Vitest in many setups but ensure globals are present.
// If any global polyfills are needed (DOMParser, etc) they can be added here.
