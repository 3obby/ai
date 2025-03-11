import { auth } from "@/lib/auth-helpers";
import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { Storage } from "@google-cloud/storage";

// Force dynamic rendering for API routes
export const dynamic = "force-dynamic";

// Initialize Google Cloud Storage
const initStorage = () => {
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
    console.warn("GOOGLE_APPLICATION_CREDENTIALS_JSON not found, using mock storage");
    return null;
  }

  try {
    // Parse the JSON credentials from env var
    const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
    return new Storage({ credentials });
  } catch (error) {
    console.error("Error initializing Google Cloud Storage:", error);
    return null;
  }
};

// Helper to get file content from Google Cloud Storage
const getFileContent = async (bucketName: string, filePath: string): Promise<string> => {
  const storage = initStorage();
  
  if (!storage) {
    // In development, return mock content
    if (process.env.NODE_ENV === 'development') {
      console.log('Development mode: Returning mock file content');
      return `This is mock content for file: ${filePath}`;
    }
    throw new Error('Storage not initialized');
  }
  
  const bucket = storage.bucket(bucketName);
  const file = bucket.file(filePath);
  
  // Get file content as string
  const [content] = await file.download();
  return content.toString('utf-8');
};

// Helper to update file content in Google Cloud Storage
const updateFileContent = async (bucketName: string, filePath: string, content: string): Promise<void> => {
  const storage = initStorage();
  
  if (!storage) {
    // In development, just log
    if (process.env.NODE_ENV === 'development') {
      console.log('Development mode: Would update file content for:', filePath);
      return;
    }
    throw new Error('Storage not initialized');
  }
  
  const bucket = storage.bucket(bucketName);
  const file = bucket.file(filePath);
  
  await file.save(content, {
    contentType: 'text/plain',
    metadata: {
      updated: new Date().toISOString()
    }
  });
};

// GET - Retrieve file content
export async function GET(
  req: Request,
  { params }: { params: { fileId: string } }
) {
  try {
    const session = await auth();
    const userId = session?.userId;
    
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    
    const fileId = params.fileId;
    
    // Get file record from database
    const file = await prismadb.file.findUnique({
      where: {
        id: fileId,
      },
    });
    
    if (!file) {
      return new NextResponse("File not found", { status: 404 });
    }
    
    // Check ownership
    if (file.userId !== userId) {
      return new NextResponse("Unauthorized", { status: 403 });
    }
    
    // Check if file is text type
    if (!file.type.includes('text/') && !file.type.includes('application/json')) {
      return new NextResponse("File is not a text file", { status: 400 });
    }
    
    try {
      // Get actual file content from storage
      const bucketName = process.env.GCS_BUCKET_NAME || 'mock-bucket';
      const content = await getFileContent(bucketName, file.storagePath);
      
      return NextResponse.json({ content });
    } catch (error) {
      console.error("Error getting file content:", error);
      return new NextResponse("Could not retrieve file content", { status: 500 });
    }
  } catch (error) {
    console.error("Error in GET file content:", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

// PUT - Update file content
export async function PUT(
  req: Request,
  { params }: { params: { fileId: string } }
) {
  try {
    const session = await auth();
    const userId = session?.userId;
    
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    
    const fileId = params.fileId;
    const { content } = await req.json();
    
    if (!content) {
      return new NextResponse("Content is required", { status: 400 });
    }
    
    // Get file record from database
    const file = await prismadb.file.findUnique({
      where: {
        id: fileId,
      },
    });
    
    if (!file) {
      return new NextResponse("File not found", { status: 404 });
    }
    
    // Check ownership
    if (file.userId !== userId) {
      return new NextResponse("Unauthorized", { status: 403 });
    }
    
    // Check if file is text type
    if (!file.type.includes('text/') && !file.type.includes('application/json')) {
      return new NextResponse("File is not a text file", { status: 400 });
    }
    
    try {
      // Update file content in storage
      const bucketName = process.env.GCS_BUCKET_NAME || 'mock-bucket';
      await updateFileContent(bucketName, file.storagePath, content);
      
      // Update file size in database
      const newSize = Buffer.from(content).length;
      await prismadb.file.update({
        where: { id: fileId },
        data: { 
          size: newSize,
          updatedAt: new Date()
        }
      });
      
      return NextResponse.json({ 
        success: true,
        message: "File content updated successfully"
      });
    } catch (error) {
      console.error("Error updating file content:", error);
      return new NextResponse("Could not update file content", { status: 500 });
    }
  } catch (error) {
    console.error("Error in PUT file content:", error);
    return new NextResponse("Internal error", { status: 500 });
  }
} 