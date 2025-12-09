# MeBooks Integration Deployment Guide

This guide explains how to deploy and use the MeBooks integration files for registry applications.

## Files to Deploy

### Required Files
- `mebooks-integration.js` - Core integration library (required)

### Optional Files  
- `test-registry-integration.html` - Test page for integration validation
- `example-registry-app.html` - Complete example registry implementation

## Deployment Options

### Option 1: Host Integration Library on MeBooks Domain
**Recommended for cross-origin support**

1. Deploy `mebooks-integration.js` to your MeBooks public folder
2. Reference from registry apps:
   ```html
   <script src="https://your-mebooks-domain.com/mebooks-integration.js"></script>
   ```

### Option 2: Bundle with Registry Application
**For self-contained deployments**

1. Copy `mebooks-integration.js` to your registry app's assets
2. Include in your build process or reference directly:
   ```html
   <script src="./assets/mebooks-integration.js"></script>
   ```

### Option 3: CDN or External Hosting
**For shared usage across multiple registries**

1. Host `mebooks-integration.js` on your preferred CDN or static hosting
2. Reference from multiple registry applications:
   ```html
   <script src="https://cdn.example.com/mebooks-integration.js"></script>
   ```

## Basic Integration Steps

### 1. Include the Library
```html
<script src="path/to/mebooks-integration.js"></script>
```

### 2. Initialize
```javascript
const mebooks = new MeBooksIntegration('https://your-mebooks-domain.com/');
```

### 3. Add Integration to UI
```javascript
async function addToMeBooks(catalogUrl, catalogName) {
    const result = await mebooks.importCatalog(catalogUrl, catalogName);
    
    if (result.success) {
        // Show success message
        console.log(`✅ ${result.message}`);
    } else {
        // Show error message
        console.error(`❌ ${result.message}`);
    }
}
```

### 4. Add Button/UI Element
```html
<button onclick="addToMeBooks('https://example.com/opds', 'Example Catalog')">
    Add to MeBooks
</button>
```

## Configuration

### Constructor Options
```javascript
const mebooks = new MeBooksIntegration(mebooksBaseUrl);
```

### Import Options
```javascript
const result = await mebooks.importCatalog(catalogUrl, catalogName, {
    sameTab: false,      // Open in same tab vs new tab
    focusExisting: true  // Focus existing MeBooks tab when found
});
```

### Timeout Configuration
```javascript
mebooks.setResponseTimeout(2000); // 2 second timeout
```

## Error Handling

### Result Object
```javascript
{
    success: boolean,    // Whether the operation succeeded
    method: string,      // How the integration was handled
    message: string      // Human-readable status message
}
```

### Common Error Scenarios
- **Popup Blocked**: Browser blocked opening new tab
- **Cross-Tab Failed**: Communication with existing instance failed
- **Invalid URL**: Malformed catalog URL provided
- **Network Error**: Unable to reach MeBooks instance

### Robust Error Handling
```javascript
async function addCatalogSafely(catalogUrl, catalogName) {
    try {
        const result = await mebooks.importCatalog(catalogUrl, catalogName);
        
        switch (result.method) {
            case 'cross-tab-communication':
                showSuccess(`Added to existing MeBooks: ${catalogName}`);
                break;
            case 'new-tab':
                showSuccess(`Opened MeBooks with catalog: ${catalogName}`);
                break;
            case 'same-tab-navigation':
                // Current page will navigate to MeBooks
                break;
        }
        
    } catch (error) {
        showError(`Failed to add catalog: ${error.message}`);
        
        // Fallback: direct URL navigation
        const fallbackUrl = `https://your-mebooks-domain.com/#/?import=${encodeURIComponent(catalogUrl)}&name=${encodeURIComponent(catalogName)}`;
        window.open(fallbackUrl, '_blank');
    }
}
```

## Testing Your Integration

### 1. Test with Example App
Visit the included example registry app to verify integration works:
```
https://your-mebooks-domain.com/example-registry-app.html
```

### 2. Use Test Page
Use the comprehensive test page for validation:
```
https://your-mebooks-domain.com/test-registry-integration.html
```

### 3. Test Scenarios
- **MeBooks Closed**: Integration should open new MeBooks instance
- **MeBooks Open**: Integration should add catalog to existing instance
- **Network Issues**: Should handle timeouts and errors gracefully
- **Popup Blocked**: Should provide fallback options

## Production Considerations

### CORS and Security
- Ensure MeBooks domain allows cross-origin requests if needed
- Consider Content Security Policy (CSP) implications
- Test across different browser configurations

### Performance
- Integration library is lightweight (~5KB minified)
- Cross-tab communication uses minimal localStorage
- Timeouts are configurable to balance UX and reliability

### Browser Compatibility
- Works in all modern browsers with localStorage support
- Graceful degradation for older browsers
- No external dependencies

## Support and Documentation

- **Technical Details**: See `REGISTRY_INTEGRATION_IMPLEMENTATION.md`
- **API Reference**: See main README Palace Registry Integration section
- **Examples**: Study `example-registry-app.html` implementation
- **Testing**: Use `test-registry-integration.html` for validation

## Troubleshooting

### Common Issues
1. **Library Not Loading**: Check path and CORS settings
2. **No Response**: Verify MeBooks URL and network connectivity  
3. **Popup Blocked**: Implement fallback to same-tab navigation
4. **Cross-Tab Not Working**: Check localStorage availability and browser privacy settings

### Debug Mode
Enable console logging to troubleshoot integration issues:
```javascript
// The library automatically logs detailed information to browser console
// Check browser developer tools for integration status messages
```