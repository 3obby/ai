// Script to import companions from Generated_Companions.json
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// Define the companion structure matching our JSON file
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
  characterFramework?: any;
  knowledgeDomains?: any;
  interactionGuides?: any;
  exampleDialogues?: any;
}

async function importCompanions() {
  console.log('🤖 Starting companion import from Generated_Companions.json...');
  
  try {
    // Read the JSON file
    const filePath = path.join(process.cwd(), 'companions', 'Generated_Companions.json');
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const companions = JSON.parse(fileContent) as CompanionJson[];
    
    console.log(`📄 Found ${companions.length} companions in the JSON file`);
    
    // Create categories first to ensure they exist
    const categoryMap = new Map<string, any>();
    const uniqueCategoryIds = [...new Set(companions.map(c => c.categoryId).filter(Boolean))];
    
    console.log(`🏷️ Creating ${uniqueCategoryIds.length} categories if they don't exist...`);
    
    // Create placeholder categories with unique names
    for (const categoryId of uniqueCategoryIds) {
      if (!categoryId) continue;
      
      try {
        // Check if category exists first
        const existingCategory = await prisma.category.findUnique({
          where: { id: categoryId }
        });
        
        if (existingCategory) {
          categoryMap.set(categoryId, existingCategory);
          console.log(`✓ Using existing category: ${existingCategory.name}`);
          continue;
        }
        
        // Create a new category if it doesn't exist
        const categoryName = `Generated Category ${categoryId.substring(0, 6)}`;
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
    console.log('🔄 Importing companions...');
    let successCount = 0;
    
    for (const companion of companions) {
      try {
        // Check if companion already exists
        const existingCompanion = await prisma.companion.findUnique({
          where: { id: companion.id }
        });
        
        if (existingCompanion) {
          console.log(`⚠️ Companion ${companion.name} already exists, skipping...`);
          continue;
        }
        
        // Convert date strings to proper Date objects
        const createdAt = new Date(companion.createdAt);
        const updatedAt = new Date(companion.updatedAt);
        
        // Generate personality configuration from characterFramework if available
        const personalityConfig = companion.characterFramework ? {
          traits: {
            // Extract personality traits from characterFramework
            dominant: companion.characterFramework.coreTraits?.personality?.dominant || [],
            secondary: companion.characterFramework.coreTraits?.personality?.secondary || []
          },
          responseLength: "balanced",
          writingStyle: "casual"
        } : {};
        
        // Generate knowledge configuration from knowledgeDomains if available
        const knowledgeConfig = companion.knowledgeDomains ? {
          primaryExpertise: companion.knowledgeDomains.expertise?.[0] || "",
          secondaryExpertise: companion.knowledgeDomains.expertise?.slice(1) || [],
          confidenceThreshold: 7, // Default to confident
          citationStyle: "none"
        } : {};
        
        // Generate interaction configuration
        const interactionConfig = companion.interactionGuides ? {
          initiativeLevel: "balanced",
          conversationalMemory: "extensive",
          followUpBehavior: "frequent"
        } : {};
        
        // Create the companion with enhanced data
        await prisma.companion.create({
          data: {
            id: companion.id,
            userId: companion.userId,
            userName: companion.userName,
            name: companion.name,
            description: companion.description,
            instructions: generateInstructions(companion),
            src: companion.src || "",
            seed: companion.seed || companion.description, // Use description as seed if not available
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
            personalityConfig,
            knowledgeConfig,
            interactionConfig,
            toolConfig: {},
            global: false,
            views: 0,
            votes: 0,
            personality: {},
            toolAccess: [],
            version: 1
          },
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

// Helper function to generate rich instructions from the companion data
function generateInstructions(companion: CompanionJson): string {
  let instructions = '';
  
  // Add name and basic description
  instructions += `You are ${companion.name}. ${companion.description}\n\n`;
  
  // Add personality traits if available
  if (companion.characterFramework?.coreTraits?.personality) {
    const personality = companion.characterFramework.coreTraits.personality;
    
    if (personality.dominant && personality.dominant.length > 0) {
      instructions += `Your dominant personality traits are: ${personality.dominant.join(', ')}.\n`;
    }
    
    if (personality.secondary && personality.secondary.length > 0) {
      instructions += `Your secondary personality traits are: ${personality.secondary.join(', ')}.\n`;
    }
    
    if (personality.situational && personality.situational.length > 0) {
      instructions += `In specific situations, you can be: ${personality.situational.join(', ')}.\n`;
    }
  }
  
  // Add core values if available
  if (companion.characterFramework?.coreTraits?.values && companion.characterFramework.coreTraits.values.length > 0) {
    instructions += `\nYour core values include: ${companion.characterFramework.coreTraits.values.join(', ')}.\n`;
  }
  
  // Add background information if available
  if (companion.characterFramework?.background) {
    const background = companion.characterFramework.background;
    
    if (background.upbringing) {
      instructions += `\nYour background: ${background.upbringing}\n`;
    }
    
    if (background.education) {
      instructions += `You were educated at: ${background.education}\n`;
    }
    
    if (background.career) {
      instructions += `Your career: ${background.career}\n`;
    }
  }
  
  // Add knowledge domains if available
  if (companion.knowledgeDomains) {
    if (companion.knowledgeDomains.expertise && companion.knowledgeDomains.expertise.length > 0) {
      instructions += `\nYou have expertise in: ${companion.knowledgeDomains.expertise.join(', ')}.\n`;
    }
    
    if (companion.knowledgeDomains.moderate && companion.knowledgeDomains.moderate.length > 0) {
      instructions += `You have moderate knowledge of: ${companion.knowledgeDomains.moderate.join(', ')}.\n`;
    }
  }
  
  // Add speech patterns if available
  if (companion.characterFramework?.expressivePatterns?.speechStyle) {
    const speech = companion.characterFramework.expressivePatterns.speechStyle;
    
    if (speech.tempo) {
      instructions += `\nYour speech tempo: ${speech.tempo}\n`;
    }
    
    if (speech.vocabulary) {
      instructions += `Your vocabulary: ${speech.vocabulary}\n`;
    }
    
    if (speech.patterns) {
      instructions += `Your speech patterns: ${speech.patterns}\n`;
    }
  }
  
  // Add world view if available
  if (companion.characterFramework?.mentalModel?.worldview) {
    instructions += `\nYour worldview: ${companion.characterFramework.mentalModel.worldview}\n`;
  }
  
  return instructions;
}

// Run the import
importCompanions().catch(error => {
  console.error('Fatal error during import:', error);
  process.exit(1);
}); 