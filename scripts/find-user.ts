import { PrismaClient } from "@prisma/client"

// Initialize Prisma client
const prisma = new PrismaClient()

async function findUserByEmail() {
  // Replace with the actual email address of the user
  const userEmail = "rfusseryiii@gmail.com"

  console.log(`Looking up user with email: ${userEmail}`)

  try {
    // Find the user by email
    const user = await prisma.userUsage.findUnique({
      where: { email: userEmail },
    })

    if (!user) {
      console.error(`No user found with email: ${userEmail}`)
      return
    }

    console.log("User found!")
    console.log("User ID:", user.userId)
    console.log("Current available tokens:", user.availableTokens)
    console.log("Current total money spent: $" + user.totalMoneySpent)
  } catch (error) {
    console.error("Error finding user:", error)
  } finally {
    // Close the Prisma client connection
    await prisma.$disconnect()
  }
}

// Run the function
findUserByEmail()
  .then(() => console.log("Done"))
  .catch((error) => console.error("Script failed:", error))
