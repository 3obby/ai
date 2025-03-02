import { auth } from "@clerk/nextjs"
import prismadb from "@/lib/prismadb"
import { NextResponse } from "next/server"
import {
  calculateLevel,
  getXPForNextLevel,
  getProgressToNextLevel,
} from "@/lib/level-system"

// Non-subscribed users get this many free tokens
const FREE_TOKEN_ALLOWANCE = 10000

export async function GET() {
  try {
    const { userId } = auth()

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
          earnedXP: 0,
          level: 0,
          nextLevelXP: getXPForNextLevel(0),
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

    console.log("User usage data:", userUsage) // Log the actual data structure

    // Use totalSpent as the XP value
    const currentXP = userUsage.totalSpent || 0
    const currentLevel = calculateLevel(currentXP)
    const nextLevelXP = getXPForNextLevel(currentLevel)
    const progressToNextLevel = getProgressToNextLevel(currentXP)

    // Check subscription status
    const isSubscribed = userSubscription?.stripeCurrentPeriodEnd
      ? new Date(userSubscription.stripeCurrentPeriodEnd) > new Date()
      : false

    // Calculate token allocation based on subscription status
    const baseTokens = isSubscribed
      ? (userSubscription as any)?.includeBaseTokens || FREE_TOKEN_ALLOWANCE
      : FREE_TOKEN_ALLOWANCE

    // For now, just use the availableTokens as the actual available tokens
    const remainingTokens = userUsage.availableTokens || 0

    // Calculate used tokens as baseTokens - availableTokens, but ensure it's not negative
    const usedTokens = Math.max(0, baseTokens - remainingTokens)

    return NextResponse.json({
      earnedXP: currentXP,
      level: currentLevel,
      nextLevelXP: nextLevelXP,
      progressToNextLevel: progressToNextLevel,
      usedTokens: usedTokens,
      remainingTokens: remainingTokens,
      baseTokenAllocation: baseTokens,
      isSubscribed: isSubscribed,
      totalMoneySpent: userUsage.totalMoneySpent || 0,
    })
  } catch (error) {
    console.log("[USER_PROGRESS_ERROR]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
