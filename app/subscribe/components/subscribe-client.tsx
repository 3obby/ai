"use client"

import { Button } from "@/components/ui/button"
import {
  Check,
  Zap,
  Rocket,
  Star,
  Trophy,
  Bot,
  ThumbsUp,
  Sparkles,
  Loader2,
} from "lucide-react"
import { useRouter } from "next/navigation"
import axios from "axios"
import { useState } from "react"
import { useToast } from "@/components/ui/use-toast"
import { SUBSCRIPTION_PLAN } from "@/lib/subscription-plans"

interface SubscribeClientProps {
  userId: string
}

const AI_PERSONA_COST = 100
const VOTE_COST = 25
const XP_PER_LEVEL = 160
const XP_Submit_Features = 50

const calculateLevel = (totalSpent: number): number => {
  return Math.floor(totalSpent / XP_PER_LEVEL)
}

const options = {
  xp100: {
    name: "Starter Pack",
    xp: 100,
    price: 5,
    features: [
      "+100 XP (≈ 50 messages)",
      `Increase ${Math.floor(100 / XP_PER_LEVEL)} Level`,
      `Create ${Math.floor(
        100 / AI_PERSONA_COST
      )} AI Persona (${AI_PERSONA_COST} XP)`,
      `Send ${Math.floor(100 / VOTE_COST)} Votes (${VOTE_COST} XP)`,
      `Submit ${Math.floor(
        100 / XP_Submit_Features
      )} Features (${XP_Submit_Features} XP)`,
    ],
    icon: Zap,
    color: "blue",
    levelUp: Math.floor(100 / XP_PER_LEVEL),
    botLimit: Math.floor(100 / AI_PERSONA_COST),
    votesLimit: Math.floor(100 / VOTE_COST),
    submitLimit: Math.floor(100 / XP_Submit_Features),
  },
  xp500: {
    name: "Power Pack",
    xp: 500,
    price: 20,
    features: [
      "+500 XP (≈ 250 messages)",
      `Increase ${Math.floor(500 / XP_PER_LEVEL)} Levels`,
      `Create ${Math.floor(
        500 / AI_PERSONA_COST
      )} AI Personas (${AI_PERSONA_COST} XP)`,
      `Send ${Math.floor(500 / VOTE_COST)} Votes (${VOTE_COST} XP)`,
      `Submit ${Math.floor(
        500 / XP_Submit_Features
      )} Features (${XP_Submit_Features} XP)`,
    ],
    icon: Rocket,
    color: "purple",
    levelUp: Math.floor(500 / XP_PER_LEVEL),
    botLimit: Math.floor(500 / AI_PERSONA_COST),
    votesLimit: Math.floor(500 / VOTE_COST),
    submitLimit: Math.floor(500 / XP_Submit_Features),
  },
  xp2000: {
    name: "Ultimate Pack",
    xp: 2000,
    price: 60,
    features: [
      "+2000 XP (≈ 1000 messages)",
      `Increase ${Math.floor(2000 / XP_PER_LEVEL)} Levels`,
      `Create ${Math.floor(
        2000 / AI_PERSONA_COST
      )} AI Personas (${AI_PERSONA_COST} XP)`,
      `Send ${Math.floor(2000 / VOTE_COST)} Votes (${VOTE_COST} XP)`,
      `Submit ${Math.floor(
        2000 / XP_Submit_Features
      )} Features (${XP_Submit_Features} XP)`,
    ],
    icon: Star,
    color: "amber",
    levelUp: Math.floor(2000 / XP_PER_LEVEL),
    botLimit: Math.floor(2000 / AI_PERSONA_COST),
    votesLimit: Math.floor(2000 / VOTE_COST),
    submitLimit: Math.floor(2000 / XP_Submit_Features),
  },
}

export default function SubscribeClient({ userId }: SubscribeClientProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  // Handler for subscription
  const onSubscribe = async () => {
    try {
      if (!userId || userId === "") {
        return router.push("/")
      }
      setLoading(true)

      const plan = SUBSCRIPTION_PLAN

      const response = await axios.post("/api/stripe/subscription", {
        priceAmount: plan.weeklyPrice * 100, // Convert to cents
      })

      window.location.href = response.data.url
    } catch (error) {
      console.log(error)
      toast({
        description: "Something went wrong with the subscription",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-16 max-w-5xl">
      <style jsx>{`
        :root {
          --border-color: #e2e8f0;
          --bg-color: #ffffff;
          --text-color: #1a202c;
          --highlight-color: #3182ce;
        }

        [data-theme="dark"] {
          --border-color: #4a5568;
          --bg-color: #2d3748;
          --text-color: #e2e8f0;
          --highlight-color: #63b3ed;
        }

        .theme-container {
          background-color: var(--bg-color);
          color: var(--text-color);
        }

        .theme-border {
          border-color: var(--border-color);
        }

        .theme-highlight {
          color: var(--highlight-color);
        }
      `}</style>

      <div className="theme-container text-center mb-12">
        <div className="flex justify-center items-center flex-col gap-y-4 pb-2">
          <div className="flex items-center gap-x-2 font-bold text-2xl">
            Subscribe to Premium
            <Trophy className="h-8 w-8 theme-highlight animate-pulse" />
          </div>
          <p className="text-lg text-muted-foreground max-w-3xl">
            Get unlimited AI companions and{" "}
            {SUBSCRIPTION_PLAN.tokensPerMonth.toLocaleString()} tokens per month
          </p>
        </div>
      </div>

      {/* Subscription Plan */}
      <div className="max-w-3xl mx-auto">
        <div
          className="
            relative overflow-hidden
            p-8 rounded-xl transition-all
            border-2 theme-border hover:shadow-xl
            bg-blue-500/10 dark:bg-blue-500/20 
          "
        >
          {/* Sparkle effects */}
          <div className="absolute -top-10 -right-10 h-20 w-20 bg-gradient-to-br from-white/20 to-transparent rounded-full blur-xl transform group-hover:scale-150 transition-transform" />

          <div className="relative">
            {/* Header */}
            <div className="flex flex-col items-center mb-6">
              <h3 className="text-2xl font-bold">{SUBSCRIPTION_PLAN.name}</h3>
              <p className="text-gray-500 text-sm mb-3">
                {SUBSCRIPTION_PLAN.description}
              </p>
              <div className="flex items-baseline gap-x-2">
                <span className="text-4xl font-bold">
                  ${SUBSCRIPTION_PLAN.weeklyPrice}
                </span>
                <span className="text-gray-500">/month</span>
              </div>
            </div>

            {/* Feature List */}
            <div className="space-y-4 my-6">
              <div className="flex items-start gap-2">
                <div className="rounded-full bg-green-100 dark:bg-green-900 p-1 mt-1">
                  <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h4 className="font-medium">Weekly Token Allowance</h4>
                  <p className="text-sm text-gray-500">
                    {SUBSCRIPTION_PLAN.tokensPerMonth.toLocaleString()} tokens
                    per month (~
                    {Math.floor(SUBSCRIPTION_PLAN.tokensPerMonth / 2000)}{" "}
                    conversations)
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <div className="rounded-full bg-green-100 dark:bg-green-900 p-1 mt-1">
                  <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h4 className="font-medium">
                    Create Unlimited AI Companions
                  </h4>
                  <p className="text-sm text-gray-500">
                    Customize and create as many AI companions as you want
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <div className="rounded-full bg-green-100 dark:bg-green-900 p-1 mt-1">
                  <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h4 className="font-medium">Premium Features</h4>
                  <p className="text-sm text-gray-500">
                    Access all premium features including group chats and more
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <div className="rounded-full bg-green-100 dark:bg-green-900 p-1 mt-1">
                  <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h4 className="font-medium">Priority Support</h4>
                  <p className="text-sm text-gray-500">
                    Get prioritized assistance and feature requests
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <div className="rounded-full bg-green-100 dark:bg-green-900 p-1 mt-1">
                  <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h4 className="font-medium">No Interruptions</h4>
                  <p className="text-sm text-gray-500">
                    Enjoy seamless conversations without token limits
                  </p>
                </div>
              </div>
            </div>

            <Button
              onClick={onSubscribe}
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-400 hover:from-blue-700 hover:to-blue-500 text-white py-6 rounded-lg text-lg font-semibold transition"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  Subscribe Now
                  <Sparkles className="h-5 w-5 ml-2" />
                </>
              )}
            </Button>
            <p className="text-xs text-center mt-4 text-gray-500">
              Secure payment processing by Stripe. Cancel anytime.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
