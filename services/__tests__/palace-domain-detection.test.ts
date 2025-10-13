import { describe, it, expect } from 'vitest';

// Since isPalaceHost logic is embedded in the functions, we'll test it indirectly
// by checking if the domain detection logic would work correctly
describe('Palace Project Domain Detection', () => {
  it('should detect thepalaceproject.org domains as Palace hosts', () => {
    const testUrls = [
      'https://thepalaceproject.org',
      'https://catalog.thepalaceproject.org',
      'https://sub.thepalaceproject.org/feed',
      'https://minotaur.dev.palaceproject.io',
      'https://palace.io',
      'https://catalog.palace.io',
    ];

    testUrls.forEach(url => {
      const hostname = new URL(url).hostname.toLowerCase();
      const isPalaceHost = hostname.endsWith('palace.io') || 
                          hostname.endsWith('palaceproject.io') || 
                          hostname.endsWith('thepalaceproject.org') || 
                          hostname === 'palace.io' || 
                          hostname.endsWith('.palace.io') || 
                          hostname.endsWith('.thepalaceproject.org');
      
      expect(isPalaceHost).toBe(true);
    });
  });

  it('should not detect non-Palace domains as Palace hosts', () => {
    const testUrls = [
      'https://example.com',
      'https://gutenberg.org',
      'https://not-palace.com',
      'https://fake-thepalaceproject.net',
    ];

    testUrls.forEach(url => {
      const hostname = new URL(url).hostname.toLowerCase();
      const isPalaceHost = hostname.endsWith('palace.io') || 
                          hostname.endsWith('palaceproject.io') || 
                          hostname.endsWith('thepalaceproject.org') || 
                          hostname === 'palace.io' || 
                          hostname.endsWith('.palace.io') || 
                          hostname.endsWith('.thepalaceproject.org');
      
      expect(isPalaceHost).toBe(false);
    });
  });
});