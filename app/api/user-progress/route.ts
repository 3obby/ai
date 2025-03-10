import { auth } from "@/lib/auth-helpers";
import prismadb from "@/lib/prismadb"
import { NextResponse } from "next/server"
import {
  calculateLevel,
  getXPForNextLevel,
  getProgressToNextLevel,
} from "@/lib/level-system"
import { SUBSCRIPTION_PLAN } from "@/lib/subscription-plans"

// Force dynamic rendering for API routes
export const dynamic = "force-dynamic";

// Non-subscribed users get this many free tokens
const FREE_TOKEN_ALLOWANCE = 10000
const DAY_IN_MS = 86_400_000

export async function GET(req: Request) {
  try {
    const session = await auth()
    const userId = session?.userId

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    // Get both user usage and subscription data
    const [userUsage, userSubscription] = await Promise.all([
      prismadb.userUsage.findUnique({
        where: { userId },
      }),
      prismadb.userSubscription.findUnique({
        where: { userId },
        select: {
          stripeSubscriptionId: true,
          stripeCurrentPeriodEnd: true,
          stripeCustomerId: true,
          stripePriceId: true,
        },
      }),
    ])

    // If user doesn't have a usage record yet, create one with initial tokens
    if (!userUsage) {
      console.log("Creating new user usage record for:", userId)
      try {
        // For this quick fix, we'll use a temporary email since we can't easily get it
        const tempEmail = `${userId}@tempmail.com`

        // Create new user usage record with initial tokens
        const newUserUsage = await prismadb.userUsage.create({
          data: {
            userId,
            email: tempEmail,
            availableTokens: FREE_TOKEN_ALLOWANCE, // Give free tokens to start
            totalSpent: 0,
            totalMoneySpent: 0,
          },
        })

        console.log("Created new user usage record:", newUserUsage)

        // Return initial data
        return NextResponse.json({
          burnedTokens: 0,
          level: 0,
          nextLevelTokens: getXPForNextLevel(0),
          progressToNextLevel: 0,
          usedTokens: 0,
          remainingTokens: FREE_TOKEN_ALLOWANCE,
          baseTokenAllocation: FREE_TOKEN_ALLOWANCE,
          isSubscribed: false,
          totalMoneySpent: 0,
        })
      } catch (error) {
        console.error("Error creating user usage record:", error)
        return new NextResponse("Failed to create user record", { status: 500 })
      }
    }

    // Only log in development mode and in a simplified format
    if (process.env.NODE_ENV === "development" && Math.random() < 0.1) {
      console.log(
        "[USER_PROGRESS] Tokens available:",
        userUsage.availableTokens
      )
    }

    // Use totalSpent as the tokens burned value
    const currentTokensBurned = userUsage.totalSpent || 0
    const currentLevel = calculateLevel(currentTokensBurned)
    const nextLevelTokens = getXPForNextLevel(currentLevel)
    const progressToNextLevel = getProgressToNextLevel(currentTokensBurned)

    // Check subscription status
    const isSubscribed =
      userSubscription?.stripePriceId &&
      userSubscription.stripeCurrentPeriodEnd?.getTime()! + DAY_IN_MS >
        Date.now()

    // Calculate token allocation based on subscription status
    const baseTokens = isSubscribed
      ? SUBSCRIPTION_PLAN.includeBaseTokens
      : FREE_TOKEN_ALLOWANCE

    // For now, just use the availableTokens as the actual available tokens
    const remainingTokens = userUsage.availableTokens || 0

    // Calculate used tokens as baseTokens - availableTokens, but ensure it's not negative
    const usedTokens = Math.max(0, baseTokens - remainingTokens)

    return NextResponse.json({
      burnedTokens: currentTokensBurned,
      level: currentLevel,
      nextLevelTokens: nextLevelTokens,
      progressToNextLevel: progressToNextLevel,
      usedTokens: usedTokens,
      remainingTokens: remainingTokens,
      baseTokenAllocation: baseTokens,
      isSubscribed: !!isSubscribed,
      totalMoneySpent: userUsage.totalMoneySpent || 0,
    })
  } catch (error) {
    console.log("[USER_PROGRESS_ERROR]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
