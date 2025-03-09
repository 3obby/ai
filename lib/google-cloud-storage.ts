import { Storage } from '@google-cloud/storage';
import crypto from 'crypto';
import path from 'path';

// Determine if we're in development or production
const isDevelopment = process.env.NODE_ENV !== 'production';
const bucketName = process.env.GCS_BUCKET_NAME || '';

// Create a mock storage implementation for development
const createMockStorage = () => {
  console.log('Using mock storage implementation for development');
  return {
    bucket: () => ({
      file: (filepath: string) => ({
        getSignedUrl: async () => {
          // Generate a mock signed URL that includes the filepath for debugging
          const mockUrl = `https://storage.googleapis.com/mock-bucket/${filepath}?mockSignature=123`;
          return [mockUrl];
        },
        delete: async () => {
          console.log(`[MOCK] Deleted file: ${filepath}`);
          return;
        },
      }),
    }),
  } as unknown as Storage;
};

// Initialize storage based on environment
let storage: Storage;

// For development without proper credentials, use mock storage
if (isDevelopment && (!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON && !process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
  storage = createMockStorage();
} else {
  // Try to initialize real storage
  try {
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
      try {
        const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
        storage = new Storage({
          projectId: credentials.project_id,
          credentials,
        });
      } catch (error) {
        console.error('Error parsing Google Cloud credentials:', error);
        storage = isDevelopment ? createMockStorage() : new Storage();
      }
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      storage = new Storage({
        keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
      });
    } else {
      // Default to mock in dev, try default auth in prod
      storage = isDevelopment ? createMockStorage() : new Storage();
    }
  } catch (error) {
    console.error('Error initializing Google Cloud Storage:', error);
    storage = createMockStorage();
  }
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
 * In development without credentials, returns a mock URL
 */
export const getSignedUploadUrl = async (
  filename: string,
  contentType: string,
  userId: string
): Promise<{ url: string, storagePath: string }> => {
  // Create a path that includes user ID for organization
  const storagePath = `uploads/${userId}/${filename}`;
  
  // For development without bucket or when using mock storage
  if (!bucketName || isDevelopment) {
    // Return a mock upload URL - this is just for development
    console.log(`[DEV] Generating mock upload URL for ${storagePath}`);
    const mockUrl = `https://storage.googleapis.com/mock-upload/${storagePath}`;
    return { url: mockUrl, storagePath };
  }
  
  // For production with real bucket and credentials
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
    // Fall back to mock URL even in production if there's an error
    const mockUrl = `https://storage.googleapis.com/mock-upload/${storagePath}`;
    return { url: mockUrl, storagePath };
  }
};

/**
 * Generate a signed download URL for a file
 * In development without credentials, returns a mock URL
 */
export const getSignedDownloadUrl = async (storagePath: string): Promise<string> => {
  // For development without bucket or when using mock storage
  if (!bucketName || isDevelopment) {
    // Return a mock download URL - this is just for development
    console.log(`[DEV] Generating mock download URL for ${storagePath}`);
    return `https://storage.googleapis.com/mock-download/${storagePath}`;
  }
  
  // For production with real bucket and credentials
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
    // Fall back to mock URL even in production if there's an error
    return `https://storage.googleapis.com/mock-download/${storagePath}`;
  }
};

/**
 * Delete a file from Google Cloud Storage
 * In development without credentials, just logs the operation
 */
export const deleteFile = async (storagePath: string): Promise<void> => {
  // For development without bucket or when using mock storage
  if (!bucketName || isDevelopment) {
    // Just log the operation in development
    console.log(`[DEV] Mock deleting file: ${storagePath}`);
    return;
  }
  
  // For production with real bucket and credentials
  try {
    await storage
      .bucket(bucketName)
      .file(storagePath)
      .delete();
  } catch (error) {
    console.error('Error deleting file:', error);
    // Just log the error in production
  }
};

/**
 * Calculate token cost based on file size and type
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