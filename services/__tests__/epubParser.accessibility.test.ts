
import { describe, expect, it } from 'vitest';

import { parseOpfMetadata } from '../epubParser';

const opfWithAccessibility = `<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>Test Book</dc:title>
    <meta property="schema:accessibilityFeature">alternativeText</meta>
    <meta property="schema:accessibilityFeature">displayTransformability</meta>
    <meta property="schema:accessibilitySummary">This publication conforms to WCAG 2.2 Level AA.</meta>
    <meta property="schema:accessMode">textual</meta>
    <meta property="schema:accessModeSufficient">textual</meta>
    <meta property="schema:accessibilityConformsTo">WCAG2.2AA</meta>
    <meta property="schema:accessibilityCertification">Certified</meta>
    <meta property="schema:accessibilityHazard">none</meta>
  </metadata>
</package>`;

describe('parseOpfMetadata accessibility extraction', () => {
  it('extracts all accessibility fields from OPF', () => {
    const meta = parseOpfMetadata(opfWithAccessibility);
    expect(meta.accessibilityFeatures).toEqual([
      'alternativeText',
      'displayTransformability',
    ]);
    expect(meta.accessibilitySummary).toBe('This publication conforms to WCAG 2.2 Level AA.');
    expect(meta.accessModes).toEqual(['textual']);
    expect(meta.accessModesSufficient).toEqual(['textual']);
    expect(meta.certificationConformsTo).toEqual(['WCAG2.2AA']);
    expect(meta.certification).toBe('Certified');
    expect(meta.hazards).toEqual(['none']);
  });
});
