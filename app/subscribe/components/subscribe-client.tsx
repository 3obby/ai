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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

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
      "Quick top-up when running low",
      "No waiting for weekly refresh",
      "Never expires"
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
      "Ideal for complex AI interactions"
    ],
    icon: Diamond,
    color: "purple",
    savePercentage: 20,
    pricePerToken: (9.99 / 500_000),
  }
}

export default function SubscribeClient({ userId }: SubscribeClientProps) {
  const [subscribeLoading, setSubscribeLoading] = useState(false)
  const [tokenLoading, setTokenLoading] = useState<Record<string, boolean>>({})
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [remainingTokens, setRemainingTokens] = useState<number>(0)
  const router = useRouter()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("subscription")
  
  // Fetch user data on component mount
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await axios.get("/api/user-progress")
        if (response.data) {
          setIsSubscribed(response.data.isSubscribed || false)
          setRemainingTokens(response.data.remainingTokens || 0)
          
          // Automatically switch to tokens tab if user is already subscribed
          if (response.data.isSubscribed) {
            setActiveTab("tokens")
          }
        }
      } catch (error) {
        console.error("Failed to fetch user data:", error)
      }
    }
    
    fetchUserData()
  }, [])

  // Apply discount for subscribers
  const getDiscountedPrice = (basePrice: number) => {
    if (isSubscribed) {
      return (basePrice * 0.8).toFixed(2) // 20% discount
    }
    return basePrice.toFixed(2)
  }

  // Handler for subscription
  const onSubscribe = async () => {
    try {
      if (!userId || userId === "") {
        return router.push("/")
      }
      setSubscribeLoading(true)

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
      setSubscribeLoading(false)
    }
  }
  
  // Handler for token purchases
  const handlePurchaseTokens = async (packageKey: string) => {
    if (!userId) {
      return router.push("/login")
    }
    
    setTokenLoading(prev => ({ ...prev, [packageKey]: true }))
    
    try {
      const selectedPackage = TOKEN_PACKAGES[packageKey as keyof typeof TOKEN_PACKAGES]
      const price = isSubscribed 
        ? selectedPackage.price * 0.8 // 20% discount for subscribers
        : selectedPackage.price
      
      const response = await axios.post("/api/stripe/token-purchase", {
        tokenAmount: selectedPackage.tokens,
        priceAmount: Math.round(price * 100), // Convert to cents
        packageType: packageKey,
        isSubscriber: isSubscribed
      })
      
      window.location.href = response.data.url
    } catch (error) {
      console.error("Token purchase error:", error)
      toast({
        description: "Something went wrong with your token purchase. Please try again.",
        variant: "destructive",
      })
    } finally {
      setTokenLoading(prev => ({ ...prev, [packageKey]: false }))
    }
  }

  return (
    <div className="container mx-auto px-4 py-10 max-w-5xl">
      <div className="text-center mb-8">
        <div className="flex justify-center items-center flex-col gap-y-4 pb-2">
          <div className="flex items-center gap-x-2 font-bold text-3xl">
            AI Companion Tokens
            <Trophy className="h-8 w-8 text-amber-500 animate-pulse" />
          </div>
          
          {isSubscribed ? (
            <div className="flex flex-col items-center gap-2">
              <p className="text-lg text-muted-foreground max-w-3xl">
                Purchase additional tokens with exclusive subscriber benefits
              </p>
              <div className="flex items-center gap-2 mt-2 bg-secondary/50 px-4 py-2 rounded-full">
                <Coins className="h-5 w-5 text-amber-500" />
                <span className="font-medium">
                  Your balance: {formatNumber(remainingTokens)} tokens
                </span>
              </div>
              <div className="bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400 px-3 py-1 rounded-full text-sm font-medium">
                Active subscriber: Enjoy 20% off all token purchases!
              </div>
            </div>
          ) : (
            <p className="text-lg text-muted-foreground max-w-3xl">
              Subscribe for weekly tokens or purchase tokens directly
            </p>
          )}
        </div>
      </div>

      <Tabs defaultValue={activeTab} value={activeTab} onValueChange={setActiveTab} className="w-full max-w-4xl mx-auto">
        <TabsList className="grid w-full grid-cols-2 mb-8">
          <TabsTrigger value="subscription" disabled={isSubscribed}>
            <Sparkles className="mr-2 h-4 w-4" />
            Weekly Subscription
          </TabsTrigger>
          <TabsTrigger value="tokens">
            <Coins className="mr-2 h-4 w-4" />
            Buy Tokens
          </TabsTrigger>
        </TabsList>
        
        {/* Subscription Tab */}
        <TabsContent value="subscription" className="space-y-4">
          <div className="max-w-3xl mx-auto">
            <div
              className="
                relative overflow-hidden
                p-8 rounded-xl transition-all
                border-2 border-blue-500/30 hover:shadow-xl
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
                    <span className="text-gray-500">/week</span>
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
                        per week (~
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
                      <h4 className="font-medium">20% Off Token Purchases</h4>
                      <p className="text-sm text-gray-500">
                        Get an exclusive 20% discount on all token packages
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <div className="rounded-full bg-green-100 dark:bg-green-900 p-1 mt-1">
                      <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <h4 className="font-medium">Premium Support</h4>
                      <p className="text-sm text-gray-500">
                        Priority customer support and early access to new features
                      </p>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={onSubscribe}
                  disabled={subscribeLoading}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                  size="lg"
                >
                  {subscribeLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 h-4 w-4" />
                  )}
                  {subscribeLoading ? "Processing..." : "Subscribe Now"}
                </Button>
                
                <p className="text-xs text-center text-muted-foreground mt-4">
                  Cancel anytime. Your subscription will continue until the end of the billing period.
                </p>
              </div>
            </div>
          </div>
        </TabsContent>
        
        {/* Token Packages Tab */}
        <TabsContent value="tokens">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Standard Token Package */}
            <div className="relative overflow-hidden p-6 rounded-xl transition-all border-2 hover:shadow-xl bg-blue-500/10 dark:bg-blue-500/20 border-blue-500/30">
              <div className="absolute -top-10 -right-10 h-20 w-20 bg-gradient-to-br from-blue-400/20 to-transparent rounded-full blur-xl" />
              
              {isSubscribed && (
                <div className="absolute top-2 left-2 bg-green-100 dark:bg-green-900/70 text-green-700 dark:text-green-400 text-xs font-bold px-2 py-1 rounded-full">
                  20% SUBSCRIBER DISCOUNT
                </div>
              )}
              
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
                    {isSubscribed && (
                      <span className="text-xl line-through text-gray-400">${TOKEN_PACKAGES.standard.price}</span>
                    )}
                    <span className="text-3xl font-bold">${getDiscountedPrice(TOKEN_PACKAGES.standard.price)}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    ${(Number(getDiscountedPrice(TOKEN_PACKAGES.standard.pricePerToken)) * 1000).toFixed(3)} per 1,000 tokens
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
                  disabled={!!tokenLoading.standard}
                >
                  {tokenLoading.standard ? (
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
              
              {isSubscribed && (
                <div className="absolute top-2 left-2 bg-green-100 dark:bg-green-900/70 text-green-700 dark:text-green-400 text-xs font-bold px-2 py-1 rounded-full">
                  20% SUBSCRIBER DISCOUNT
                </div>
              )}

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
                    {isSubscribed && (
                      <span className="text-xl line-through text-gray-400">${TOKEN_PACKAGES.premium.price}</span>
                    )}
                    <span className="text-3xl font-bold">${getDiscountedPrice(TOKEN_PACKAGES.premium.price)}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    ${(Number(getDiscountedPrice(TOKEN_PACKAGES.premium.pricePerToken)) * 1000).toFixed(3)} per 1,000 tokens
                  </div>
                  <div className="mt-2 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400 text-xs px-2 py-1 rounded-full">
                    {isSubscribed ? 'Save 36% vs standard price' : 'Save 20% vs standard price'}
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
                  disabled={!!tokenLoading.premium}
                >
                  {tokenLoading.premium ? (
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
                <span>Subscribers get {formatNumber(SUBSCRIPTION_PLAN.includeBaseTokens)} tokens per week automatically</span>
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
                <span>Subscribers receive an exclusive 20% discount on all token purchases</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="rounded-full bg-blue-100 dark:bg-blue-900 p-1 mt-0.5 flex-shrink-0">
                  <Check className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                </div>
                <span>Conversations with AI companions use approximately 2,000 tokens each</span>
              </li>
            </ul>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
