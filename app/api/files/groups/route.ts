import { NextResponse } from "next/server";
import { auth } from "@/lib/auth-helpers";
import prismadb from "@/lib/prismadb";

// Create a new file group
export async function POST(req: Request) {
  try {
    const session = await auth();
    const userId = session?.userId;
    
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    
    const body = await req.json();
    const { name, description, color } = body;
    
    if (!name) {
      return new NextResponse("Group name is required", { status: 400 });
    }
    
    // Create the file group
    const fileGroup = await prismadb.fileGroup.create({
      data: {
        userId,
        name,
        description,
        color,
      },
    });
    
    return new NextResponse(JSON.stringify(fileGroup));
  } catch (error) {
    console.error("[FILE_GROUP_CREATE_ERROR]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

// Get all file groups for the user
export async function GET(req: Request) {
  try {
    const session = await auth();
    const userId = session?.userId;
    
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    
    // Get query params
    const { searchParams } = new URL(req.url);
    const includeFiles = searchParams.get("includeFiles") === "true";
    
    let query = {
      where: {
        userId,
      },
      orderBy: {
        name: "asc" as const,
      },
    };
    
    // Include files if requested
    if (includeFiles) {
      query = {
        ...query,
        include: {
          files: {
            include: {
              file: true,
            },
          },
        },
      } as any;
    }
    
    // Get the file groups
    const fileGroups = await prismadb.fileGroup.findMany(query as any);
    
    return new NextResponse(JSON.stringify(fileGroups));
  } catch (error) {
    console.error("[FILE_GROUP_GET_ERROR]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

// Delete a file group
export async function DELETE(req: Request) {
  try {
    const session = await auth();
    const userId = session?.userId;
    
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    
    // Get group ID from query params
    const { searchParams } = new URL(req.url);
    const groupId = searchParams.get("id");
    
    if (!groupId) {
      return new NextResponse("Group ID is required", { status: 400 });
    }
    
    // Verify the user owns this group
    const existingGroup = await prismadb.fileGroup.findFirst({
      where: {
        id: groupId,
        userId,
      },
    });
    
    if (!existingGroup) {
      return new NextResponse("Group not found or not owned by user", { status: 404 });
    }
    
    // Delete the file group - cascade will handle relations
    await prismadb.fileGroup.delete({
      where: {
        id: groupId,
      },
    });
    
    return new NextResponse(JSON.stringify({ success: true }));
  } catch (error) {
    console.error("[FILE_GROUP_DELETE_ERROR]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
} 