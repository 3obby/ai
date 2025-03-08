import { auth } from "@/lib/auth-helpers"
import { NextResponse } from "next/server"
import prismadb from "@/lib/prismadb"

// DELETE endpoint to clear all chats
export async function DELETE(req: Request) {
  try {
    const session = await auth()
    const userId = session?.userId

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    // Delete all messages for this user
    await prismadb.message.deleteMany({
      where: {
        userId: userId,
      },
    })

    return new NextResponse("All chats cleared successfully", { status: 200 })
  } catch (error) {
    console.log("[CHAT_CLEAR]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
