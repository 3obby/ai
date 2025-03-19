// Script to add vanilla ChatGPT bot presets
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GPT model presets
const GPT_PRESETS = [
  {
    name: 'ChatGPT (GPT-4)',
    instructions: 'You are ChatGPT, a large language model trained by OpenAI, based on the GPT-4 architecture. You are designed to be helpful, harmless, and honest. You provide informative, balanced responses and always prioritize user safety. Respond in a conversational manner to assist the user with their questions to the best of your ability.',
    model: 'gpt-4',
    description: 'The most advanced OpenAI model with improved reasoning and instruction-following capabilities.',
    src: 'https://api.dicebear.com/7.x/bottts/png?seed=gpt4&backgroundColor=00a67e'
  },
  {
    name: 'ChatGPT (GPT-3.5)',
    instructions: 'You are ChatGPT, a large language model trained by OpenAI, based on the GPT-3.5 architecture. You are designed to be helpful, harmless, and honest. You provide informative, balanced responses and always prioritize user safety. Respond in a conversational manner to assist the user with their questions to the best of your ability.',
    model: 'gpt-3.5-turbo',
    description: 'Fast and efficient OpenAI model with good general knowledge and capabilities.',
    src: 'https://api.dicebear.com/7.x/bottts/png?seed=gpt35&backgroundColor=00a67e'
  }
];

// Helper to check if a preset already exists
async function presetExists(name: string): Promise<boolean> {
  const existingCompanion = await prisma.companion.findFirst({
    where: { name }
  });
  return !!existingCompanion;
}

async function main() {
  console.log('Starting to add ChatGPT preset bots...');
  
  // Find or create a "Presets" category
  let presetsCategory = await prisma.category.findFirst({
    where: { name: 'Presets' }
  });
  
  if (!presetsCategory) {
    presetsCategory = await prisma.category.create({
      data: { name: 'Presets' }
    });
    console.log('Created new "Presets" category');
  }
  
  // Add each GPT preset
  for (const preset of GPT_PRESETS) {
    try {
      // Check if preset already exists
      if (await presetExists(preset.name)) {
        console.log(`Skipping existing preset: ${preset.name}`);
        continue;
      }
      
      // Create the preset companion
      await prisma.companion.create({
        data: {
          name: preset.name,
          instructions: preset.instructions,
          src: preset.src,
          userId: 'system', // Use 'system' for presets
          userName: 'OpenAI',
          xpEarned: 0,
          tokensBurned: 0,
          private: false,
          isFree: true,
          messageDelay: 0,
          sendMultipleMessages: false,
          categoryId: presetsCategory.id,
          customIntroduction: `Hello! I'm ${preset.name}. ${preset.description} How can I help you today?`
        } as any // Type assertion to avoid Prisma client validation
      });
      
      console.log(`Added preset bot: ${preset.name}`);
    } catch (error) {
      console.error(`Error adding preset ${preset.name}:`, error);
    }
  }
  
  console.log('Finished adding ChatGPT preset bots!');
}

main()
  .catch((e) => {
    console.error('Error adding ChatGPT presets:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 