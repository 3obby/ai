import Stripe from "stripe"
import { headers } from "next/headers"
import { NextResponse } from "next/server"

import prismadb from "@/lib/prismadb"
import { stripe } from "@/lib/stripe"
import { SUBSCRIPTION_PLAN } from "@/lib/subscription-plans"


// Force dynamic rendering for API routes
export const dynamic = "force-dynamic";

// Use the new route segment config format
export const runtime = "edge"
export const maxDuration = 60 // Allow more time for webhook processing

const XP_PER_LEVEL = 160

// Calculate how many levels will be gained from XP amount
const calculateLevelIncrease = (xpAmount: number): number => {
  return Math.floor(xpAmount / XP_PER_LEVEL)
}

// Helper to process a one-time payment
async function processOneTimePayment(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId
  const xpAmount = parseInt(session.metadata?.xpAmount || "0")
  const amountPaid = session.amount_total ? session.amount_total / 100 : 0 // Convert cents to dollars
  const paymentType = session.metadata?.paymentType

  if (!userId || !xpAmount) {
    return { error: "Missing metadata", status: 400 }
  }

  try {
    // Execute this in a regular serverless function since PrismaClient is not Edge compatible
    return await fetch(`${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/db/process-payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        xpAmount,
        amountPaid,
        paymentType
      })
    }).then(res => res.json())
  } catch (error: any) {
    console.error("Error processing one-time payment:", error)
    return { error: error.message, status: 500 }
  }
}

// Helper to process a subscription
async function processSubscription(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId
  const includeBaseTokens = parseInt(session.metadata?.includeBaseTokens || "0")
  const additionalTokenCost = parseFloat(session.metadata?.additionalTokenCost || "0.00003")
  const amountPaid = session.amount_total ? session.amount_total / 100 : SUBSCRIPTION_PLAN.weeklyPrice

  if (!userId) {
    return { error: "Missing subscription metadata", status: 400 }
  }

  try {
    // Execute this in a regular serverless function since PrismaClient is not Edge compatible
    return await fetch(`${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/db/process-subscription`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        customer: session.customer,
        subscription: session.subscription,
        stripePriceId: session.metadata?.stripePriceId || process.env.STRIPE_STANDARD_PRICE_ID,
        includeBaseTokens,
        additionalTokenCost,
        amountPaid,
        specialCheckEmail: "rfusseryiii@gmail.com" // Special case handling
      })
    }).then(res => res.json())
  } catch (error: any) {
    console.error("Error processing subscription:", error)
    return { error: error.message, status: 500 }
  }
}

// Helper to process invoice payment
async function processInvoicePayment(invoice: Stripe.Invoice) {
  if (!invoice.subscription) return { success: true }

  try {
    const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string)
    const userId = subscription.metadata.userId

    if (!userId) {
      return { error: "User ID not found in subscription metadata", status: 400 }
    }

    // Execute this in a regular serverless function since PrismaClient is not Edge compatible
    return await fetch(`${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/db/process-invoice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        subscription: subscription.id,
        currentPeriodEnd: subscription.current_period_end,
        stripePriceId: subscription.metadata.stripePriceId || process.env.STRIPE_STANDARD_PRICE_ID,
        includeBaseTokens: parseInt(
          subscription.metadata.includeBaseTokens || 
          SUBSCRIPTION_PLAN.includeBaseTokens.toString()
        )
      })
    }).then(res => res.json())
  } catch (error: any) {
    console.error("Error processing invoice payment:", error)
    return { error: error.message, status: 500 }
  }
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
  if (event.type === "checkout.session.completed" && session.mode === "payment") {
    const result = await processOneTimePayment(session)
    
    if (result.error) {
      return new NextResponse(result.error, { status: result.status || 500 })
    }
    
    return new NextResponse(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  // Handle subscription creations and updates
  if (event.type === "checkout.session.completed" && session.mode === "subscription") {
    const result = await processSubscription(session)
    
    if (result.error) {
      return new NextResponse(result.error, { status: result.status || 500 })
    }
    
    return new NextResponse(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  // Handle subscription renewals
  if (event.type === "invoice.payment_succeeded") {
    const invoice = event.data.object as Stripe.Invoice
    const result = await processInvoicePayment(invoice)
    
    if (result.error) {
      return new NextResponse(result.error, { status: result.status || 500 })
    }
    
    return new NextResponse(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  // Return 200 for other events we don't process
  return new NextResponse(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  })
}
