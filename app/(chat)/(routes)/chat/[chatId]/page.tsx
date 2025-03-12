import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { getOrCreateAnonymousUser } from "@/app/actions/user-actions";
import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb"
import { ChatClient } from "./components/client"

interface ChatIdPageProps {
  params: Promise<{
    chatId: string
  }>
}

const ChatIdPage = async ({ params }: ChatIdPageProps) => {
  // Properly await the params to get chatId in Next.js 15
  const { chatId } = await params;
  
  // Get auth session
  const session = await auth();
  const userId = session?.userId;
  
  // Handle anonymous user case
  let effectiveUserId = userId;
  let hasConnectionIssues = false;
  
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

  try {
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
      return redirect("/");
    }

    return (
      <ChatClient companion={companion} userId={effectiveUserId} />
    );
  } catch (error: any) {
    console.error("Error fetching companion:", error);
    
    // For anonymous users, provide a fallback experience when the database is not reachable
    if (!userId && error.message?.includes("Can't reach database server")) {
      console.log("Database connection issues detected, using fallback companion for anonymous user");
      hasConnectionIssues = true;
      
      // Create a basic fallback companion
      const fallbackCompanion = {
        id: chatId,
        userId: "system",
        userName: "System",
        src: "/placeholders/default-avatar.png",
        name: "Chat Assistant",
        description: "I'm here to help you with your questions.",
        instructions: "Be helpful and provide assistance to users.",
        seed: "default",
        createdAt: new Date(),
        updatedAt: new Date(),
        categoryId: null,
        category: null,
        messageDelay: 0,
        xpEarned: 0,
        tokensBurned: 0,
        sendMultipleMessages: false,
        isFree: true,
        private: false,
        global: true,
        customIntroduction: "Hello! I'm here to assist you. How can I help you today?",
        description_old: "",
        personalityConfig: null,
        knowledgeConfig: null,
        interactionConfig: null,
        toolConfig: null,
        personality: {},
        toolAccess: [],
        version: 1,
        views: 0,
        votes: 0,
        messages: [],
        _count: {
          messages: 0
        }
      };
      
      return (
        <ChatClient companion={fallbackCompanion} userId={effectiveUserId} hasConnectionIssues={hasConnectionIssues} />
      );
    }
    
    // For authenticated users or other errors, redirect to error page
    return redirect("/error?code=500&message=Failed+to+load+chat");
  }
};

export default ChatIdPage;
