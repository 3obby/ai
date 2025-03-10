// Script to list all companions in the database
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function listCompanions() {
  try {
    console.log('🤖 Listing all companions in the database...');
    
    const companions = await prisma.companion.findMany({
      include: {
        category: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    console.log(`Total companions: ${companions.length}`);
    console.log('-------------------------------------------');
    
    companions.forEach((companion, index) => {
      console.log(`${index + 1}. ${companion.name}`);
      console.log(`   ID: ${companion.id}`);
      console.log(`   Category: ${companion.category?.name || 'None'}`);
      console.log(`   Privacy: ${companion.private ? 'Private' : 'Public'}`);
      console.log(`   Created: ${companion.createdAt}`);
      console.log('-------------------------------------------');
    });
    
  } catch (error) {
    console.error('Error listing companions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
listCompanions().catch(console.error);
