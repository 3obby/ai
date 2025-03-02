import { redirect } from "next/navigation"
import { auth, redirectToSignIn } from "@clerk/nextjs"

import prismadb from "@/lib/prismadb"
import { GroupChatClient } from "./components/client"

interface GroupChatPageProps {
  params: {
    groupId: string
  }
}

const GroupChatPage = async ({ params }: GroupChatPageProps) => {
  const { userId } = auth()

  if (!userId) {
    return redirectToSignIn()
  }

  let groupChat = await prismadb.groupChat.findUnique({
    where: {
      id: params.groupId,
    },
    include: {
      members: {
        include: {
          companion: true,
        },
      },
      messages: {
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  })

  if (!groupChat) {
    return redirect("/")
  }

  // Only create welcome messages if there are no existing messages
  if (groupChat.messages.length === 0) {
    const welcomeMessages = await Promise.all(
      groupChat.members.map(async (member) => {
        // Use the bot's custom introduction if available, or fall back to a generic greeting
        const greeting =
          member.companion.customIntroduction ||
          `Hi there! I'm ${member.companion.name}. 👋`

        return await prismadb.groupMessage.create({
          data: {
            content: greeting,
            groupChatId: params.groupId,
            isBot: true,
            senderId: member.companion.id,
          },
        })
      })
    )

    // Update groupChat with the newly created messages
    groupChat = {
      ...groupChat,
      messages: welcomeMessages,
    }
  }

  return <GroupChatClient groupChat={groupChat} initialLoad={true} />
}

export default GroupChatPage
