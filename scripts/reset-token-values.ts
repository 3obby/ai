// Script to reset all token values to 0
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting token value reset...');
  
  // Reset all token values for companions
  await prisma.$executeRaw`
    UPDATE "Companion" 
    SET "tokensBurned" = 0, 
        "xpEarned" = 0
  `;
  
  console.log('Reset token values for all companions');
  
  // Reset user burned token values if any exist
  try {
    await prisma.$executeRaw`
      DELETE FROM "UserBurnedTokens"
    `;
    console.log('Deleted all user burned token records');
  } catch (error) {
    console.log('No user burned token records found or error deleting:', error);
  }
  
  console.log('Token value reset completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during reset:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 