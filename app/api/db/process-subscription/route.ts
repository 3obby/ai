import { NextResponse } from "next/server"
import prismadb from "@/lib/prismadb"
import { SUBSCRIPTION_PLAN } from "@/lib/subscription-plans"

// Regular server route (not Edge) for database operations
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { 
      userId, 
      customer, 
      subscription, 
      stripePriceId,
      includeBaseTokens, 
      amountPaid,
      specialCheckEmail 
    } = body
    
    // Validate required fields
    if (!userId) {
      return NextResponse.json({ error: "Missing user ID" }, { status: 400 })
    }
    
    console.log("[PROCESS-SUBSCRIPTION] Processing for user:", userId)
    
    // Calculate the end date - 30 days from now
    const subscriptionEndTimestamp = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60
    const subscriptionEndDate = new Date(subscriptionEndTimestamp * 1000)

    console.log("[PROCESS-SUBSCRIPTION] End date:", subscriptionEndDate)

    // If specialCheckEmail is provided, check for that user
    let targetUserId = userId
    
    if (specialCheckEmail) {
      const userByEmail = await prismadb.userUsage.findFirst({
        where: { email: specialCheckEmail },
        select: { userId: true },
      })

      if (userByEmail) {
        console.log(
          "[PROCESS-SUBSCRIPTION] Found user by email:",
          specialCheckEmail,
          "userId:",
          userByEmail.userId
        )
        targetUserId = userByEmail.userId
      }
    }

    // Update or create the subscription
    const subscriptionRecord = await prismadb.userSubscription.upsert({
      where: { userId: targetUserId },
      create: {
        userId: targetUserId,
        stripeCustomerId: customer as string,
        stripeSubscriptionId: subscription as string,
        stripePriceId: stripePriceId || process.env.STRIPE_STANDARD_PRICE_ID,
        stripeCurrentPeriodEnd: subscriptionEndDate,
        price: SUBSCRIPTION_PLAN.weeklyPrice,
      },
      update: {
        stripeSubscriptionId: subscription as string,
        stripePriceId: stripePriceId || process.env.STRIPE_STANDARD_PRICE_ID,
        stripeCurrentPeriodEnd: subscriptionEndDate,
        price: SUBSCRIPTION_PLAN.weeklyPrice,
      },
    })

    console.log(
      "[PROCESS-SUBSCRIPTION] Updated subscription:",
      JSON.stringify(subscriptionRecord, null, 2)
    )

    // If there are base tokens to add
    if (includeBaseTokens > 0) {
      // Credit the user with the base tokens included in the plan and update totalMoneySpent
      await prismadb.userUsage.update({
        where: { userId },
        data: {
          availableTokens: { increment: includeBaseTokens },
          totalMoneySpent: { increment: amountPaid || 0 },
        },
      })

      // Record the transaction for the included tokens
      await prismadb.usageTransaction.create({
        data: {
          userId,
          amount: includeBaseTokens,
        },
      })
    }
    
    return NextResponse.json({ 
      success: true,
      subscription: subscriptionRecord.id
    })
  } catch (error: any) {
    console.error("[PROCESS-SUBSCRIPTION-ERROR]", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
} 