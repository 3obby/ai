import { redirect } from "next/navigation"
import { auth } from "@/lib/auth-helpers"
import prismadb from "@/lib/prismadb"
import { GroupChatClient } from "./components/client"

interface GroupChatIdPageProps {
  params: {
    groupId: string
  }
}

const GroupChatIdPage = async ({ params }: GroupChatIdPageProps) => {
  const session = await auth()
  const userId = session?.userId

  if (!userId) {
    return redirect("/login")
  }

  const groupChat = await prismadb.groupChat.findUnique({
    where: {
      id: params.groupId,
    },
    include: {
      members: {
        include: {
          companion: true,
        },
      },
    },
  })

  if (!groupChat) {
    return redirect("/")
  }

  // Only allow the creator to access the group chat
  if (groupChat.creatorId !== userId) {
    return redirect("/")
  }

  return <GroupChatClient groupChat={groupChat} initialLoad={true} />
}

export default GroupChatIdPage
