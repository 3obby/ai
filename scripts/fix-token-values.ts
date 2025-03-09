// Script to sync token values between fields
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting token value synchronization...');
  
  // First get all companions
  const companions = await prisma.companion.findMany();
  console.log(`Found ${companions.length} companions`);
  
  // For each companion, synchronize the values
  for (const companion of companions) {
    // Choose the non-zero value or default to 0
    const tokenValue = Math.max(companion.xpEarned || 0, companion.tokensBurned || 0);
    
    // Update with the synchronized value
    await prisma.companion.update({
      where: { id: companion.id },
      data: {
        xpEarned: tokenValue,
        tokensBurned: tokenValue
      }
    });
    
    console.log(`Updated companion "${companion.name}" (ID: ${companion.id}) with token value: ${tokenValue}`);
  }
  
  console.log('Token value synchronization completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during synchronization:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 