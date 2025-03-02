"use client"

import { useEffect, useState } from "react"
import axios from "axios"
import {
  Sparkles,
  Zap,
  Bot,
  MessageSquare,
  Check,
  Rocket,
  ScrollText,
  Infinity,
  Shield,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useProModal } from "@/hooks/use-pro-modal"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/components/ui/use-toast"
import { SUBSCRIPTION_PLAN } from "@/lib/subscription-plans"
import { useRouter } from "next/navigation"

export const ProModal = () => {
  const proModal = useProModal()
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const [availableTokens, setAvailableTokens] = useState(0)
  const router = useRouter()

  useEffect(() => {
    const fetchUserProgress = async () => {
      try {
        const response = await fetch("/api/user-progress")
        const data = await response.json()
        setAvailableTokens(data.remainingTokens || 0)
      } catch (error) {
        console.error("Error fetching user progress:", error)
      }
    }
    fetchUserProgress()
  }, [])

  const onSubscribe = async () => {
    try {
      setLoading(true)
      router.push("/subscribe")
      proModal.onClose()
    } catch (error) {
      toast({
        description: "Something went wrong",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={proModal.isOpen} onOpenChange={proModal.onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex justify-center items-center flex-col gap-y-4 pb-2">
            <div className="flex items-center gap-x-2 font-bold text-xl">
              You&apos;re out of Tokens!
              <Zap className="h-6 w-6 text-amber-500" />
            </div>
          </DialogTitle>
          <DialogDescription className="text-center pt-2 space-y-2 font-medium text-zinc-900 dark:text-zinc-100">
            Subscribe to continue chatting with your AI companions.
          </DialogDescription>
        </DialogHeader>
        <Separator />

        <div className="p-4">
          <div className="rounded-lg border-2 border-blue-500 bg-blue-500/10 dark:bg-blue-500/20 p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold">{SUBSCRIPTION_PLAN.name}</h3>
              <div className="px-3 py-1 rounded-full bg-blue-500 text-white text-sm font-medium">
                ${SUBSCRIPTION_PLAN.monthlyPrice}/month
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              {SUBSCRIPTION_PLAN.description}
            </p>

            <div className="space-y-3 mt-4">
              <div className="flex items-start gap-x-2">
                <Check className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Monthly Token Allowance</p>
                  <p className="text-sm text-muted-foreground">
                    {SUBSCRIPTION_PLAN.tokensPerMonth.toLocaleString()} tokens
                    per month (~
                    {Math.floor(SUBSCRIPTION_PLAN.tokensPerMonth / 2000)}{" "}
                    conversations)
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-x-2">
                <Check className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Create Unlimited AI Companions</p>
                  <p className="text-sm text-muted-foreground">
                    Customize and create as many AI personas as you want
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-x-2">
                <Check className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Advanced AI Features</p>
                  <p className="text-sm text-muted-foreground">
                    Access to all current and upcoming premium features
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-x-2">
                <Check className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Priority Support</p>
                  <p className="text-sm text-muted-foreground">
                    Get prioritized assistance and feature requests
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="pt-4">
          <Button
            onClick={onSubscribe}
            disabled={loading}
            size="lg"
            variant="premium"
            className="w-full"
          >
            {loading ? "Loading..." : "Subscribe Now"}
            <Sparkles className="h-4 w-4 ml-2" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
