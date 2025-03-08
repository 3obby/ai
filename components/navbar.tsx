"use client"

import Link from "next/link"
import { Poppins } from "next/font/google"
import { Sparkles, Settings } from "lucide-react"

import { cn } from "@/lib/utils"
import { MobileSidebar } from "@/components/mobile-sidebar"
import { Button } from "@/components/ui/button"
import { useProModal } from "@/hooks/use-pro-modal"
import { useSettingsModal } from "@/hooks/use-settings-modal"
import { ChatLimit } from "@/components/chat-limit"
import { SettingsModal } from "@/components/settings-modal"
import { UserButton } from "@/components/user-button"

const font = Poppins({ weight: "600", subsets: ["latin"] })

interface NavbarProps {
  isPro: boolean
  userId: string
  stripePriceId?: string
}

export const Navbar = ({ isPro, userId }: NavbarProps) => {
  const proModal = useProModal()
  const settingsModal = useSettingsModal()

  return (
    <div className="fixed top-0 w-full md:w-[calc(100%-4rem)] md:right-0 z-50 border-b border-primary/10 bg-secondary h-16">
      <div className="h-full px-4 flex items-center">
        {/* Left side - Mobile only */}
        <div className="flex items-center md:hidden">
          <MobileSidebar isPro={isPro} />
          <Link href="/">
            <h1
              className={cn(
                "text-lg font-bold text-primary ml-2",
                font.className
              )}
            >
              GChat
            </h1>
          </Link>
        </div>
        
        {/* Spacer - pushes right side to edge */}
        <div className="flex-grow"></div>
        
        {/* Right side - User profile and controls */}
        <div className="flex items-center space-x-2 md:space-x-4">
          <ChatLimit userId={userId} className="hidden lg:flex" />
          
          {!isPro && (
            <Link href="/subscribe" className="hidden md:block">
              <Button 
                size="sm" 
                variant="premium" 
                className="h-8 px-3 text-xs whitespace-nowrap"
              >
                Upgrade
                <Sparkles className="h-3 w-3 fill-white text-white ml-1" />
              </Button>
            </Link>
          )}
          
          <Button
            onClick={settingsModal.onOpen}
            size="icon"
            variant="ghost"
            className="h-8 w-8 rounded-full"
          >
            <Settings className="h-4 w-4" />
          </Button>
          
          <div className="pl-1">
            <UserButton />
          </div>
        </div>
      </div>
      
      <SettingsModal isPro={isPro} />
    </div>
  )
}
