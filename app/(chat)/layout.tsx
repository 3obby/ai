import { Navbar } from "@/components/navbar"
import { Sidebar } from "@/components/sidebar"
import { checkSubscription } from "@/lib/subscription"
import { auth } from "@/lib/server-auth"
import { redirect } from "next/navigation"

const ChatLayout = async ({ children }: { children: React.ReactNode }) => {
  const isPro = await checkSubscription()
  const session = await auth()
  const userId = session?.userId

  if (!userId) {
    return redirect("/login")
  }

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
