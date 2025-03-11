import { NextResponse } from "next/server";
import { auth } from "@/lib/auth-helpers";
import prismadb from "@/lib/prismadb";
import { deleteFile } from "@/lib/vercel-blob-storage";

export async function DELETE(req: Request, { params }: { params: { fileId: string } }) {
  try {
    const session = await auth();
    const userId = session?.userId;
    
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    
    const { fileId } = params;
    
    // Get the file to verify ownership and get storage path
    const file = await prismadb.file.findUnique({
      where: {
        id: fileId,
        userId,
      },
    });
    
    if (!file) {
      return new NextResponse("File not found", { status: 404 });
    }
    
    // Delete from Vercel Blob storage
    try {
      await deleteFile(file.storagePath);
    } catch (error) {
      console.error("[VERCEL_BLOB_DELETE_ERROR]", error);
      // Continue with database deletion even if storage deletion fails
    }
    
    // Use a transaction to update related records
    await prismadb.$transaction(async (tx) => {
      // Delete the file record (this will cascade to fileToGroup records)
      await tx.file.delete({
        where: {
          id: fileId,
        },
      });
      
      // Update user's total storage
      await tx.user.update({
        where: {
          id: userId,
        },
        data: {
          totalStorage: {
            decrement: file.size,
          },
        },
      });
    });
    
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[FILE_DELETE_ERROR]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function GET(req: Request, { params }: { params: { fileId: string } }) {
  try {
    const session = await auth();
    const userId = session?.userId;
    
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    
    const { fileId } = params;
    
    // Get the file
    const file = await prismadb.file.findUnique({
      where: {
        id: fileId,
      },
    });
    
    if (!file) {
      return new NextResponse("File not found", { status: 404 });
    }
    
    // Check if the file is public or belongs to the user
    if (file.userId !== userId && !file.isPublic) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    
    return new NextResponse(JSON.stringify(file));
  } catch (error) {
    console.error("[FILE_GET_ERROR]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
} 