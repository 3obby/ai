// Script to import updated fantasy companions from JSON file
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

async function importCompanions() {
  console.log('🤖 Starting fantasy companion import...');
  
  try {
    // Read the JSON file
    const filePath = path.join(process.cwd(), 'companions', 'Generated_Companions.json');
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const companions = JSON.parse(fileContent) as CompanionJson[];
    
    console.log(`📄 Found ${companions.length} companions in the JSON file`);
    
    // Create categories first to ensure they exist
    const categoryMap = new Map<string, any>();
    const uniqueCategoryIds = [...new Set(companions.map(c => c.categoryId).filter(Boolean))];
    
    console.log(`🏷️ Creating ${uniqueCategoryIds.length} categories...`);
    
    // Create placeholder categories with unique names
    for (const categoryId of uniqueCategoryIds) {
      if (!categoryId) continue;
      
      const categoryName = `Category ${categoryId.substring(0, 6)}`;
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
    console.log('🔄 Importing fantasy companions...');
    let successCount = 0;
    
    for (const companion of companions) {
      try {
        // Convert date strings to proper Date objects
        const createdAt = new Date(companion.createdAt);
        const updatedAt = new Date(companion.updatedAt);
        
        // Create the companion - use type assertion to bypass TypeScript errors
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
            global: false,
            views: 0,
            votes: 0,
            personality: {},
            toolAccess: [],
            version: 1
          } as any, // Type assertion to bypass TypeScript checks
        });
        
        successCount++;
        console.log(`✅ Imported companion: ${companion.name}`);
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
importCompanions().catch(error => {
  console.error('Fatal error during import:', error);
  process.exit(1);
}); 