import { Suspense } from "react"
import prismadb from "@/lib/prismadb"
import { Categories } from "@/components/categories"
import { Companions } from "@/components/companions"
import { SearchInput } from "@/components/search-input"
import { auth } from "@/lib/auth-helpers"
import { redirect } from "next/navigation"
import { DashboardSkeleton } from "@/components/ui/dashboard-skeleton"
import { CategoriesSkeleton } from "@/components/categories-skeleton"
import { CompanionsSkeleton } from "@/components/companions-skeleton"
import { SearchInputSkeleton } from "@/components/search-input-skeleton"

// Force dynamic rendering for this route since it requires authentication
export const dynamic = 'force-dynamic';

interface DashboardPageProps {
  searchParams: {
    categoryId: string
    name: string
    page: string
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
  searchParams: { categoryId: string; name: string; page: string }; 
  userId: string 
}) {
  try {
    console.log("Fetching companions for dashboard...");
    
    // Parse page number and set default if not provided
    const page = parseInt(searchParams.page || "1", 10);
    const pageSize = 10; // Number of companions per page
    const skip = (page - 1) * pageSize;
    
    // Get the total count for pagination
    const totalCount = await prismadb.companion.count({
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
  const session = await auth()
  const userId = session?.userId

  // If no user is authenticated, redirect to the landing page
  if (!userId) {
    redirect("/login")
  }

  return (
    <div className="h-full pt-2 pb-16 px-1 sm:px-2 md:p-4 space-y-2 sm:space-y-4 overflow-hidden max-w-[100vw]">
      <Suspense fallback={<SearchInputSkeleton />}>
        <SearchInput />
      </Suspense>
      
      <Suspense fallback={<CategoriesSkeleton />}>
        <CategoriesWrapper />
      </Suspense>
      
      <Suspense fallback={<CompanionsSkeleton />}>
        <CompanionsWrapper searchParams={searchParams} userId={userId} />
      </Suspense>
    </div>
  )
} 