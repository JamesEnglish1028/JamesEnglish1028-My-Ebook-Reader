# MeBooks Integration for Registry Applications

This directory contains the MeBooks integration library and examples for adding OPDS catalog import functionality to registry applications.

## Quick Start

### 1. Include the Library
```html
<script src="mebooks-integration.js"></script>
```

### 2. Initialize and Use
```javascript
// Initialize
const mebooks = new MeBooksIntegration('https://your-mebooks-domain.com/');

// Add catalog to MeBooks
async function addCatalog(catalogUrl, catalogName) {
    const result = await mebooks.importCatalog(catalogUrl, catalogName);
    console.log(result.success ? '✅ Success!' : '❌ Failed');
}

// Use in your UI
addCatalog('https://standardebooks.org/opds/all', 'Standard Ebooks');
```

## Files

- `mebooks-integration.js` - Core integration library
- `example-registry-app.html` - Complete working example
- `DEPLOYMENT_GUIDE.md` - Detailed deployment instructions

## Features

✅ **Smart Integration**: Automatically detects existing MeBooks instances
✅ **Cross-Tab Communication**: Preserves user data and settings
✅ **Fallback Support**: Opens new instance if none exists
✅ **Error Handling**: Comprehensive error reporting
✅ **Promise-based API**: Modern async/await support
✅ **No Dependencies**: Standalone library

## Integration Methods

1. **Cross-Tab Communication** (Primary) - Communicates with existing MeBooks tabs
2. **URL Parameters** (Fallback) - Opens new MeBooks instance with catalog

## Browser Support

- All modern browsers with localStorage support
- Graceful degradation for older browsers
- No external dependencies required

## Documentation

For complete documentation, API reference, and examples, see the main MeBooks repository:
https://github.com/JamesEnglish1028/JamesEnglish1028-My-Ebook-Reader

## License

Same as MeBooks project license.
