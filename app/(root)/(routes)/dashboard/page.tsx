import { Suspense } from "react"
import prismadb from "@/lib/prismadb"
import { Categories } from "@/components/categories"
import { Companions } from "@/components/companions"
import { SearchInput } from "@/components/search-input"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { DashboardSkeleton } from "@/components/ui/dashboard-skeleton"
import { CategoriesSkeleton } from "@/components/categories-skeleton"
import { CompanionsSkeleton } from "@/components/companions-skeleton"
import { SearchInputSkeleton } from "@/components/search-input-skeleton"
import { v4 as uuidv4 } from 'uuid'
import { cookies } from 'next/headers'
import { allocateAnonymousTokens } from "@/lib/token-usage"
import { ANONYMOUS_TOKEN_ALLOWANCE } from "@/lib/token-usage"

// Force dynamic rendering for this route to ensure fresh data
export const dynamic = 'force-dynamic';

interface DashboardPageProps {
  searchParams: {
    categoryId?: string
    name?: string
    page?: string
  }
}

// Create or get an anonymous user ID
async function getOrCreateAnonymousUser(): Promise<string | undefined> {
  // Generate a new anonymous user ID
  const anonymousId = uuidv4();
  
  console.log(`Creating new anonymous user with ID: ${anonymousId}`);
  
  try {
    // Create a new user record
    await prismadb.user.create({
      data: {
        id: anonymousId,
        name: 'Anonymous User',
        email: `anon-${anonymousId}@example.com`,
        // Store anonymous info in metadata
        metadata: { isAnonymous: true }
      }
    });
    
    // Allocate tokens to the anonymous user
    await allocateAnonymousTokens(anonymousId);
    
    console.log(`Successfully created new anonymous user with ID: ${anonymousId}`);
    return anonymousId;
  } catch (error) {
    console.error('Error creating anonymous user:', error);
    return undefined;
  }
}

// Separate async component for loading categories
async function CategoriesWrapper() {
  // Add a small artificial delay for UX testing if needed
  // await new Promise(resolve => setTimeout(resolve, 1000));
  const categories = await prismadb.category.findMany();
  return <Categories data={categories} />;
}

// Separate async component for loading companions with pagination
async function CompanionsWrapper({ 
  searchParams, 
  userId 
}: { 
  searchParams: { categoryId?: string; name?: string; page?: string }; 
  userId: string | undefined 
}) {
  // Handle the case where userId might be undefined
  if (!userId) {
    // Return empty state if no user ID is available (should not happen in practice)
    return <Companions userId="" data={[]} currentPage={1} totalCompanions={0} pageSize={10} />;
  }
  
  try {
    console.log("Fetching companions for dashboard...");
    
    const page = parseInt(searchParams.page || "1", 10);
    const pageSize = 10; // Number of companions per page
    const skip = (page - 1) * pageSize;
    
    // Get the total count for pagination
    // Use as any to bypass the TypeScript error
    const totalCount = await (prismadb.companion as any).count({
      where: {
        AND: [
          {
            categoryId: searchParams.categoryId || undefined,
            name: searchParams.name
              ? { contains: searchParams.name, mode: "insensitive" }
              : undefined,
          },
          {
            OR: [
              { private: false },
              {
                AND: [
                  { private: true },
                  { userId: userId },
                ],
              },
            ],
          },
        ],
      },
    });
    
    // Get paginated companions
    const data = await prismadb.companion.findMany({
      where: {
        AND: [
          {
            categoryId: searchParams.categoryId || undefined,
            name: searchParams.name
              ? {
                  contains: searchParams.name,
                  mode: "insensitive",
                }
              : undefined,
          },
          {
            OR: [
              { private: false },
              {
                AND: [
                  { private: true },
                  { userId: userId },
                ],
              },
            ],
          },
        ],
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        _count: {
          select: {
            messages: true,
          },
        },
        // Include user-specific burned tokens for the current user
        userBurnedTokens: {
          where: {
            userId: userId,
          },
          take: 1,
        },
      },
      skip,
      take: pageSize,
    });
    
    console.log(`Found ${data.length} companions (page ${page}, total ${totalCount})`);
    
    return <Companions 
             userId={userId} 
             data={data} 
             currentPage={page} 
             totalCompanions={totalCount} 
             pageSize={pageSize} 
           />;
  } catch (error) {
    console.error("Error fetching companions:", error);
    // Return an empty list as fallback
    return <Companions userId={userId} data={[]} currentPage={1} totalCompanions={0} pageSize={10} />;
  }
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  // Try to get authenticated user
  const session = await auth();
  const userId = session?.user?.id;
  
  console.log("Dashboard page accessed. Authenticated user ID:", userId || "None");
  
  // Handle anonymous user case
  let effectiveUserId = userId;
  
  if (!userId) {
    console.log("No authenticated user, creating anonymous user...");
    try {
      // Create an anonymous user if no logged-in user
      const anonymousUserId = await getOrCreateAnonymousUser();
      
      if (anonymousUserId) {
        console.log("Successfully created anonymous user:", anonymousUserId);
        effectiveUserId = anonymousUserId;
      } else {
        console.error("Failed to create anonymous user");
      }
    } catch (error) {
      console.error("Error in anonymous user creation:", error);
    }
  }
  
  // Display a welcome message for anonymous users
  const isAnonymous = !userId;
  const anonymousMessage = isAnonymous ? { 
    title: "Welcome to the AI Companion Platform!",
    description: `You're browsing as an anonymous user with ${ANONYMOUS_TOKEN_ALLOWANCE} free tokens. Create an account to get access to more features and tokens.`
  } : null;

  return (
    <div className="h-full pt-2 pb-16 px-1 sm:px-2 md:p-4 space-y-2 sm:space-y-4 overflow-x-hidden max-w-[100vw]">
      {anonymousMessage && (
        <div className="bg-gradient-to-r from-orange-500/20 to-orange-500/10 p-4 rounded-lg mb-4 shadow-md border border-orange-500/20">
          <h2 className="text-xl font-bold text-orange-500">{anonymousMessage.title}</h2>
          <p className="text-sm text-muted-foreground mt-1">{anonymousMessage.description}</p>
          <div className="mt-3 flex gap-3">
            <a href="/login" className="bg-orange-500 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-orange-600 transition-colors">
              Sign Up
            </a>
            <a href="/login" className="bg-white text-orange-500 border border-orange-500 px-3 py-2 rounded-md text-sm font-medium hover:bg-orange-50 transition-colors">
              Log In
            </a>
          </div>
        </div>
      )}
      
      <Suspense fallback={<SearchInputSkeleton />}>
        <SearchInput />
      </Suspense>
      
      <Suspense fallback={<CategoriesSkeleton />}>
        <CategoriesWrapper />
      </Suspense>
      
      <Suspense fallback={<CompanionsSkeleton />}>
        {effectiveUserId ? (
          <CompanionsWrapper userId={effectiveUserId} searchParams={searchParams} />
        ) : (
          <div className="text-center p-8 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <p className="text-muted-foreground">
              Unable to display companions. Please try refreshing the page.
            </p>
          </div>
        )}
      </Suspense>
    </div>
  )
} 