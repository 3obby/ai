import prismadb from "@/lib/prismadb"
import { Categories } from "@/components/categories"
import { Companions } from "@/components/companions"
import { SearchInput } from "@/components/search-input"
import { auth } from "@/lib/server-auth"
import { redirect } from "next/navigation"

// Force dynamic rendering for this route since it requires authentication
export const dynamic = 'force-dynamic';

interface DashboardPageProps {
  searchParams: {
    categoryId: string
    name: string
  }
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const session = await auth()
  const userId = session?.userId

  // If no user is authenticated, redirect to the landing page
  if (!userId) {
    redirect("/login")
  }

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
            { private: false }, // Show all public companions
            {
              AND: [
                // Show private companions only if they belong to the user
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
    },
  })

  const categories = await prismadb.category.findMany()

  return (
    <div className="h-full p-4 space-y-2">
      <SearchInput />
      <Categories data={categories} />
      <Companions userId={userId} data={data} />
    </div>
  )
} 