import { auth } from "@/lib/auth"
import prismadb from "@/lib/prismadb"

const DAY_IN_MS = 86_400_000

export const checkSubscription = async () => {
  try {
    const session = await auth()
    const userId = session?.userId

    if (!userId) {
      console.log("No userId found in auth")
      return false
    }

    console.log("Checking subscription for userId:", userId)

    const userSubscription = await prismadb.userSubscription.findUnique({
      where: {
        userId: userId,
      },
      select: {
        stripeSubscriptionId: true,
        stripeCurrentPeriodEnd: true,
        stripeCustomerId: true,
        stripePriceId: true,
      },
    })

    console.log(
      "User subscription data:",
      JSON.stringify(userSubscription, null, 2)
    )

    if (!userSubscription) {
      console.log("No subscription found for user")
      return false
    }

    const isValid =
      userSubscription.stripeSubscriptionId &&
      userSubscription.stripeCurrentPeriodEnd?.getTime()! + DAY_IN_MS >
        Date.now()

    console.log("Subscription validity check result:", isValid)

    return !!isValid
  } catch (error) {
    console.error("Error checking subscription:", error)
    return false
  }
}

export const getSubscriptionData = async () => {
  const session = await auth()
  const userId = session?.userId

  if (!userId) {
    return null
  }

  const userSubscription = await prismadb.userSubscription.findUnique({
    where: {
      userId: userId,
    },
    select: {
      stripeSubscriptionId: true,
      stripeCurrentPeriodEnd: true,
      stripeCustomerId: true,
      stripePriceId: true,
      price: true,
    },
  })

  if (!userSubscription) {
    return null
  }

  return userSubscription
}

export const SUBSCRIPTION_TIERS = {
  FREE: process.env.STARTER_PRICE_ID, // No price ID for free tier
  PRO: process.env.PRO_PRICE_ID,
  ENTERPRISE: process.env.ULTIMATE_PRICE_ID,
} as const

export const changeSubscription = async (newPriceId: string) => {
  try {
    const response = await fetch("/api/stripe/change-subscription", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ newPriceId }),
    })

    if (!response.ok) {
      throw new Error("Failed to change subscription")
    }

    return response.json()
  } catch (error) {
    throw error
  }
}
