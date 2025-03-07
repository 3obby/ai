import { auth } from "@/lib/server-auth"
import { redirect } from "next/navigation"

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Check if user is authenticated
  const session = await auth()
  
  // If authenticated, redirect to dashboard
  if (session?.userId) {
    redirect("/dashboard")
  }

  return children
}
