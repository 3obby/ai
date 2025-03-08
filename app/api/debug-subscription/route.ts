import { auth } from "@/lib/auth-helpers";
import { NextResponse } from "next/server"

import prismadb from "@/lib/prismadb"
import { checkSubscription } from "@/lib/subscription"

export async function GET(req: Request) {
  try {
    const session = await auth();
const userId = session?.userId;

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized", userId: null },
        { status: 401 }
      )
    }

    // Get the subscription check result
    const isPro = await checkSubscription()

    // Get the raw subscription data
    const userSubscription = await prismadb.userSubscription.findUnique({
      where: {
        userId: userId,
      },
    })

    // Get the user usage data
    const userUsage = await prismadb.userUsage.findUnique({
      where: {
        userId: userId,
      },
    })

    return NextResponse.json({
      userId,
      isPro,
      subscription: userSubscription,
      usage: userUsage,
      diagnostics: {
        today: new Date(),
        hasStripeSubId: !!userSubscription?.stripeSubscriptionId,
        hasStripePriceId: !!userSubscription?.stripePriceId,
        subscriptionEndDate: userSubscription?.stripeCurrentPeriodEnd,
        isEndDateValid: userSubscription?.stripeCurrentPeriodEnd
          ? userSubscription.stripeCurrentPeriodEnd.getTime() > Date.now()
          : false,
      },
    })
  } catch (error) {
    console.error("[DEBUG_SUBSCRIPTION_ERROR]", error)
    return NextResponse.json(
      { error: "Internal error", details: error },
      { status: 500 }
    )
  }
}
