import { NextResponse } from "next/server"
import prismadb from "@/lib/prismadb"


// Force dynamic rendering for API routes
export const dynamic = "force-dynamic";

// Regular server route (not Edge) for database operations
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { userId, xpAmount, amountPaid } = body
    
    // Validate required fields
    if (!userId || !xpAmount) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }
    
    // Get current user usage
    const userUsage = await prismadb.userUsage.findUnique({
      where: { userId },
    })

    if (!userUsage) {
      return NextResponse.json({ error: "User usage not found" }, { status: 404 })
    }

    // Update user's XP balance and record transaction
    await prismadb.$transaction([
      // Update user usage
      prismadb.userUsage.update({
        where: { userId },
        data: {
          availableTokens: { increment: xpAmount },
          totalSpent: { increment: xpAmount },
          totalMoneySpent: { increment: amountPaid }, // Track money spent
        },
      }),
      // Record the transaction
      prismadb.usageTransaction.create({
        data: {
          userId,
          amount: xpAmount,
        },
      }),
      // Update user subscription record with payment info
      prismadb.userSubscription.upsert({
        where: { userId },
        create: {
          userId,
          price: amountPaid,
          stripeCustomerId: body.customer || "",
        },
        update: {
          price: { increment: amountPaid },
        },
      }),
    ])
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[PROCESS-PAYMENT-ERROR]", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
} 