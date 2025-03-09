import { NextResponse } from "next/server"
import prismadb from "@/lib/prismadb"

// Force dynamic rendering for API routes
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { userId, tokenAmount, amountPaid, packageType, isSubscriber } = await req.json()

    if (!userId || !tokenAmount) {
      return new NextResponse(JSON.stringify({ 
        error: "Missing required fields" 
      }), { status: 400 })
    }

    console.log(`Processing token purchase for user ${userId}: ${tokenAmount.toLocaleString()} tokens ($${amountPaid})${isSubscriber ? ' with subscriber discount' : ''}`)

    // Get the current user usage record
    const userUsage = await prismadb.userUsage.findUnique({
      where: { userId },
    })

    if (!userUsage) {
      console.error(`User usage record not found for: ${userId}`)
      return new NextResponse(JSON.stringify({ 
        error: "User record not found" 
      }), { status: 404 })
    }

    // Calculate the new token balance
    const currentTokens = userUsage.availableTokens || 0
    const newTokenBalance = currentTokens + parseInt(tokenAmount.toString())
    const newTotalMoneySpent = (userUsage.totalMoneySpent || 0) + parseFloat(amountPaid.toString())

    console.log(`Updating token balance: ${currentTokens.toLocaleString()} -> ${newTokenBalance.toLocaleString()}`)

    // Create transaction description with discount info if applicable
    const transactionDescription = isSubscriber
      ? `Purchased ${tokenAmount.toLocaleString()} ${packageType === 'premium' ? 'premium' : 'standard'} tokens with 20% subscriber discount`
      : `Purchased ${tokenAmount.toLocaleString()} ${packageType === 'premium' ? 'premium' : 'standard'} tokens`;

    // First, update the user's token balance in the database
    const updatedUsage = await prismadb.userUsage.update({
      where: { userId },
      data: {
        availableTokens: newTokenBalance,
        totalMoneySpent: newTotalMoneySpent,
      },
    });

    // Create transaction manually without relying on a direct relation
    const transactionData = {
      id: crypto.randomUUID(),
      amount: parseInt(tokenAmount.toString()),
      type: "TOKEN_PURCHASE",
      description: transactionDescription,
      metadata: JSON.stringify({
        packageType,
        amountPaid,
        isSubscriber: isSubscriber ? true : false
      }),
      userUsageId: userUsage.id,
      createdAt: new Date()
    };

    // For troubleshooting only - this will be replaced with proper implementation when schema is updated
    console.log(`Would create transaction: ${JSON.stringify(transactionData)}`);

    console.log(`Token purchase successful. New balance: ${updatedUsage.availableTokens.toLocaleString()}`)

    return new NextResponse(JSON.stringify({ 
      success: true,
      userId,
      newBalance: updatedUsage.availableTokens,
      transactionId: transactionData.id
    }))
  } catch (error) {
    console.error("[PROCESS_TOKEN_PURCHASE_ERROR]", error)
    return new NextResponse(JSON.stringify({ 
      error: "Internal server error" 
    }), { status: 500 })
  }
} 