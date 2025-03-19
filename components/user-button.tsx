"use client"

import { useCurrentUser } from "@/lib/hooks/use-current-user"
import { UserAvatar } from "@/components/user-avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { LogOut, User, Mail } from "lucide-react"
import { useRouter } from "next/navigation"
import { signOut } from "next-auth/react"
import { useMemo } from "react"

export const UserButton = () => {
  const { user } = useCurrentUser()
  const router = useRouter()

  const displayName = useMemo(() => {
    if (!user) return "User";
    
    if (user.email && user.email.includes('@')) {
      return user.email.split('@')[0];
    }
    
    return user.name?.split(' ')[0] || "User";
  }, [user]);

  const handleLogout = async () => {
    await signOut({ redirect: false })
    router.push("/login")
  }

  return (
    <div className="flex items-center">
      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center focus:outline-none" asChild>
          <button className="flex items-center gap-x-2 h-8 rounded-full">
            <span className="hidden md:inline-block text-sm font-medium">
              {displayName}
            </span>
            <UserAvatar 
              src={user?.image || undefined} 
              className="h-8 w-8"
            />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>Account Info</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          <div className="px-2 py-1.5 flex flex-col space-y-1">
            <div className="flex items-center">
              <User className="mr-2 h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{displayName}</span>
            </div>
            <div className="flex items-start">
              <Mail className="mr-2 h-4 w-4 text-muted-foreground mt-0.5" />
              <span className="text-xs text-muted-foreground break-all">
                {user?.email}
              </span>
            </div>
          </div>
          
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => router.push("/account")}>
            <User className="mr-2 h-4 w-4" />
            <span>My Account</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>Log out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
