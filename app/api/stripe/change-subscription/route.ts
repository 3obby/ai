import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { stripe } from "@/lib/stripe";


// Force dynamic rendering for API routes
export const dynamic = "force-dynamic";

const PRICE_IDS = {
  starter: process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID,
  pro: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID,
  ultimate: process.env.NEXT_PUBLIC_STRIPE_ULTIMATE_PRICE_ID,
} as const;

// Helper to get plan name from price ID
const getPlanFromPriceId = (priceId: string) => {
  return Object.entries(PRICE_IDS).find(([_, value]) => value === priceId)?.[0];
};

export async function POST(req: Request) {
  try {
    const session = await auth();
const userId = session?.userId;
    const { newPriceId, newPrice } = await req.json();

    if (!userId || !newPriceId || !newPrice) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    // Get current subscription
    const userSubscription = await prismadb.userSubscription.findUnique({
      where: { userId }
    });

    if (!userSubscription?.stripeSubscriptionId) {
      return new NextResponse("No subscription found", { status: 404 });
    }

    // Check if user is trying to switch to same plan
    if (userSubscription.price === newPrice) {
      return new NextResponse("You are already on this plan", { status: 400 });
    }

    // Get current subscription from Stripe
    const subscription = await stripe.subscriptions.retrieve(
      userSubscription.stripeSubscriptionId
    );

    if (newPrice > userSubscription.price) {
      // Upgrading - create invoice for price difference
      const updatedSubscription = await stripe.subscriptions.update(
        userSubscription.stripeSubscriptionId,
        {
          items: [{
            id: subscription.items.data[0].id,
            price: newPriceId,
          }],
          proration_behavior: 'always_invoice',
          payment_behavior: 'pending_if_incomplete',
        }
      );

      const invoice = await stripe.invoices.retrieve(
        updatedSubscription.latest_invoice as string
      );

      return NextResponse.json({ 
        url: invoice.hosted_invoice_url 
      });
    } else {
      // Downgrading - no invoice needed
      await stripe.subscriptions.update(
        userSubscription.stripeSubscriptionId,
        {
          items: [{
            id: subscription.items.data[0].id,
            price: newPriceId,
          }],
          proration_behavior: 'none',
        }
      );

      // Update the database immediately for downgrades
      await prismadb.userSubscription.update({
        where: { userId },
        data: {
          stripePriceId: newPriceId,
          price: newPrice / 100, // Convert from cents to dollars
        }
      });

      return NextResponse.json({ 
        success: true,
        message: "Subscription downgraded successfully" 
      });
    }

  } catch (error) {
    console.log("[STRIPE_CHANGE_SUBSCRIPTION_ERROR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 