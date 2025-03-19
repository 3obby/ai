/**
 * URL Helper for Next.js 15 compatibility
 * 
 * In Next.js 15, relative URLs are no longer valid for fetch API and URL constructor.
 * This utility provides a consistent way to generate absolute URLs.
 */

/**
 * Get the application's base URL (origin) for both server and client environments
 * @returns {string} The absolute base URL
 */
export const getBaseUrl = (): string => {
  // On client side, use window.location.origin
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  
  // On server side, use environment variables
  // - NEXTAUTH_URL is typically set for production
  // - VERCEL_URL is available in Vercel deployments
  // - Default to localhost for local development
  return process.env.NEXTAUTH_URL || 
         (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 
         'http://localhost:3000');
};

/**
 * Convert a relative path to an absolute URL
 * @param {string} path - The relative path (e.g., "/api/auth/anonymous")
 * @returns {string} The absolute URL
 */
export const getAbsoluteUrl = (path: string): string => {
  const baseUrl = getBaseUrl();
  
  // Ensure path starts with a slash
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  
  return `${baseUrl}${normalizedPath}`;
};

/**
 * Enhanced fetch function that automatically converts relative paths to absolute URLs
 * @param {string} path - The relative path to fetch
 * @param {RequestInit} options - Fetch options
 * @returns {Promise<Response>} The fetch response
 */
export const fetchWithBaseUrl = (
  path: string, 
  options?: RequestInit
): Promise<Response> => {
  const absoluteUrl = getAbsoluteUrl(path);
  return fetch(absoluteUrl, options);
}; 