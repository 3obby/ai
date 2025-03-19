import { PrismaClient } from "@prisma/client"
import { SUBSCRIPTION_PLAN } from "../lib/subscription-plans"

// Initialize Prisma client
const prisma = new PrismaClient()

async function creditUser() {
  // Replace with the actual user ID who needs to be credited
  const userId = "user_2tJzu60nBqQW0UJR3AvDJVmLglU"

  // Amount of tokens to credit (from the subscription plan)
  const tokensToCredit = SUBSCRIPTION_PLAN.includeBaseTokens // 200,000 tokens

  // Amount to add to totalMoneySpent (weekly price from subscription plan)
  const amountPaid = SUBSCRIPTION_PLAN.weeklyPrice // $4.99

  console.log(`Starting credit operation for user: ${userId}`)
  console.log(`Will credit: ${tokensToCredit} tokens`)
  console.log(`Will update totalMoneySpent by: $${amountPaid}`)

  try {
    // First check if the user exists
    const user = await prisma.userUsage.findUnique({
      where: { userId },
    })

    if (!user) {
      console.error(`User with ID ${userId} not found`)
      return
    }

    console.log("Current user state:")
    console.log(`Available tokens: ${user.availableTokens}`)
    console.log(`Total money spent: $${user.totalMoneySpent}`)

    // Update the user's record
    const updatedUser = await prisma.userUsage.update({
      where: { userId },
      data: {
        availableTokens: { increment: tokensToCredit },
        totalMoneySpent: { increment: amountPaid },
      },
    })

    console.log("User successfully credited!")
    console.log(`New available tokens: ${updatedUser.availableTokens}`)
    console.log(`New total money spent: $${updatedUser.totalMoneySpent}`)

    // Record the transaction
    await prisma.usageTransaction.create({
      data: {
        userId,
        amount: tokensToCredit,
      },
    })

    console.log("Transaction record created")
  } catch (error) {
    console.error("Error updating user:", error)
  } finally {
    // Close the Prisma client connection
    await prisma.$disconnect()
  }
}

// Run the function
creditUser()
  .then(() => console.log("Done"))
  .catch((error) => console.error("Script failed:", error))
