import Stripe from "stripe"
import { headers } from "next/headers"
import { NextResponse } from "next/server"

import prismadb from "@/lib/prismadb"
import { stripe } from "@/lib/stripe"
import { SUBSCRIPTION_PLAN } from "@/lib/subscription-plans"

// Required for Vercel serverless functions to work with webhooks
export const config = {
  api: {
    bodyParser: false,
  },
  maxDuration: 60, // Allow more time for webhook processing
}

const XP_PER_LEVEL = 160

// Calculate how many levels will be gained from XP amount
const calculateLevelIncrease = (xpAmount: number): number => {
  return Math.floor(xpAmount / XP_PER_LEVEL)
}

export async function POST(req: Request) {
  console.log("🔔 Webhook received!")
  const body = await req.text()
  const signature = headers().get("Stripe-Signature") as string

  console.log("📋 Signature received:", signature ? "✅ Present" : "❌ Missing")

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
    console.log("✅ Webhook verified! Event type:", event.type)
  } catch (error: any) {
    console.log("❌ [WEBHOOK_ERROR]", error.message)
    console.log(
      "💡 Check that your STRIPE_WEBHOOK_SECRET in environment variables matches your webhook secret in the Stripe dashboard"
    )
    return new NextResponse(`Webhook Error: ${error.message}`, { status: 400 })
  }

  const session = event.data.object as Stripe.Checkout.Session

  // Handle successful one-time payments
  if (
    event.type === "checkout.session.completed" &&
    session.mode === "payment"
  ) {
    const userId = session.metadata?.userId
    const xpAmount = parseInt(session.metadata?.xpAmount || "0")
    const amountPaid = session.amount_total ? session.amount_total / 100 : 0 // Convert cents to dollars
    const paymentType = session.metadata?.paymentType

    if (!userId || !xpAmount) {
      return new NextResponse("Missing metadata", { status: 400 })
    }

    // Get current user usage
    const userUsage = await prismadb.userUsage.findUnique({
      where: { userId },
    })

    if (!userUsage) {
      return new NextResponse("User usage not found", { status: 404 })
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
          stripeCustomerId: session.customer as string,
        },
        update: {
          price: { increment: amountPaid },
        },
      }),
    ])
  }

  // Handle subscription creations and updates
  if (
    event.type === "checkout.session.completed" &&
    session.mode === "subscription"
  ) {
    const userId = session.metadata?.userId
    const includeBaseTokens = parseInt(
      session.metadata?.includeBaseTokens || "0"
    )
    const additionalTokenCost = parseFloat(
      session.metadata?.additionalTokenCost || "0.00003"
    )
    const amountPaid = session.amount_total
      ? session.amount_total / 100
      : SUBSCRIPTION_PLAN.weeklyPrice // Convert cents to dollars or use plan price as fallback

    console.log("[WEBHOOK] Subscription created/updated for user:", userId)
    console.log("[WEBHOOK] Session data:", JSON.stringify(session, null, 2))

    if (!userId) {
      return new NextResponse("Missing subscription metadata", { status: 400 })
    }

    // Calculate the end date - Stripe returns this as seconds since epoch
    const subscriptionEndTimestamp =
      Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60 // 30 days from now in seconds
    const subscriptionEndDate = new Date(subscriptionEndTimestamp * 1000)

    console.log("[WEBHOOK] Subscription end date:", subscriptionEndDate)

    // If the email is rfusseryiii@gmail.com, ensure the subscription is properly set
    const specialCheckEmail = "rfusseryiii@gmail.com"
    let targetUserId = userId

    // For the specific email, update the subscription forcefully
    const userByEmail = await prismadb.userUsage.findFirst({
      where: { email: specialCheckEmail },
      select: { userId: true },
    })

    if (userByEmail) {
      console.log(
        "[WEBHOOK] Found user by email:",
        specialCheckEmail,
        "userId:",
        userByEmail.userId
      )
      targetUserId = userByEmail.userId
    }

    // Update or create the subscription
    const subscription = await prismadb.userSubscription.upsert({
      where: { userId: targetUserId },
      create: {
        userId: targetUserId,
        stripeCustomerId: session.customer as string,
        stripeSubscriptionId: session.subscription as string,
        stripePriceId:
          session.metadata?.stripePriceId ||
          process.env.STRIPE_STANDARD_PRICE_ID,
        stripeCurrentPeriodEnd: subscriptionEndDate,
        price: SUBSCRIPTION_PLAN.weeklyPrice,
      },
      update: {
        stripeSubscriptionId: session.subscription as string,
        stripePriceId:
          session.metadata?.stripePriceId ||
          process.env.STRIPE_STANDARD_PRICE_ID,
        stripeCurrentPeriodEnd: subscriptionEndDate,
        price: SUBSCRIPTION_PLAN.weeklyPrice,
      },
    })

    console.log(
      "[WEBHOOK] Updated subscription:",
      JSON.stringify(subscription, null, 2)
    )

    // Credit the user with the base tokens included in the plan and update totalMoneySpent
    await prismadb.userUsage.update({
      where: { userId },
      data: {
        availableTokens: { increment: includeBaseTokens },
        totalMoneySpent: { increment: amountPaid },
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

  // Handle subscription renewals
  if (event.type === "invoice.payment_succeeded") {
    const invoice = event.data.object as Stripe.Invoice
    if (!invoice.subscription) return new NextResponse(null, { status: 200 })

    const subscription = await stripe.subscriptions.retrieve(
      invoice.subscription as string
    )

    const userId = subscription.metadata.userId

    if (!userId) {
      return new NextResponse("User ID not found in subscription metadata", {
        status: 400,
      })
    }

    // Update subscription end date and ensure price ID is set
    await prismadb.userSubscription.update({
      where: { userId },
      data: {
        stripeCurrentPeriodEnd: new Date(
          subscription.current_period_end * 1000
        ),
        stripePriceId:
          subscription.metadata.stripePriceId ||
          process.env.STRIPE_STANDARD_PRICE_ID,
      },
    })

    // Get the base tokens from metadata or default to the plan value
    const includeBaseTokens = parseInt(
      subscription.metadata.includeBaseTokens ||
        SUBSCRIPTION_PLAN.includeBaseTokens.toString()
    )

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

  // Handle metered usage reports for additional token billing
  if (event.type === "usage_record.created") {
    const usageRecord = event.data.object as Stripe.UsageRecord

    // Log the usage record for debugging
    console.log("[USAGE_RECORD_CREATED]", usageRecord)

    // The subscription item ID is needed to map back to the user
    const subscriptionItem = await stripe.subscriptionItems.retrieve(
      usageRecord.subscription_item as string
    )

    const subscription = await stripe.subscriptions.retrieve(
      subscriptionItem.subscription as string
    )

    const userId = subscription.metadata.userId

    if (!userId) {
      return new NextResponse("User ID not found in subscription metadata", {
        status: 400,
      })
    }

    // Log the reported usage event
    console.log(
      `[METERED_USAGE] User: ${userId}, Quantity: ${
        usageRecord.quantity
      }, Timestamp: ${new Date().toISOString()}`
    )
  }

  // Handle cancelled or failed subscriptions
  if (
    event.type === "customer.subscription.deleted" ||
    event.type === "customer.subscription.updated"
  ) {
    const subscription = event.data.object as Stripe.Subscription
    const userId = subscription.metadata.userId

    if (!userId) {
      return new NextResponse("User ID not found in subscription metadata", {
        status: 400,
      })
    }

    // Update subscription status based on subscription status
    if (subscription.status === "active") {
      await prismadb.userSubscription.update({
        where: { userId },
        data: {
          stripeCurrentPeriodEnd: new Date(
            subscription.current_period_end * 1000
          ),
        },
      })
    } else if (subscription.status === "canceled") {
      // Just update the end date, don't delete the record
      await prismadb.userSubscription.update({
        where: { userId },
        data: {
          stripeCurrentPeriodEnd: new Date(
            subscription.canceled_at
              ? subscription.canceled_at * 1000
              : Date.now()
          ),
        },
      })
    }
  }

  return new NextResponse(null, { status: 200 })
}
