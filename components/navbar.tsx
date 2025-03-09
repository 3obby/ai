"use client"

import Link from "next/link"
import { Poppins } from "next/font/google"
import { Sparkles, Settings, Coins } from "lucide-react"

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
      <div className="h-full px-4 flex items-center justify-between">
        {/* Left side - now contains user controls */}
        <div className="flex items-center">
          <div className="md:hidden mr-2 flex items-center justify-center">
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
          
          {/* Buy tokens button */}
          <div className="hidden md:block ml-3">
            <Link href="/subscribe">
              <Button 
                size="sm" 
                variant={isPro ? "outline" : "premium"}
                className="h-8 px-3 text-xs whitespace-nowrap"
              >
                {isPro ? (
                  <>
                    <Coins className="h-3 w-3 text-amber-500 mr-1" />
                    Buy Tokens
                  </>
                ) : (
                  <>
                    Upgrade
                    <Sparkles className="h-3 w-3 fill-white text-white ml-1" />
                  </>
                )}
              </Button>
            </Link>
          </div>
        </div>
        
        {/* Right side - now contains the logo */}
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <IntegratedLogo userId={userId} />
          </div>
        </div>
      </div>
      
      <SettingsModal isPro={isPro} />
    </div>
  )
}

