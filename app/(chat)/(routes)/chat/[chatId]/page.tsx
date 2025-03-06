import { redirect } from "next/navigation"
import { auth } from "@/lib/server-auth"

import prismadb from "@/lib/prismadb"

import { ChatClient } from "./components/client"

interface ChatIdPageProps {
  params: {
    chatId: string
  }
}

const ChatIdPage = async ({ params }: ChatIdPageProps) => {
  const session = await auth()
  const userId = session?.userId

  if (!userId) {
    return redirect("/login")
  }

  const companion = await prismadb.companion.findUnique({
    where: {
      id: params.chatId,
    },
    include: {
      messages: {
        orderBy: {
          createdAt: "asc",
        },
        where: {
          userId,
        },
      },
      _count: {
        select: {
          messages: true,
        },
      },
    },
  })

  if (!companion) {
    return redirect("/")
  }

  // Redirect non-PRO users if they try to access a paid companion

  return <ChatClient companion={companion} />
}

export default ChatIdPage
