import matchers from '@testing-library/jest-dom/matchers';
import { expect } from 'vitest';

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers as any);

// jsdom is the default for Vitest in many setups but ensure globals are present.
// If any global polyfills are needed (DOMParser, etc) they can be added here.
