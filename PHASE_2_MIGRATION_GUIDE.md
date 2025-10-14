# Phase 2 Migration Guide: Using Domain Services

## Overview

Phase 2 has introduced a new **Service Layer** with clean abstractions over domain operations. These services provide:

- ✅ **Consistent Result Pattern** - No throwing exceptions in business logic
- ✅ **Comprehensive Logging** - All operations tracked
- ✅ **Type Safety** - Full TypeScript support
- ✅ **Easy Testing** - Simple to mock services
- ✅ **Backward Compatible** - Existing code continues to work

This guide shows how to migrate components from direct storage/utility calls to domain services.

---

## Available Services

### 1. BookRepository (`domain/book`)
```typescript
import { bookRepository } from '../domain/book';
```

**Operations:**
- `save(book)` - Save/update book
- `findById(id)` - Get book with binary data
- `findMetadataById(id)` - Get book without binary
- `findAll()` - Get all books
- `findAllMetadata()` - Get all books metadata only
- `findByIdentifier(id)` - Find by providerId or ISBN
- `delete(id)` - Delete book
- `update(id, updates)` - Partial update
- `exists(identifier)` - Check existence
- `count()` - Total book count

### 2. OPDSParserService & OPDSAcquisitionService (`domain/catalog`)
```typescript
import { opdsParserService, opdsAcquisitionService } from '../domain/catalog';
```

**OPDSParserService:**
- `parseOPDS1(xmlText, baseUrl)` - Parse OPDS 1 feed
- `parseOPDS2(jsonData, baseUrl)` - Parse OPDS 2 feed
- `parseOPDS(content, baseUrl)` - Auto-detect and parse
- `detectVersion(content)` - Determine OPDS version

**OPDSAcquisitionService:**
- `resolveOPDS1(href, credentials)` - Resolve OPDS 1 acquisition
- `resolveOPDS2(href, credentials)` - Resolve OPDS 2 acquisition
- `resolve(href, version, credentials)` - Auto-detect and resolve

### 3. BookmarkService (`domain/reader`)
```typescript
import { bookmarkService } from '../domain/reader';
```

**Operations:**
- `findByBookId(bookId)` - Get all bookmarks
- `findById(bookId, bookmarkId)` - Get specific bookmark
- `add(bookId, options)` - Create bookmark
- `update(bookId, bookmarkId, options)` - Update bookmark
- `delete(bookId, bookmarkId)` - Delete bookmark
- `deleteAll(bookId)` - Delete all bookmarks
- `count(bookId)` - Count bookmarks
- `findByChapter(bookId, chapter)` - Filter by chapter
- `exportBookmarks(bookId)` - Export as JSON
- `importBookmarks(bookId, json, merge)` - Import bookmarks

### 4. CitationService (`domain/reader`)
```typescript
import { citationService } from '../domain/reader';
```

**Citation Management:**
- `findByBookId(bookId)` - Get all citations
- `add(bookId, options)` - Create citation
- `update(bookId, citationId, options)` - Update citation
- `delete(bookId, citationId)` - Delete citation
- `findByChapter(bookId, chapter)` - Filter by chapter

**Citation Formatting:**
- `formatAuthorName(name, format)` - Format author name
- `generateCitation(book, format)` - Generate citation components
- `formatCitation(book, format)` - Plain text citation
- `formatAllStyles(book)` - All formats (APA, MLA, Chicago)
- `exportToRIS(book, citations)` - Export to RIS format

### 5. PositionTrackerService (`domain/reader`)
```typescript
import { positionTracker } from '../domain/reader';
```

**Position Management:**
- `getPosition(bookId)` - Get last reading position
- `savePosition(bookId, cfi)` - Save reading position
- `clearPosition(bookId)` - Clear position
- `getSpeechPosition(bookId)` - Get TTS position
- `saveSpeechPosition(bookId, cfi)` - Save TTS position

**Progress Utilities:**
- `calculateProgress(currentPage, totalPages)` - Calculate percentage
- `createLocationInfo(currentPage, totalPages, progress)` - Create LocationInfo
- `formatLocationInfo(location)` - Format as "Page 42 of 100 (42%)"
- `formatPageLabel(location)` - Format as "Page 42"

---

## Migration Patterns

### Pattern 1: Result Pattern Handling

**Old Way (exceptions):**
```typescript
try {
  const book = await getBookById(bookId);
  if (!book) {
    console.error('Book not found');
    return;
  }
  // Use book
} catch (error) {
  console.error('Failed to get book', error);
}
```

**New Way (Result pattern):**
```typescript
const result = await bookRepository.findMetadataById(bookId);
if (!result.success) {
  console.error('Failed to get book:', result.error);
  return;
}

if (!result.data) {
  console.error('Book not found');
  return;
}

const book = result.data;
// Use book - TypeScript knows it's not null here
```

### Pattern 2: Bookmark Management Migration

**Old Way:**
```typescript
import { getBookmarksForBook, saveBookmarksForBook } from '../services/readerUtils';

// Get bookmarks
const bookmarks = getBookmarksForBook(bookId);
setBookmarks(bookmarks);

// Add bookmark
const newBookmark = {
  id: new Date().toISOString(),
  cfi: currentCfi,
  label: `Page ${currentPage}`,
  chapter: currentChapter,
  description: undefined,
  createdAt: Date.now(),
};
const updated = [...bookmarks, newBookmark];
setBookmarks(updated);
saveBookmarksForBook(bookId, updated);
```

**New Way:**
```typescript
import { bookmarkService } from '../domain/reader';

// Get bookmarks
const result = bookmarkService.findByBookId(bookId);
if (result.success) {
  setBookmarks(result.data);
}

// Add bookmark
const addResult = bookmarkService.add(bookId, {
  cfi: currentCfi,
  label: `Page ${currentPage}`,
  chapter: currentChapter,
  description: undefined,
});

if (addResult.success) {
  // Refresh bookmark list
  const refreshResult = bookmarkService.findByBookId(bookId);
  if (refreshResult.success) {
    setBookmarks(refreshResult.data);
  }
}
```

**Benefits:**
- ✅ No manual array manipulation
- ✅ Automatic ID generation
- ✅ Consistent error handling
- ✅ Logging included

### Pattern 3: Citation Management Migration

**Old Way:**
```typescript
import { getCitationsForBook, saveCitationsForBook } from '../services/readerUtils';

const citations = getCitationsForBook(bookId);
const newCitation = {
  id: new Date().toISOString(),
  cfi: currentCfi,
  note: userNote,
  createdAt: Date.now(),
  pageNumber: currentPage,
  chapter: currentChapter,
};
const updated = [...citations, newCitation];
setCitations(updated);
saveCitationsForBook(bookId, updated);
```

**New Way:**
```typescript
import { citationService } from '../domain/reader';

const result = citationService.add(bookId, {
  cfi: currentCfi,
  note: userNote,
  pageNumber: currentPage,
  chapter: currentChapter,
});

if (result.success) {
  const refreshResult = citationService.findByBookId(bookId);
  if (refreshResult.success) {
    setCitations(refreshResult.data);
  }
}
```

### Pattern 4: Position Tracking Migration

**Old Way:**
```typescript
import { 
  getLastPositionForBook, 
  saveLastPositionForBook 
} from '../services/readerUtils';

// Get position
const startCfi = getLastPositionForBook(bookId) || defaultCfi;

// Save position (with debounce)
if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
saveTimeoutRef.current = window.setTimeout(() => {
  saveLastPositionForBook(bookId, currentCfi);
}, 1000);
```

**New Way:**
```typescript
import { positionTracker } from '../domain/reader';

// Get position
const posResult = positionTracker.getPosition(bookId);
const startCfi = posResult.success && posResult.data ? posResult.data : defaultCfi;

// Save position (with debounce)
if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
saveTimeoutRef.current = window.setTimeout(() => {
  positionTracker.savePosition(bookId, currentCfi);
}, 1000);
```

### Pattern 5: OPDS Parsing Migration

**Old Way:**
```typescript
import { parseOpds1Xml, parseOpds2Json } from '../services/opds';

try {
  let result;
  if (content.startsWith('<')) {
    result = parseOpds1Xml(content, baseUrl);
  } else {
    const json = JSON.parse(content);
    result = parseOpds2Json(json, baseUrl);
  }
  setBooks(result.books);
} catch (error) {
  console.error('Failed to parse OPDS', error);
}
```

**New Way:**
```typescript
import { opdsParserService } from '../domain/catalog';

const result = await opdsParserService.parseOPDS(content, baseUrl);
if (!result.success) {
  console.error('Failed to parse OPDS:', result.error);
  return;
}

setBooks(result.data.books);
setNavLinks(result.data.navLinks);
setPagination(result.data.pagination);
```

**Benefits:**
- ✅ Auto-detection of OPDS version
- ✅ No manual try/catch
- ✅ Consistent error messages
- ✅ Logging included

### Pattern 6: Book Repository Migration

**Old Way:**
```typescript
import { saveBook, getBookById, getAllBooks, deleteBook } from '../services/db';

// Save book
try {
  const id = await saveBook(bookData);
  console.log('Book saved with ID:', id);
} catch (error) {
  console.error('Failed to save book', error);
}

// Get book
try {
  const book = await getBookById(bookId);
  if (book) {
    setBook(book);
  }
} catch (error) {
  console.error('Failed to get book', error);
}
```

**New Way:**
```typescript
import { bookRepository } from '../domain/book';

// Save book
const saveResult = await bookRepository.save(bookData);
if (!saveResult.success) {
  console.error('Failed to save book:', saveResult.error);
  return;
}
console.log('Book saved with ID:', saveResult.data);

// Get book (metadata only, faster)
const result = await bookRepository.findMetadataById(bookId);
if (!result.success) {
  console.error('Failed to get book:', result.error);
  return;
}

if (result.data) {
  setBook(result.data);
} else {
  console.log('Book not found');
}
```

---

## Component Migration Examples

### Example 1: Library Component - Book List

**Before:**
```typescript
const Library: React.FC = () => {
  const [books, setBooks] = useState<BookRecord[]>([]);
  
  useEffect(() => {
    const loadBooks = async () => {
      try {
        const allBooks = await getAllBooks();
        setBooks(allBooks);
      } catch (error) {
        console.error('Failed to load books', error);
      }
    };
    loadBooks();
  }, []);
  
  const handleDelete = async (bookId: number) => {
    try {
      await deleteBook(bookId);
      const updated = await getAllBooks();
      setBooks(updated);
    } catch (error) {
      console.error('Failed to delete book', error);
    }
  };
  
  // ... rest of component
};
```

**After:**
```typescript
import { bookRepository } from '../domain/book';

const Library: React.FC = () => {
  const [books, setBooks] = useState<BookMetadata[]>([]);
  
  useEffect(() => {
    const loadBooks = async () => {
      const result = await bookRepository.findAllMetadata();
      if (result.success) {
        setBooks(result.data);
      } else {
        console.error('Failed to load books:', result.error);
      }
    };
    loadBooks();
  }, []);
  
  const handleDelete = async (bookId: number) => {
    const deleteResult = await bookRepository.delete(bookId);
    if (!deleteResult.success) {
      console.error('Failed to delete book:', deleteResult.error);
      return;
    }
    
    // Refresh list
    const result = await bookRepository.findAllMetadata();
    if (result.success) {
      setBooks(result.data);
    }
  };
  
  // ... rest of component
};
```

### Example 2: ReaderView - Bookmark Management

**Before:**
```typescript
const ReaderView: React.FC<Props> = ({ bookId }) => {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  
  useEffect(() => {
    setBookmarks(getBookmarksForBook(bookId));
  }, [bookId]);
  
  const handleQuickBookmark = () => {
    const newBookmark = {
      id: new Date().toISOString(),
      cfi: currentCfi,
      label: `Page ${currentPage}`,
      chapter: currentChapter,
      description: undefined,
      createdAt: Date.now(),
    };
    const updated = [...bookmarks, newBookmark];
    setBookmarks(updated);
    saveBookmarksForBook(bookId, updated);
  };
  
  // ... rest of component
};
```

**After:**
```typescript
import { bookmarkService } from '../domain/reader';

const ReaderView: React.FC<Props> = ({ bookId }) => {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  
  useEffect(() => {
    const result = bookmarkService.findByBookId(bookId);
    if (result.success) {
      setBookmarks(result.data);
    }
  }, [bookId]);
  
  const handleQuickBookmark = () => {
    const result = bookmarkService.add(bookId, {
      cfi: currentCfi,
      label: `Page ${currentPage}`,
      chapter: currentChapter,
    });
    
    if (result.success) {
      // Refresh bookmarks
      const refreshResult = bookmarkService.findByBookId(bookId);
      if (refreshResult.success) {
        setBookmarks(refreshResult.data);
      }
    }
  };
  
  // ... rest of component
};
```

---

## Testing with Services

### Unit Testing Services

Services are easy to test because they have no React dependencies:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { bookmarkService } from '../domain/reader';

describe('BookmarkService', () => {
  const testBookId = 999;
  
  afterEach(() => {
    // Clean up test data
    bookmarkService.deleteAll(testBookId);
  });
  
  it('should add and retrieve bookmark', () => {
    const addResult = bookmarkService.add(testBookId, {
      cfi: 'epubcfi(/6/4[chap01]!/4/2)',
      label: 'Test Bookmark',
      chapter: 'Chapter 1',
    });
    
    expect(addResult.success).toBe(true);
    expect(addResult.data).toBeDefined();
    
    const findResult = bookmarkService.findByBookId(testBookId);
    expect(findResult.success).toBe(true);
    expect(findResult.data).toHaveLength(1);
    expect(findResult.data[0].label).toBe('Test Bookmark');
  });
  
  it('should delete bookmark', () => {
    const addResult = bookmarkService.add(testBookId, {
      cfi: 'epubcfi(/6/4[chap01]!/4/2)',
      label: 'Test Bookmark',
    });
    
    const bookmarkId = addResult.data!.id;
    const deleteResult = bookmarkService.delete(testBookId, bookmarkId);
    
    expect(deleteResult.success).toBe(true);
    
    const findResult = bookmarkService.findByBookId(testBookId);
    expect(findResult.data).toHaveLength(0);
  });
});
```

### Mocking Services in Component Tests

```typescript
import { vi, describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { bookRepository } from '../domain/book';
import Library from './Library';

vi.mock('../domain/book', () => ({
  bookRepository: {
    findAllMetadata: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('Library Component', () => {
  it('should display books', async () => {
    const mockBooks = [
      { id: 1, title: 'Book 1', author: 'Author 1' },
      { id: 2, title: 'Book 2', author: 'Author 2' },
    ];
    
    vi.mocked(bookRepository.findAllMetadata).mockResolvedValue({
      success: true,
      data: mockBooks,
    });
    
    render(<Library />);
    
    expect(await screen.findByText('Book 1')).toBeInTheDocument();
    expect(await screen.findByText('Book 2')).toBeInTheDocument();
  });
});
```

---

## Migration Strategy

### Phase A: Preparation (Current)
- ✅ All services created and tested
- ✅ Services coexist with existing code
- ✅ Zero breaking changes
- ✅ All 89 tests passing

### Phase B: Gradual Migration (Recommended)
1. **Start with new features** - Use services for all new code
2. **Migrate utility functions** - Replace one-off utility calls
3. **Migrate simple components** - Start with components that have simple data flows
4. **Migrate complex components** - ReaderView, Library, etc.
5. **Deprecate old utilities** - Mark old functions with `@deprecated`
6. **Remove old utilities** - After all migrations complete

### Phase C: Cleanup (Future)
- Remove deprecated utility functions
- Update all imports to use domain services
- Remove redundant code from services/db.ts, services/readerUtils.ts

---

## Best Practices

### 1. Always Check Result Success
```typescript
const result = await bookRepository.findById(id);
if (!result.success) {
  // Handle error
  console.error(result.error);
  return;
}
// Use result.data
```

### 2. Handle Null Data
```typescript
const result = await bookRepository.findMetadataById(id);
if (!result.success) {
  console.error(result.error);
  return;
}

if (!result.data) {
  console.log('Book not found');
  return;
}

// result.data is guaranteed to be non-null here
const book = result.data;
```

### 3. Prefer Metadata Methods for Lists
```typescript
// ❌ Slow - loads binary data
const books = await bookRepository.findAll();

// ✅ Fast - only metadata
const books = await bookRepository.findAllMetadata();
```

### 4. Use Service Singletons
```typescript
// ✅ Import singleton
import { bookmarkService } from '../domain/reader';

// ❌ Don't create new instances
import { BookmarkService } from '../domain/reader';
const service = new BookmarkService();
```

### 5. Leverage Type Safety
```typescript
// TypeScript knows the type after success check
const result = await bookRepository.findMetadataById(id);
if (result.success && result.data) {
  // result.data is BookMetadata, not null
  const title = result.data.title; // No optional chaining needed
}
```

---

## Troubleshooting

### "Property 'error' does not exist on type..."

This is the discriminated union type narrowing issue. Always create new error objects:

```typescript
// ❌ Wrong
if (!result.success) {
  return { success: false, error: result.error }; // TypeScript error
}

// ✅ Correct
if (!result.success) {
  return { success: false, error: 'Failed to fetch data' };
}
```

### Service returns success but data is null

Some operations can succeed but return null (e.g., book not found):

```typescript
const result = await bookRepository.findMetadataById(id);
if (!result.success) {
  // Operation failed (DB error, etc.)
  return;
}

if (!result.data) {
  // Operation succeeded but book doesn't exist
  return;
}

// Book exists
const book = result.data;
```

---

## Summary

Phase 2 services provide a clean, type-safe, and well-tested foundation for domain operations. Migration is **optional and gradual** - existing code continues to work. The Result pattern eliminates exception handling complexity and makes error states explicit.

**Key Takeaways:**
- ✅ Services are ready to use today
- ✅ No breaking changes required
- ✅ Migrate incrementally as needed
- ✅ Better testing and type safety
- ✅ Comprehensive logging included

For questions or issues, refer to the service implementation files in `/domain/` or the Phase 2 progress documentation.
