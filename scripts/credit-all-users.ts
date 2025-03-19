import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Initialize Prisma client
const prisma = new PrismaClient();

async function creditAllUsers() {
  try {
    console.log("Starting to credit all users with 1,000,000 tokens...");
    
    // Get all user usage records
    const userUsages = await prisma.userUsage.findMany();
    console.log(`Found ${userUsages.length} users to credit`);
    
    // Add 1,000,000 tokens to each user
    const updatePromises = userUsages.map(async (userUsage) => {
      // Create a transaction record
      const transaction = await prisma.transaction.create({
        data: {
          amount: 1000000,
          type: "CREDIT",
          description: "Special credit: 1,000,000 tokens added",
          userUsageId: userUsage.id,
        },
      });
      
      // Update the user's available tokens
      const updatedUser = await prisma.userUsage.update({
        where: { id: userUsage.id },
        data: {
          availableTokens: { increment: 1000000 },
        },
      });
      
      return {
        email: userUsage.email,
        previousTokens: userUsage.availableTokens,
        newTokens: updatedUser.availableTokens,
        transactionId: transaction.id,
      };
    });
    
    const results = await Promise.all(updatePromises);
    
    console.log("Successfully credited all users with 1,000,000 tokens!");
    console.log("Summary:");
    results.forEach((result) => {
      console.log(`- ${result.email}: ${result.previousTokens} → ${result.newTokens} tokens`);
    });
  } catch (error) {
    console.error("Error crediting users:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the function
creditAllUsers()
  .then(() => {
    console.log("Script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Script failed:", error);
    process.exit(1);
  }); 