import { readFileSync } from 'fs';
import { resolve } from 'path';

/* global __dirname */

import { describe, test, expect } from 'vitest';

import { parseOpds2Json, parseOpds1Xml } from '../opds';

describe('OPDS Version Forcing Issue Diagnosis', () => {
  test('demonstrates the issue when OPDS 1 XML is forced to parse as OPDS 2', () => {
    // Read the real Palace.io OPDS 1 XML data
    const xmlPath = resolve(__dirname, '../../test-data/MinotaurOPDS.xml');
    const xmlData = readFileSync(xmlPath, 'utf-8');
    
    console.log('XML data starts with:', xmlData.substring(0, 100));
    
    // This should work correctly (OPDS 1 XML → OPDS 1 parser)
    const correctResult = parseOpds1Xml(xmlData, 'https://minotaur.dev.palaceproject.io/minotaur-test-library/');
    expect(correctResult.books.length).toBeGreaterThan(0);
    expect(correctResult.books.some(b => b.collections && b.collections.length > 0)).toBe(true);
    
    console.log('Correct parsing - books with collections:', correctResult.books.filter(b => b.collections && b.collections.length > 0).length);
    
    // This will fail (OPDS 1 XML → OPDS 2 parser) - simulating the user's issue
    expect(() => {
      parseOpds2Json(xmlData as any, 'https://minotaur.dev.palaceproject.io/minotaur-test-library/');
    }).toThrow();
    
    console.log('✓ Confirmed: Forcing OPDS 2 parsing on OPDS 1 XML fails as expected');
  });

  test('shows how catalog opdsVersion setting affects parsing', () => {
    // Simulate the catalog configuration scenarios
    
    // Scenario 1: opdsVersion: 'auto' (should work)
    const catalogAuto = { 
      id: 'palace-test', 
      name: 'Palace Test', 
      url: 'https://example.palace.io/catalog', 
      opdsVersion: 'auto' as const, 
    };
    
    // Scenario 2: opdsVersion: '2' (would cause the user's issue)
    const catalogForced2 = { 
      id: 'palace-test', 
      name: 'Palace Test', 
      url: 'https://example.palace.io/catalog', 
      opdsVersion: '2' as const, 
    };
    
    // Scenario 3: opdsVersion: '1' (would work correctly)
    const catalogForced1 = { 
      id: 'palace-test', 
      name: 'Palace Test', 
      url: 'https://example.palace.io/catalog', 
      opdsVersion: '1' as const, 
    };
    
    // Simulate the Library.tsx logic for determining forcedVersion
    const getForcedVersion = (catalog: { opdsVersion?: 'auto' | '1' | '2' }) => {
      return catalog.opdsVersion || 'auto';
    };
    
    expect(getForcedVersion(catalogAuto)).toBe('auto');      // ✓ Would auto-detect
    expect(getForcedVersion(catalogForced2)).toBe('2');      // ❌ Would force OPDS 2 on OPDS 1 XML
    expect(getForcedVersion(catalogForced1)).toBe('1');      // ✓ Would force OPDS 1 correctly
    
    console.log('Auto detection version:', getForcedVersion(catalogAuto));
    console.log('Forced OPDS 2 version:', getForcedVersion(catalogForced2), '← This would cause the issue');
    console.log('Forced OPDS 1 version:', getForcedVersion(catalogForced1));
  });
});