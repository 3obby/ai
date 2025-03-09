import { auth } from "@/lib/auth-helpers";
import { NextResponse } from "next/server"

import prismadb from "@/lib/prismadb"
import { stripe } from "@/lib/stripe"
import { absoluteUrl } from "@/lib/utils"

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

    const { tokenAmount, priceAmount, packageType, isSubscriber } = await req.json()

    if (!tokenAmount || !priceAmount || !packageType) {
      return new NextResponse("Missing required fields", { status: 400 })
    }

    // Format package name for display
    const packageName = packageType === 'premium' ? 'Premium Tokens' : 'Standard Tokens';
    
    // Add subscriber discount info if applicable
    const packageDescription = isSubscriber 
      ? `One-time purchase of ${tokenAmount.toLocaleString()} tokens (20% subscriber discount applied)`
      : `One-time purchase of ${tokenAmount.toLocaleString()} tokens`;

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
          price_data: {
            currency: "usd",
            product_data: {
              name: `${packageName} (${tokenAmount.toLocaleString()} tokens)`,
              description: packageDescription,
            },
            unit_amount: priceAmount, // Amount in cents
          },
          quantity: 1,
        },
      ],
      metadata: {
        userId,
        tokenAmount: tokenAmount.toString(),
        packageType,
        paymentType: "token-purchase",
        isSubscriber: isSubscriber ? "true" : "false"
      },
    })

    return new NextResponse(JSON.stringify({ url: stripeSession.url }))
  } catch (error) {
    console.log("[STRIPE_TOKEN_PURCHASE]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
} 