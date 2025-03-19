import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSignedDownloadUrl } from "@/lib/vercel-blob-storage";
import prismadb from "@/lib/prismadb";

// Check if we're in development mode
const isDevelopment = process.env.NODE_ENV !== 'production';

export async function POST(req: Request) {
  try {
    const session = await auth();
    const userId = session?.userId;
    
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    
    const body = await req.json();
    const { fileId } = body;
    
    if (!fileId) {
      return new NextResponse("Missing file ID", { status: 400 });
    }
    
    // Get the file record
    const file = await prismadb.file.findUnique({
      where: { id: fileId },
    });
    
    if (!file) {
      return new NextResponse("File not found", { status: 404 });
    }
    
    // Verify the file belongs to the user
    if (file.userId !== userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    
    // With Vercel Blob, the storagePath is already a URL, but we'll verify it exists
    let downloadUrl;
    try {
      downloadUrl = await getSignedDownloadUrl(file.storagePath);
    } catch (error) {
      console.error("Error verifying Blob URL:", error);
      if (isDevelopment) {
        // Use a mock URL in development
        downloadUrl = `https://mock-vercel-blob-download.com/${file.storagePath}?mock=true`;
        console.log("Using mock download URL in development:", downloadUrl);
      } else {
        // In production, propagate the error
        throw error;
      }
    }
    
    // Update the file record with the verified URL and set status to READY
    const updatedFile = await prismadb.$transaction(async (tx) => {
      // Update the file
      const updatedFile = await tx.file.update({
        where: { id: fileId },
        data: {
          url: downloadUrl,
          status: "READY",
        },
      });
      
      // Create a transaction record
      await tx.transaction.create({
        data: {
          amount: -file.tokensCost,
          type: "FILE_STORAGE",
          description: `File storage: ${file.originalName}`,
          metadata: JSON.stringify({
            fileId: file.id,
            fileName: file.originalName,
            fileSize: file.size,
          }),
          userUsageId: (await tx.userUsage.findUnique({ where: { userId } }))?.id || '',
        },
      });
      
      return updatedFile;
    });
    
    return new NextResponse(JSON.stringify({
      success: true,
      file: updatedFile,
    }));
  } catch (error) {
    console.error("[CONFIRM_UPLOAD_ERROR]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
} 