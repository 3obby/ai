import { Navbar } from "@/components/navbar"
import { Sidebar } from "@/components/sidebar"
import { checkSubscription } from "@/lib/subscription"
import { auth } from "@/lib/auth"
import { v4 as uuidv4 } from 'uuid'
import { allocateAnonymousTokens } from "@/lib/token-usage"
import prismadb from "@/lib/prismadb"

// Create or get an anonymous user ID
async function getOrCreateAnonymousUser(): Promise<string | undefined> {
  // Generate a new anonymous user ID
  const anonymousId = uuidv4();
  
  console.log(`Creating new anonymous user in chat layout with ID: ${anonymousId}`);
  
  try {
    // Create a new user record with minimal required fields
    const user = await prismadb.user.create({
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

const ChatLayout = async ({ children }: { children: React.ReactNode }) => {
  const session = await auth()
  const userId = session?.userId
  
  // Handle anonymous user case
  let effectiveUserId = userId;
  
  if (!userId) {
    console.log("Anonymous user in chat layout, proceeding without redirection");
  }
  
  // Check subscription only if user is authenticated
  const isPro = userId ? await checkSubscription() : false;

  return (
    <div className="h-full">
      <Navbar isPro={isPro} userId={userId} />
      <div className="hidden md:flex mt-16 h-full w-20 flex-col fixed inset-y-0">
        <Sidebar userId={userId} />
      </div>
      <main className="md:pl-20 pt-16 h-full">{children}</main>
    </div>
  )
}

export default ChatLayout
