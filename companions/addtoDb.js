const { PrismaClient } = require('@prisma/client');
const companions = require('./Generated_Companions.json');

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Starting seeding companions...');
    
    // Add companions
    for (const companion of companions) {
      const existingCompanion = await prisma.companion.findUnique({
        where: { id: companion.id }
      });

      if (!existingCompanion) {
        await prisma.companion.create({
          data: {
            id: companion.id,
            userId: companion.userId,
            userName: companion.userName,
            src: companion.src,
            name: companion.name,
            description: companion.description,
            instructions: companion.instructions,
            seed: companion.seed,
            private: companion.private || false,
            categoryId: companion.categoryId
          }
        });
        console.log(`Created companion: ${companion.name}`);
      } else {
        console.log(`Skipping existing companion: ${companion.name}`);
      }
    }

    console.log('Seeding completed successfully!');
  } catch (error) {
    console.error('Error during seeding:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });