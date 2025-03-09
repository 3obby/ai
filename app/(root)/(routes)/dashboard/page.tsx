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
  }
}

// Separate async component for loading categories
async function CategoriesWrapper() {
  // Add a small artificial delay for UX testing if needed
  // await new Promise(resolve => setTimeout(resolve, 1000));
  const categories = await prismadb.category.findMany();
  return <Categories data={categories} />;
}

// Separate async component for loading companions
async function CompanionsWrapper({ 
  searchParams, 
  userId 
}: { 
  searchParams: { categoryId: string; name: string }; 
  userId: string 
}) {
  // Add a small artificial delay for UX testing if needed
  // await new Promise(resolve => setTimeout(resolve, 2000));
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
          userId: userId
        },
        take: 1
      }
    },
  });
  
  return <Companions userId={userId} data={data} />;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const session = await auth()
  const userId = session?.userId

  // If no user is authenticated, redirect to the landing page
  if (!userId) {
    redirect("/login")
  }

  return (
    <div className="h-full p-4 space-y-4">
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