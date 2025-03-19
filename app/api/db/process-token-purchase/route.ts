import { NextResponse } from "next/server"
import prismadb from "@/lib/prismadb"

// Force dynamic rendering for API routes
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { userId, tokenAmount, amountPaid, packageType, isSubscriber, quantity = 1 } = await req.json()

    if (!userId || !tokenAmount) {
      return new NextResponse(JSON.stringify({ 
        error: "Missing required fields" 
      }), { status: 400 })
    }

    const quantityNum = parseInt(quantity.toString()) || 1;
    const tokenAmountNum = parseInt(tokenAmount.toString());
    const amountPaidNum = parseFloat(amountPaid.toString());

    const singlePackageTokens = Math.floor(tokenAmountNum / quantityNum);
    
    console.log(`Processing token purchase for user ${userId}: ${tokenAmountNum.toLocaleString()} tokens ($${amountPaidNum}) - ${quantityNum}x packages of ${singlePackageTokens.toLocaleString()} tokens each`)

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
    const newTokenBalance = currentTokens + tokenAmountNum
    const newTotalMoneySpent = (userUsage.totalMoneySpent || 0) + amountPaidNum

    console.log(`Updating token balance: ${currentTokens.toLocaleString()} -> ${newTokenBalance.toLocaleString()}`)

    // Create transaction description with quantity info
    const packageLabel = packageType === 'premium' ? 'premium' : 'standard';
    const quantityLabel = quantityNum > 1 ? `${quantityNum}x ` : '';
    const transactionDescription = `Purchased ${quantityLabel}${tokenAmountNum.toLocaleString()} ${packageLabel} tokens`;

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
      amount: tokenAmountNum,
      type: "TOKEN_PURCHASE",
      description: transactionDescription,
      metadata: JSON.stringify({
        packageType,
        amountPaid: amountPaidNum,
        quantity: quantityNum,
        singlePackageTokens,
        isSubscriber: true
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