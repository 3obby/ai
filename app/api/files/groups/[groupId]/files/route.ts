import { NextResponse } from "next/server";
import { auth } from "@/lib/auth-helpers";
import prismadb from "@/lib/prismadb";

export async function POST(req: Request, { params }: { params: { groupId: string } }) {
  try {
    const session = await auth();
    const userId = session?.userId;
    
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    
    const { groupId } = params;
    const body = await req.json();
    const { fileId } = body;
    
    if (!fileId) {
      return new NextResponse("File ID is required", { status: 400 });
    }
    
    // Verify the file group exists and belongs to the user
    const fileGroup = await prismadb.fileGroup.findUnique({
      where: {
        id: groupId,
        userId,
      },
    });
    
    if (!fileGroup) {
      return new NextResponse("File group not found", { status: 404 });
    }
    
    // Verify the file exists and belongs to the user
    const file = await prismadb.file.findUnique({
      where: {
        id: fileId,
        userId,
      },
    });
    
    if (!file) {
      return new NextResponse("File not found", { status: 404 });
    }
    
    // Check if the file is already in the group
    const existingFileToGroup = await prismadb.fileToGroup.findUnique({
      where: {
        fileId_fileGroupId: {
          fileId,
          fileGroupId: groupId,
        },
      },
    });
    
    if (existingFileToGroup) {
      return new NextResponse("File is already in this group", { status: 400 });
    }
    
    // Add the file to the group
    const fileToGroup = await prismadb.fileToGroup.create({
      data: {
        fileId,
        fileGroupId: groupId,
      },
    });
    
    return new NextResponse(JSON.stringify(fileToGroup));
  } catch (error) {
    console.error("[ADD_FILE_TO_GROUP_ERROR]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
} 