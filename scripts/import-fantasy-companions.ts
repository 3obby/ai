// Script to import ONLY the fantasy companions from JSON file
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// Define the companion structure from the JSON
interface CompanionJson {
  id: string;
  userId: string;
  userName: string;
  src: string;
  name: string;
  description: string;
  instructions: string;
  seed: string;
  private: boolean;
  createdAt: string;
  updatedAt: string;
  categoryId: string;
}

// Create category names based on ID for better readability
function getCategoryName(categoryId: string): string {
  const categories: Record<string, string> = {
    '392bdce3-7e7c-4e8c-91cf-114c5ddf8e6b': 'Sci-Fi Characters',
    '35e89cd6-7e12-4383-86d2-c5465ddb4f2e': 'Mystic Characters',
    '9e43f0d4-deee-4152-badc-7b2cb5bd9272': 'Cyberpunk Characters',
    'a0a6e91a-8623-4cea-9108-6252e43d3f0f': 'Fantasy Characters',
    'b4ce8c8b-8d06-4b3c-bb04-faec3d4a0d03': 'Celebrity Characters',
    'dd5748a7-6e52-4a57-925d-92af7a149f7a': 'Music Artists'
  };
  
  return categories[categoryId] || `Category ${categoryId.substring(0, 6)}`;
}

async function importFantasyCompanions() {
  console.log('🚀 Starting FANTASY companion import...');
  
  try {
    // Read the JSON file
    const filePath = path.join(process.cwd(), 'companions', 'Generated_Companions.json');
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const companions = JSON.parse(fileContent) as CompanionJson[];
    
    console.log(`📄 Found ${companions.length} companions in the JSON file`);
    
    // Create categories first to ensure they exist
    const categoryMap = new Map<string, any>();
    const uniqueCategoryIds = [...new Set(companions.map(c => c.categoryId).filter(Boolean))];
    
    console.log(`🏷️ Creating ${uniqueCategoryIds.length} categories with proper names...`);
    
    // Create categories with proper names
    for (const categoryId of uniqueCategoryIds) {
      if (!categoryId) continue;
      
      const categoryName = getCategoryName(categoryId);
      try {
        const category = await prisma.category.create({
          data: {
            id: categoryId,
            name: categoryName,
          },
        });
        categoryMap.set(categoryId, category);
        console.log(`✅ Created category: ${categoryName}`);
      } catch (error) {
        console.error(`❌ Failed to create category ${categoryId}:`, error);
      }
    }
    
    // Import companions
    console.log('🧙‍♂️ Importing fantasy companions...');
    let successCount = 0;
    
    for (const companion of companions) {
      try {
        // Convert date strings to proper Date objects
        const createdAt = new Date(companion.createdAt);
        const updatedAt = new Date(companion.updatedAt);
        
        // Create the companion
        // @ts-ignore - This is a one-time import script
        await prisma.companion.create({
          data: {
            id: companion.id,
            userId: companion.userId,
            userName: companion.userName,
            name: companion.name,
            description: companion.description,
            instructions: companion.instructions,
            src: companion.src || "",
            seed: companion.seed,
            private: companion.private,
            createdAt,
            updatedAt,
            categoryId: companion.categoryId,
            isFree: true,
            tokensBurned: 0,
            messageDelay: 0,
            sendMultipleMessages: true,
            customIntroduction: null,
            xpEarned: 0,
            personalityConfig: {},
            knowledgeConfig: {},
            interactionConfig: {},
            toolConfig: {},
            global: true, // Make them visible to everyone!
            views: 0,
            votes: 0,
            personality: {},
            toolAccess: [],
            version: 1
          } as any, // Type assertion to bypass TypeScript checks
        });
        
        successCount++;
        console.log(`✨ Imported companion: ${companion.name}`);
      } catch (error) {
        console.error(`❌ Failed to import companion ${companion.name}:`, error);
      }
    }
    
    console.log(`🎉 Import completed! Successfully imported ${successCount} out of ${companions.length} companions.`);
  } catch (error) {
    console.error('❌ Import failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the import
importFantasyCompanions().catch(error => {
  console.error('Fatal error during import:', error);
  process.exit(1);
}); 