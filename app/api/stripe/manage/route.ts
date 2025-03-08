import { auth } from "@/lib/auth-helpers";
import { NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { absoluteUrl } from "@/lib/utils"
import prismadb from "@/lib/prismadb"


// Force dynamic rendering for API routes
export const dynamic = "force-dynamic";

const returnUrl = absoluteUrl("/")

export async function GET(req: Request) {
  try {
    const authSession = await auth()
    const userId = authSession?.userId
    const user = authSession?.user

    if (!userId || !user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    // Fetch the user subscription from our database
    const userSubscription = await prismadb.userSubscription.findUnique({
      where: {
        userId,
      },
    })

    // If user has no subscription or no stripeCustomerId, handle accordingly
    if (!userSubscription?.stripeCustomerId) {
      return new NextResponse("No subscription found", { status: 404 })
    }

    if (!userSubscription.stripePriceId) {
      return new NextResponse("No price ID found", { status: 400 })
    }

    // First create a configuration for the portal
    const configuration = await stripe.billingPortal.configurations.create({
      features: {
        subscription_update: {
          enabled: true,
          default_allowed_updates: ["price"],
          proration_behavior: "always_invoice",
          products: [
            {
              product: "prod_RnhVPbX3Lh3Zhk",
              prices: [userSubscription.stripePriceId],
            },
          ],
        },
        customer_update: {
          enabled: true,
          allowed_updates: ["email", "tax_id"],
        },
        payment_method_update: {
          enabled: true,
        },
        subscription_cancel: {
          enabled: true,
        },
      },
      business_profile: {
        headline: "Manage your subscription",
      },
    })

    // Then create the session with this configuration
    const stripeSession = await stripe.billingPortal.sessions.create({
      customer: userSubscription.stripeCustomerId,
      configuration: configuration.id,
      return_url: returnUrl,
    })

    return NextResponse.json({ url: stripeSession.url })
  } catch (error) {
    console.log("[STRIPE_MANAGE_ERROR]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
