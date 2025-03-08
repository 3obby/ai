import { auth } from "@/lib/auth-helpers";
import { NextResponse } from "next/server"

import prismadb from "@/lib/prismadb"
import { stripe } from "@/lib/stripe"
import { absoluteUrl } from "@/lib/utils"


// Force dynamic rendering for API routes
export const dynamic = "force-dynamic";

const settingsUrl = absoluteUrl("/")

export async function POST(req: Request) {
  try {
    const session = await auth();
const userId = session?.userId;
const user = session?.user;
    const { option, xpAmount, priceAmount } = await req.json()

    if (!userId || !user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    // Create a one-time payment session
    const stripeSession = await stripe.checkout.sessions.create({
      success_url: settingsUrl,
      cancel_url: settingsUrl,
      payment_method_types: ["card"],
      mode: "payment", // Changed from subscription to one-time payment
      billing_address_collection: "auto",
      customer_email: user.email || '',
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `${xpAmount} XP Package`,
              description: `One-time purchase of ${xpAmount} XP`,
            },
            unit_amount: priceAmount, // Amount in cents
          },
          quantity: 1,
        },
      ],
      metadata: {
        userId,
        xpAmount,
        option,
        paymentType: "one-time",
      },
    })

    return new NextResponse(JSON.stringify({ url: stripeSession.url }))
  } catch (error) {
    console.log("[STRIPE_ONE_TIME]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
