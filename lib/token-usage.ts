import prismadb from "./prismadb"
import { COMPUTE_COST_PER_TOKEN, SUBSCRIPTION_PLAN } from "./subscription-plans"
import { stripe } from "./stripe"
import { calculateXPEarned } from "./level-system"
import { auth } from "./auth-helpers"

// Free token allowance for non-subscribed users
export const FREE_TOKEN_ALLOWANCE = 10000

// Free token allowance for anonymous users
export const ANONYMOUS_TOKEN_ALLOWANCE = 1000

// Token burning constants for user actions
export const TOKENS_PER_MESSAGE = 2
export const TOKENS_PER_GROUP_MESSAGE = 2
export const TOKENS_PER_COMPANION_CREATION = 100
export const TOKENS_PER_GROUP_CREATION = 50

interface UsageResult {
  success: boolean
  remainingTokens: number
  earnedTokens?: number
  error?: string
}

/**
 * Reports metered usage to Stripe for additional token consumption
 */
async function reportTokenUsageToStripe(
  userId: string,
  tokenAmount: number
): Promise<boolean> {
  try {
    // Get the user's subscription
    const userSubscription = await prismadb.userSubscription.findUnique({
      where: { userId },
    })

    if (!userSubscription?.stripeSubscriptionId) {
      console.log(
        "[STRIPE_USAGE_REPORT] No active subscription for user",
        userId
      )
      return false
    }

    // Get subscription items to find the metered usage item
    const subscription = await stripe.subscriptions.retrieve(
      userSubscription.stripeSubscriptionId
    )

    const meteredPriceId = process.env.STRIPE_METERED_PRICE_ID

    if (!meteredPriceId) {
      console.log("[STRIPE_USAGE_REPORT] No metered price ID configured")
      return false
    }

    // Find the metered subscription item
    const meteredItem = subscription.items.data.find(
      (item) => item.price.id === meteredPriceId
    )

    if (!meteredItem) {
      console.log("[STRIPE_USAGE_REPORT] No metered subscription item found")
      return false
    }

    // Report the usage
    await stripe.subscriptionItems.createUsageRecord(meteredItem.id, {
      quantity: tokenAmount,
      timestamp: "now",
      action: "increment",
    })

    console.log(
      `[STRIPE_USAGE_REPORT] Reported ${tokenAmount} tokens for user ${userId}`
    )
    return true
  } catch (error) {
    console.error("[STRIPE_USAGE_REPORT_ERROR]", error)
    return false
  }
}

/**
 * Track token usage for a user and award XP based on usage
 */
export async function trackTokenUsage(
  userId: string,
  tokenAmount: number,
  purpose: string = "chat"
): Promise<UsageResult> {
  try {
    console.log(
      `[TOKEN_USAGE] Tracking ${tokenAmount} tokens for user ${userId}`
    )

    // Get user's subscription and usage info
    const [userSubscription, userUsage] = await Promise.all([
      prismadb.userSubscription.findUnique({
        where: { userId },
        select: {
          stripeSubscriptionId: true,
          stripeCurrentPeriodEnd: true,
          stripePriceId: true,
        },
      }),
      prismadb.userUsage.findUnique({
        where: { userId },
      }),
    ])

    if (!userUsage) {
      return {
        success: false,
        remainingTokens: 0,
        error: "User usage record not found",
      }
    }

    // Only log in development mode and in a simplified format
    if (process.env.NODE_ENV === "development") {
      console.log("[TOKEN_USAGE] User tokens:", userUsage.availableTokens)
    }

    // Check if user has an active subscription
    const isSubscribed =
      userSubscription?.stripePriceId &&
      userSubscription.stripeCurrentPeriodEnd?.getTime()! > new Date().getTime()

    // Calculate token allocation and remaining tokens
    const baseTokens = isSubscribed
      ? SUBSCRIPTION_PLAN.includeBaseTokens
      : FREE_TOKEN_ALLOWANCE

    // Use availableTokens directly from the database
    const remainingTokens = userUsage.availableTokens || 0

    // Check if there are enough tokens remaining
    if (remainingTokens < tokenAmount) {
      if (!isSubscribed) {
        // Free users hit their token limit
        return {
          success: false,
          remainingTokens,
          error: "You've used all your free tokens. Please subscribe for more.",
        }
      }

      // Subscribed users have exceeded their base allocation, report to Stripe for metered billing
      reportTokenUsageToStripe(userId, tokenAmount).catch((error) =>
        console.error("[TRACK_TOKEN_USAGE_STRIPE_ERROR]", error)
      )
    }

    // Calculate the cost and tokens burned for this usage
    const tokenCost = isSubscribed ? tokenAmount * COMPUTE_COST_PER_TOKEN : 0
    const tokensBurned = calculateXPEarned(tokenAmount, tokenCost)

    // Update user's usage - decrement availableTokens and increment totalSpent for tokens burned
    await prismadb.$transaction([
      prismadb.userUsage.update({
        where: { userId },
        data: {
          availableTokens: { decrement: tokenAmount },
          totalSpent: { increment: tokensBurned }, // Use totalSpent for tokens burned
          totalMoneySpent: { increment: tokenCost },
        },
      }),
      // Record the transaction
      prismadb.usageTransaction.create({
        data: {
          userId,
          amount: tokenAmount, // Amount represents tokens used
        },
      }),
    ])

    // Get updated usage
    const updatedUsage = await prismadb.userUsage.findUnique({
      where: { userId },
    })

    // Return updated information
    return {
      success: true,
      remainingTokens: updatedUsage?.availableTokens || 0,
      earnedTokens: tokensBurned,
    }
  } catch (error) {
    console.error("[TOKEN_USAGE_ERROR]", error)
    return {
      success: false,
      remainingTokens: 0,
      error: "Error tracking token usage",
    }
  }
}

/**
 * Allocates free tokens to an anonymous user
 */
export async function allocateAnonymousTokens(userId: string): Promise<boolean> {
  try {
    // Check if user already has a usage record
    const existingUsage = await prismadb.userUsage.findUnique({
      where: { userId },
    });

    if (existingUsage) {
      // User already exists, just make sure they have the anonymous tokens
      if (existingUsage.availableTokens < ANONYMOUS_TOKEN_ALLOWANCE) {
        await prismadb.userUsage.update({
          where: { userId },
          data: {
            availableTokens: ANONYMOUS_TOKEN_ALLOWANCE,
          },
        });
      }
      return true;
    }

    // Get user info to get the email
    const user = await prismadb.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      console.error(`[ANONYMOUS_TOKENS_ERROR] User ${userId} not found`);
      return false;
    }

    // Create a new user usage record for the anonymous user
    await prismadb.userUsage.create({
      data: {
        userId,
        email: user.email,
        availableTokens: ANONYMOUS_TOKEN_ALLOWANCE,
        totalSpent: 0,
        totalMoneySpent: 0,
      },
    });

    console.log(`[ANONYMOUS_TOKENS] Allocated ${ANONYMOUS_TOKEN_ALLOWANCE} tokens for anonymous user ${userId}`);
    return true;
  } catch (error) {
    console.error("[ANONYMOUS_TOKENS_ERROR]", error);
    return false;
  }
}
