// OPDS1 Audiobook test fixtures
export const xmlAudiobookFeed = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:schema="http://schema.org/">
  <entry schema:additionalType="http://bib.schema.org/Audiobook">
    <title>Sample Audiobook</title>
    <author><name>Test Author</name></author>
    <link rel="http://opds-spec.org/acquisition" href="https://example.com/book.m4a" type="audio/mp4"/>
  </entry>
  <entry schema:additionalType="http://schema.org/EBook">
    <title>Sample E-book</title>
    <author><name>Test Author</name></author>
    <link rel="http://opds-spec.org/acquisition" href="https://example.com/book.epub" type="application/epub+zip"/>
  </entry>
  <entry>
    <title>Default Book</title>
    <author><name>Test Author</name></author>
    <link rel="http://opds-spec.org/acquisition" href="https://example.com/book2.epub" type="application/epub+zip"/>
  </entry>
</feed>`;

export const xmlAudiobookEdgeFeed = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:schema="http://schema.org/">
  <entry schema:additionalType="http://schema.org/Audiobook">
    <title>Alternative Schema Audiobook</title>
    <author><name>Test Author</name></author>
    <link rel="http://opds-spec.org/acquisition" href="https://example.com/book.m4a" type="audio/mp4"/>
  </entry>
  <entry>
    <title>Book Without Schema</title>
    <author><name>Test Author</name></author>
    <link rel="http://opds-spec.org/acquisition" href="https://example.com/book.epub" type="application/epub+zip"/>
  </entry>
</feed>`;
