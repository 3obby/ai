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
    <div className="fixed w-full z-50 flex items-center py-2 px-2 sm:px-4 h-16 border-b border-primary/10 bg-secondary">
      <div className="flex items-center w-auto md:w-64 flex-shrink-0">
        <MobileSidebar isPro={isPro} />
        <Link href="/">
          <h1
            className={cn(
              "hidden md:block text-xl md:text-3xl font-bold text-primary truncate",
              font.className
            )}
          >
            GroupChatBotBuilder
          </h1>
        </Link>
      </div>
      <div className="flex items-center justify-end flex-1 space-x-2 sm:space-x-3 md:space-x-4">
        <div className="flex-shrink-0 max-w-[300px] min-w-[100px]">
          <ChatLimit userId={userId} />
        </div>
        {!isPro && (
          <Link href="/subscribe" className="hidden sm:block flex-shrink-0">
            <Button size="sm" variant="premium" className="whitespace-nowrap">
              Upgrade
              <Sparkles className="h-4 w-4 fill-white text-white ml-2" />
            </Button>
          </Link>
        )}
        <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
          <Button
            onClick={settingsModal.onOpen}
            size="icon"
            variant="ghost"
            className="h-8 w-8 sm:h-9 sm:w-9"
          >
            <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
          <UserButton />
        </div>
      </div>
      <SettingsModal isPro={isPro} />
    </div>
  )
}
