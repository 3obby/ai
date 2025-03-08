import { auth } from "@/lib/auth-helpers"
import { redirect } from "next/navigation"

import { Navbar } from "@/components/navbar"
import { Sidebar } from "@/components/sidebar"
import { checkSubscription } from "@/lib/subscription"
import { ContentTransition } from "@/components/ui/content-transition"

const RootLayout = async ({ children }: { children: React.ReactNode }) => {
  const isPro = await checkSubscription()
  const session = await auth()
  const userId = session?.userId

  if (!userId) {
    return redirect("/login")
  }

  return (
    <div className="h-full relative">
      <div className="flex h-full">
        {/* Sidebar - fixed to left side with full height */}
        <div className="hidden md:block fixed top-0 left-0 h-full w-20 z-40 bg-secondary border-r border-primary/10">
          <Sidebar userId={userId} />
        </div>
        
        <div className="flex-1 flex flex-col min-h-screen">
          {/* Navbar - spans entire width on mobile, adjusted on desktop */}
          <Navbar isPro={isPro} userId={userId} />
          
          {/* Main content - pushed right on desktop */}
          <main className="md:pl-20 pt-16 flex-1 bg-slate-50 dark:bg-zinc-900">
            <ContentTransition>
              {children}
            </ContentTransition>
          </main>
        </div>
      </div>
    </div>
  )
}

export default RootLayout
