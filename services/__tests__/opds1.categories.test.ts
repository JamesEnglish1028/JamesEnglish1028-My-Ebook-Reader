import { describe, it, expect } from 'vitest';
import { parseOpds1Xml, groupBooksByMode } from '../opds';

describe('OPDS 1 Category Label Display', () => {
  it('uses category label instead of term for category lane names', () => {
    const xmlData = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:schema="http://schema.org/">
  <entry>
    <title>Literary Criticism Book</title>
    <author><name>Test Author</name></author>
    <category scheme="http://librarysimplified.org/terms/genres/Simplified/" 
             term="http://librarysimplified.org/terms/genres/Simplified/Literary%20Criticism" 
             label="Literary Criticism"/>
    <link rel="http://opds-spec.org/acquisition" href="https://example.com/book.epub" type="application/epub+zip"/>
  </entry>
  <entry>
    <title>Mystery Book</title>
    <author><name>Test Author 2</name></author>
    <category scheme="http://librarysimplified.org/terms/genres/Simplified/" 
             term="http://librarysimplified.org/terms/genres/Simplified/Mystery" 
             label="Mystery"/>
    <link rel="http://opds-spec.org/acquisition" href="https://example.com/book2.epub" type="application/epub+zip"/>
  </entry>
  <entry>
    <title>Book Without Label</title>
    <author><name>Test Author 3</name></author>
    <category scheme="http://librarysimplified.org/terms/genres/Simplified/" 
             term="Science"/>
    <link rel="http://opds-spec.org/acquisition" href="https://example.com/book3.epub" type="application/epub+zip"/>
  </entry>
</feed>`;

    const { books } = parseOpds1Xml(xmlData, 'https://example.com/');
    
    // Verify books have categories with proper labels
    expect(books).toHaveLength(3);
    
    const literaryBook = books.find(b => b.title === 'Literary Criticism Book');
    expect(literaryBook?.categories).toBeDefined();
    expect(literaryBook?.categories?.[0]).toEqual({
      scheme: 'http://librarysimplified.org/terms/genres/Simplified/',
      term: 'http://librarysimplified.org/terms/genres/Simplified/Literary%20Criticism',
      label: 'Literary Criticism'
    });
    
    const mysteryBook = books.find(b => b.title === 'Mystery Book');
    expect(mysteryBook?.categories?.[0]).toEqual({
      scheme: 'http://librarysimplified.org/terms/genres/Simplified/',
      term: 'http://librarysimplified.org/terms/genres/Simplified/Mystery',
      label: 'Mystery'
    });
    
    // Book without label should fall back to term
    const scienceBook = books.find(b => b.title === 'Book Without Label');
    expect(scienceBook?.categories?.[0]).toEqual({
      scheme: 'http://librarysimplified.org/terms/genres/Simplified/',
      term: 'Science',
      label: 'Science'
    });
  });

  it('groups books by category labels in category lanes', () => {
    const xmlData = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:schema="http://schema.org/">
  <entry>
    <title>Literary Criticism Book 1</title>
    <author><name>Test Author</name></author>
    <category scheme="http://librarysimplified.org/terms/genres/Simplified/" 
             term="http://librarysimplified.org/terms/genres/Simplified/Literary%20Criticism" 
             label="Literary Criticism"/>
    <link rel="http://opds-spec.org/acquisition" href="https://example.com/book1.epub" type="application/epub+zip"/>
  </entry>
  <entry>
    <title>Literary Criticism Book 2</title>
    <author><name>Test Author 2</name></author>
    <category scheme="http://librarysimplified.org/terms/genres/Simplified/" 
             term="http://librarysimplified.org/terms/genres/Simplified/Literary%20Criticism" 
             label="Literary Criticism"/>
    <link rel="http://opds-spec.org/acquisition" href="https://example.com/book2.epub" type="application/epub+zip"/>
  </entry>
  <entry>
    <title>Mystery Book</title>
    <author><name>Test Author 3</name></author>
    <category scheme="http://librarysimplified.org/terms/genres/Simplified/" 
             term="http://librarysimplified.org/terms/genres/Simplified/Mystery" 
             label="Mystery"/>
    <link rel="http://opds-spec.org/acquisition" href="https://example.com/book3.epub" type="application/epub+zip"/>
  </entry>
</feed>`;

    const { books, navLinks, pagination } = parseOpds1Xml(xmlData, 'https://example.com/');
    const grouped = groupBooksByMode(books, navLinks, pagination, 'subject');
    
    expect(grouped.categoryLanes).toHaveLength(2);
    
    // Find Literary Criticism lane
    const literaryLane = grouped.categoryLanes.find(lane => 
      lane.category.label === 'Literary Criticism'
    );
    expect(literaryLane).toBeDefined();
    expect(literaryLane?.books).toHaveLength(2);
    expect(literaryLane?.category.label).toBe('Literary Criticism');
    expect(literaryLane?.category.term).toBe('http://librarysimplified.org/terms/genres/Simplified/Literary%20Criticism');
    
    // Find Mystery lane
    const mysteryLane = grouped.categoryLanes.find(lane => 
      lane.category.label === 'Mystery'
    );
    expect(mysteryLane).toBeDefined();
    expect(mysteryLane?.books).toHaveLength(1);
    expect(mysteryLane?.category.label).toBe('Mystery');
    expect(mysteryLane?.category.term).toBe('http://librarysimplified.org/terms/genres/Simplified/Mystery');
  });

  it('maintains backward compatibility with subjects as fallback', () => {
    const xmlData = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <title>Book with Subject Only</title>
    <author><name>Test Author</name></author>
    <category term="Science Fiction"/>
    <link rel="http://opds-spec.org/acquisition" href="https://example.com/book.epub" type="application/epub+zip"/>
  </entry>
</feed>`;

    const { books, navLinks, pagination } = parseOpds1Xml(xmlData, 'https://example.com/');
    const grouped = groupBooksByMode(books, navLinks, pagination, 'subject');
    
    expect(books[0].subjects).toEqual(['Science Fiction']);
    expect(grouped.categoryLanes).toHaveLength(1);
    expect(grouped.categoryLanes[0].category.label).toBe('Science Fiction');
  });
});