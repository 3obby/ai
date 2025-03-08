import { NextResponse } from "next/server"
import { auth } from "@/lib/auth-helpers"
import prismadb from "@/lib/prismadb"

export const dynamic = "force-dynamic"

export async function PATCH(
  req: Request,
  { params }: { params: { botId: string } }
) {
  try {
    const session = await auth()
    const userId = session?.userId
    const { delay } = await req.json()

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const user = await prismadb.user.findUnique({
      where: {
        id: userId,
      },
    })

    if (!user) {
      return new NextResponse("Unauthorized", { status: 403 })
    }

    const existingBot = await prismadb.companion.findUnique({
      where: {
        id: params.botId,
      },
    })

    if (!existingBot) {
      return new NextResponse("Bot not found", { status: 404 })
    }

    // Update using raw SQL to avoid type errors
    await prismadb.$executeRaw`
      UPDATE "Companion" 
      SET "messageDelay" = ${delay}
      WHERE id = ${params.botId}
    `

    const updatedBot = await prismadb.companion.findUnique({
      where: {
        id: params.botId,
      },
    })

    return NextResponse.json(updatedBot)
  } catch (error) {
    console.error("[BOT_DELAY_ERROR]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
