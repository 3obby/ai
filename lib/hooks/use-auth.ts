import { signOut, useSession } from "next-auth/react"
import { useRouter } from "next/navigation"

export function useAuth() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const isLoading = status === "loading"

  return {
    userId: session?.user?.id,
    isLoaded: !isLoading,
    isSignedIn: !!session?.user,
    user: session?.user,
    signOut: () => {
      signOut({ callbackUrl: "/login" })
      router.refresh()
    },
  }
}
