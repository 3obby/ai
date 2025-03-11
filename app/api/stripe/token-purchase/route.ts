import { auth } from "@/lib/auth-helpers";
import { NextResponse } from "next/server"

import prismadb from "@/lib/prismadb"
import { stripe } from "@/lib/stripe"
import { absoluteUrl } from "@/lib/utils"
import { checkSubscription } from "@/lib/subscription"

// Force dynamic rendering for API routes
export const dynamic = "force-dynamic";

const settingsUrl = absoluteUrl("/subscribe")

export async function POST(req: Request) {
  try {
    const session = await auth();
    const userId = session?.userId;
    const user = session?.user;

    if (!userId || !user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    // Check if the user has an active subscription
    const isPro = await checkSubscription();

    if (!isPro) {
      return new NextResponse("Subscription required to purchase tokens", { status: 403 })
    }

    const { 
      tokenAmount, 
      priceAmount, 
      packageType, 
      quantity = 1,
      priceId = process.env.STRIPE_TOKEN_BUNDLE_PRICE_ID
    } = await req.json()

    if (!tokenAmount || !priceAmount || !packageType) {
      return new NextResponse("Missing required fields", { status: 400 })
    }

    if (!priceId) {
      return new NextResponse("Missing price ID configuration", { status: 500 })
    }

    // Format package name for display
    const packageName = packageType === 'premium' ? 'Premium Tokens' : 'Standard Tokens';
    
    // Calculate the total price based on quantity
    const totalPrice = priceAmount * quantity;
    
    // Create a one-time payment session
    const stripeSession = await stripe.checkout.sessions.create({
      success_url: settingsUrl,
      cancel_url: settingsUrl,
      payment_method_types: ["card"],
      mode: "payment",
      billing_address_collection: "auto",
      customer_email: user.email || '',
      line_items: [
        {
          price: priceId, // Use the price ID directly
          quantity: quantity,
        },
      ],
      metadata: {
        userId,
        tokenAmount: tokenAmount.toString(),
        packageType,
        paymentType: "token-purchase",
        isSubscriber: "true", // Always true since we check subscription status
        quantity: quantity.toString(),
      },
    })

    return new NextResponse(JSON.stringify({ url: stripeSession.url }))
  } catch (error) {
    console.log("[STRIPE_TOKEN_PURCHASE]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
} 