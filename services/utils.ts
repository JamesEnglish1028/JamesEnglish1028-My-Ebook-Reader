/**
 * Wraps text to fit inside a specified width on a canvas.
 * @param context The canvas 2D rendering context.
 * @param text The text to wrap.
 * @param x The x-coordinate where to start drawing the text.
 * @param y The y-coordinate where to start drawing the text.
 * @param maxWidth The maximum width of a line.
 * @param lineHeight The height of a line.
 * @returns The y-coordinate after the last line was drawn.
 */
const wrapText = (
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
): number => {
  const words = text.split(' ');
  let line = '';
  let currentY = y;

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = context.measureText(testLine);
    const testWidth = metrics.width;
    if (testWidth > maxWidth && n > 0) {
      context.fillText(line, x, currentY);
      line = words[n] + ' ';
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }
  context.fillText(line, x, currentY);
  return currentY + lineHeight;
};


export const generatePdfCover = (title: string, author: string): Promise<string> => {
    return new Promise((resolve) => {
        const width = 400;
        const height = 600;
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
            return resolve(''); 
        }

        // Background Gradient
        const gradient = ctx.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, '#1e3a8a'); // dark blue
        gradient.addColorStop(1, '#4c1d95'); // dark purple
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
        
        // PDF Badge
        const badgeWidth = 70;
        const badgeHeight = 35;
        const badgeX = width - badgeWidth - 20;
        const badgeY = 20;
        ctx.fillStyle = '#dc2626'; // red-600
        ctx.fillRect(badgeX, badgeY, badgeWidth, badgeHeight);
        ctx.font = 'bold 20px sans-serif';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('PDF', badgeX + badgeWidth / 2, badgeY + badgeHeight / 2);

        // Title
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillStyle = 'white';
        ctx.font = 'bold 42px sans-serif';
        const titleY = wrapText(ctx, title, 30, 100, width - 60, 50);

        // Divider
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(30, titleY + 10);
        ctx.lineTo(width - 30, titleY + 10);
        ctx.stroke();

        // Author
        ctx.font = '24px sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        wrapText(ctx, author, 30, titleY + 30, width - 60, 30);
        
        resolve(canvas.toDataURL('image/jpeg', 0.9));
    });
};

export const blobUrlToBase64 = async (blobUrl: string): Promise<string> => {
    const response = await fetch(blobUrl);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

// FIX: Switched to a new CORS proxy to resolve network errors.
const CORS_PROXY_URL = 'https://corsproxy.io/?';
// Own proxy URL can be configured via Vite env var VITE_OWN_PROXY_URL
const OWN_PROXY_URL: string = (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env.VITE_OWN_PROXY_URL) ? (import.meta as any).env.VITE_OWN_PROXY_URL : '';
const FORCE_PROXY = (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env.VITE_FORCE_PROXY === 'true');

/**
 * Wraps a URL with a CORS proxy to prevent cross-origin issues.
 * @param url The URL to proxy.
 * @returns The proxied URL.
 */
export const proxiedUrl = (url: string): string => {
  try {
    // Check if the URL is valid before trying to proxy it.
    new URL(url);
    // If the app is configured to always use an owned proxy, prefer it
    if (OWN_PROXY_URL) {
      // Normalize OWN_PROXY_URL so callers can set either the root host or the full /proxy path.
      // - If user set e.g. https://example.com, we convert to https://example.com/proxy
      // - If user set https://example.com/proxy or https://example.com/proxy/, we keep it
      let base = OWN_PROXY_URL.trim();
      // remove trailing slashes
      base = base.replace(/\/+$/, '');
      if (!base.endsWith('/proxy')) base = `${base}/proxy`;
      const sep = base.includes('?') ? '&' : '?';
      if (FORCE_PROXY) return `${base}${sep}url=${encodeURIComponent(url)}`;
      return `${base}${sep}url=${encodeURIComponent(url)}`;
    }
    // Fallback to the public CORS proxy
    return `${CORS_PROXY_URL}${encodeURIComponent(url)}`;
  } catch (e) {
    // If the URL is invalid, return an empty string or a placeholder to avoid breaking image tags.
    console.error("Invalid URL passed to proxiedUrl:", url);
    return '';
  }
};

/**
 * Probe a URL to see if it can be fetched directly from the browser (CORS allowance).
 * If the probe fails (network/CORS), return a proxied URL that will be used instead.
 *
 * Notes:
 * - Uses a HEAD request to minimize transferred data where supported. Some servers may
 *   not support HEAD (405); in that case we fall back to using the proxy.
 * - Browsers will perform preflight automatically when the request requires it. This
 *   helper attempts a lightweight probe so we can choose the proxy only when necessary.
 */
export const maybeProxyForCors = async (url: string): Promise<string> => {
  // If developer explicitly requests forcing the owned proxy, respect it immediately.
  if (FORCE_PROXY) {
    try {
      // Validate URL before proxying
      new URL(url);
      return proxiedUrl(url);
    } catch (e) {
      console.error('Invalid URL for maybeProxyForCors when forcing proxy:', url);
      return '';
    }
  }
  try {
    // Validate URL first
    new URL(url);
  } catch (e) {
    console.error('Invalid URL for maybeProxyForCors:', url);
    return '';
  }

  try {
    // Try a lightweight HEAD probe to check CORS allowance. If the server responds
    // with an OK (2xx) and the Access-Control-Allow-Origin header permits our origin,
    // we can attempt the full request directly. Treat redirects (3xx) or non-matching
    // CORS headers as reasons to use the proxy.
    const resp = await fetch(url, { method: 'HEAD', mode: 'cors', redirect: 'manual' });
    if (!resp) return proxiedUrl(url);

    // If the server returned a redirect, don't attempt to fetch directly — use proxy.
    if (resp.status >= 300 && resp.status < 400) {
      console.log('[maybeProxyForCors] HEAD probe redirect', { url, status: resp.status });
      return proxiedUrl(url);
    }

    // If server returned a success status, check CORS header.
    if (resp.status >= 200 && resp.status < 300) {
      const allow = resp.headers.get('access-control-allow-origin');
      try {
        const origin = (typeof window !== 'undefined' && window.location && window.location.origin) ? window.location.origin : '';
        console.log('[maybeProxyForCors] HEAD probe', { url, status: resp.status, allow, origin });
        if (allow === '*' || (allow && origin && allow === origin)) {
          console.log('[maybeProxyForCors] using direct URL', { url });
          return url;
        }
      } catch (e) {
        // If we can't determine window origin, be conservative and use the proxy
  console.log('[maybeProxyForCors] error determining origin, falling back to proxy', { url, err: e });
      }
    }

    // Fallback to proxy for any other status (including 4xx/5xx or missing CORS header)
    return proxiedUrl(url);
  } catch (e) {
    // Likely a network or CORS error — use the proxy.
    return proxiedUrl(url);
  }
};


export const imageUrlToBase64 = async (url: string): Promise<string | null> => {
    try {
        const proxyUrl = proxiedUrl(url);
        const response = await fetch(proxyUrl);
        if (!response.ok) {
            console.error(`Failed to fetch cover image from ${url}, status: ${response.status}`);
            return null;
        }
        const blob = await response.blob();
        if (!blob.type.startsWith('image/')) {
            console.error(`Fetched resource from ${url} is not an image. MIME type: ${blob.type}`);
            return null;
        }
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error("Error fetching or converting image to base64:", error);
        return null;
    }
};

// Lightweight analytics/event tracking helper used for in-app events during development
export const trackEvent = (eventName: string, payload?: Record<string, any>) => {
  try {
    const detail = { event: eventName, payload: payload || {}, ts: Date.now() };
    // Emit a window event so consumers (dev tools, tests) can listen
    try { window.dispatchEvent(new CustomEvent('analytics', { detail })); } catch (e) { /* ignore */ }
    if (isDebug()) {
      console.info('trackEvent:', eventName, payload || {});
    }
  } catch (e) {
    // swallow any errors to avoid breaking UI
    if (isDebug()) console.warn('trackEvent failed', e);
  }
};

// Small helper that centralizes debug flag logic. It checks for an explicit
// client-side flag `window.__MEBOOKS_DEBUG__` or Vite env var VITE_DEBUG.
export const isDebug = (): boolean => {
  try {
    if (typeof window !== 'undefined' && (window as any).__MEBOOKS_DEBUG__) return true;
  } catch (e) {
    // ignore
  }
  try {
    // import.meta.env may not be available in some runtimes; guard access
    // Vite exposes VITE_DEBUG when set in env
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_DEBUG === 'true') return true;
  } catch (e) {
    // ignore
  }
  return false;
};