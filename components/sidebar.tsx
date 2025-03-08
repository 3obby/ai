"use client"

import { Home, Plus, Users, Settings, MessageSquare } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"

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

  const onNavigate = (url: string, requiredXP: number = 0) => {
    try {
      // Always allow navigation in case of API errors
      if (isLoading || requiredXP === 0 || (userUsage && userUsage.remainingTokens >= requiredXP)) {
        router.push(url)
        return
      }
      proModal.onOpen()
    } catch (error) {
      console.error("Navigation error:", error)
      // Fallback: try to navigate anyway
      router.push(url)
    }
  }

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
      href: "/community",
      label: "Vote",
      requiredXP: 0,
    },
    {
      icon: MessageSquare,
      href: "/groups",
      label: "Groups",
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

  return (
    <div className="space-y-4 flex flex-col h-full text-primary bg-secondary">
      <div className="py-4 flex-1 flex flex-col items-center justify-center">
        {routes.map((route) => (
          <div
            key={route.href}
            onClick={() => onNavigate(route.href, route.requiredXP)}
            className={cn(
              "relative flex items-center justify-center w-12 h-12 mt-2 mb-2 mx-auto rounded-lg group hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer",
              pathname === route.href && "bg-primary/10 text-primary",
              route.requiredXP > 0 &&
                (!userUsage ||
                  userUsage.remainingTokens < route.requiredXP) &&
                !isLoading &&
                "opacity-75"
            )}
          >
            <route.icon className="h-6 w-6" />
            <span className="absolute left-full ml-2 rounded-md px-2 py-1 text-xs font-medium text-white bg-gray-800 invisible opacity-0 -translate-x-3 group-hover:visible group-hover:opacity-100 group-hover:translate-x-0 transition-all whitespace-nowrap z-50">
              {route.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
