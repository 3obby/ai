// Script to clean the database and import only Argo from aa.json
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

// Generate seed conversation from example dialogues
function generateSeedFromExamples(examples?: Array<{context: string; dialogue: string}>): string {
  if (!examples || examples.length === 0) {
    return "You are a helpful AI companion.";
  }
  
  // Use the first example dialogue as seed
  return examples[0].dialogue;
}

async function cleanAndImportArgo() {
  console.log('🧹 Cleaning database - removing all existing companions...');
  
  try {
    // Delete all existing companions
    const deleteResult = await prisma.companion.deleteMany({});
    console.log(`🗑️ Deleted ${deleteResult.count} existing companions`);
    
    // Read Argo from aa.json
    const filePath = path.join(process.cwd(), 'companions', 'aa.json');
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`Could not find Argo file at: ${filePath}`);
    }
    
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const argo = JSON.parse(fileContent) as RichCompanionJson;
    
    console.log(`📄 Found Argo character!`);
    
    // Check if the category exists, create if it doesn't
    const categoryId = argo.categoryId;
    let category = await prisma.category.findUnique({
      where: { id: categoryId }
    });
    
    if (!category) {
      category = await prisma.category.create({
        data: {
          id: categoryId,
          name: "Cyberpunk Characters" // Hard-coded since we know it's Argo's category
        }
      });
      console.log(`✅ Created category: Cyberpunk Characters`);
    } else {
      console.log(`✅ Found existing category: ${category.name}`);
    }
    
    // Generate enhanced instructions from character framework
    const enhancedInstructions = generateInstructions(argo);
    
    // Generate seed from example dialogues or use provided seed
    const generatedSeed = argo.seed || generateSeedFromExamples(argo.exampleDialogues);
    
    // Create structured personality config from character framework
    const personalityConfig = argo.characterFramework ? {
      traits: argo.characterFramework.coreTraits?.personality || {},
      values: argo.characterFramework.coreTraits?.values || [],
      cognitiveStyle: argo.characterFramework.coreTraits?.cognitiveStyle || {}
    } : {};
    
    // Store example dialogues in interaction config
    const interactionConfig = argo.exampleDialogues ? {
      examples: argo.exampleDialogues
    } : {};
    
    // Convert date strings to proper Date objects
    const createdAt = new Date(argo.createdAt || new Date());
    const updatedAt = new Date(argo.updatedAt || new Date());
    
    // Create Argo in the database
    // @ts-ignore - This is a one-time import script
    const importedArgo = await prisma.companion.create({
      data: {
        id: argo.id,
        userId: argo.userId,
        userName: argo.userName,
        name: argo.name,
        description: argo.description,
        instructions: enhancedInstructions,
        src: argo.src || "",
        seed: generatedSeed,
        private: argo.private,
        createdAt,
        updatedAt,
        categoryId: argo.categoryId,
        isFree: true,
        tokensBurned: 0,
        messageDelay: 0,
        sendMultipleMessages: true,
        customIntroduction: null,
        xpEarned: 0,
        personalityConfig: personalityConfig,
        knowledgeConfig: {},
        interactionConfig: interactionConfig,
        toolConfig: {},
        global: true, // Make Argo visible to everyone
        views: 0,
        votes: 0,
        personality: {},
        toolAccess: [],
        version: 1
      } as any, // Type assertion to bypass TypeScript checks
    });
    
    console.log(`✨ Successfully imported Argo!`);
    console.log(`🧠 Character framework with ${Object.keys(personalityConfig.traits || {}).length} trait groups and ${personalityConfig.values?.length || 0} values`);
    console.log(`📚 Conversation examples: ${interactionConfig.examples?.length || 0}`);
    
  } catch (error) {
    console.error('❌ Error during clean & import:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
cleanAndImportArgo().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
}); 