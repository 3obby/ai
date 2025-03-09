import { NextResponse } from "next/server";
import { auth } from "@/lib/auth-helpers";
import { getSignedUploadUrl, generateUniqueFilename, calculateTokenCost } from "@/lib/google-cloud-storage";
import prismadb from "@/lib/prismadb";

// Max file size: 50MB
const MAX_FILE_SIZE = 50 * 1024 * 1024;

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
    
    // Generate a unique filename
    const uniqueFilename = generateUniqueFilename(filename);
    
    // Generate a signed URL for upload
    const { url, storagePath } = await getSignedUploadUrl(uniqueFilename, contentType, userId);
    
    // Create a file record in the database with PROCESSING status
    const file = await prismadb.file.create({
      data: {
        userId,
        name: uniqueFilename,
        originalName: filename,
        type: contentType,
        size,
        url: "", // Will be updated after upload confirmation
        storagePath,
        status: "PROCESSING",
        tokensCost: tokenCost,
      },
    });
    
    return new NextResponse(JSON.stringify({
      uploadUrl: url,
      fileId: file.id,
      tokenCost,
    }));
  } catch (error) {
    console.error("[FILES_UPLOAD_URL_ERROR]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
} 