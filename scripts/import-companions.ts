// Script to import categories and companions from JSON files
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// Read JSON files
const categoriesPath = path.join(process.cwd(), 'companions', 'Category.json');
const companionsPath = path.join(process.cwd(), 'companions', 'Generated_Companions.json');

const categories = JSON.parse(fs.readFileSync(categoriesPath, 'utf8'));
const companions = JSON.parse(fs.readFileSync(companionsPath, 'utf8'));

async function main() {
  console.log('Starting database import...');
  
  // First import categories
  console.log('Importing categories...');
  for (const category of categories) {
    const existingCategory = await prisma.category.findUnique({
      where: { id: category.id }
    });

    if (!existingCategory) {
      await prisma.category.create({
        data: {
          id: category.id,
          name: category.name
        }
      });
      console.log(`Created category: ${category.name}`);
    } else {
      console.log(`Skipping existing category: ${category.name}`);
    }
  }
  
  // Then import companions
  console.log('Importing companions...');
  for (const companion of companions) {
    const existingCompanion = await prisma.companion.findUnique({
      where: { id: companion.id }
    });

    if (!existingCompanion) {
      try {
        await prisma.companion.create({
          data: {
            id: companion.id,
            userId: companion.userId,
            userName: companion.userName,
            src: companion.src || 'https://api.dicebear.com/7.x/bottts/png?seed=1234',
            name: companion.name,
            instructions: companion.instructions,
            xpEarned: 0,
            private: companion.private || false,
            categoryId: companion.categoryId,
            isFree: true,
            messageDelay: 0,
            sendMultipleMessages: true,
            customIntroduction: null
          } as any  // Using type assertion to avoid linter errors with schema changes
        });
        console.log(`Created companion: ${companion.name}`);
      } catch (error) {
        console.error(`Error creating companion ${companion.name}:`, error);
      }
    } else {
      console.log(`Skipping existing companion: ${companion.name}`);
    }
  }

  console.log('Import completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during import:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 