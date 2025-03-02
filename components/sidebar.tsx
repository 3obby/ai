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
  const [userUsage, setUserUsage] = useState<any>(null)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    // Check both authentication and admin status
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

    const fetchUserUsage = async () => {
      try {
        const response = await fetch("/api/user-progress")
        const data = await response.json()
        setUserUsage(data)
      } catch (error) {
        console.error("Error fetching user usage:", error)
      }
    }

    fetchUserUsage()

    return () => {
      window.removeEventListener("storage", handleStorageChange)
    }
  }, [])

  // Check both conditions on route change
  useEffect(() => {
    const isAuthenticated =
      localStorage.getItem("isAdminAuthenticated") === "true"
    const adminStatus = localStorage.getItem("isAdmin") === "true"
    setIsAdmin(isAuthenticated && adminStatus)
  }, [pathname])

  const onNavigate = (url: string, requiredXP: number = 0) => {
    if (
      requiredXP === 0 ||
      (userUsage && userUsage.remainingTokens >= requiredXP)
    ) {
      router.push(url)
      return
    }
    proModal.onOpen()
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

  console.log("Routes:", routes) // Debug log
  console.log("Is Admin:", isAdmin) // Debug log

  return (
    <div className="space-y-4 flex flex-col h-full text-primary bg-secondary">
      <div className="p-3 flex-1 flex justify-center">
        <div className="space-y-2">
          {routes.map((route) => (
            <div
              onClick={() => onNavigate(route.href, route.requiredXP)}
              key={route.href}
              className={cn(
                "text-muted-foreground text-xs group flex p-3 w-full justify-start font-medium cursor-pointer hover:text-primary hover:bg-primary/10 rounded-lg transition",
                pathname === route.href && "bg-primary/10 text-primary",
                route.requiredXP > 0 &&
                  (!userUsage ||
                    userUsage.remainingTokens < route.requiredXP) &&
                  "opacity-75"
              )}
            >
              <div className="flex flex-col gap-y-2 items-center flex-1">
                <route.icon className="h-5 w-5" />
                {route.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
