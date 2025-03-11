import { redirect } from "next/navigation"
import { auth } from "@/lib/auth-helpers"
import { cookies } from "next/headers"
import { v4 as uuidv4 } from 'uuid'

import prismadb from "@/lib/prismadb"
import { allocateAnonymousTokens } from "@/lib/token-usage"

import { ChatClient } from "./components/client"

interface ChatIdPageProps {
  params: {
    chatId: string
  }
}

// Create or get an anonymous user ID
async function getOrCreateAnonymousUser(): Promise<string | undefined> {
  // Generate a new anonymous user ID
  const anonymousId = uuidv4();
  
  console.log(`Creating new anonymous user in chat page with ID: ${anonymousId}`);
  
  try {
    // Create a new user record with minimal required fields
    await prismadb.user.create({
      data: {
        id: anonymousId,
        name: 'Anonymous User',
        email: `anon-${anonymousId}@example.com`
      }
    });
    
    // Allocate tokens to the anonymous user
    await allocateAnonymousTokens(anonymousId);
    
    console.log(`Successfully created new anonymous user: ${anonymousId}`);
    return anonymousId;
  } catch (error) {
    console.error('Error creating anonymous user:', error);
    return undefined;
  }
}

const ChatIdPage = async ({ params }: ChatIdPageProps) => {
  const session = await auth()
  const userId = session?.userId
  
  // Handle anonymous user case
  let effectiveUserId = userId;
  
  if (!userId) {
    console.log("No authenticated user, creating anonymous user for chat...");
    try {
      // Create an anonymous user if no logged-in user
      const anonymousUserId = await getOrCreateAnonymousUser();
      
      if (anonymousUserId) {
        console.log("Successfully created anonymous user for chat:", anonymousUserId);
        effectiveUserId = anonymousUserId;
      } else {
        console.error("Failed to create anonymous user for chat");
        return redirect("/login");
      }
    } catch (error) {
      console.error("Error in anonymous user creation:", error);
      return redirect("/login");
    }
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
          userId: effectiveUserId,
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

  return <ChatClient companion={companion} userId={effectiveUserId} isAnonymous={!userId} />
}

export default ChatIdPage
