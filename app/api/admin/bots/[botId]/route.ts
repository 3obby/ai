import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prismadb from "@/lib/prismadb"

export const dynamic = "force-dynamic"

export async function DELETE(
  req: Request,
  { params }: { params: { botId: string } }
) {
  try {
    const session = await auth()
    const userId = session?.userId

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    if (!params.botId) {
      return new NextResponse("Bot ID is required", { status: 400 })
    }

    // Get bot first to check if it exists
    const existingBot = await prismadb.companion.findUnique({
      where: {
        id: params.botId,
      },
    })

    if (!existingBot) {
      return new NextResponse("Bot not found", { status: 404 })
    }

    // Delete the bot
    const result = await prismadb.$executeRaw`
      DELETE FROM "Companion" WHERE id = ${params.botId}
    `

    return NextResponse.json({ success: true, deleted: params.botId })
  } catch (error) {
    console.error("[BOT_DELETE]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}

export async function GET(
  req: Request,
  { params }: { params: { botId: string } }
) {
  try {
    const session = await auth()
    const userId = session?.userId

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    if (!params.botId) {
      return new NextResponse("Bot ID is required", { status: 400 })
    }

    // Server-side just checks if the user exists
    const user = await prismadb.user.findUnique({
      where: {
        id: userId,
      },
    })

    if (!user) {
      return new NextResponse("Unauthorized", { status: 403 })
    }

    // Get specific bot/companion
    const bot = await prismadb.companion.findUnique({
      where: {
        id: params.botId,
      },
    })

    return NextResponse.json(bot)
  } catch (error) {
    console.error("[ADMIN_BOT_GET_ERROR]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { botId: string } }
) {
  try {
    const session = await auth()
    const userId = session?.userId
    const body = await req.json()

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    if (!params.botId) {
      return new NextResponse("Bot ID is required", { status: 400 })
    }

    // Server-side just checks if the user exists
    const user = await prismadb.user.findUnique({
      where: {
        id: userId,
      },
    })

    if (!user) {
      return new NextResponse("Unauthorized", { status: 403 })
    }

    // Get bot first to check if it exists
    const existingBot = await prismadb.companion.findUnique({
      where: {
        id: params.botId,
      },
    })

    if (!existingBot) {
      return new NextResponse("Bot not found", { status: 404 })
    }

    // Update using raw SQL to avoid type errors
    const result = await prismadb.$executeRaw`
      UPDATE "Companion" 
      SET "name" = ${body.name || existingBot.name},
          "instructions" = ${body.instructions || existingBot.instructions},
          "src" = ${body.src || existingBot.src},
          "categoryId" = ${body.categoryId || existingBot.categoryId},
          "private" = ${body.private !== undefined ? body.private : existingBot.private}
      WHERE id = ${params.botId}
    `

    const updatedBot = await prismadb.companion.findUnique({
      where: {
        id: params.botId,
      },
    })

    return NextResponse.json(updatedBot)
  } catch (error) {
    console.error("[ADMIN_BOT_PATCH_ERROR]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
