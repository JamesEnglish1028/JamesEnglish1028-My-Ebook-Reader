/**
 * Read Aloud Utilities
 *
 * Functions for sentence detection and DOM range manipulation
 * used by the EPUB reader's text-to-speech feature.
 */

// A list of common English abbreviations that might be mistaken for sentence endings.
const ABBREVIATIONS = [
  'Mr', 'Mrs', 'Ms', 'Dr', 'Prof', 'Sr', 'Jr', 'Sen', 'Rep', 'Gov', 'Gen', 'Hon', // Titles
  'Sgt', 'Capt', 'Col', 'Lt', // Military
  'St', 'Ave', 'Blvd', // Locations
  'etc', 'i.e', 'e.g', 'vs', 'al', 'op', 'cit', // Latin & Common
];

// This regex improves sentence detection by handling common abbreviations and multiple punctuation marks (like ellipses).
const SENTENCE_REGEX = new RegExp(
  `(?:.+?)` + // Non-greedy match for sentence content.
  `(?<!\\b(?:${ABBREVIATIONS.join('|')}))` + // Negative lookbehind: ensure what comes before the period is NOT a known abbreviation.
  `\\.` + // Match the period.
  `[.!?]*` + // Match any subsequent punctuation (for ellipses, etc.).
  `\\s*` + // Include trailing whitespace.
  `|` + // OR
  `(?:.+?)` + // Non-greedy match for sentence content.
  `[?!]+` + // Match '?' or '!', which are unambiguous sentence endings.
  `[.!?]*` + // Match any subsequent punctuation (for "?!").
  `\\s*`, // Include trailing whitespace.
  'g',
);

/**
 * Find the sentence range containing a given character index
 * @param text - The text to search in
 * @param index - The character index to find
 * @returns Object with start, end, and sentence text, or null if not found
 */
export const findSentenceRange = (
  text: string,
  index: number
): { start: number; end: number; sentence: string } | null => {
  SENTENCE_REGEX.lastIndex = 0; // Reset regex state for global flag
  let match;
  while ((match = SENTENCE_REGEX.exec(text)) !== null) {
    const fullMatch = match[0];
    const matchStart = match.index;
    const matchEnd = matchStart + fullMatch.length;

    if (index >= matchStart && index < matchEnd) {
      const trimmedSentence = fullMatch.trim();
      const textStartIndexInMatch = fullMatch.search(/\S/);
      if (textStartIndexInMatch === -1) {
        continue;
      }
      const startOffset = matchStart + textStartIndexInMatch;
      const endOffset = startOffset + trimmedSentence.length;

      return { start: startOffset, end: endOffset, sentence: trimmedSentence };
    }
  }
  return null;
};

/**
 * Create a DOM Range from character offsets in a root node
 * @param root - The root DOM node to search in
 * @param startOffset - Starting character offset
 * @param endOffset - Ending character offset
 * @returns DOM Range or null if not found
 */
export const findDomRangeFromCharacterOffsets = (
  root: Node,
  startOffset: number,
  endOffset: number
): Range | null => {
  const doc = root.ownerDocument;
  if (!doc) return null;

  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let charCount = 0;
  let startNode: Node | null = null;
  let startNodeOffset = 0;
  let endNode: Node | null = null;
  let endNodeOffset = 0;
  let currentNode: Node | null;

  while ((currentNode = walker.nextNode())) {
    const nodeText = currentNode.textContent || '';
    const nodeLength = nodeText.length;
    const nextCharCount = charCount + nodeLength;

    if (startNode === null && startOffset >= charCount && startOffset < nextCharCount) {
      startNode = currentNode;
      startNodeOffset = startOffset - charCount;
    }

    if (endNode === null && endOffset > charCount && endOffset <= nextCharCount) {
      endNode = currentNode;
      endNodeOffset = endOffset - charCount;
    }

    if (startNode && endNode) {
      break; // Found both, exit loop
    }
    charCount = nextCharCount;
  }

  if (startNode && endNode) {
    const range = doc.createRange();
    try {
      range.setStart(startNode, startNodeOffset);
      range.setEnd(endNode, endNodeOffset);
      return range;
    } catch (e) {
      console.error('Error creating DOM range:', e);
      return null;
    }
  }
  return null;
};
