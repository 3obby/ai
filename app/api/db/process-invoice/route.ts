import { NextResponse } from "next/server"
import prismadb from "@/lib/prismadb"

// Regular server route (not Edge) for database operations
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { 
      userId, 
      subscription,
      currentPeriodEnd,
      stripePriceId,
      includeBaseTokens 
    } = body
    
    // Validate required fields
    if (!userId) {
      return NextResponse.json({ error: "Missing user ID" }, { status: 400 })
    }
    
    console.log("[PROCESS-INVOICE] Processing for user:", userId)
    
    // Update subscription end date and ensure price ID is set
    await prismadb.userSubscription.update({
      where: { userId },
      data: {
        stripeCurrentPeriodEnd: new Date(currentPeriodEnd * 1000),
        stripePriceId: stripePriceId || process.env.STRIPE_STANDARD_PRICE_ID,
      },
    })

    // If there are base tokens to add
    if (includeBaseTokens > 0) {
      // Credit the user with the weekly included tokens
      await prismadb.userUsage.update({
        where: { userId },
        data: {
          availableTokens: { increment: includeBaseTokens },
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
      message: `Processed invoice for user ${userId} with ${includeBaseTokens} tokens`
    })
  } catch (error: any) {
    console.error("[PROCESS-INVOICE-ERROR]", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
} 