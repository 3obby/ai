import { redirect } from "next/navigation"

// Force dynamic rendering for authentication check
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  // Redirect all users to the groupchatcontext page by default
  redirect("/groupchatcontext")
} 