import { describe, it } from 'vitest';

/**
 * Placeholder for google.ts tests.
 *
 * Google Drive integration depends on browser globals (window.gapi, window.google.accounts)
 * and real Google API credentials. These cannot be reliably unit tested in a headless or CI environment.
 *
 * Integration and error-paths should be tested via manual QA or e2e/integration tests with a real browser.
 *
 * See: services/google.ts
 */

describe.skip('google.ts - Google Drive integration', () => {
  it('Google Drive upload/download logic and error/edge cases require real browser and credentials', () => {
    // No-op: see above.
  });
});
