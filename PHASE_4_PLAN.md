# PHASE 4: Component Decomposition Plan

**Status**: 🎯 READY TO START  
**Created**: October 14, 2025  
**Estimated Duration**: 3-4 weeks  
**Risk Level**: MEDIUM (Structural changes, but non-breaking)

## 🎯 Goal

Break down monolithic "God Components" into smaller, focused, maintainable pieces following React best practices:
- **Separation of Concerns**: Each component has a single responsibility
- **Container/Presentational Pattern**: Separate logic from UI
- **Reusability**: Extract common patterns into shared components
- **Maintainability**: Files under 300 lines for easy comprehension

## 📊 Current State Analysis

### Component Sizes (Before Decomposition)

| Component | Lines | Target | Complexity |
|-----------|-------|--------|------------|
| **Library.tsx** | 1,516 | ~200 | 🔴 CRITICAL |
| **App.tsx** | 710 | ~150 | 🟡 HIGH |
| **ReaderView.tsx** | 1,407 | ~200 | 🔴 CRITICAL |

### Problems with Current Architecture

**Library.tsx (1,516 lines)**:
- ❌ Manages OPDS catalog browsing AND local library
- ❌ Handles sorting, filtering, pagination, navigation
- ❌ 30+ event handlers (`handle*` functions)
- ❌ Multiple rendering modes (lanes, grids, flat lists)
- ❌ Complex state management (16+ useState hooks)
- ❌ Mixes business logic with UI rendering

**App.tsx (710 lines)**:
- ❌ Routing, state management, modal orchestration
- ❌ Import/export logic mixed with UI
- ❌ Credential handling, OPDS acquisition
- ❌ Cloud sync and local storage management
- ❌ Deep prop drilling to child components

**ReaderView.tsx (1,407 lines)**:
- ❌ EPUB rendering, TOC, bookmarks, citations, search
- ❌ Read-aloud functionality with complex state
- ❌ Settings panel, keyboard shortcuts, zoom controls
- ❌ Position tracking and view state management

## 🏗️ Phase 4 Breakdown

### 4.1: Decompose Library.tsx (Week 1-2)
**Current**: 1,516 lines → **Target**: ~200 lines

#### New Structure
```
components/
  library/
    LibraryView.tsx              (~200 lines - main coordinator)
    
    /catalog
      CatalogView.tsx            (~150 lines - OPDS browsing container)
      CatalogNavigation.tsx      (~100 lines - breadcrumbs, pagination)
      CatalogFilters.tsx         (~150 lines - audience, fiction, media filters)
      CatalogBookGrid.tsx        (~100 lines - grid/flat list display)
      CatalogSidebar.tsx         (~100 lines - collections navigation)
    
    /local
      LocalLibraryView.tsx       (~150 lines - local books container)
      BookGrid.tsx               (~100 lines - grid display with sorting)
      SortControls.tsx           (~80 lines - sort dropdown)
      ImportButton.tsx           (~60 lines - file upload handler)
    
    /shared
      BookCard.tsx               (~100 lines - reusable book card)
      LaneView.tsx               (~150 lines - horizontal scrolling lanes)
      EmptyState.tsx             (~50 lines - no books message)
```

#### Component Responsibilities

**LibraryView.tsx** (Container):
```typescript
// Coordinates between catalog and local library views
// Manages top-level state (activeSource, importStatus)
// Handles view switching (catalog ↔ local)
// Delegates to CatalogView or LocalLibraryView
```

**CatalogView.tsx** (Container):
```typescript
// Manages OPDS catalog state
// Fetches and parses catalog content
// Handles navigation (breadcrumbs, collections)
// Delegates rendering to presentation components
```

**LocalLibraryView.tsx** (Container):
```typescript
// Manages local book library state
// Handles fetching books from repository
// Manages sorting and filtering
// Delegates rendering to BookGrid
```

**Presentational Components** (Pure):
```typescript
// BookCard, CatalogNavigation, etc.
// Receive data via props
// Emit events via callbacks
// No direct state management or side effects
```

### 4.2: Decompose App.tsx (Week 2-3)
**Current**: 710 lines → **Target**: ~150 lines

#### New Structure
```
components/
  app/
    AppShell.tsx                 (~150 lines - main router & layout)
    
    /views
      LibraryViewContainer.tsx   (~80 lines - wraps Library with state)
      ReaderViewContainer.tsx    (~80 lines - wraps ReaderView with state)
      BookDetailContainer.tsx    (~80 lines - wraps BookDetailView)
    
    /modals
      ImportStatusModal.tsx      (~60 lines - import progress/errors)
      CredentialsModal.tsx       (~100 lines - OPDS auth)
      SyncModal.tsx              (~150 lines - cloud sync logic)
      LocalStorageModal.tsx      (~80 lines - storage management)
    
    /hooks
      useBookImport.ts           (~150 lines - import logic)
      useCloudSync.ts            (~120 lines - sync logic)
      useCredentials.ts          (~100 lines - credential management)
```

#### Component Responsibilities

**AppShell.tsx** (Container):
```typescript
// React Router setup
// Global state (currentView, selectedBook)
// Modal orchestration
// Splash screen
// Error boundary wrapper
```

**ViewContainer Components**:
```typescript
// Extract complex props and state management
// Wrap view components with necessary context
// Handle view-specific logic (animations, navigation)
```

**Modal Components**:
```typescript
// Self-contained modal logic
// Accept minimal props (isOpen, onClose, callbacks)
// Manage their own internal state
```

**Custom Hooks**:
```typescript
// Extract complex stateful logic
// Make reusable across components
// Easier to test in isolation
```

### 4.3: Decompose ReaderView.tsx (Week 3-4)
**Current**: 1,407 lines → **Target**: ~200 lines

#### New Structure
```
components/
  reader/
    ReaderView.tsx               (~200 lines - main coordinator)
    
    /epub
      EpubRenderer.tsx           (~150 lines - iframe & rendering)
      EpubControls.tsx           (~100 lines - prev/next navigation)
      EpubProgress.tsx           (~80 lines - progress bar & chapter info)
    
    /features
      BookmarksPanel.tsx         (already exists - ~200 lines)
      CitationsPanel.tsx         (~150 lines - create/manage citations)
      SearchPanel.tsx            (already exists - ~300 lines)
      TocPanel.tsx               (already exists - ~200 lines)
      ReadAloud.tsx              (~250 lines - TTS functionality)
    
    /ui
      ReaderToolbar.tsx          (~100 lines - top controls)
      SidePanel.tsx              (~80 lines - collapsible panel wrapper)
      SettingsPanel.tsx          (already exists - ~150 lines)
      ShortcutsModal.tsx         (already exists - ~100 lines)
      ZoomHud.tsx                (already exists - ~80 lines)
    
    /hooks
      useEpubNavigation.ts       (~150 lines - navigation logic)
      useBookmarks.ts            (~100 lines - bookmark operations)
      useCitations.ts            (~100 lines - citation operations)
      useReadAloud.ts            (~200 lines - TTS logic)
```

#### Component Responsibilities

**ReaderView.tsx** (Container):
```typescript
// Load book data and settings
// Coordinate between EPUB renderer and feature panels
// Handle keyboard shortcuts
// Manage panel visibility state
// Handle animations and transitions
```

**EpubRenderer.tsx** (Core Display):
```typescript
// Manage iframe and ePub.js instance
// Handle page rendering and navigation
// Emit events for position changes
// Apply theme and typography settings
```

**Feature Panels** (Self-contained):
```typescript
// Each panel manages its own state
// Communicate via callbacks
// Can be shown/hidden independently
// Use domain services for data operations
```

**Custom Hooks**:
```typescript
// Extract complex logic (navigation, TTS, search)
// Make testable in isolation
// Share across components
```

## 📋 Implementation Strategy

### Approach: Parallel Development (Recommended)

✅ **Advantages**:
- No disruption to existing functionality
- Can be developed and tested in parallel
- Easy to compare old vs new
- Lower risk of breaking changes
- Can rollback easily if needed

**Process**:
1. Create new component structure in parallel folders
2. Develop and test new components thoroughly
3. Update imports to use new components
4. Remove old files once migration complete
5. Update tests to reflect new structure

### Alternative: Incremental Replacement (Not Recommended)

⚠️ **Disadvantages**:
- Constant refactoring of working code
- Higher risk of breaking changes
- Difficult to test in isolation
- Longer period of instability

---

## 📅 Detailed Timeline

### Week 1: Library.tsx Decomposition

**Days 1-2: Planning & Structure**
- [ ] Create `components/library/` folder structure
- [ ] Define TypeScript interfaces for all new components
- [ ] Create barrel exports (`index.ts` files)
- [ ] Set up new test files

**Days 3-4: Presentational Components**
- [ ] Extract `BookCard.tsx` (reusable card component)
- [ ] Extract `CatalogNavigation.tsx` (breadcrumbs, pagination)
- [ ] Extract `CatalogFilters.tsx` (audience, fiction, media)
- [ ] Extract `SortControls.tsx` (sort dropdown)
- [ ] Extract `CatalogSidebar.tsx` (collections nav)
- [ ] Write tests for each component

**Days 5-6: Container Components**
- [ ] Create `CatalogBookGrid.tsx` (catalog display)
- [ ] Create `BookGrid.tsx` (local library display)
- [ ] Create `LocalLibraryView.tsx` (local container)
- [ ] Create `CatalogView.tsx` (catalog container)
- [ ] Write integration tests

**Day 7: Main Coordinator**
- [ ] Create `LibraryView.tsx` (main coordinator)
- [ ] Update `Library.tsx` to use new structure OR
- [ ] Create new export and update imports in App.tsx
- [ ] Run full test suite
- [ ] Manual QA testing

### Week 2: App.tsx Decomposition

**Days 1-2: Custom Hooks**
- [ ] Extract `useBookImport.ts` (import logic)
- [ ] Extract `useCloudSync.ts` (sync logic)
- [ ] Extract `useCredentials.ts` (credential management)
- [ ] Write tests for hooks

**Days 3-4: Modal Components**
- [ ] Extract `ImportStatusModal.tsx`
- [ ] Extract `SyncModal.tsx`
- [ ] Refactor existing `CredentialsModal.tsx` if needed
- [ ] Refactor existing `LocalStorageModal.tsx` if needed
- [ ] Write tests for modals

**Days 5-6: View Containers**
- [ ] Create `LibraryViewContainer.tsx`
- [ ] Create `ReaderViewContainer.tsx`
- [ ] Create `BookDetailContainer.tsx`
- [ ] Write integration tests

**Day 7: AppShell**
- [ ] Create `AppShell.tsx` (main router)
- [ ] Update routing logic
- [ ] Test all navigation flows
- [ ] Manual QA testing

### Week 3: ReaderView.tsx Decomposition

**Days 1-2: Custom Hooks**
- [ ] Extract `useEpubNavigation.ts`
- [ ] Extract `useBookmarks.ts` (if not using existing panel)
- [ ] Extract `useCitations.ts`
- [ ] Extract `useReadAloud.ts` (complex!)
- [ ] Write tests for hooks

**Days 3-4: Core Components**
- [ ] Extract `EpubRenderer.tsx` (iframe management)
- [ ] Extract `EpubControls.tsx` (navigation)
- [ ] Extract `EpubProgress.tsx` (progress bar)
- [ ] Extract `ReadAloud.tsx` (TTS UI)
- [ ] Write tests

**Days 5-6: UI Components**
- [ ] Extract `ReaderToolbar.tsx`
- [ ] Extract `SidePanel.tsx` (wrapper)
- [ ] Refactor existing panels if needed
- [ ] Write tests

**Day 7: Main Coordinator**
- [ ] Create `ReaderView.tsx` (new version)
- [ ] Wire up all components
- [ ] Test keyboard shortcuts
- [ ] Test all features (bookmarks, citations, search, TOC)
- [ ] Manual QA testing

### Week 4: Integration & Polish

**Days 1-3: Integration Testing**
- [ ] Full app testing (all flows)
- [ ] Performance testing (check for regressions)
- [ ] Accessibility testing
- [ ] Cross-browser testing

**Days 4-5: Documentation**
- [ ] Update component documentation
- [ ] Create architecture diagram
- [ ] Document new component patterns
- [ ] Update README if needed

**Days 6-7: Cleanup & Finalization**
- [ ] Remove old component files
- [ ] Update all imports throughout codebase
- [ ] Run full test suite (ensure 100% passing)
- [ ] Final code review
- [ ] Create PR with detailed summary

---

## 🧪 Testing Strategy

### Unit Tests (Component Level)

**Presentational Components**:
```typescript
describe('BookCard', () => {
  it('renders book metadata correctly', () => {});
  it('calls onClick when clicked', () => {});
  it('displays cover image with fallback', () => {});
  it('shows format badges correctly', () => {});
});
```

**Container Components**:
```typescript
describe('CatalogView', () => {
  it('fetches catalog on mount', () => {});
  it('handles navigation correctly', () => {});
  it('filters books by audience', () => {});
  it('shows loading state', () => {});
  it('handles errors gracefully', () => {});
});
```

**Custom Hooks**:
```typescript
describe('useBookImport', () => {
  it('imports EPUB file successfully', () => {});
  it('handles duplicate books', () => {});
  it('shows progress during import', () => {});
  it('handles import errors', () => {});
});
```

### Integration Tests

```typescript
describe('Library Integration', () => {
  it('switches between catalog and local library', () => {});
  it('imports book from catalog', () => {});
  it('navigates catalog breadcrumbs', () => {});
  it('filters and sorts books', () => {});
});

describe('Reader Integration', () => {
  it('opens book and renders first page', () => {});
  it('navigates between pages', () => {});
  it('creates and navigates to bookmarks', () => {});
  it('performs search and highlights results', () => {});
});
```

### Manual QA Checklist

- [ ] Library: Browse catalog, navigate collections
- [ ] Library: Import book from file
- [ ] Library: Import book from catalog
- [ ] Library: Sort and filter local books
- [ ] Library: Delete book
- [ ] Reader: Open EPUB book
- [ ] Reader: Navigate pages (click, keyboard, swipe)
- [ ] Reader: Create/delete bookmarks
- [ ] Reader: Create/delete citations
- [ ] Reader: Search within book
- [ ] Reader: Navigate TOC
- [ ] Reader: Adjust settings (theme, font, spacing)
- [ ] Reader: Read-aloud functionality
- [ ] App: Cloud sync
- [ ] App: OPDS credentials
- [ ] App: Keyboard shortcuts

---

## 📦 Example Component Extraction

### Before: Library.tsx (Monolithic)

```typescript
// 1,516 lines of code
const Library: React.FC<LibraryProps> = ({ /* 20+ props */ }) => {
  // 16+ useState hooks
  const [books, setBooks] = useState<BookMetadata[]>([]);
  const [catalogBooks, setCatalogBooks] = useState<CatalogBook[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // ... 13 more state variables
  
  // 30+ event handlers
  const handleSelectSource = useCallback(() => { /* ... */ }, []);
  const handlePaginationClick = () => { /* ... */ };
  const handleNavLinkClick = () => { /* ... */ };
  // ... 27 more handlers
  
  // Complex rendering logic
  const renderCurrentView = () => {
    if (isCatalogLoading) return <Spinner />;
    if (showCategoryView) return <CategoryView />;
    if (showCollectionView) return <CollectionView />;
    return <FlatView />;
  };
  
  return (
    <div>
      {/* 400+ lines of JSX */}
    </div>
  );
};
```

### After: LibraryView.tsx (Coordinator)

```typescript
// ~200 lines of code
const LibraryView: React.FC<LibraryViewProps> = ({
  onOpenBook,
  onShowBookDetail,
  processAndSaveBook,
  onOpenCloudSyncModal,
  onShowAbout,
}) => {
  const [activeSource, setActiveSource] = useState<'library' | Catalog | null>('library');
  const [importStatus, setImportStatus] = useState<ImportStatus>({ isLoading: false, message: '', error: null });
  
  const handleImport = useBookImport({ processAndSaveBook, setImportStatus });
  
  return (
    <div className="h-screen flex flex-col bg-slate-900">
      {/* Header */}
      <LibraryHeader
        activeSource={activeSource}
        onSelectSource={setActiveSource}
        onOpenSettings={onOpenCloudSyncModal}
        onShowAbout={onShowAbout}
      />
      
      {/* Main Content */}
      {activeSource === 'library' ? (
        <LocalLibraryView
          onOpenBook={onOpenBook}
          onShowBookDetail={onShowBookDetail}
          onImport={handleImport}
        />
      ) : (
        <CatalogView
          source={activeSource}
          onShowBookDetail={onShowBookDetail}
          onImport={handleImport}
        />
      )}
      
      {/* Import Status Modal */}
      <ImportStatusModal
        status={importStatus}
        onClose={() => setImportStatus({ isLoading: false, message: '', error: null })}
      />
    </div>
  );
};
```

### After: CatalogView.tsx (Container)

```typescript
// ~150 lines of code
const CatalogView: React.FC<CatalogViewProps> = ({
  source,
  onShowBookDetail,
  onImport,
}) => {
  const {
    books,
    navPath,
    pagination,
    collections,
    isLoading,
    error,
    navigateTo,
    goBack,
  } = useCatalogNavigation(source);
  
  const [filters, setFilters] = useState<CatalogFilters>({
    audience: 'all',
    fiction: 'all',
    media: 'all',
  });
  
  const filteredBooks = useCatalogFilters(books, filters);
  
  if (isLoading) return <Spinner text="Loading catalog..." />;
  if (error) return <ErrorMessage error={error} />;
  
  return (
    <div className="flex gap-6">
      {/* Collections Sidebar */}
      {collections.length > 0 && (
        <CatalogSidebar
          collections={collections}
          activeCollection={filters.collection}
          onSelectCollection={(c) => setFilters({ ...filters, collection: c })}
        />
      )}
      
      {/* Main Content */}
      <div className="flex-1">
        <CatalogNavigation
          navPath={navPath}
          pagination={pagination}
          onNavigate={navigateTo}
          onGoBack={goBack}
        />
        
        <CatalogFilters
          filters={filters}
          onFiltersChange={setFilters}
        />
        
        <CatalogBookGrid
          books={filteredBooks}
          onBookClick={onShowBookDetail}
        />
      </div>
    </div>
  );
};
```

### After: BookCard.tsx (Presentational)

```typescript
// ~100 lines of code
interface BookCardProps {
  book: BookMetadata | CatalogBook;
  onClick: (book: BookMetadata | CatalogBook) => void;
  onContextMenu?: (book: BookMetadata | CatalogBook, e: React.MouseEvent) => void;
}

const BookCard: React.FC<BookCardProps> = ({ book, onClick, onContextMenu }) => {
  const handleClick = () => onClick(book);
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    onContextMenu?.(book, e);
  };
  
  return (
    <div
      className="group cursor-pointer"
      onClick={handleClick}
      onContextMenu={handleContextMenu}
    >
      {/* Book Cover */}
      <div className="relative aspect-[2/3] mb-3 rounded-lg overflow-hidden shadow-lg">
        <img
          src={book.cover || '/placeholder-cover.png'}
          alt={book.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
        />
        
        {/* Format Badges */}
        {('alternativeFormats' in book) && book.alternativeFormats.length > 0 && (
          <div className="absolute top-2 right-2 flex gap-1">
            {book.alternativeFormats.map((fmt, idx) => (
              <FormatBadge key={idx} format={fmt.format} />
            ))}
          </div>
        )}
      </div>
      
      {/* Book Info */}
      <h3 className="font-medium text-white line-clamp-2 mb-1">
        {book.title}
      </h3>
      <p className="text-sm text-slate-400 line-clamp-1">
        {book.author}
      </p>
    </div>
  );
};
```

---

## 🎯 Success Criteria

### Quantitative Metrics

- ✅ All components under 300 lines (target: under 200)
- ✅ 100% test coverage maintained (89/89 tests passing → 120+ tests)
- ✅ 0 TypeScript errors
- ✅ 0 breaking changes to public APIs
- ✅ No performance regressions (measure load times)
- ✅ Bundle size increase < 5% (code-splitting should help)

### Qualitative Goals

- ✅ Each component has a single, clear responsibility
- ✅ Components are reusable across different contexts
- ✅ Business logic separated from presentation
- ✅ Easy to locate and modify specific functionality
- ✅ New developers can understand component purpose quickly
- ✅ Components can be tested in isolation

---

## ⚠️ Risk Assessment & Mitigation

### Risk 1: Breaking Existing Functionality (HIGH)

**Mitigation**:
- Use parallel development approach
- Comprehensive test coverage before and after
- Manual QA checklist for all features
- Gradual rollout (feature flag if needed)

### Risk 2: State Management Complexity (MEDIUM)

**Mitigation**:
- Document state flow clearly
- Use TypeScript for type safety
- Consider using Context API for deep prop drilling
- Extract complex state into custom hooks

### Risk 3: Performance Regressions (MEDIUM)

**Mitigation**:
- Profile before and after decomposition
- Use React.memo for presentational components
- Ensure proper dependency arrays in useCallback/useMemo
- Monitor bundle size

### Risk 4: Increased Complexity (LOW)

**Mitigation**:
- Clear folder structure and naming conventions
- Comprehensive documentation
- Barrel exports for clean imports
- Consistent patterns across components

### Risk 5: Testing Overhead (LOW)

**Mitigation**:
- Focus on integration tests for containers
- Simple snapshot tests for presentational components
- Test custom hooks in isolation
- Reuse test utilities

---

## 📚 Reference Architecture

### Container/Presentational Pattern

**Container Components** (Smart):
- Manage state and side effects
- Connect to services and hooks
- Handle business logic
- Pass data to presentational components

**Presentational Components** (Dumb):
- Receive data via props
- Render UI based on props
- Emit events via callbacks
- No side effects or state management

### Folder Structure Convention

```
components/
  [feature]/
    [Feature]View.tsx          # Main container
    /sub-feature
      [SubFeature].tsx         # Sub-containers
    /ui
      [Component].tsx          # Presentational components
    /hooks
      use[Feature].ts          # Custom hooks
    index.ts                   # Barrel export
    __tests__/
      [Component].test.tsx     # Tests
```

### Import Pattern

```typescript
// Before: Deep imports
import Library from './components/Library';
import { CategoryLane } from './components/CategoryLane';

// After: Barrel exports
import { LibraryView, CatalogView, BookCard } from './components/library';
```

---

## 🚀 Getting Started

### Step 1: Create Branch

```bash
git checkout -b phase-4-decomposition
```

### Step 2: Create Folder Structure

```bash
mkdir -p components/library/{catalog,local,shared}
mkdir -p components/app/{views,modals,hooks}
mkdir -p components/reader/{epub,features,ui,hooks}
```

### Step 3: Start with Library.tsx

Begin with the largest component to gain the most immediate benefit.

### Step 4: Test Thoroughly

At each stage, ensure all tests pass and manually test the feature.

---

## 📖 Resources

- [React Component Patterns](https://reactpatterns.com/)
- [Container/Presentational Pattern](https://medium.com/@dan_abramov/smart-and-dumb-components-7ca2f9a7c7d0)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Custom Hooks Guide](https://react.dev/learn/reusing-logic-with-custom-hooks)

---

## ✅ Phase 4 Completion Checklist

- [ ] All components under 300 lines
- [ ] 100% test coverage (120+ tests passing)
- [ ] 0 TypeScript errors
- [ ] 0 breaking changes
- [ ] Performance benchmarks maintained or improved
- [ ] Documentation updated
- [ ] Code review completed
- [ ] Manual QA passed
- [ ] PR merged to main
- [ ] PHASE_4_COMPLETE.md written

---

**Ready to start? Let's begin with Library.tsx decomposition!**
