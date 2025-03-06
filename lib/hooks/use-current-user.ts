import { useState, useEffect } from "react"

export interface User {
  id: string
  email: string
  name?: string | null
  image?: string | null
}

export function useCurrentUser() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setIsLoading(true)
        const response = await fetch("/api/me")

        if (!response.ok) {
          if (response.status === 401) {
            // User is not authenticated
            setUser(null)
            return
          }
          throw new Error(`Failed to fetch user: ${response.statusText}`)
        }

        const userData = await response.json()
        setUser(userData)
      } catch (err) {
        console.error("Error fetching current user:", err)
        setError(err instanceof Error ? err : new Error(String(err)))
      } finally {
        setIsLoading(false)
      }
    }

    fetchUser()
  }, [])

  return { user, isLoading, error }
}
