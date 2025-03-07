import { Navbar } from "@/components/navbar"
import { Sidebar } from "@/components/sidebar"
import { auth } from "@/lib/server-auth"
import { checkSubscription } from "@/lib/subscription"
import { redirect } from "next/navigation"

// Force dynamic rendering for authentication
export const dynamic = 'force-dynamic';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  
  if (!session?.userId) {
    redirect("/login")
  }

  // checkSubscription doesn't take parameters based on its definition
  const isPro = await checkSubscription()

  return (
    <div className="h-full relative">
      <div className="hidden h-full md:flex md:w-72 md:flex-col md:fixed md:inset-y-0 z-[80] bg-gray-900">
        <Sidebar userId={session.userId} />
      </div>
      <main className="md:pl-72 pb-10">
        <Navbar isPro={isPro} userId={session.userId} />
        {children}
      </main>
    </div>
  )
} 