import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import prismadb from "@/lib/prismadb"
import { cookies } from "next/headers"
import { GroupChatClient } from "./components/client"

interface GroupChatIdPageProps {
  params: Promise<{
    groupId: string
  }>,
  searchParams: Promise<{
    userId?: string
  }>
}

const GroupChatIdPage = async ({ params, searchParams }: GroupChatIdPageProps) => {
  // Await params and searchParams as required by Next.js 15
  const { groupId } = await params;
  const { userId: queryUserId } = await searchParams;
  
  const session = await auth()
  const userId = session?.userId
  
  // In Next.js 15, cookies() must be awaited
  const cookieStore = await cookies()
  const anonymousUserId = cookieStore.get('anonymousUserId')?.value || 
                          cookieStore.get('next-auth.anonymous-user-id')?.value || 
                          cookieStore.get('next-auth.anonymous-token')?.value
  
  console.log("GroupChatIdPage auth info:", {
    authenticatedUserId: userId,
    anonymousUserIdFromCookie: anonymousUserId,
    queryUserId
  })
  
  // Use authenticated user ID, anonymous user ID from cookie, or query parameter (in that order of preference)
  const effectiveUserId = userId || anonymousUserId || queryUserId
  
  if (!effectiveUserId) {
    console.log("No user ID found for group chat page, redirecting to login")
    return redirect("/login")
  }

  console.log(`Accessing group chat ${groupId} as user ${effectiveUserId}`)

  const groupChat = await prismadb.groupChat.findUnique({
    where: {
      id: groupId,
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
    console.log(`User ${effectiveUserId} is not the creator of group chat ${groupId}, redirecting to dashboard`)
    return redirect("/dashboard")
  }

  return <GroupChatClient groupChat={groupChat} initialLoad={true} userId={effectiveUserId} />
}

export default GroupChatIdPage
