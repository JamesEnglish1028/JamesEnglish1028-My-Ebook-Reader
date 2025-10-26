// OPDS1 test fixtures for collections
export const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:opds="http://opds-spec.org/2010/catalog">
  <title>Test Catalog</title>
  <entry>
    <title>Test Book 1</title>
    <author><name>Test Author</name></author>
    <link rel="http://opds-spec.org/acquisition" href="/books/1.epub" type="application/epub+zip"/>
    <link rel="collection" href="/collections/fiction" title="Fiction"/>
  </entry>
  <entry>
    <title>Test Book 2</title>
    <author><name>Test Author</name></author>
    <link rel="http://opds-spec.org/acquisition" href="/books/2.epub" type="application/epub+zip"/>
    <link rel="collection" href="/collections/fiction" title="Fiction"/>
    <link rel="collection" href="/collections/bestsellers" title="Bestsellers"/>
  </entry>
  <entry>
    <title>Test Book 3</title>
    <author><name>Test Author</name></author>
    <link rel="http://opds-spec.org/acquisition" href="/books/3.epub" type="application/epub+zip"/>
  </entry>
</feed>`;

export const books = [
  {
    title: 'Book 1',
    author: 'Author 1',
    coverImage: null,
    downloadUrl: '/books/1.epub',
    summary: null,
    collections: [
      { title: 'Fiction', href: '/collections/fiction' },
    ],
  },
  {
    title: 'Book 2',
    author: 'Author 2',
    coverImage: null,
    downloadUrl: '/books/2.epub',
    summary: null,
    collections: [
      { title: 'Fiction', href: '/collections/fiction' },
      { title: 'Bestsellers', href: '/collections/bestsellers' },
    ],
  },
  {
    title: 'Book 3',
    author: 'Author 3',
    coverImage: null,
    downloadUrl: '/books/3.epub',
    summary: null,
  },
];
