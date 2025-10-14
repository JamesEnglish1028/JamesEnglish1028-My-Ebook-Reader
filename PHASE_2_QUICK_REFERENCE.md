# Phase 2 Quick Reference

Quick reference guide for using the new domain services.

## Import Services

```typescript
// Book operations
import { bookRepository } from './domain/book';

// OPDS operations
import { opdsParserService, opdsAcquisitionService } from './domain/catalog';

// Reader operations
import { 
  bookmarkService, 
  citationService, 
  positionTracker 
} from './domain/reader';
```

## Common Patterns

### Result Pattern

All services return a Result type for type-safe error handling:

```typescript
const result = await bookRepository.findById(id);

if (!result.success) {
  console.error('Error:', result.error);
  return;
}

// TypeScript knows result.data exists here
const book = result.data;
```

### Book Operations

```typescript
// Get all books (metadata only - fast)
const result = await bookRepository.findAllMetadata();

// Get single book with binary data
const result = await bookRepository.findById(bookId);

// Get single book metadata only (faster)
const result = await bookRepository.findMetadataById(bookId);

// Save book
const result = await bookRepository.save(bookData);

// Delete book
const result = await bookRepository.delete(bookId);

// Check if book exists
const result = await bookRepository.exists(providerId);
```

### Bookmark Operations

```typescript
// Get all bookmarks
const result = bookmarkService.findByBookId(bookId);

// Add bookmark
const result = bookmarkService.add(bookId, {
  cfi: 'epubcfi(/6/4[chap01]!/4/2)',
  label: 'Chapter 1 Start',
  chapter: 'Chapter 1',
  description: 'Optional note'
});

// Delete bookmark
const result = bookmarkService.delete(bookId, bookmarkId);

// Get bookmarks sorted by date
const result = bookmarkService.findSortedByDate(bookId);

// Export bookmarks
const result = bookmarkService.exportBookmarks(bookId);
```

### Citation Operations

```typescript
// Add citation
const result = citationService.add(bookId, {
  cfi: 'epubcfi(/6/4[chap01]!/4/2)',
  note: 'Important passage',
  pageNumber: 42,
  chapter: 'Chapter 1'
});

// Format citation (APA, MLA, Chicago)
const citation = citationService.formatCitation(bookMetadata, 'apa');
console.log(citation.text);

// Generate all formats
const allFormats = citationService.formatAllStyles(bookMetadata);

// Export to RIS format
const result = citationService.exportToRIS(bookMetadata, citations);
```

### Position Tracking

```typescript
// Save reading position
positionTracker.savePosition(bookId, cfi);

// Get reading position
const result = positionTracker.getPosition(bookId);
if (result.success && result.data) {
  const cfi = result.data;
}

// Calculate progress
const progress = positionTracker.calculateProgress(currentPage, totalPages);

// Create location info
const location = positionTracker.createLocationInfo(42, 100, 42);
// { currentPage: 42, totalPages: 100, progress: 42 }

// Format location
const label = positionTracker.formatPageLabel(location);
// "Page 42"
```

### OPDS Parsing

```typescript
// Auto-detect and parse (easiest)
const result = await opdsParserService.parseOPDS(content, baseUrl);

// Parse specific version
const result = await opdsParserService.parseOPDS1(xmlContent, baseUrl);
const result = await opdsParserService.parseOPDS2(jsonData, baseUrl);

// Resolve acquisition link
const result = await opdsAcquisitionService.resolve(
  acquisitionUrl,
  'auto', // or '1' or '2'
  credentials
);
```

## Error Handling

### Check Success First

```typescript
const result = await someService.operation();

if (!result.success) {
  // Handle error
  console.error(result.error);
  showToast(result.error);
  return;
}

// Use result.data safely
const data = result.data;
```

### Handle Null Data

```typescript
const result = await bookRepository.findMetadataById(id);

if (!result.success) {
  console.error('Operation failed:', result.error);
  return;
}

if (!result.data) {
  console.log('Book not found');
  return;
}

// Book exists and is not null
const book = result.data;
```

## Testing

### Mock Services

```typescript
import { vi } from 'vitest';
import { bookRepository } from '../domain/book';

vi.mock('../domain/book', () => ({
  bookRepository: {
    findAllMetadata: vi.fn(),
    save: vi.fn(),
    delete: vi.fn(),
  },
}));

// In test
vi.mocked(bookRepository.findAllMetadata).mockResolvedValue({
  success: true,
  data: [mockBook1, mockBook2],
});
```

### Test Service Directly

```typescript
import { bookmarkService } from '../domain/reader';

describe('Bookmarks', () => {
  afterEach(() => {
    bookmarkService.deleteAll(testBookId);
  });

  it('should add bookmark', () => {
    const result = bookmarkService.add(testBookId, {
      cfi: 'test-cfi',
      label: 'Test',
    });

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
  });
});
```

## Best Practices

### ✅ DO

- Always check `result.success` before using `result.data`
- Use metadata methods for lists (`findAllMetadata` vs `findAll`)
- Import singleton instances (not classes)
- Handle null data separately from errors
- Use logging (already integrated in services)

### ❌ DON'T

- Don't extract `result.error` across function boundaries
- Don't create new service instances
- Don't use `result.data` without checking success
- Don't mix old utilities with new services in same function
- Don't throw exceptions from service methods

## Performance Tips

1. **Use metadata methods** - Faster for listings
   ```typescript
   // ✅ Fast
   const result = await bookRepository.findAllMetadata();
   
   // ❌ Slow (loads binary data)
   const result = await bookRepository.findAll();
   ```

2. **Debounce position saves**
   ```typescript
   const savePosition = debounce((bookId, cfi) => {
     positionTracker.savePosition(bookId, cfi);
   }, 1000);
   ```

3. **Batch operations** when possible
   ```typescript
   const allPositions = positionTracker.exportAllPositions();
   ```

## Migration Strategy

1. **New features** - Use services from day one
2. **Bug fixes** - Consider migrating while fixing
3. **Refactors** - Perfect time to switch to services
4. **Gradual** - No rush, both systems work

## Documentation

- **Full Guide**: `PHASE_2_MIGRATION_GUIDE.md`
- **Progress**: `PHASE_2_PROGRESS.md`
- **Summary**: `PHASE_2_COMPLETE.md`
- **Source Code**: All services have JSDoc comments

## Support

Questions? Check the migration guide or service source code for detailed JSDoc comments and examples.
