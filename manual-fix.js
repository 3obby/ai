// manual-fix.js
const { PrismaClient } = require("@prisma/client")
const prisma = new PrismaClient()

async function main() {
  try {
    // Find the user by email
    const userByEmail = await prisma.userUsage.findFirst({
      where: { email: "rfusseryiii@gmail.com" },
      select: { userId: true },
    })

    if (!userByEmail) {
      console.log("User not found with email rfusseryiii@gmail.com")
      return
    }

    console.log("Found user:", userByEmail.userId)

    // Calculate end date (30 days from now)
    const endDate = new Date()
    endDate.setDate(endDate.getDate() + 30)

    // Update or create subscription
    const subscription = await prisma.userSubscription.upsert({
      where: { userId: userByEmail.userId },
      create: {
        userId: userByEmail.userId,
        stripeCustomerId: "manual_fix_customer",
        stripeSubscriptionId: "manual_fix_sub_" + Date.now(),
        stripePriceId: "price_1OqoH8HcGZrJ1mCF8dYP2H3k", // Use the standard price ID
        stripeCurrentPeriodEnd: endDate,
        price: 4.99,
      },
      update: {
        stripeSubscriptionId: "manual_fix_sub_" + Date.now(),
        stripeCurrentPeriodEnd: endDate,
      },
    })

    console.log("Updated subscription:", subscription)

    // Verify the subscription
    const verifySubscription = await prisma.userSubscription.findUnique({
      where: { userId: userByEmail.userId },
    })

    console.log("Verification:", verifySubscription)
  } catch (error) {
    console.error("Error:", error)
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
