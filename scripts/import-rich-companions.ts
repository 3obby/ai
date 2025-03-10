// Script to import rich companions with detailed character frameworks
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// Define the extended companion structure with character framework
interface RichCompanionJson {
  id: string;
  userId: string;
  userName: string;
  src: string;
  name: string;
  description: string;
  characterFramework?: {
    coreTraits?: {
      personality?: {
        dominant?: string[];
        secondary?: string[];
        situational?: string[];
      };
      values?: string[];
      cognitiveStyle?: {
        thinking?: string;
        decisions?: string;
        attention?: string;
      };
    };
    background?: {
      upbringing?: string;
      formativeEvents?: Array<{
        event: string;
        impact: string;
        age?: number;
      }>;
    };
  };
  exampleDialogues?: Array<{
    context: string;
    dialogue: string;
  }>;
  instructions?: string;
  seed?: string;
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

// Generate seed conversation from example dialogues
function generateSeedFromExamples(examples?: Array<{context: string; dialogue: string}>): string {
  if (!examples || examples.length === 0) {
    return "You are a helpful AI companion.";
  }
  
  // Use the first example dialogue as seed
  return examples[0].dialogue;
}

// Generate instructions from character framework
function generateInstructions(companion: RichCompanionJson): string {
  const framework = companion.characterFramework;
  if (!framework) {
    return companion.instructions || `You are ${companion.name}. ${companion.description}`;
  }

  let instructions = `# Character: ${companion.name}\n\n`;
  instructions += `## Background\n${companion.description}\n\n`;
  
  // Add personality traits if available
  if (framework.coreTraits?.personality) {
    instructions += "## Personality\n";
    const personality = framework.coreTraits.personality;
    
    if (personality.dominant?.length) {
      instructions += `- Dominant traits: ${personality.dominant.join(", ")}\n`;
    }
    
    if (personality.secondary?.length) {
      instructions += `- Secondary traits: ${personality.secondary.join(", ")}\n`;
    }
    
    if (personality.situational?.length) {
      instructions += `- Situational behaviors: ${personality.situational.join(", ")}\n`;
    }
    
    instructions += "\n";
  }
  
  // Add values if available
  if (framework.coreTraits?.values?.length) {
    instructions += "## Core Values\n";
    framework.coreTraits.values.forEach(value => {
      instructions += `- ${value}\n`;
    });
    instructions += "\n";
  }
  
  // Add cognitive style if available
  if (framework.coreTraits?.cognitiveStyle) {
    instructions += "## Thinking Style\n";
    const style = framework.coreTraits.cognitiveStyle;
    
    if (style.thinking) {
      instructions += `- Thought process: ${style.thinking}\n`;
    }
    
    if (style.decisions) {
      instructions += `- Decision making: ${style.decisions}\n`;
    }
    
    if (style.attention) {
      instructions += `- Attention focus: ${style.attention}\n`;
    }
    
    instructions += "\n";
  }
  
  // Add background details if available
  if (framework.background) {
    if (framework.background.upbringing) {
      instructions += `## Upbringing\n${framework.background.upbringing}\n\n`;
    }
    
    if (framework.background.formativeEvents?.length) {
      instructions += "## Formative Experiences\n";
      framework.background.formativeEvents.forEach(event => {
        instructions += `- Age ${event.age || "unknown"}: ${event.event} — ${event.impact}\n`;
      });
      instructions += "\n";
    }
  }
  
  // Add conversation style guidance from example dialogues
  if (companion.exampleDialogues?.length) {
    instructions += "## Conversation Style\n";
    instructions += "Your responses should match the style shown in these example interactions:\n\n";
    
    companion.exampleDialogues.forEach((example, i) => {
      instructions += `### Example ${i+1}: ${example.context}\n\`\`\`\n${example.dialogue}\n\`\`\`\n\n`;
    });
  }
  
  return instructions;
}

async function importRichCompanions() {
  console.log('🚀 Starting RICH companion import...');
  
  try {
    // Read the JSON file - try different possible locations
    const possiblePaths = [
      path.join(process.cwd(), 'companions', 'aa.json'),
      path.join(process.cwd(), 'aa.json'),
      path.join(process.cwd(), 'companions', 'Generated_Companions.json')
    ];
    
    let fileContent = '';
    let filePath = '';
    
    for (const testPath of possiblePaths) {
      if (fs.existsSync(testPath)) {
        filePath = testPath;
        fileContent = fs.readFileSync(testPath, 'utf8');
        console.log(`📄 Found companion file at: ${testPath}`);
        break;
      }
    }
    
    if (!fileContent) {
      throw new Error("Could not find companion file in any of the expected locations");
    }
    
    // Parse as either a single companion or an array
    let companions: RichCompanionJson[] = [];
    const parsed = JSON.parse(fileContent);
    
    if (Array.isArray(parsed)) {
      companions = parsed;
    } else {
      companions = [parsed]; // Single companion object
    }
    
    console.log(`📄 Found ${companions.length} companions to import`);
    
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
    console.log('🧠 Importing rich companions with character frameworks...');
    let successCount = 0;
    
    for (const companion of companions) {
      try {
        // Convert date strings to proper Date objects
        const createdAt = new Date(companion.createdAt || new Date());
        const updatedAt = new Date(companion.updatedAt || new Date());
        
        // Generate enhanced instructions from character framework
        const enhancedInstructions = generateInstructions(companion);
        
        // Generate seed from example dialogues or use provided seed
        const generatedSeed = companion.seed || generateSeedFromExamples(companion.exampleDialogues);
        
        // Create structured personality config from character framework
        const personalityConfig = companion.characterFramework ? {
          traits: companion.characterFramework.coreTraits?.personality || {},
          values: companion.characterFramework.coreTraits?.values || [],
          cognitiveStyle: companion.characterFramework.coreTraits?.cognitiveStyle || {}
        } : {};
        
        // Create knowledge config from background info
        const knowledgeConfig = companion.characterFramework?.background ? {
          background: companion.characterFramework.background
        } : {};
        
        // Store example dialogues in interaction config
        const interactionConfig = companion.exampleDialogues ? {
          examples: companion.exampleDialogues
        } : {};
        
        // Create the companion
        // @ts-ignore - This is a one-time import script
        await prisma.companion.create({
          data: {
            id: companion.id,
            userId: companion.userId,
            userName: companion.userName,
            name: companion.name,
            description: companion.description,
            instructions: enhancedInstructions,
            src: companion.src || "",
            seed: generatedSeed,
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
            personalityConfig: personalityConfig,
            knowledgeConfig: knowledgeConfig,
            interactionConfig: interactionConfig,
            toolConfig: {},
            global: true, // Make them visible to everyone
            views: 0,
            votes: 0,
            personality: {},
            toolAccess: [],
            version: 1
          } as any, // Type assertion to bypass TypeScript checks
        });
        
        successCount++;
        console.log(`✨ Imported rich companion: ${companion.name}`);
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
importRichCompanions().catch(error => {
  console.error('Fatal error during import:', error);
  process.exit(1);
}); 