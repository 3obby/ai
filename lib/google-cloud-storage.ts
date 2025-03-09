import { Storage } from '@google-cloud/storage';
import crypto from 'crypto';
import path from 'path';

// Initialize Google Cloud Storage with environment variables
let storage: Storage;
let bucketName = process.env.GCS_BUCKET_NAME || '';

try {
  // Check if we have JSON credentials
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
    try {
      const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
      storage = new Storage({
        projectId: credentials.project_id,
        credentials,
      });
    } catch (error) {
      console.error('Error parsing Google Cloud credentials:', error);
      // Fallback to default credentials
      storage = new Storage();
    }
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    // Use credentials file path
    storage = new Storage({
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    });
  } else {
    // Use default credentials
    storage = new Storage();
  }
} catch (error) {
  console.error('Error initializing Google Cloud Storage:', error);
  // Create a mock storage object for development
  storage = {
    bucket: () => ({
      file: () => ({
        getSignedUrl: async () => ['https://example.com/mock-signed-url'],
        delete: async () => {},
      }),
    }),
  } as unknown as Storage;
}

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
 * Generate a signed upload URL for direct browser-to-bucket uploads
 */
export const getSignedUploadUrl = async (
  filename: string,
  contentType: string,
  userId: string
): Promise<{ url: string, storagePath: string }> => {
  if (!bucketName) {
    console.warn('GCS_BUCKET_NAME environment variable is not set, using mock URL');
    const storagePath = `uploads/${userId}/${filename}`;
    return { 
      url: `https://example.com/mock-upload-url/${storagePath}`,
      storagePath 
    };
  }
  
  // Create a path that includes user ID for organization
  const storagePath = `uploads/${userId}/${filename}`;
  
  const options = {
    version: 'v4' as const,
    action: 'write' as const,
    expires: Date.now() + 15 * 60 * 1000, // 15 minutes
    contentType,
  };

  try {
    const [url] = await storage
      .bucket(bucketName)
      .file(storagePath)
      .getSignedUrl(options);
    
    return { url, storagePath };
  } catch (error) {
    console.error('Error generating signed URL:', error);
    // Return a mock URL for development
    return { 
      url: `https://example.com/mock-upload-url/${storagePath}`,
      storagePath 
    };
  }
};

/**
 * Generate a signed download URL for a file
 */
export const getSignedDownloadUrl = async (storagePath: string): Promise<string> => {
  if (!bucketName) {
    console.warn('GCS_BUCKET_NAME environment variable is not set, using mock URL');
    return `https://example.com/mock-download-url/${storagePath}`;
  }
  
  const options = {
    version: 'v4' as const,
    action: 'read' as const,
    expires: Date.now() + 60 * 60 * 1000, // 1 hour
  };

  try {
    const [url] = await storage
      .bucket(bucketName)
      .file(storagePath)
      .getSignedUrl(options);
    
    return url;
  } catch (error) {
    console.error('Error generating download URL:', error);
    // Return a mock URL for development
    return `https://example.com/mock-download-url/${storagePath}`;
  }
};

/**
 * Delete a file from Google Cloud Storage
 */
export const deleteFile = async (storagePath: string): Promise<void> => {
  if (!bucketName) {
    console.warn('GCS_BUCKET_NAME environment variable is not set, skipping delete');
    return;
  }
  
  try {
    await storage
      .bucket(bucketName)
      .file(storagePath)
      .delete();
  } catch (error) {
    console.error('Error deleting file:', error);
    // In development, just log the error
  }
};

/**
 * Calculate token cost based on file size and type
 * This is a simple example - adjust based on your actual pricing model
 */
export const calculateTokenCost = (fileSize: number, fileType: string): number => {
  // Base cost: 1 token per 100 KB
  let baseCost = Math.ceil(fileSize / 102400);
  
  // Adjust based on file type
  if (fileType.startsWith('image/')) {
    // Images cost slightly more
    baseCost = Math.ceil(baseCost * 1.2);
  } else if (fileType.includes('pdf')) {
    // PDFs require more processing
    baseCost = Math.ceil(baseCost * 1.5);
  } else if (fileType.includes('video')) {
    // Videos cost more
    baseCost = Math.ceil(baseCost * 2);
  }
  
  // Minimum cost of 10 tokens
  return Math.max(10, baseCost);
};

export default storage; 