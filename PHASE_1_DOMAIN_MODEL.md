# Phase 1: Domain Model Architecture

## Overview
This document outlines the domain-driven design for MeBooks, organizing code around business domains rather than technical layers.

## Domain Structure

### `/domain/book/`
**Responsibility**: Everything related to managing books in the user's library

#### Files:
- `types.ts` - Book entity types
  - `Book` (formerly BookMetadata) - Book in library with ID
  - `BookRecord` (formerly BookRecord) - Book data for storage with ArrayBuffer
  - `BookFormat` - EPUB | PDF type

- `repository.ts` - Book persistence layer
  - `BookRepository` class wrapping IndexedDB operations
  - Methods: `save()`, `find()`, `findAll()`, `delete()`, `update()`

- `index.ts` - Barrel export

**Key Principles**:
- Book domain owns the "source of truth" for library books
- Repository pattern isolates IndexedDB from business logic
- No UI concerns - pure data management

---

### `/domain/catalog/`
**Responsibility**: OPDS catalog integration, browsing, and acquisition

#### Files:
- `types.ts` - Catalog-related types
  - `Catalog` - Catalog configuration
  - `CatalogBook` - Book representation from catalog (not yet in library)
  - `CatalogNavigationLink` - Nav tree structure
  - `CatalogPagination` - Pagination metadata
  - `Collection`, `Series`, `Category` - OPDS metadata
  - `AuthDocument`, `CredentialPrompt` - Authentication

- `opds-parser.ts` - OPDS feed parsing
  - `parseOPDS()` - Detects version and delegates
  - `parseOPDS1()` - Atom/XML parsing
  - `parseOPDS2()` - JSON parsing

- `acquisition.ts` - Book acquisition logic
  - `resolveAcquisitionChain()` - OPDS 2 acquisition
  - `resolveAcquisitionChainOpds1()` - OPDS 1 acquisition
  - Handles authentication challenges

- `credentials.ts` - Catalog authentication
  - Credential storage and retrieval
  - Per-host authentication management

- `index.ts` - Barrel export

**Key Principles**:
- Catalog domain is responsible for "books we can download"
- Separate from Book domain which is "books we have"
- Handles all OPDS complexity

---

### `/domain/reader/`
**Responsibility**: Reading experience, navigation, annotations

#### Files:
- `types.ts` - Reader-related types
  - `ReaderSettings` - Theme, font, citation format
  - `ReadAloudSettings` - TTS configuration
  - `TocItem` - Table of contents structure
  - `Bookmark` - Saved reading positions
  - `Citation` - Highlighted text with notes
  - `SearchResult` - In-book search results

- `bookmark-service.ts` - Bookmark management
  - `BookmarkService` class
  - Methods: `add()`, `delete()`, `findByBook()`, `navigate()`

- `citation-service.ts` - Citation management
  - `CitationService` class
  - Methods: `add()`, `delete()`, `findByBook()`, `format()` (APA/MLA/Chicago)

- `position-tracker.ts` - Reading position tracking
  - Stores last CFI per book
  - Auto-resume functionality

- `index.ts` - Barrel export

**Key Principles**:
- Reader domain owns the reading experience
- Independent of book storage (works with any book)
- Manages user annotations and preferences

---

### `/domain/sync/`
**Responsibility**: Google Drive synchronization

#### Files:
- `types.ts` - Sync-related types
  - `SyncPayload` - Complete sync data structure
  - `GoogleUser` - User profile

- `google-drive-sync.ts` - Google Drive integration
  - `syncToGoogleDrive()`
  - `restoreFromGoogleDrive()`

- `index.ts` - Barrel export

**Key Principles**:
- Sync is its own bounded context
- Orchestrates data from other domains
- Handles conflict resolution

---

## Migration Strategy

### Phase 1.1: Create Domain Structure (Current)
1. ✅ Create domain folders
2. ✅ Document domain architecture
3. Create type files in each domain
4. Add barrel exports

### Phase 1.2: Extract Services
1. Create `BookRepository` wrapping db.ts
2. Create `BookmarkService` and `CitationService`
3. Create OPDS parser modules

### Phase 1.3: Update Imports
1. Components import from `/domain/*` instead of root types.ts
2. Maintain backward compatibility via root types.ts re-exports
3. Gradually migrate components

### Phase 1.4: Verify
1. All tests still pass
2. No breaking changes
3. Dev server runs successfully

---

## Benefits

### 1. **Clear Boundaries**
- Each domain has well-defined responsibilities
- Reduces cognitive load when working in one area
- Makes it obvious where new features belong

### 2. **Easier Testing**
- Domain services can be tested in isolation
- Mock at domain boundaries rather than internal functions
- Integration tests map to user journeys across domains

### 3. **Better Type Safety**
- Domain-specific types live with domain logic
- Reduces massive "God types" file
- Easier to find and understand types

### 4. **Scalability**
- New features fit naturally into domains
- Can refactor one domain without touching others
- Easier to onboard new developers

### 5. **Reduced Coupling**
- Components depend on domain interfaces, not implementation
- Can swap implementations (e.g., different database)
- Repository pattern enables offline-first architecture

---

## Example Domain Interactions

### User Flow: Import Book from Catalog
```
1. User clicks book in catalog
   ↓
2. CatalogBook → acquisition.resolveAcquisitionChain()
   ↓
3. Download EPUB ArrayBuffer
   ↓
4. BookRepository.save(bookData)
   ↓
5. Return Book entity with ID
```

### User Flow: Add Bookmark
```
1. User selects text in reader
   ↓
2. ReaderView gets current CFI
   ↓
3. BookmarkService.add(bookId, cfi, label)
   ↓
4. Store in localStorage
   ↓
5. UI updates bookmark list
```

### User Flow: Sync to Cloud
```
1. User clicks "Sync"
   ↓
2. SyncService.syncToGoogleDrive()
   ↓
3. Gather data:
   - BookRepository.findAll()
   - BookmarkService.findAll()
   - CitationService.findAll()
   ↓
4. Create SyncPayload
   ↓
5. Upload to Google Drive
```

---

## File Organization After Migration

```
/domain/
  /book/
    types.ts       - Book, BookRecord, BookFormat
    repository.ts  - BookRepository class
    index.ts

  /catalog/
    types.ts           - Catalog, CatalogBook, OPDS types
    opds-parser.ts     - parseOPDS, parseOPDS1, parseOPDS2
    acquisition.ts     - resolveAcquisitionChain
    credentials.ts     - Credential management
    index.ts

  /reader/
    types.ts              - ReaderSettings, Bookmark, Citation, TocItem
    bookmark-service.ts   - BookmarkService class
    citation-service.ts   - CitationService class
    position-tracker.ts   - Position tracking
    index.ts

  /sync/
    types.ts             - SyncPayload, GoogleUser
    google-drive-sync.ts - Sync logic
    index.ts
```

---

## Notes

- **Backward Compatibility**: Root `types.ts` will re-export all domain types
- **No Breaking Changes**: Existing imports continue to work during migration
- **Gradual Migration**: Move one domain at a time, verify tests pass
- **Clear Dependencies**: Domains can depend on each other explicitly via imports

