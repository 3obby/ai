// Script to identify and optimize large companion image files in the database
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const IMAGES_TO_CHECK = [
  'taylor-swift', // Taylor Swift image
  'taylor', // Taylor Swift (common variations)
  'swift', // Taylor Swift (common variations)
  'vanilla-openai', // Vanilla OpenAI image that's causing issues
];

const CLOUDINARY_PRESET = 'GroupChatBotBuilderai'; // Your Cloudinary preset

/**
 * Main function to identify and optimize companion images
 */
async function main() {
  try {
    console.log('Starting companion image optimization...');
    
    // Get all companions
    const companions = await prisma.companion.findMany({
      select: {
        id: true,
        name: true,
        src: true,
      },
    });
    
    console.log(`Found ${companions.length} companions in the database.`);
    
    // Initialize counters
    let largeImageCount = 0;
    let optimizedCount = 0;
    
    // Define large images (usually URLs containing the keywords or external URLs)
    for (const companion of companions) {
      // Check if this companion has an image that needs optimization
      const needsOptimization = IMAGES_TO_CHECK.some(keyword => 
        companion.name.toLowerCase().includes(keyword) || 
        (companion.src && companion.src.toLowerCase().includes(keyword))
      );
      
      // Check if it's a large external URL (not from Cloudinary or Dicebear)
      const isExternalLargeUrl = companion.src && 
        !companion.src.includes('cloudinary.com') && 
        !companion.src.includes('dicebear.com') &&
        !companion.src.startsWith('/') && // Not a local file
        companion.src.includes('http'); // Is a URL
      
      if (needsOptimization || isExternalLargeUrl) {
        largeImageCount++;
        console.log(`Found potential large image: ${companion.name} (${companion.src})`);
        
        // For this script, we'll replace with a DiceBear avatar
        // In a production environment, you might want to download, optimize, and re-upload
        const seed = companion.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        const timestamp = Date.now();
        const newImageUrl = `https://api.dicebear.com/7.x/bottts/png?seed=${seed}&size=200&backgroundColor=b6e3f4,c0aede,d1d4f9&t=${timestamp}`;
        
        // Update the companion in the database
        console.log(`Updating companion ${companion.id} image to: ${newImageUrl}`);
        
        await prisma.companion.update({
          where: { id: companion.id },
          data: { src: newImageUrl },
        });
        
        optimizedCount++;
        console.log(`Successfully optimized image for: ${companion.name}`);
      }
    }
    
    console.log('\n--- Summary ---');
    console.log(`Total companions checked: ${companions.length}`);
    console.log(`Large images identified: ${largeImageCount}`);
    console.log(`Images optimized: ${optimizedCount}`);
    
  } catch (error) {
    console.error('Error during image optimization:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
main(); 