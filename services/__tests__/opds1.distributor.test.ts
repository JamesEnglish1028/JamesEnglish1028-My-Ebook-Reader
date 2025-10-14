import { describe, it, expect } from 'vitest';

import { parseOpds1Xml } from '../opds';

describe('OPDS 1 Distributor Parsing', () => {
  it('correctly extracts distributor from bibframe:distribution element', () => {
    const xmlData = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:bibframe="http://id.loc.gov/ontologies/bibframe/">
  <entry>
    <title>Book from BiblioBoard</title>
    <author><name>Test Author</name></author>
    <bibframe:distribution bibframe:ProviderName="BiblioBoard"/>
    <link rel="http://opds-spec.org/acquisition" href="https://example.com/book1.epub" type="application/epub+zip"/>
  </entry>
  <entry>
    <title>Book from OAPEN</title>
    <author><name>Test Author 2</name></author>
    <bibframe:distribution bibframe:ProviderName="OAPEN"/>
    <link rel="http://opds-spec.org/acquisition" href="https://example.com/book2.epub" type="application/epub+zip"/>
  </entry>
  <entry>
    <title>Book from OverDrive</title>
    <author><name>Test Author 3</name></author>
    <bibframe:distribution bibframe:ProviderName="OverDrive"/>
    <link rel="http://opds-spec.org/acquisition" href="https://example.com/book3.epub" type="application/epub+zip"/>
  </entry>
  <entry>
    <title>Book without Distributor</title>
    <author><name>Test Author 4</name></author>
    <link rel="http://opds-spec.org/acquisition" href="https://example.com/book4.epub" type="application/epub+zip"/>
  </entry>
</feed>`;

    const { books } = parseOpds1Xml(xmlData, 'https://example.com/');
    
    expect(books).toHaveLength(4);
    
    // Check BiblioBoard book
    const biblioBoardBook = books.find(b => b.title === 'Book from BiblioBoard');
    expect(biblioBoardBook?.distributor).toBe('BiblioBoard');
    
    // Check OAPEN book  
    const oapenBook = books.find(b => b.title === 'Book from OAPEN');
    expect(oapenBook?.distributor).toBe('OAPEN');
    
    // Check OverDrive book
    const overdriveBook = books.find(b => b.title === 'Book from OverDrive');
    expect(overdriveBook?.distributor).toBe('OverDrive');
    
    // Check book without distributor
    const noDistributorBook = books.find(b => b.title === 'Book without Distributor');
    expect(noDistributorBook?.distributor).toBeUndefined();
  });

  it('handles distributor extraction from real Palace OPDS data', () => {
    const xmlData = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:bibframe="http://id.loc.gov/ontologies/bibframe/">
  <entry>
    <title>Sample Academic Book</title>
    <author><name>Academic Author</name></author>
    <publisher>Academic Press</publisher>
    <bibframe:distribution bibframe:ProviderName="OAPEN"/>
    <link rel="http://opds-spec.org/acquisition" href="https://example.com/academic.epub" type="application/epub+zip"/>
  </entry>
  <entry>
    <title>Popular Fiction Book</title>
    <author><name>Fiction Author</name></author>
    <publisher>Random House</publisher>
    <bibframe:distribution bibframe:ProviderName="BiblioBoard"/>
    <link rel="http://opds-spec.org/acquisition" href="https://example.com/fiction.epub" type="application/epub+zip"/>
  </entry>
</feed>`;

    const { books } = parseOpds1Xml(xmlData, 'https://example.com/');
    
    expect(books).toHaveLength(2);
    
    const academicBook = books.find(b => b.title === 'Sample Academic Book');
    expect(academicBook?.distributor).toBe('OAPEN');
    expect(academicBook?.publisher).toBe('Academic Press');
    
    const fictionBook = books.find(b => b.title === 'Popular Fiction Book');
    expect(fictionBook?.distributor).toBe('BiblioBoard');
    expect(fictionBook?.publisher).toBe('Random House');
  });

  it('handles edge cases in distributor parsing', () => {
    const xmlData = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:bibframe="http://id.loc.gov/ontologies/bibframe/">
  <entry>
    <title>Book with Empty Distributor</title>
    <author><name>Test Author</name></author>
    <bibframe:distribution bibframe:ProviderName=""/>
    <link rel="http://opds-spec.org/acquisition" href="https://example.com/book1.epub" type="application/epub+zip"/>
  </entry>
  <entry>
    <title>Book with Whitespace Distributor</title>
    <author><name>Test Author 2</name></author>
    <bibframe:distribution bibframe:ProviderName="  UMPEBC  "/>
    <link rel="http://opds-spec.org/acquisition" href="https://example.com/book2.epub" type="application/epub+zip"/>
  </entry>
  <entry>
    <title>Book with Distribution Element but No ProviderName</title>
    <author><name>Test Author 3</name></author>
    <bibframe:distribution someOtherAttribute="value"/>
    <link rel="http://opds-spec.org/acquisition" href="https://example.com/book3.epub" type="application/epub+zip"/>
  </entry>
</feed>`;

    const { books } = parseOpds1Xml(xmlData, 'https://example.com/');
    
    expect(books).toHaveLength(3);
    
    // Empty distributor should be undefined
    const emptyDistributorBook = books.find(b => b.title === 'Book with Empty Distributor');
    expect(emptyDistributorBook?.distributor).toBeUndefined();
    
    // Whitespace should be trimmed
    const whitespaceBook = books.find(b => b.title === 'Book with Whitespace Distributor');
    expect(whitespaceBook?.distributor).toBe('UMPEBC');
    
    // Missing ProviderName attribute should be undefined
    const missingProviderBook = books.find(b => b.title === 'Book with Distribution Element but No ProviderName');
    expect(missingProviderBook?.distributor).toBeUndefined();
  });
});