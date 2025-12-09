# MeBooks Registry Integration Implementation

## Overview

This implementation adds support for launching MeBooks from a catalog registry viewer application with automatic OPDS catalog import functionality.

## Integration Points

### URL Parameters
MeBooks now supports the following URL parameters for automatic catalog import:
- `import`: The URL of the OPDS catalog to import
- `name`: The display name for the catalog

### Example Usage
```
https://your-mebooks-domain.com/#/?import=https://standardebooks.org/opds/all&name=Standard%20Ebooks
```

## Implementation Details

### Files Modified
- `App.tsx`: Added URL parameter handling and catalog import logic

### Key Changes

1. **Added useCatalogs Hook Import**
   ```typescript
   import { useGlobalShortcuts, useCatalogs } from './hooks';
   ```

2. **Added Catalog Management in AppInner**
   ```typescript
   const { addCatalog } = useCatalogs();
   ```

3. **Added URL Parameter Processing**
   - New useEffect hook that monitors URL parameters
   - Automatically extracts `import` and `name` parameters
   - Calls `addCatalog()` to add the catalog to the user's collection
   - Shows success/error toast messages
   - Navigates to library view to display the new catalog
   - Cleans URL parameters after processing

## Features

### Automatic Catalog Import
When MeBooks is launched with `import` and `name` parameters:
1. The catalog is automatically added to the user's collection
2. A success toast is displayed: "Successfully added catalog: [Name]"
3. The app navigates to the library view
4. URL parameters are cleaned from the address bar
5. Error handling with appropriate error messages

### Error Handling
- Try-catch block around catalog addition
- Error toast messages for failed imports
- Logging for debugging purposes

## Integration with Palace Registry UI

This implementation is designed to work with the Palace Registry UI application, which expects MeBooks to handle these URL parameters. The registry UI can launch MeBooks with:

```javascript
const mebooksUrl = `https://your-mebooks-domain.com/#/?import=${encodeURIComponent(catalogUrl)}&name=${encodeURIComponent(catalogName)}`;
window.open(mebooksUrl, '_blank');
```

## Testing

A test file `test-registry-integration.html` has been created with sample links to test the integration functionality. The test includes links with various OPDS catalogs to verify the automatic import behavior.

## Technical Notes

- Uses existing `useCatalogs` hook for catalog management
- Leverages existing toast system for user feedback
- OPDS version defaults to '2' (OPDS 2.0)
- Compatible with existing URL parameter handling (autoOpen)
- Maintains clean separation of concerns

## Future Enhancements

Potential improvements could include:
- Support for additional URL parameters (e.g., auto-navigate to specific collection)
- Validation of OPDS catalog URLs before adding
- Support for different OPDS versions via URL parameter
- Batch catalog import from multiple URLs