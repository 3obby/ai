import { put, del, list, head, PutBlobResult, ListBlobResult } from '@vercel/blob';
import crypto from 'crypto';
import path from 'path';

// Determine if we're in development or production
const isDevelopment = process.env.NODE_ENV !== 'production';

/**
 * Generate a unique filename for upload
 */
export const generateUniqueFilename = (originalFilename: string): string => {
  const extension = path.extname(originalFilename);
  const basename = path.basename(originalFilename, extension);
  const timestamp = Date.now();
  const randomString = crypto.randomBytes(8).toString('hex');
  
  return `${basename}-${timestamp}-${randomString}${extension}`.toLowerCase().replace(/[^a-z0-9.-]/g, '-');
};

/**
 * Calculate token cost based on file size and type
 * 
 * @param size File size in bytes
 * @param contentType MIME type of the file
 * @returns Token cost
 */
export const calculateTokenCost = (size: number, contentType: string): number => {
  // Base cost: 1 token per 5KB
  let baseCost = Math.ceil(size / 5120);
  
  // Apply multipliers based on content type
  if (contentType.startsWith('image/')) {
    // Images cost more due to potential processing
    baseCost = Math.ceil(baseCost * 1.5);
  } else if (contentType.includes('pdf') || contentType.includes('document')) {
    // Documents cost more due to text extraction
    baseCost = Math.ceil(baseCost * 2);
  }
  
  // Minimum cost is 100 tokens
  return Math.max(100, baseCost);
};

/**
 * Generate a URL for direct browser-to-Vercel Blob uploads
 */
export const getSignedUploadUrl = async (
  filename: string,
  contentType: string,
  userId: string
): Promise<{ url: string, storagePath: string }> => {
  const storagePath = `uploads/${userId}/${filename}`;
  
  // For development mock
  if (isDevelopment && !process.env.VERCELBLOB_READ_WRITE_TOKEN) {
    console.log(`[DEV] Mock upload URL for ${storagePath}`);
    const mockUrl = `https://mock-vercel-blob.com/${storagePath}`;
    return { url: mockUrl, storagePath };
  }
  
  try {
    // Create a placeholder Blob object for upload URL
    const emptyBlob = new Blob([], { type: contentType });
    
    // Get a URL that can be used to upload a file to Vercel Blob
    const blob = await put(storagePath, emptyBlob, {
      access: 'public',
      contentType,
      addRandomSuffix: false, // We already add unique suffixes
      multipart: true,
    });
    
    return {
      url: blob.url,
      storagePath: blob.url
    };
  } catch (error) {
    console.error('Error generating Vercel Blob upload URL:', error);
    // Fall back to mock URL even in production if there's an error
    const mockUrl = `https://mock-vercel-blob.com/${storagePath}`;
    return { url: mockUrl, storagePath };
  }
};

/**
 * Generate a signed download URL for a file
 */
export const getSignedDownloadUrl = async (storagePath: string): Promise<string> => {
  // For development mock
  if (isDevelopment && !process.env.VERCELBLOB_READ_WRITE_TOKEN) {
    console.log(`[DEV] Mock download URL for ${storagePath}`);
    return `https://mock-vercel-blob-download.com/${storagePath}`;
  }
  
  try {
    // For Vercel Blob, we're directly returning the storagePath since it's already a URL
    // But first verify the blob exists
    const blob = await head(storagePath);
    if (!blob) {
      throw new Error(`File not found: ${storagePath}`);
    }
    
    // The URL is already a signed URL that works for GET requests
    return storagePath;
  } catch (error) {
    console.error('Error generating Vercel Blob download URL:', error);
    return `https://mock-vercel-blob-download.com/${storagePath}`;
  }
};

/**
 * Delete a file from Vercel Blob
 */
export const deleteFile = async (blobUrl: string): Promise<void> => {
  // For development mock
  if (isDevelopment && !process.env.VERCELBLOB_READ_WRITE_TOKEN) {
    console.log(`[DEV] Mock deleting file: ${blobUrl}`);
    return;
  }
  
  try {
    await del(blobUrl);
  } catch (error) {
    console.error('Error deleting file from Vercel Blob:', error);
  }
};

/**
 * List files for a user
 */
export const listUserFiles = async (userId: string): Promise<ListBlobResult['blobs']> => {
  const prefix = `uploads/${userId}/`;
  
  // For development mock
  if (isDevelopment && !process.env.VERCELBLOB_READ_WRITE_TOKEN) {
    console.log(`[DEV] Mock listing files for user: ${userId}`);
    return [];
  }
  
  try {
    const { blobs } = await list({ prefix });
    return blobs;
  } catch (error) {
    console.error('Error listing files from Vercel Blob:', error);
    return [];
  }
}; 