import { redirect } from "next/navigation"

// Force dynamic rendering for authentication check
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  // Simply redirect all users to dashboard - we'll handle anonymous users there
  redirect("/dashboard")
} 