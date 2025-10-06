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

// FIX: Switched to a different CORS proxy to resolve network errors.
const CORS_PROXY_URL = 'https://cors.eu.org/';

/**
 * Wraps a URL with a CORS proxy to prevent cross-origin issues.
 * @param url The URL to proxy.
 * @returns The proxied URL.
 */
export const proxiedUrl = (url: string): string => {
  try {
    // Check if the URL is valid before trying to proxy it.
    new URL(url);
    // This proxy just prepends its URL to the target URL.
    return `${CORS_PROXY_URL}${url}`;
  } catch (e) {
    // If the URL is invalid, return an empty string or a placeholder to avoid breaking image tags.
    console.error("Invalid URL passed to proxiedUrl:", url);
    return '';
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