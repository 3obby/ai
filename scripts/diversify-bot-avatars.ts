// Script to generate diverse bot avatars
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Bot-themed avatar style options from DiceBear
const BOT_AVATAR_STYLES = [
  'bottts',           // Classic robots
  'pixel-art',        // Pixel art style (can be robot-themed)
  'shapes',           // Abstract shapes
  'identicon',        // Unique pattern identifiers
  'cells',            // Cell-like patterns
  'thumbs',           // Thumb-style avatars (can be made to look tech-y)
  'rings',            // Abstract ring patterns
  'initials'          // For initializing with bot name initials
];

// Available modifier options for bottts style
const BOTTTS_MODIFIERS = [
  '&mouthProbability=100&sidesMultiProbability=100&topProbability=100&textureProbability=80', // Complex robots
  '&mouthProbability=100&sidesMultiProbability=0&topProbability=100&textureProbability=50',   // Cleaner robots
  '&mouthProbability=100&sidesMultiProbability=0&topProbability=100&textureProbability=0',    // Simple robots
  '&mouthProbability=100&sidesMultiProbability=100&topProbability=0&textureProbability=80',   // No antenna bots
  '&mouthProbability=100&sidesMultiProbability=100&topProbability=50&textureProbability=100', // High texture robots
];

// Fun background color options
const BACKGROUND_COLORS = [
  'b6e3f4',   // Light blue
  'c0aede',   // Light purple
  'd1d4f9',   // Light lavender
  'ffd5dc',   // Light pink
  'c8f7c5',   // Light green
  'ffeaa7',   // Light yellow
  'fab1a0',   // Light coral
  'a29bfe',   // Periwinkle
  '81ecec',   // Cyan
  '74b9ff',   // Blue
];

// Generate a seed based on name or random if no name
function generateSeed(name: string): string {
  if (!name) return Math.random().toString(36).substring(2, 12);
  
  // Use the name to create a deterministic but unique seed
  return name.toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .padEnd(5, name[0] || 'x')
    .substring(0, 10) + 
    Math.floor(Math.random() * 1000).toString();
}

// Generate a DiceBear avatar URL
function generateAvatarUrl(name: string): string {
  // Weighted selection - bottts should be most common
  const styleWeights = [
    { style: 'bottts', weight: 70 },    // 70% chance for bottts
    { style: 'pixel-art', weight: 15 }, // 15% chance for pixel-art
    { style: 'shapes', weight: 5 },     // 5% chance for shapes
    { style: 'identicon', weight: 3 },  // 3% chance for identicon
    { style: 'cells', weight: 3 },      // 3% chance for cells
    { style: 'thumbs', weight: 2 },     // 2% chance for thumbs
    { style: 'rings', weight: 1 },      // 1% chance for rings
    { style: 'initials', weight: 1 }    // 1% chance for initials
  ];
  
  // Weighted random selection
  const totalWeight = styleWeights.reduce((sum, item) => sum + item.weight, 0);
  let random = Math.random() * totalWeight;
  
  let selectedStyle = 'bottts'; // Default fallback
  for (const { style, weight } of styleWeights) {
    if (random < weight) {
      selectedStyle = style;
      break;
    }
    random -= weight;
  }
  
  const seed = generateSeed(name);
  
  // Random background color
  const backgroundColor = BACKGROUND_COLORS[Math.floor(Math.random() * BACKGROUND_COLORS.length)];
  
  // Add bottts-specific modifiers if bottts style is selected
  let modifiers = '';
  if (selectedStyle === 'bottts') {
    modifiers = BOTTTS_MODIFIERS[Math.floor(Math.random() * BOTTTS_MODIFIERS.length)];
  }
  
  return `https://api.dicebear.com/7.x/${selectedStyle}/png?seed=${seed}&size=200&backgroundColor=${backgroundColor}${modifiers}`;
}

async function main() {
  console.log('Starting bot avatar regeneration with robot styles...');
  
  // Get all companions
  const companions = await prisma.companion.findMany();
  console.log(`Found ${companions.length} companions`);
  
  let updatedCount = 0;
  
  for (const companion of companions) {
    try {
      // Generate new robot avatar URL
      const newAvatarUrl = generateAvatarUrl(companion.name);
      
      // Update all avatars to bot styles
      await prisma.companion.update({
        where: { id: companion.id },
        data: { src: newAvatarUrl }
      });
      
      updatedCount++;
      console.log(`Updated avatar for "${companion.name}" to robot style`);
    } catch (error) {
      console.error(`Error updating avatar for companion ${companion.name}:`, error);
    }
  }
  
  console.log(`Bot avatar regeneration completed successfully! Updated ${updatedCount} avatars.`);
}

main()
  .catch((e) => {
    console.error('Error during avatar regeneration:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 