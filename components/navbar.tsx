"use client"

import Link from "next/link"
import { Poppins } from "next/font/google"
import { Settings } from "lucide-react"

import { cn } from "@/lib/utils"
import { MobileSidebar } from "@/components/mobile-sidebar"
import { Button } from "@/components/ui/button"
import { useProModal } from "@/hooks/use-pro-modal"
import { useSettingsModal } from "@/hooks/use-settings-modal"
import { SettingsModal } from "@/components/settings-modal"
import { UserButton } from "@/components/user-button"
import { IntegratedLogo } from "@/components/integrated-logo"

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
    <div className="fixed top-0 right-0 md:left-20 left-0 z-40 border-b border-primary/10 bg-secondary h-16 sm:h-16 md:h-16">
      <div className="h-full pl-4 flex items-center justify-between">
        {/* Left side - now contains user controls */}
        <div className="flex items-center">
          <div className="md:hidden mr-3 flex items-center justify-center">
            <MobileSidebar isPro={isPro} userId={userId} />
          </div>
          
          {/* User avatar and settings moved to left */}
          <div className="flex items-center space-x-2">
            <Button
              onClick={settingsModal.onOpen}
              size="icon"
              variant="ghost"
              className="h-9 w-9 rounded-full flex items-center justify-center"
            >
              <Settings className="h-5 w-5" />
            </Button>
            
            <div>
              <UserButton />
            </div>
          </div>
        </div>
        
        {/* Right side - logo with no padding on right */}
        <div className="flex items-center h-full">
          <IntegratedLogo userId={userId} isPro={isPro} />
        </div>
      </div>
      
      <SettingsModal isPro={isPro} />
    </div>
  )
}

