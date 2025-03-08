import { auth } from "@/lib/auth-helpers";
import { NextResponse } from "next/server"
import prismadb from "@/lib/prismadb"


// Force dynamic rendering for API routes
export const dynamic = "force-dynamic";

// GET - Fetch all prompts for the current user
export async function GET(req: Request) {
  try {
    const session = await auth();
const userId = session?.userId;

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const userPrompts = await prismadb.userPrompt.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    })

    return NextResponse.json(userPrompts)
  } catch (error) {
    console.error("[USER_PROMPTS_GET]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}

// POST - Create a new prompt
export async function POST(req: Request) {
  try {
    const { text } = await req.json()

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    if (!text || typeof text !== "string") {
      return new NextResponse("Invalid prompt text", { status: 400 })
    }

    const prompt = await prismadb.userPrompt.create({
      data: {
        userId,
        text,
        isActive: true,
      },
    })

    return NextResponse.json(prompt)
  } catch (error) {
    console.error("[USER_PROMPTS_POST]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}

// PUT - Update a user prompt (text or active status)
export async function PUT(req: Request) {
  try {
    const { id, text, isActive } = await req.json()

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    if (!id) {
      return new NextResponse("Prompt ID is required", { status: 400 })
    }

    // Find the prompt first to verify ownership
    const existingPrompt = await prismadb.userPrompt.findUnique({
      where: { id },
    })

    if (!existingPrompt || existingPrompt.userId !== userId) {
      return new NextResponse("Unauthorized or prompt not found", {
        status: 404,
      })
    }

    // Update with provided fields
    const updateData: any = {}
    if (text !== undefined) updateData.text = text
    if (isActive !== undefined) updateData.isActive = isActive

    const updatedPrompt = await prismadb.userPrompt.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(updatedPrompt)
  } catch (error) {
    console.error("[USER_PROMPTS_PUT]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}

// DELETE - Remove a user prompt
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    if (!id) {
      return new NextResponse("Prompt ID is required", { status: 400 })
    }

    // Find the prompt first to verify ownership
    const existingPrompt = await prismadb.userPrompt.findUnique({
      where: { id },
    })

    if (!existingPrompt || existingPrompt.userId !== userId) {
      return new NextResponse("Unauthorized or prompt not found", {
        status: 404,
      })
    }

    // Delete the prompt
    await prismadb.userPrompt.delete({
      where: { id },
    })

    return NextResponse.json({ message: "Prompt deleted" })
  } catch (error) {
    console.error("[USER_PROMPTS_DELETE]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
