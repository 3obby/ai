import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

import prismadb from "@/lib/prismadb";
import { stripe } from "@/lib/stripe";
import { absoluteUrl } from "@/lib/utils";


// Force dynamic rendering for API routes
export const dynamic = "force-dynamic";

const settingsUrl = absoluteUrl("/");
const dashboardUrl = absoluteUrl("/dashboard");

export async function POST(req: Request) {
  try {
    const session = await auth();
const userId = session?.userId;
const user = session?.user;
    const { option, xpAmount, priceAmount } = await req.json();

    if (!userId || !user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Create Checkout Session
    const stripeSession = await stripe.checkout.sessions.create({
      success_url: settingsUrl,
      cancel_url: dashboardUrl,
      payment_method_types: ["card"],
      mode: "payment",
      billing_address_collection: "auto",
      customer_email: user.email || '',
      line_items: [
        {
          price_data: {
            currency: "USD",
            product_data: {
              name: `${xpAmount} XP Package`,
              description: `One-time purchase of ${xpAmount} XP`,
            },
            unit_amount: Math.round(priceAmount * 100),
          },
          quantity: 1,
        },
      ],
      metadata: {
        userId,
        xpAmount,
        option
      },
    });

    return new NextResponse(JSON.stringify({ url: stripeSession.url }));
  } catch (error) {
    console.log("[STRIPE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
};
