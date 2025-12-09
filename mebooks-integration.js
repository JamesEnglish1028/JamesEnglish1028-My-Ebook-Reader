/**
 * MeBooks Registry Integration Library
 *
 * This library provides utilities for registry applications to integrate with MeBooks,
 * allowing them to send OPDS catalog information to existing MeBooks instances or
 * open new ones with the catalog pre-loaded.
 *
 * Usage:
 *   const mebooksIntegration = new MeBooksIntegration('http://localhost:3000/JamesEnglish1028-My-Ebook-Reader/');
 *   mebooksIntegration.importCatalog('https://example.com/opds', 'Example Catalog');
 */

class MeBooksIntegration {
    constructor(mebooksBaseUrl = 'http://localhost:3000/JamesEnglish1028-My-Ebook-Reader/') {
        this.mebooksBaseUrl = mebooksBaseUrl.endsWith('/') ? mebooksBaseUrl : mebooksBaseUrl + '/';
        this.responseTimeout = 1500; // Time to wait for existing instance response
    }

    /**
     * Import an OPDS catalog into MeBooks
     * @param {string} catalogUrl - The URL of the OPDS catalog
     * @param {string} catalogName - The display name for the catalog
     * @param {Object} options - Additional options
     * @param {boolean} options.sameTab - Open MeBooks in same tab instead of new tab (default: false)
     * @param {boolean} options.focusExisting - Focus existing MeBooks tab if found (default: true)
     * @returns {Promise<{success: boolean, method: string, message: string}>}
     */
    async importCatalog(catalogUrl, catalogName, options = {}) {
        const { sameTab = false, focusExisting = true } = options;

        return new Promise((resolve) => {
            // First, try to communicate with existing MeBooks instance
            const importMessage = {
                importUrl: catalogUrl,
                catalogName: catalogName,
                timestamp: Date.now()
            };

            localStorage.setItem('mebooks-import-catalog', JSON.stringify(importMessage));

            let responseReceived = false;

            const responseListener = (event) => {
                if (event.key === 'mebooks-import-response' && event.newValue) {
                    try {
                        const response = JSON.parse(event.newValue);
                        if (response.catalogName === catalogName && Date.now() - response.timestamp < 2000) {
                            responseReceived = true;
                            localStorage.removeItem('mebooks-import-response');
                            window.removeEventListener('storage', responseListener);

                            resolve({
                                success: response.success,
                                method: 'cross-tab-communication',
                                message: response.success
                                    ? `Successfully added "${catalogName}" to existing MeBooks instance`
                                    : `Failed to add "${catalogName}" to existing MeBooks instance`
                            });
                        }
                    } catch (e) {
                        console.error('MeBooksIntegration: Failed to parse response:', e);
                    }
                }
            };

            window.addEventListener('storage', responseListener);

            // If no response after timeout, open MeBooks
            setTimeout(() => {
                if (!responseReceived) {
                    window.removeEventListener('storage', responseListener);

                    const mebooksUrl = `${this.mebooksBaseUrl}#/?import=${encodeURIComponent(catalogUrl)}&name=${encodeURIComponent(catalogName)}`;

                    if (sameTab) {
                        window.location.href = mebooksUrl;
                        resolve({
                            success: true,
                            method: 'same-tab-navigation',
                            message: `Opening MeBooks with catalog: ${catalogName}`
                        });
                    } else {
                        const newWindow = window.open(mebooksUrl, '_blank');
                        resolve({
                            success: !!newWindow,
                            method: 'new-tab',
                            message: newWindow
                                ? `Opening MeBooks in new tab with catalog: ${catalogName}`
                                : 'Failed to open MeBooks (popup blocked?)'
                        });
                    }
                }
            }, this.responseTimeout);
        });
    }

    /**
     * Check if MeBooks is currently running in another tab
     * @returns {Promise<boolean>}
     */
    async checkMeBooksRunning() {
        return new Promise((resolve) => {
            const checkMessage = {
                type: 'ping',
                timestamp: Date.now()
            };

            localStorage.setItem('mebooks-ping', JSON.stringify(checkMessage));

            let responseReceived = false;

            const responseListener = (event) => {
                if (event.key === 'mebooks-pong' && event.newValue) {
                    try {
                        const response = JSON.parse(event.newValue);
                        if (Date.now() - response.timestamp < 1000) {
                            responseReceived = true;
                            localStorage.removeItem('mebooks-pong');
                            window.removeEventListener('storage', responseListener);
                            resolve(true);
                        }
                    } catch (e) {
                        console.error('MeBooksIntegration: Failed to parse ping response:', e);
                    }
                }
            };

            window.addEventListener('storage', responseListener);

            setTimeout(() => {
                if (!responseReceived) {
                    window.removeEventListener('storage', responseListener);
                    resolve(false);
                }
            }, 800);
        });
    }

    /**
     * Set the timeout for waiting for existing instance responses
     * @param {number} timeout - Timeout in milliseconds
     */
    setResponseTimeout(timeout) {
        this.responseTimeout = Math.max(500, Math.min(5000, timeout)); // Clamp between 500ms and 5s
    }
}

// Export for use in different environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MeBooksIntegration;
} else if (typeof window !== 'undefined') {
    window.MeBooksIntegration = MeBooksIntegration;
}
