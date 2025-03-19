import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { head } from "@vercel/blob";

// Force dynamic rendering for API routes
export const dynamic = "force-dynamic";

// Helper to get file content from Vercel Blob
const getFileContent = async (blobUrl: string): Promise<string> => {
  try {
    // Verify the blob exists
    const blob = await head(blobUrl);
    if (!blob) {
      throw new Error(`File not found: ${blobUrl}`);
    }
    
    // Get file content from blob URL
    const response = await fetch(blobUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch file content: ${response.statusText}`);
    }
    
    return await response.text();
  } catch (error) {
    console.error('Error fetching file content:', error);
    return '';
  }
};

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

    // Check if the file exists and belongs to the user
    const file = await prismadb.file.findUnique({
      where: {
        id: fileId,
        userId,
      },
    });

    if (!file) {
      return new NextResponse("File not found", { status: 404 });
    }

    // For non-text files, we can't efficiently return content
    if (!file.type.startsWith('text/') && !file.type.includes('json')) {
      return new NextResponse("File is not a text or JSON file", { status: 400 });
    }

    // Get the file content from Vercel Blob
    const content = await getFileContent(file.storagePath);

    return NextResponse.json({ content });
  } catch (error) {
    console.error("[FILE_CONTENT_ERROR]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

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

    // Check if the file exists and belongs to the user
    const file = await prismadb.file.findUnique({
      where: {
        id: fileId,
        userId,
      },
    });

    if (!file) {
      return new NextResponse("File not found", { status: 404 });
    }

    // For now, we don't support updating file content in Vercel Blob
    // To update, you'd need to delete the old blob and upload a new one
    return new NextResponse(
      "Updating file content is not supported with Vercel Blob. Please delete and re-upload the file.",
      { status: 501 }
    );
  } catch (error) {
    console.error("[FILE_CONTENT_UPDATE_ERROR]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
} 