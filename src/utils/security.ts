/**
 * Security and sanitization utilities for CivicResolve.
 */

/**
 * Validates whether an image URL is safe to render in an <img> tag.
 * Strictly permits only HTTPS/HTTP web URLs or base64 raster image data URIs.
 * Prevents javascript: or malicious payload injection.
 */
export function isSafeImageUrl(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();

  // Allowed protocols
  if (trimmed.startsWith('https://') || trimmed.startsWith('http://')) {
    return true;
  }

  // Allowed base64 raster image MIME types (JPEG, PNG, WebP)
  if (
    trimmed.startsWith('data:image/jpeg;base64,') ||
    trimmed.startsWith('data:image/jpg;base64,') ||
    trimmed.startsWith('data:image/png;base64,') ||
    trimmed.startsWith('data:image/webp;base64,')
  ) {
    return true;
  }

  return false;
}

/**
 * Basic string sanitization that trims and strips non-printable ASCII control characters.
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return '';
  // Remove ASCII control characters (0x00-0x1F, except \n, \r, \t)
  return input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim();
}
