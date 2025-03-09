import { NextResponse } from "next/server"
import prismadb from "@/lib/prismadb"

// Force dynamic rendering for API routes
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { userId, tokenAmount, amountPaid, packageType } = await req.json()

    if (!userId || !tokenAmount) {
      return new NextResponse(JSON.stringify({ 
        error: "Missing required fields" 
      }), { status: 400 })
    }

    console.log(`Processing token purchase for user ${userId}: ${tokenAmount.toLocaleString()} tokens ($${amountPaid})`)

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

    // Update the user's token balance in the database
    const updatedUsage = await prismadb.userUsage.update({
      where: { userId },
      data: {
        availableTokens: newTokenBalance,
        totalMoneySpent: newTotalMoneySpent,
        // Record the purchase in transaction history
        transactions: {
          create: {
            amount: parseInt(tokenAmount.toString()),
            type: "TOKEN_PURCHASE",
            description: `Purchased ${tokenAmount.toLocaleString()} ${packageType === 'premium' ? 'premium' : 'standard'} tokens`,
            metadata: JSON.stringify({
              packageType,
              amountPaid
            })
          }
        }
      },
    })

    console.log(`Token purchase successful. New balance: ${updatedUsage.availableTokens.toLocaleString()}`)

    return new NextResponse(JSON.stringify({ 
      success: true,
      userId,
      newBalance: updatedUsage.availableTokens
    }))
  } catch (error) {
    console.error("[PROCESS_TOKEN_PURCHASE_ERROR]", error)
    return new NextResponse(JSON.stringify({ 
      error: "Internal server error" 
    }), { status: 500 })
  }
} 