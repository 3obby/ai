import { NextResponse } from "next/server";
import { auth } from "@/lib/auth-helpers";
import { getSignedUploadUrl, generateUniqueFilename, calculateTokenCost } from "@/lib/vercel-blob-storage";
import prismadb from "@/lib/prismadb";

// Max file size: 50MB for individual files
const MAX_FILE_SIZE = 50 * 1024 * 1024;

// Max storage per user: 5GB
const MAX_STORAGE_PER_USER = 5 * 1024 * 1024 * 1024;

// Allowed file types
const ALLOWED_FILE_TYPES = [
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // pptx
  'text/plain',
  'text/csv',
  'text/markdown',
  'application/json',
  
  // Images
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  
  // Other
  'application/zip',
  'application/x-zip-compressed',
];

export async function POST(req: Request) {
  try {
    const session = await auth();
    const userId = session?.userId;
    
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    
    const body = await req.json();
    const { filename, contentType, size } = body;
    
    if (!filename || !contentType || !size) {
      return new NextResponse("Missing required fields", { status: 400 });
    }
    
    // Validate file size
    if (size > MAX_FILE_SIZE) {
      return new NextResponse(`File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`, { status: 400 });
    }
    
    // Validate file type
    if (!ALLOWED_FILE_TYPES.includes(contentType)) {
      return new NextResponse("File type not allowed", { status: 400 });
    }
    
    // Calculate token cost
    const tokenCost = calculateTokenCost(size, contentType);
    
    // Check if user has enough tokens
    const userUsage = await prismadb.userUsage.findUnique({
      where: { userId },
    });
    
    if (!userUsage || userUsage.availableTokens < tokenCost) {
      return new NextResponse("Not enough tokens. Please purchase more tokens.", { status: 403 });
    }
    
    // Get current user storage usage
    const user = await prismadb.user.findUnique({
      where: { id: userId },
      select: { totalStorage: true }
    });
    
    // Check if the user has enough storage allowance
    const currentStorage = user?.totalStorage || 0;
    
    if (currentStorage + size > MAX_STORAGE_PER_USER) {
      return new NextResponse(`Storage limit exceeded. You have ${((MAX_STORAGE_PER_USER - currentStorage) / (1024 * 1024)).toFixed(2)}MB remaining.`, { status: 403 });
    }
    
    // Generate a unique filename
    const uniqueFilename = generateUniqueFilename(filename);
    
    // Generate a signed URL for upload using Vercel Blob
    const { url, storagePath } = await getSignedUploadUrl(uniqueFilename, contentType, userId);
    
    // Perform database operations in a transaction
    await prismadb.$transaction(async (tx) => {
      // Create a file record
      const file = await tx.file.create({
        data: {
          userId,
          name: uniqueFilename,
          originalName: filename,
          type: contentType,
          size,
          url: storagePath, // Use storagePath as URL
          storagePath,
          status: "PROCESSING", // Use the enum value from FileStatus
          tokensCost: tokenCost,
        },
      });
      
      // Update user's storage usage
      await tx.user.update({
        where: { id: userId },
        data: {
          totalStorage: {
            increment: size,
          },
        },
      });
      
      // Deduct tokens from user's balance
      await tx.userUsage.update({
        where: { userId },
        data: {
          availableTokens: {
            decrement: tokenCost,
          },
        },
      });
      
      // Create a transaction record
      await tx.transaction.create({
        data: {
          amount: -tokenCost,
          type: "FILE_UPLOAD",
          description: `Upload file: ${filename}`,
          metadata: JSON.stringify({
            fileId: file.id,
            fileName: filename,
            fileSize: size,
          }),
          userUsageId: userUsage.id,
        },
      });
    });
    
    return NextResponse.json({
      url,
      fileId: null, // File ID will be determined after successful upload
      name: uniqueFilename,
      tokensCost: tokenCost,
    });
  } catch (error) {
    console.error("[FILE_UPLOAD_ERROR]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
} 