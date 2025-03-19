// Script to update tokensBurned values for companions
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting token burned update...');
  
  // Get all companions
  const companions = await prisma.companion.findMany();
  console.log(`Found ${companions.length} companions`);
  
  // Update with random token values for demonstration
  for (const companion of companions) {
    try {
      // Generate random token values between 100 and 5000
      const tokenValue = Math.floor(Math.random() * 4900) + 100;
      
      // Update both fields with the same value
      await prisma.$executeRaw`
        UPDATE "Companion" 
        SET "tokensBurned" = ${tokenValue}, 
            "xpEarned" = ${tokenValue}
        WHERE "id" = ${companion.id}
      `;
      
      console.log(`Updated companion "${companion.name}" with ${tokenValue} tokens burned`);
    } catch (error) {
      console.error(`Error updating companion ${companion.name}:`, error);
    }
  }
  
  console.log('Token burned update completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during update:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 