import { redirect } from "next/navigation"
import { auth } from "@/lib/auth-helpers"
import prismadb from "@/lib/prismadb"
import { cookies } from "next/headers"
import { GroupChatClient } from "./components/client"

interface GroupChatIdPageProps {
  params: {
    groupId: string
  }
}

const GroupChatIdPage = async ({ params }: GroupChatIdPageProps) => {
  const session = await auth()
  const userId = session?.userId
  
  // Check for anonymous user ID in cookies
  const cookieStore = cookies()
  const anonymousUserId = cookieStore.get('anonymousUserId')?.value || 
                          cookieStore.get('next-auth.anonymous-user-id')?.value || 
                          cookieStore.get('next-auth.anonymous-token')?.value
  
  // Use authenticated user ID or anonymous user ID
  const effectiveUserId = userId || anonymousUserId
  
  if (!effectiveUserId) {
    console.log("No user ID found for group chat page, redirecting to login")
    return redirect("/login")
  }

  console.log(`Accessing group chat ${params.groupId} as user ${effectiveUserId}`)

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
      messages: {
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  })

  if (!groupChat) {
    console.log("Group chat not found, redirecting to dashboard")
    return redirect("/dashboard")
  }

  // Only allow the creator to access the group chat
  if (groupChat.creatorId !== effectiveUserId) {
    console.log(`User ${effectiveUserId} is not the creator of group chat ${params.groupId}, redirecting to dashboard`)
    return redirect("/dashboard")
  }

  return <GroupChatClient groupChat={groupChat} initialLoad={true} userId={effectiveUserId} />
}

export default GroupChatIdPage
