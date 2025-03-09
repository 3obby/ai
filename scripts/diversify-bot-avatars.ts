// Script to generate diverse bot avatars
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Avatar style options from DiceBear
const AVATAR_STYLES = [
  'adventurer', 
  'adventurer-neutral', 
  'avataaars', 
  'big-ears', 
  'big-ears-neutral', 
  'big-smile', 
  'bottts', 
  'croodles', 
  'croodles-neutral', 
  'fun-emoji',
  'lorelei', 
  'micah', 
  'miniavs', 
  'notionists', 
  'open-peeps', 
  'personas', 
  'pixel-art'
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
function generateAvatarUrl(name: string, style?: string): string {
  const selectedStyle = style || AVATAR_STYLES[Math.floor(Math.random() * AVATAR_STYLES.length)];
  const seed = generateSeed(name);
  
  // Select colors based on style
  let backgroundColor = '';
  
  if (['bottts', 'avataaars', 'personas'].includes(selectedStyle)) {
    // Pastel background for robot/character styles
    backgroundColor = '&backgroundColor=b6e3f4,c0aede,d1d4f9';
  }
  
  return `https://api.dicebear.com/7.x/${selectedStyle}/png?seed=${seed}&size=200${backgroundColor}`;
}

async function main() {
  console.log('Starting bot avatar diversification...');
  
  // Get all companions
  const companions = await prisma.companion.findMany();
  console.log(`Found ${companions.length} companions`);
  
  for (const companion of companions) {
    try {
      // Generate a style that fits the character name
      // We'll use a character-appropriate style when possible
      let style;
      
      // Choose style based on character type/name
      const nameLower = companion.name.toLowerCase();
      
      if (nameLower.includes('robot') || nameLower.includes('ai') || 
          nameLower.includes('bot') || nameLower.includes('tech')) {
        style = 'bottts';
      } else if (nameLower.includes('pixel') || nameLower.includes('game') || 
                 nameLower.includes('fortnite') || nameLower.includes('duty')) {
        style = 'pixel-art';
      } else if (nameLower.includes('cat') || nameLower.includes('dog') || 
                 nameLower.includes('animal')) {
        style = 'big-smile';
      } else if (companion.categoryId === '35e89cd6-7e12-4383-86d2-c5465ddb4f2e') {
        // Philosophy category
        style = 'personas';
      } else if (companion.categoryId === '392bdce3-7e7c-4e8c-91cf-114c5ddf8e6b') {
        // Scientists category
        style = 'micah';
      } else if (companion.categoryId === 'dd5748a7-6e52-4a57-925d-92af7a149f7a' ||
                 companion.categoryId === 'be9f47a1-70d9-4af9-9e17-87c9713fbde6') {
        // Musicians or Famous People
        style = 'avataaars';
      } else {
        // Random style for others
        style = AVATAR_STYLES[Math.floor(Math.random() * AVATAR_STYLES.length)];
      }
      
      // Only update if src is empty or using default avatar
      if (!companion.src || 
          companion.src.includes('placeholder') || 
          companion.src === 'https://api.dicebear.com/7.x/bottts/png?seed=1234') {
        
        const newAvatarUrl = generateAvatarUrl(companion.name, style);
        
        await prisma.companion.update({
          where: { id: companion.id },
          data: { src: newAvatarUrl }
        });
        
        console.log(`Updated avatar for "${companion.name}" with style: ${style}`);
      } else {
        console.log(`Skipping avatar update for "${companion.name}" - already has custom avatar`);
      }
    } catch (error) {
      console.error(`Error updating avatar for companion ${companion.name}:`, error);
    }
  }
  
  console.log('Bot avatar diversification completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during avatar diversification:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 