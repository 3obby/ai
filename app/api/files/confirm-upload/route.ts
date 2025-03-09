import { NextResponse } from "next/server";
import { auth } from "@/lib/auth-helpers";
import { getSignedDownloadUrl } from "@/lib/google-cloud-storage";
import prismadb from "@/lib/prismadb";

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
    
    // Generate a signed download URL
    const downloadUrl = await getSignedDownloadUrl(file.storagePath);
    
    // Update the file record with the download URL and set status to READY
    const updatedFile = await prismadb.file.update({
      where: { id: fileId },
      data: {
        url: downloadUrl,
        status: "READY",
      },
    });
    
    // Deduct tokens from user's balance
    await prismadb.userUsage.update({
      where: { userId },
      data: {
        availableTokens: {
          decrement: file.tokensCost,
        },
      },
    });
    
    // Create a transaction record
    await prismadb.transaction.create({
      data: {
        amount: -file.tokensCost,
        type: "FILE_STORAGE",
        description: `File storage: ${file.originalName}`,
        metadata: JSON.stringify({
          fileId: file.id,
          fileName: file.originalName,
          fileSize: file.size,
        }),
        userUsage: {
          connect: {
            userId,
          },
        },
      },
    });
    
    // Update user's total storage
    await prismadb.user.update({
      where: { id: userId },
      data: {
        totalStorage: {
          increment: file.size,
        },
      },
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