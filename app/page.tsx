import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"

// Force dynamic rendering for authentication check
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  // Get authentication state
  const session = await auth()
  
  // If authenticated, redirect to dashboard
  if (session?.user?.id) {
    redirect("/dashboard")
  } else {
    // If not authenticated, redirect to login
    redirect("/login")
  }
} 