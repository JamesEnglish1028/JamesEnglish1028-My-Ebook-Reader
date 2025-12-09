# MeBooks Registry Integration Implementation

## Overview

This implementation provides comprehensive support for registry viewer applications to integrate with MeBooks. It solves the challenge of single-page app integration by using cross-tab communication via localStorage events, ensuring catalogs are added to existing MeBooks instances rather than isolated new tabs.

## Integration Methods

### 1. Cross-Tab Communication (Primary Method)
Uses localStorage events to communicate with existing MeBooks instances:
- Registry sends catalog import request via localStorage
- Existing MeBooks instance receives and processes the request
- MeBooks responds with success/failure status
- No new tabs needed - works with existing user data

### 2. URL Parameters (Fallback Method)
Falls back to URL parameters when no existing instance is detected:
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

## MeBooks Integration Library

A JavaScript library (`mebooks-integration.js`) provides a clean API for registry applications:

```javascript
// Initialize
const mebooksIntegration = new MeBooksIntegration('https://your-mebooks-domain.com/');

// Import a catalog
const result = await mebooksIntegration.importCatalog(
    'https://standardebooks.org/opds/all', 
    'Standard Ebooks'
);

// Check if MeBooks is running
const isRunning = await mebooksIntegration.checkMeBooksRunning();
```

### Library Features
- **Smart Detection**: Automatically detects existing MeBooks instances
- **Fallback Handling**: Opens new instance if none exists
- **Promise-based API**: Clean async/await interface
- **Status Checking**: Can detect if MeBooks is currently running
- **Configurable Timeouts**: Adjustable response timeouts

## Cross-Tab Communication Protocol

### Import Request
```javascript
localStorage.setItem('mebooks-import-catalog', JSON.stringify({
    importUrl: 'https://example.com/opds',
    catalogName: 'Example Catalog', 
    timestamp: Date.now()
}));
```

### Import Response
```javascript
localStorage.setItem('mebooks-import-response', JSON.stringify({
    success: true,
    catalogName: 'Example Catalog',
    timestamp: Date.now()
}));
```

### Ping/Pong Detection
```javascript
// Ping
localStorage.setItem('mebooks-ping', JSON.stringify({
    timestamp: Date.now()
}));

// Pong
localStorage.setItem('mebooks-pong', JSON.stringify({
    timestamp: Date.now(),
    version: '1.0.0'
}));
```

## Technical Notes

- **Cross-Tab Communication**: Uses localStorage events for same-origin tab communication
- **Timeout Handling**: 1.5-second timeout before falling back to URL parameters
- **Message Validation**: Timestamps prevent processing stale messages
- **Automatic Cleanup**: Messages are automatically removed after processing
- **Window Focus**: Successfully imported catalogs bring MeBooks to the front
- **Error Handling**: Comprehensive error handling with user feedback
- **Version Detection**: Ping/pong includes version information for compatibility

## Testing

### Comprehensive Test Page
The `test-registry-integration.html` includes:
- Sample catalog import buttons
- Status detection functionality  
- Real-time feedback display
- Integration library demonstration

### Test Scenarios
1. **Existing Instance**: MeBooks already open - catalog added via cross-tab communication
2. **No Instance**: MeBooks not open - new instance launched with catalog
3. **Status Detection**: Check if MeBooks is currently running

## Future Enhancements

Potential improvements could include:
- **Batch Import**: Multiple catalogs in single request
- **Version Compatibility**: Check MeBooks version before import
- **User Preferences**: Respect user settings for import behavior
- **Validation**: Pre-validate OPDS URLs before sending
- **Analytics**: Track import success rates and methods used