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
  Coins,
  Diamond,
  Flame,
} from "lucide-react"
import { useRouter } from "next/navigation"
import axios from "axios"
import { useState, useEffect } from "react"
import { useToast } from "@/components/ui/use-toast"
import { SUBSCRIPTION_PLAN } from "@/lib/subscription-plans"
import { cn } from "@/lib/utils"

// Helper function to format numbers with commas
const formatNumber = (num: number): string => {
  return num.toLocaleString();
}

// Token package options
const TOKEN_PACKAGES = {
  standard: {
    name: "Standard Tokens",
    tokens: 200_000,
    price: 4.99,
    valueText: "Basic Value",
    description: "Perfect for casual conversations",
    features: [
      "200,000 tokens (≈ 100 conversations)",
      "Same price as your subscription",
      "Quick top-up when running low",
      "No waiting for weekly refresh",
    ],
    icon: Coins,
    color: "blue",
    savePercentage: 0,
    pricePerToken: (4.99 / 200_000),
  },
  premium: {
    name: "Premium Tokens",
    tokens: 500_000,
    price: 9.99,
    valueText: "Best Value! 20% More Tokens",
    description: "For power users who need more tokens",
    features: [
      "500,000 tokens (≈ 250 conversations)",
      "20% more value than standard",
      "Perfect for heavy usage",
      "Ideal for complex AI interactions",
    ],
    icon: Diamond,
    color: "purple",
    savePercentage: 20,
    pricePerToken: (9.99 / 500_000),
  }
}

interface TokenShopClientProps {
  userId: string
}

export default function TokenShopClient({ userId }: TokenShopClientProps) {
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [remainingTokens, setRemainingTokens] = useState<number>(0)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    const fetchUserProgress = async () => {
      try {
        const response = await axios.get("/api/user-progress")
        if (response.data) {
          setRemainingTokens(response.data.remainingTokens || 0)
        }
      } catch (error) {
        console.error("Failed to fetch user progress:", error)
      }
    }
    
    fetchUserProgress()
  }, [])

  const handlePurchaseTokens = async (packageKey: string) => {
    if (!userId) {
      return router.push("/login")
    }
    
    setLoading(prev => ({ ...prev, [packageKey]: true }))
    
    try {
      const selectedPackage = TOKEN_PACKAGES[packageKey as keyof typeof TOKEN_PACKAGES]
      
      const response = await axios.post("/api/stripe/token-purchase", {
        tokenAmount: selectedPackage.tokens,
        priceAmount: Math.round(selectedPackage.price * 100), // Convert to cents
        packageType: packageKey
      })
      
      window.location.href = response.data.url
    } catch (error) {
      console.error("Token purchase error:", error)
      toast({
        description: "Something went wrong with your token purchase. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(prev => ({ ...prev, [packageKey]: false }))
    }
  }

  return (
    <div className="container mx-auto px-4 py-16 max-w-5xl">
      <div className="text-center mb-12">
        <div className="flex justify-center items-center flex-col gap-y-4 pb-2">
          <div className="flex items-center gap-x-2 font-bold text-2xl">
            Token Shop
            <Flame className="h-8 w-8 text-orange-500 animate-pulse" />
          </div>
          <p className="text-lg text-muted-foreground max-w-3xl">
            Purchase additional tokens to fuel your AI conversations
          </p>
          <div className="flex items-center gap-2 mt-2 bg-secondary/50 px-4 py-2 rounded-full">
            <Coins className="h-5 w-5 text-amber-500" />
            <span className="font-medium">
              Your balance: {formatNumber(remainingTokens)} tokens
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {/* Standard Token Package */}
        <div className="relative overflow-hidden p-6 rounded-xl transition-all border-2 hover:shadow-xl bg-blue-500/10 dark:bg-blue-500/20">
          <div className="absolute -top-10 -right-10 h-20 w-20 bg-gradient-to-br from-blue-400/20 to-transparent rounded-full blur-xl" />
          
          <div className="relative">
            <div className="flex flex-col items-center mb-4">
              <div className="rounded-full bg-blue-100 dark:bg-blue-900 p-3 mb-4">
                <Coins className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-xl font-bold">{TOKEN_PACKAGES.standard.name}</h3>
              <p className="text-sm text-muted-foreground mb-2">
                {TOKEN_PACKAGES.standard.description}
              </p>
              <div className="flex items-baseline gap-x-2">
                <span className="text-3xl font-bold">${TOKEN_PACKAGES.standard.price}</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                ${(TOKEN_PACKAGES.standard.pricePerToken * 1000).toFixed(3)} per 1,000 tokens
              </div>
            </div>

            <div className="space-y-3 my-6">
              {TOKEN_PACKAGES.standard.features.map((feature, index) => (
                <div key={index} className="flex items-start gap-2">
                  <div className="rounded-full bg-green-100 dark:bg-green-900 p-1 mt-0.5">
                    <Check className="h-3 w-3 text-green-600 dark:text-green-400" />
                  </div>
                  <span className="text-sm">{feature}</span>
                </div>
              ))}
            </div>

            <Button 
              onClick={() => handlePurchaseTokens('standard')}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white" 
              disabled={loading.standard}
            >
              {loading.standard ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  Purchase Tokens
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Premium Token Package */}
        <div className="relative overflow-hidden p-6 rounded-xl transition-all border-2 hover:shadow-xl bg-purple-500/10 dark:bg-purple-500/20 border-purple-500/50">
          <div className="absolute -top-10 -right-10 h-20 w-20 bg-gradient-to-br from-purple-400/20 to-transparent rounded-full blur-xl" />
          
          {/* Best value tag */}
          <div className="absolute top-2 right-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full">
            BEST VALUE
          </div>

          <div className="relative">
            <div className="flex flex-col items-center mb-4">
              <div className="rounded-full bg-purple-100 dark:bg-purple-900 p-3 mb-4">
                <Diamond className="h-8 w-8 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-xl font-bold">{TOKEN_PACKAGES.premium.name}</h3>
              <p className="text-sm text-muted-foreground mb-2">
                {TOKEN_PACKAGES.premium.description}
              </p>
              <div className="flex items-baseline gap-x-2">
                <span className="text-3xl font-bold">${TOKEN_PACKAGES.premium.price}</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                ${(TOKEN_PACKAGES.premium.pricePerToken * 1000).toFixed(3)} per 1,000 tokens
              </div>
              <div className="mt-2 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400 text-xs px-2 py-1 rounded-full">
                Save {TOKEN_PACKAGES.premium.savePercentage}% vs standard package
              </div>
            </div>

            <div className="space-y-3 my-6">
              {TOKEN_PACKAGES.premium.features.map((feature, index) => (
                <div key={index} className="flex items-start gap-2">
                  <div className="rounded-full bg-green-100 dark:bg-green-900 p-1 mt-0.5">
                    <Check className="h-3 w-3 text-green-600 dark:text-green-400" />
                  </div>
                  <span className="text-sm">{feature}</span>
                </div>
              ))}
            </div>

            <Button 
              onClick={() => handlePurchaseTokens('premium')}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white"
              disabled={loading.premium}
            >
              {loading.premium ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Get Premium Tokens
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto mt-12 bg-secondary/30 p-6 rounded-lg">
        <h3 className="text-lg font-medium mb-4">How Tokens Work</h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <div className="rounded-full bg-blue-100 dark:bg-blue-900 p-1 mt-0.5 flex-shrink-0">
              <Check className="h-3 w-3 text-blue-600 dark:text-blue-400" />
            </div>
            <span>Your subscription includes {formatNumber(SUBSCRIPTION_PLAN.includeBaseTokens)} tokens per week</span>
          </li>
          <li className="flex items-start gap-2">
            <div className="rounded-full bg-blue-100 dark:bg-blue-900 p-1 mt-0.5 flex-shrink-0">
              <Check className="h-3 w-3 text-blue-600 dark:text-blue-400" />
            </div>
            <span>Token top-ups are added to your balance immediately and never expire</span>
          </li>
          <li className="flex items-start gap-2">
            <div className="rounded-full bg-blue-100 dark:bg-blue-900 p-1 mt-0.5 flex-shrink-0">
              <Check className="h-3 w-3 text-blue-600 dark:text-blue-400" />
            </div>
            <span>Conversations with AI companions use approximately 2,000 tokens each</span>
          </li>
          <li className="flex items-start gap-2">
            <div className="rounded-full bg-blue-100 dark:bg-blue-900 p-1 mt-0.5 flex-shrink-0">
              <Check className="h-3 w-3 text-blue-600 dark:text-blue-400" />
            </div>
            <span>You'll still receive your weekly token refill with your subscription</span>
          </li>
        </ul>
      </div>
    </div>
  )
} 