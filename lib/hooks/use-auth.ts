import { useCurrentUser } from "./use-current-user"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"

export function useAuth() {
  const { user, isLoading } = useCurrentUser()
  const router = useRouter()
  const [isSignedIn, setIsSignedIn] = useState<boolean | null>(null)

  useEffect(() => {
    if (!isLoading) {
      setIsSignedIn(!!user)
    }
  }, [user, isLoading])

  const signOut = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" })
      router.push("/login")
      router.refresh()
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  return {
    userId: user?.id,
    isLoaded: !isLoading,
    isSignedIn: isSignedIn,
    user,
    signOut,
  }
}
