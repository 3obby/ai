"use client"

import Link from "next/link"
import { Poppins } from "next/font/google"
import { Settings, Menu } from "lucide-react"

import { cn } from "@/lib/utils"
import { MobileSidebar } from "@/components/mobile-sidebar"
import { Button } from "@/components/ui/button"
import { useProModal } from "@/hooks/use-pro-modal"
import { useSettingsModal } from "@/hooks/use-settings-modal"
import { SettingsModal } from "@/components/settings-modal"
import { UserButton } from "@/components/user-button"
import { IntegratedLogo } from "@/components/integrated-logo"
import { useEffect, useState } from "react"

const font = Poppins({ weight: "600", subsets: ["latin"] })

interface NavbarProps {
  isPro: boolean
  userId: string
  stripePriceId?: string
}

export const Navbar = ({ isPro, userId }: NavbarProps) => {
  const proModal = useProModal()
  const settingsModal = useSettingsModal()
  const [isMobile, setIsMobile] = useState(false)

  // Detect mobile screens
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    
    return () => {
      window.removeEventListener('resize', checkMobile)
    }
  }, [])

  return (
    <div className="fixed top-0 right-0 md:left-20 left-0 z-40 border-b border-primary/10 bg-secondary h-16 sm:h-16 md:h-16 overflow-hidden">
      <div className="h-full px-2 md:pl-4 flex items-center justify-between">
        {/* Left side */}
        <div className="flex items-center">
          {/* Mobile sidebar hamburger menu */}
          <div className="md:hidden flex items-center justify-center mr-2">
            <MobileSidebar isPro={isPro} userId={userId} />
          </div>
          
          {/* Settings button */}
          <Button
            onClick={settingsModal.onOpen}
            size="icon"
            variant="ghost"
            className="h-8 w-8 rounded-full flex items-center justify-center"
          >
            <Settings className="h-[18px] w-[18px]" />
          </Button>
          
          {/* User profile button */}
          <div className="ml-1">
            <UserButton />
          </div>
        </div>
        
        {/* Right side with logo and upgrade button */}
        <div className="flex h-full items-center">
          <IntegratedLogo 
            userId={userId} 
            isPro={isPro} 
            isMobile={isMobile}
          />
        </div>
      </div>
      
      <SettingsModal isPro={isPro} />
    </div>
  )
}

