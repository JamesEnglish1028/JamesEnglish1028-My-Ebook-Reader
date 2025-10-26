
// @vitest-environment jsdom
import '@testing-library/jest-dom';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import BookDetailView from '../BookDetailView';

describe('BookDetailView accessibility rendering', () => {
  it('renders all accessibility metadata fields', () => {
    const book = {
      id: 1,
      title: 'Test Book',
      author: 'Author',
      coverImage: null,
      accessibilityFeatures: ['altText', 'displayTransformability'],
      accessModes: ['textual'],
      accessModesSufficient: ['textual'],
      hazards: ['none'],
      accessibilitySummary: 'Summary',
      certificationConformsTo: ['WCAG2.2AA'],
      certification: 'Certified',
      accessibilityFeedback: 'Feedback',
      language: 'en',
      rights: 'public domain',
      subjects: [],
      format: 'EPUB',
    };
    // Provide all required props and mocks
    const props = {
      book,
      source: 'library',
      catalogName: undefined,
      onBack: () => {},
      onReadBook: () => {},
      onImportFromCatalog: async () => ({ success: true }),
      importStatus: { isLoading: false, message: '', error: null },
      setImportStatus: () => {},
    };
    const { getByText } = render(<BookDetailView {...props} />);
  expect(getByText('Accessibility: Summary')).toBeInTheDocument();
  expect(getByText('Features: altText, displayTransformability')).toBeInTheDocument();
    expect(getByText('Access Modes')).toBeInTheDocument();
    expect(getByText('textual')).toBeInTheDocument();
    expect(getByText('Accessibility Hazards')).toBeInTheDocument();
    expect(getByText('none')).toBeInTheDocument();
    expect(getByText('Accessibility Notes')).toBeInTheDocument();
    expect(getByText('Summary')).toBeInTheDocument();
    expect(getByText('Accessibility Summary')).toBeInTheDocument();
    expect(getByText('Feedback')).toBeInTheDocument();
  });
});
