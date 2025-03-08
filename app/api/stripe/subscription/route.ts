import { auth } from "@/lib/auth-helpers";
import { NextResponse } from "next/server"
import Stripe from "stripe"

import prismadb from "@/lib/prismadb"
import { stripe } from "@/lib/stripe"
import { SUBSCRIPTION_PLAN } from "@/lib/subscription-plans"
import { absoluteUrl } from "@/lib/utils"

const settingsUrl = absoluteUrl("/")
const subscribeUrl = absoluteUrl("/subscribe")

export async function POST(req: Request) {
  try {
    const session = await auth();
const userId = session?.userId;
const user = session?.user;
    const { priceAmount } = await req.json()

    if (!userId || !user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    // Check if the user already has a subscription
    const userSubscription = await prismadb.userSubscription.findUnique({
      where: { userId },
    })

    let stripeCustomerId = userSubscription?.stripeCustomerId

    // If user doesn't have a Stripe customer ID, create one
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.emailAddresses[0].emailAddress,
        name: `${user.firstName} ${user.lastName}`,
        metadata: {
          userId,
        },
      })
      stripeCustomerId = customer.id
    }

    // Get the Stripe price ID for the standard subscription
    const stripePriceId =
      process.env.STRIPE_STANDARD_PRICE_ID || SUBSCRIPTION_PLAN.stripePriceId

    if (!stripePriceId) {
      return new NextResponse("Price ID not configured", { status: 400 })
    }

    // Get the Stripe price ID for the metered usage (for additional tokens)
    const stripeMeteredPriceId = process.env.STRIPE_METERED_PRICE_ID

    // Create line items array with the standard subscription
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      {
        price: stripePriceId,
        quantity: 1,
      },
    ]

    // Add metered usage item if available, without quantity
    if (stripeMeteredPriceId) {
      // For metered pricing, we must not specify a quantity
      lineItems.push({
        price: stripeMeteredPriceId,
      } as Stripe.Checkout.SessionCreateParams.LineItem)
    }

    // Create a Stripe session
    const stripeSession = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      success_url: settingsUrl,
      cancel_url: subscribeUrl,
      payment_method_types: ["card"],
      mode: "subscription",
      billing_address_collection: "auto",
      line_items: lineItems,
      metadata: {
        userId,
        includeBaseTokens: SUBSCRIPTION_PLAN.includeBaseTokens.toString(),
        additionalTokenCost: SUBSCRIPTION_PLAN.additionalTokenCost.toString(),
        stripePriceId: stripePriceId,
      },
      subscription_data: {
        metadata: {
          userId,
          stripePriceId: stripePriceId,
        },
      },
    })

    return new NextResponse(JSON.stringify({ url: stripeSession.url }))
  } catch (error) {
    console.log("[STRIPE_SUBSCRIPTION]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
