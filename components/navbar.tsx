"use client"

import Link from "next/link"
import { Poppins } from "next/font/google"
import { Settings, Menu, Coins, Sparkles } from "lucide-react"

import { cn } from "@/lib/utils"
import { MobileSidebar } from "@/components/mobile-sidebar"
import { Button } from "@/components/ui/button"
import { useProModal } from "@/hooks/use-pro-modal"
import { useSettingsModal } from "@/hooks/use-settings-modal"
import { SettingsModal } from "@/components/settings-modal"
import { UserButton } from "@/components/user-button"
import { useEffect, useState } from "react"
import { formatLargeNumber } from "@/lib/format"

const font = Poppins({ weight: "600", subsets: ["latin"] })

interface NavbarProps {
  isPro: boolean
  userId?: string
  stripePriceId?: string
}

export const Navbar = ({ isPro, userId }: NavbarProps) => {
  const proModal = useProModal()
  const settingsModal = useSettingsModal()
  const [tokenBalance, setTokenBalance] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Fetch token balance
  useEffect(() => {
    const fetchTokenBalance = async () => {
      setIsLoading(true)
      try {
        // For anonymous users, still make the request but handle errors gracefully
        const response = await fetch(`/api/user-progress${userId ? `?userId=${userId}` : ''}`)
        
        if (response.ok) {
          const data = await response.json()
          setTokenBalance(data.remainingTokens || 0)
        } else {
          console.warn("Unable to fetch token balance, using default values")
          setTokenBalance(0)
        }
      } catch (error) {
        console.error("Failed to fetch token balance:", error)
        setTokenBalance(0)
      } finally {
        setIsLoading(false)
      }
    }

    fetchTokenBalance()
    
    // Update every 30 seconds
    const intervalId = setInterval(fetchTokenBalance, 30000)
    
    return () => clearInterval(intervalId)
  }, [userId])

  return (
    <div className="fixed top-0 right-0 md:left-20 left-0 z-40 border-b border-primary/10 bg-secondary h-16 overflow-hidden">
      <div className="h-full w-full flex items-center px-2 md:px-4">
        {/* Left section - Mobile menu and user controls */}
        <div className="flex items-center">
          <div className="md:hidden mr-2">
            <MobileSidebar isPro={isPro} userId={userId} />
          </div>
          
          <div className="mr-2">
            <Button
              onClick={settingsModal.onOpen}
              size="icon"
              variant="ghost"
              className="h-8 w-8 rounded-full flex items-center justify-center"
            >
              <Settings className="h-[18px] w-[18px]" />
            </Button>
          </div>
          
          <div>
            <UserButton />
          </div>
        </div>
        
        {/* Middle section - Brand name */}
        <div className="flex-grow flex justify-center">
          <Link href="/" className="hidden sm:flex items-center">
            <span className={cn(
              "text-lg font-bold",
              font.className
            )}>
              GCBB
            </span>
          </Link>
        </div>
        
        {/* Right section - Tokens and upgrade button */}
        <div className="flex items-center h-full bg-gradient-to-r from-transparent to-orange-500/30 pl-4 pr-2 absolute right-0">
          {/* Token balance */}
          <div className="flex items-center mr-2">
            {isLoading ? (
              <div className="h-3 w-10 bg-white/20 animate-pulse rounded-sm"></div>
            ) : (
              <div className="flex items-center">
                <Coins className="h-3 w-3 text-muted-foreground mr-1" />
                <span className="text-xs font-medium text-muted-foreground">
                  {tokenBalance !== null ? formatLargeNumber(tokenBalance) : '0'}
                </span>
              </div>
            )}
          </div>
          
          {/* Upgrade/Buy button */}
          <Link href="/subscribe">
            <Button 
              size="sm" 
              variant={isPro ? "outline" : "purple"}
              className="h-7 px-2 py-0 text-xs whitespace-nowrap"
            >
              {isPro ? (
                <>
                  <span className="hidden xs:inline mr-1">Buy</span>
                  <Coins className="h-3 w-3" />
                </>
              ) : (
                <>
                  <span className="text-xs">Upgrade</span>
                  <Sparkles className="h-3 w-3 ml-1" />
                </>
              )}
            </Button>
          </Link>
        </div>
      </div>
      
      <SettingsModal isPro={isPro} />
    </div>
  )
}

