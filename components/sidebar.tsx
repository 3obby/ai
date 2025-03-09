"use client"

import { Home, Plus, Users, Settings, MessageSquare, Coins } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState, useCallback, useTransition } from "react"
import Link from "next/link"

import { cn } from "@/lib/utils"
import { useProModal } from "@/hooks/use-pro-modal"

interface SidebarProps {
  userId: string
}

interface UserUsage {
  remainingTokens: number
}

const XP_REQUIRED_FOR_CREATION = 100

export const Sidebar = ({ userId }: SidebarProps) => {
  const proModal = useProModal()
  const router = useRouter()
  const pathname = usePathname()
  const [userUsage, setUserUsage] = useState<any>({ remainingTokens: XP_REQUIRED_FOR_CREATION }) // Default value to ensure UI works
  const [isAdmin, setIsAdmin] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  // Add isPending state for navigation transitions
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    // Check both authentication and admin status
    try {
      const isAuthenticated =
        localStorage.getItem("isAdminAuthenticated") === "true"
      const adminStatus = localStorage.getItem("isAdmin") === "true"
      setIsAdmin(isAuthenticated && adminStatus)

      const handleStorageChange = () => {
        const isAuth = localStorage.getItem("isAdminAuthenticated") === "true"
        const isAdm = localStorage.getItem("isAdmin") === "true"
        setIsAdmin(isAuth && isAdm)
      }

      window.addEventListener("storage", handleStorageChange)

      return () => {
        window.removeEventListener("storage", handleStorageChange)
      }
    } catch (error) {
      console.error("Error accessing localStorage:", error)
    }
  }, [])

  // Fetch user usage data
  useEffect(() => {
    const fetchUserUsage = async () => {
      setIsLoading(true)
      try {
        const response = await fetch("/api/user-progress")
        if (response.ok) {
          const data = await response.json()
          setUserUsage(data)
        } else {
          console.warn("Unable to fetch user progress, using default values")
        }
      } catch (error) {
        console.error("Error fetching user usage:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchUserUsage()
  }, [])

  // Check both conditions on route change
  useEffect(() => {
    try {
      const isAuthenticated =
        localStorage.getItem("isAdminAuthenticated") === "true"
      const adminStatus = localStorage.getItem("isAdmin") === "true"
      setIsAdmin(isAuthenticated && adminStatus)
    } catch (error) {
      console.error("Error checking admin status:", error)
    }
  }, [pathname])

  // Optimized navigation function that uses Link component under the hood for instant transitions
  const onNavigate = useCallback((url: string, requiredXP: number = 0) => {
    try {
      // Check if we should navigate or show pro modal
      if (isLoading || requiredXP === 0 || (userUsage && userUsage.remainingTokens >= requiredXP)) {
        // Use startTransition to avoid blocking the UI
        startTransition(() => {
          router.prefetch(url)
          router.push(url)
        })
        return
      }
      proModal.onOpen()
    } catch (error) {
      console.error("Navigation error:", error)
      // Fallback: try to navigate anyway
      startTransition(() => {
        router.push(url)
      })
    }
  }, [router, isLoading, userUsage, proModal])

  const routes = [
    {
      icon: Home,
      href: "/",
      label: "Home",
      requiredXP: 0,
    },
    {
      icon: Plus,
      href: "/companion/new",
      label: "Create",
      requiredXP: XP_REQUIRED_FOR_CREATION,
    },
    {
      icon: Users,
      href: "/vote",
      label: "Vote",
      requiredXP: 0,
    },
    {
      icon: MessageSquare,
      href: "/groups",
      label: "Groups",
      requiredXP: 0,
    },
    {
      icon: Coins,
      href: "/token-shop",
      label: "Token Shop",
      requiredXP: 0,
    },
  ]

  // Add admin route if user is admin
  if (isAdmin) {
    routes.push({
      icon: Settings,
      href: "/admin/dashboard",
      label: "Admin",
      requiredXP: 0,
    })
  }

  // Aggressively prefetch all routes when sidebar mounts
  useEffect(() => {
    routes.forEach(route => {
      if (route.requiredXP === 0 || (userUsage && userUsage.remainingTokens >= route.requiredXP)) {
        router.prefetch(route.href)
      }
    })
  }, [routes, userUsage, router])

  return (
    <div className="flex flex-col h-full w-full text-primary">
      <div className="mt-16 flex-1 flex flex-col items-center justify-start">
        {routes.map((route) => {
          const isActive = pathname === route.href
          
          return (
            <div
              key={route.href}
              className="relative group"
            >
              <div
                onClick={() => onNavigate(route.href, route.requiredXP)}
                className={cn(
                  "flex items-center justify-center w-12 h-12 mt-2 mb-2 mx-auto rounded-lg transition-all cursor-pointer",
                  // Normal state
                  "hover:text-orange hover:bg-orange/10",
                  // Active state with 3D effect using orange color
                  isActive ? 
                    "bg-orange/15 text-orange shadow-[inset_0_0_0_2px_#ff5722,_0_4px_6px_-1px_rgba(255,87,34,0.2),_0_2px_4px_-2px_rgba(255,87,34,0.1)]" : 
                    "",
                  // Disabled state
                  route.requiredXP > 0 &&
                    (!userUsage ||
                      userUsage.remainingTokens < route.requiredXP) &&
                    !isLoading &&
                    "opacity-60"
                )}
              >
                <route.icon className={cn(
                  "h-6 w-6 transition-transform duration-200",
                  // Add a subtle animation for the active icon
                  isActive && "scale-110"
                )} />
              </div>
              <div
                className={cn(
                  "absolute left-full ml-2 rounded-md px-2 py-1 text-xs font-medium text-white bg-gray-800 invisible opacity-0 -translate-x-3 group-hover:visible group-hover:opacity-100 group-hover:translate-x-0 transition-all whitespace-nowrap z-50",
                  "cursor-pointer" // Make the tooltip clickable too
                )}
                onClick={() => onNavigate(route.href, route.requiredXP)}
              >
                {route.label}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
