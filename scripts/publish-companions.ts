// Script to publish companions by making them public and visible
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function publishCompanions() {
  try {
    console.log('🤖 Publishing companions...');
    
    // Get all companions that we want to make public (excluding any that might already be)
    const companions = await prisma.companion.findMany({
      where: {
        // Filter for the imported companions by looking at specific IDs
        // or alternatively you could filter by userId if they all share the same userId
        OR: [
          { name: { contains: 'Maya Reyes' } },
          { name: { contains: 'Marcus Blackwell' } },
          { name: { contains: 'Jake Wilson' } },
          { name: { contains: 'Zephyra Starweaver' } },
          { name: { contains: 'Grimble Quickfingers' } },
          { name: { contains: 'Lotus-9' } },
          { name: { contains: 'Dr. Vex-117' } }
        ]
      }
    });
    
    console.log(`Found ${companions.length} companions to publish`);
    
    // Update companions to be public and globally visible
    for (const companion of companions) {
      await prisma.companion.update({
        where: { id: companion.id },
        data: {
          private: false,
          isFree: true,
        }
      });
      
      console.log(`✅ Published ${companion.name}`);
    }
    
    console.log('🎉 All companions published successfully!');
    
  } catch (error) {
    console.error('Error publishing companions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
publishCompanions().catch(console.error); 