"use client"

import Link from "next/link"
import { UserButton } from "@clerk/nextjs"
import { Poppins } from "next/font/google"
import { Sparkles, Settings } from "lucide-react"
import { useState, useEffect } from "react"
import { changeSubscription, SUBSCRIPTION_TIERS } from "@/lib/subscription"

import { cn } from "@/lib/utils"
import { MobileSidebar } from "@/components/mobile-sidebar"
import { ModeToggle } from "@/components/mode-toggle"
import { Button } from "@/components/ui/button"
import { useProModal } from "@/hooks/use-pro-modal"
import { useSettingsModal } from "@/hooks/use-settings-modal"
import { ChatLimit } from "@/components/chat-limit"
import { ChangePlanModal } from "@/components/change-plan-modal"
import { SettingsModal } from "@/components/settings-modal"

const font = Poppins({ weight: "600", subsets: ["latin"] })

interface NavbarProps {
  isPro: boolean
  userId: string
  stripePriceId?: string
}

export const Navbar = ({ isPro, userId, stripePriceId }: NavbarProps) => {
  const proModal = useProModal()
  const settingsModal = useSettingsModal()
  const [loading, setLoading] = useState(false)
  const [showChangePlan, setShowChangePlan] = useState(false)
  const [currentPlan, setCurrentPlan] = useState<
    "starter" | "pro" | "ultimate"
  >("starter")

  useEffect(() => {
    if (stripePriceId === process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID) {
      setCurrentPlan("starter")
    } else if (stripePriceId === process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID) {
      setCurrentPlan("pro")
    } else if (
      stripePriceId === process.env.NEXT_PUBLIC_STRIPE_ULTIMATE_PRICE_ID
    ) {
      setCurrentPlan("ultimate")
    }
  }, [stripePriceId])

  // const onChangeSubscription = async () => {
  //   try {
  //     setLoading(true);
  //     const newPriceId = isPro
  //       ? SUBSCRIPTION_TIERS.FREE
  //       : SUBSCRIPTION_TIERS.PRO;

  //     if (newPriceId) {
  //       await changeSubscription(newPriceId);
  //       window.location.reload();
  //     }
  //   } catch (error) {
  //     console.error("Subscription change error:", error);
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  return (
    <div className="fixed w-full z-50 flex justify-between items-center py-2 px-4 h-16 border-b border-primary/10 bg-secondary">
      <div className="flex items-center">
        <MobileSidebar isPro={isPro} />
        <Link href="/">
          <h1
            className={cn(
              "hidden md:block text-xl md:text-3xl font-bold text-primary",
              font.className
            )}
          >
            personna.ai
          </h1>
        </Link>
      </div>
      <div className="flex items-center gap-x-3">
        <ChatLimit userId={userId} />
        {/* {!isPro ? ( */}
        <Button onClick={proModal.onOpen} size="sm" variant="premium">
          Buy XP
          <Sparkles className="h-4 w-4 fill-white text-white ml-2" />
        </Button>
        {/* ) : (
          <>
            <Button 
              onClick={() => setShowChangePlan(true)} 
              size="sm" 
              variant="premium"
            >
              Change Plan
              <Sparkles className="h-4 w-4 fill-white text-white ml-2" />
            </Button>
            <ChangePlanModal 
              isOpen={showChangePlan}
              onClose={() => setShowChangePlan(false)}
              currentPlan={currentPlan}
            />
          </>
        )} */}
        <Button
          onClick={settingsModal.onOpen}
          size="icon"
          variant="ghost"
          className="h-9 w-9"
        >
          <Settings className="h-5 w-5" />
        </Button>
        <ModeToggle />
        <UserButton afterSignOutUrl="/" />
      </div>
      <SettingsModal />
    </div>
  )
}
