import { useSession } from "next-auth/react"

export interface User {
  id: string
  email: string
  name?: string | null
  image?: string | null
}

export function useCurrentUser() {
  const { data: session, status } = useSession()
  
  return { 
    user: session?.user as User | null, 
    isLoading: status === "loading",
    error: null
  }
}
