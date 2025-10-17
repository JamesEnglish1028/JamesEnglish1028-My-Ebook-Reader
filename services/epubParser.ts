// services/epubParser.ts
// EPUB/OPF metadata and accessibility extraction service


import { DOMParser } from 'xmldom';

import type { BookMetadata } from '../domain/book/types';

import {
  accessibilityFeatureMap,
  accessibilityHazardMap,
  accessModeMap,
  accessibilityConformsToMap,
} from './accessibilityMappings';

/**
 * Parse the OPF XML string and extract all relevant metadata, including accessibility fields.
 * @param opfXml - The OPF XML content as a string
 * @returns Partial<BookMetadata> with extracted fields
 */
export function parseOpfMetadata(opfXml: string): Partial<BookMetadata> {
  const parser = new DOMParser();
  const doc = parser.parseFromString(opfXml, 'application/xml');
  const getText = (tag: string) => {
    const el = doc.getElementsByTagName(tag)[0];
    return el?.textContent?.trim() || undefined;
  };
  const getAllText = (tag: string) =>
    Array.from(doc.getElementsByTagName(tag)).map((e: any) => e.textContent?.trim() || '').filter(Boolean);

  // Helper to extract <meta property="..."> values
  const getMetaPropertyValues = (property: string): string[] => {
    const elements = doc.getElementsByTagName('meta');
    const values: string[] = [];
    for (let i = 0; i < elements.length; i++) {
      const el = elements[i];
      if (el.getAttribute('property') === property) {
        const content = el.textContent?.trim();
        if (content) values.push(content);
      }
    }
    return values;
  };

  // Standard OPF metadata
  const title = getText('dc:title') || getMetaPropertyValues('schema:title')[0];
  const author = getText('dc:creator') || getMetaPropertyValues('schema:creator')[0];
  const publisher = getText('dc:publisher') || getMetaPropertyValues('schema:publisher')[0];
  const publicationDate = getText('dc:date') || getMetaPropertyValues('schema:date')[0];
  const language = getText('dc:language') || getMetaPropertyValues('schema:language')[0];
  const rights = getText('dc:rights') || getMetaPropertyValues('schema:rights')[0];
  const description = getText('dc:description') || getMetaPropertyValues('schema:description')[0];
  const subjects = getAllText('dc:subject').concat(getMetaPropertyValues('schema:subject'));
  const identifiers = getAllText('dc:identifier').concat(getMetaPropertyValues('schema:identifier'));

  // Accessibility metadata (EPUB Accessibility 1.1 preferred)
  const accessModes = getMetaPropertyValues('schema:accessMode').concat(getAllText('dcterms:accessMode'), getAllText('schema:accessMode'));
  const accessibilityFeatures = getMetaPropertyValues('schema:accessibilityFeature').concat(getAllText('dcterms:accessibilityFeature'), getAllText('schema:accessibilityFeature'));
  const hazards = getMetaPropertyValues('schema:accessibilityHazard').concat(getAllText('dcterms:accessibilityHazard'), getAllText('schema:accessibilityHazard'));
  const accessibilitySummary = getMetaPropertyValues('schema:accessibilitySummary')[0] || getText('schema:accessibilitySummary') || getText('dcterms:accessibilitySummary');
  const accessModesSufficient = getMetaPropertyValues('schema:accessModeSufficient').concat(getAllText('schema:accessModeSufficient'), getAllText('dcterms:accessModeSufficient'));
  const certificationConformsTo = getMetaPropertyValues('schema:accessibilityConformsTo').concat(getAllText('dcterms:conformsTo'), getAllText('schema:accessibilityConformsTo'));
  const certification = getMetaPropertyValues('schema:accessibilityCertification')[0] || getText('dcterms:certifiedBy') || getText('schema:accessibilityCertification');

  return {
    title,
    author,
    publisher,
    publicationDate,
    language,
    rights,
    description,
    subjects: subjects.length ? subjects : undefined,
    identifiers: identifiers.length ? identifiers : undefined,
    accessModes: accessModes.length ? accessModes : undefined,
    accessibilityFeatures: accessibilityFeatures.length ? accessibilityFeatures : undefined,
    hazards: hazards.length ? hazards : undefined,
    accessibilitySummary,
    accessModesSufficient: accessModesSufficient.length ? accessModesSufficient : undefined,
    certificationConformsTo: certificationConformsTo.length ? certificationConformsTo : undefined,
    certification,
  };
}

/**
 * Map raw accessibility metadata to user-friendly feedback using a mapping table.
 * @param metadata - Partial BookMetadata with accessibility fields
 * @returns A string with user-friendly accessibility feedback
 */
export function mapAccessibilityFeedback(metadata: Partial<BookMetadata>): string {
  const features = (metadata.accessibilityFeature || [])
    .map(f => accessibilityFeatureMap[f] || f)
    .join(', ');
  const hazards = (metadata.accessibilityHazard || [])
    .map(h => accessibilityHazardMap[h] || h)
    .join(', ');
  const modes = (metadata.accessMode || [])
    .map(m => accessModeMap[m] || m)
    .join(', ');
  const conforms = (metadata.accessibilityConformsTo || [])
    .map(c => accessibilityConformsToMap[c] || c)
    .join(', ');
  let summary = '';
  if (features) summary += `Features: ${features}. `;
  if (hazards) summary += `Hazards: ${hazards}. `;
  if (modes) summary += `Access Modes: ${modes}. `;
  if (conforms) summary += `Conforms to: ${conforms}. `;
  if (metadata.accessibilitySummary) summary += `Summary: ${metadata.accessibilitySummary}`;
  return summary.trim();
}

/**
 * High-level function to extract and map all metadata from an OPF XML string.
 * @param opfXml - The OPF XML content as a string
 * @returns BookMetadata fields, including mapped accessibility feedback
 */
export function extractBookMetadataFromOpf(opfXml: string): Partial<BookMetadata> {
  const raw = parseOpfMetadata(opfXml);
  const accessibilityFeedback = mapAccessibilityFeedback(raw);
  return {
    ...raw,
    accessibilityFeedback,
    opfRaw: opfXml,
  };
}
