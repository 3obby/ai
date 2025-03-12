import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { getOrCreateAnonymousUser } from "@/app/actions/user-actions";

import prismadb from "@/lib/prismadb"
import { ChatClient } from "./components/client"

interface ChatIdPageProps {
  params: {
    chatId: string
  }
}

const ChatIdPage = async ({ params }: ChatIdPageProps) => {
  // Properly await the params to get chatId in Next.js 15
  const chatId = params.chatId;
  
  // Get auth session
  const session = await auth();
  const userId = session?.userId;
  
  // Handle anonymous user case
  let effectiveUserId = userId;
  
  if (!userId) {
    console.log("No authenticated user, using anonymous user for chat...");
    try {
      // Use our server action to create or get an anonymous user
      const anonymousUserId = await getOrCreateAnonymousUser();
      
      if (anonymousUserId) {
        console.log("Using anonymous user for chat:", anonymousUserId);
        effectiveUserId = anonymousUserId;
      } else {
        console.error("Failed to get or create anonymous user");
        return redirect("/login");
      }
    } catch (error) {
      console.error("Error handling anonymous user:", error);
      return redirect("/login");
    }
  }

  // Get companion details with appropriate messages
  const companion = await prismadb.companion.findUnique({
    where: {
      id: chatId,
    },
    include: {
      messages: {
        orderBy: {
          createdAt: "asc",
        },
        where: {
          userId: effectiveUserId,
        },
      },
      _count: {
        select: {
          messages: true,
        },
      },
    },
  });

  if (!companion) {
    return redirect("/dashboard");
  }

  return <ChatClient companion={companion} userId={effectiveUserId} isAnonymous={!userId} />;
};

export default ChatIdPage;
