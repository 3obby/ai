#!/usr/bin/env node
/**
 * Generate Static Cache for Dashboard
 * 
 * This script generates a static cache file for anonymous users
 * to improve dashboard loading performance.
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();
const MAX_DESCRIPTION_LENGTH = 40;
const PUBLIC_DIR = path.join(process.cwd(), 'public');
const CACHE_FILE = path.join(PUBLIC_DIR, 'static-cache.json');

async function generateStaticCache() {
  console.log('🔄 Generating static cache for dashboard...');
  
  try {
    // Ensure public directory exists
    if (!fs.existsSync(PUBLIC_DIR)) {
      fs.mkdirSync(PUBLIC_DIR, { recursive: true });
    }
    
    // Get categories
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true }
    });
    
    // Get public companions (limited to first page)
    const companions = await prisma.companion.findMany({
      where: {
        OR: [
          { private: false },
          { userId: 'system' }
        ]
      },
      orderBy: { createdAt: 'desc' },
      take: 12,
      select: {
        id: true,
        name: true,
        src: true,
        description: true,
        categoryId: true,
        userName: true,
        isFree: true,
        global: true,
        createdAt: true,
        _count: {
          select: { messages: true }
        }
      }
    });
    
    // Get total count
    const countResult = await prisma.$executeRaw`
      SELECT COUNT(*) as count FROM "Companion" 
      WHERE (private = false OR "userId" = 'system')
    `;
    
    const totalCompanions = Array.isArray(countResult) && countResult.length > 0 
      ? Number(countResult[0]?.count || 0) 
      : companions.length;
    
    // Process companions to minimize data size
    const processedCompanions = companions.map(companion => ({
      id: companion.id,
      name: companion.name,
      src: companion.src,
      description: companion.description?.length > MAX_DESCRIPTION_LENGTH ? 
        companion.description.substring(0, MAX_DESCRIPTION_LENGTH) + '...' : 
        companion.description || 'No description',
      categoryId: companion.categoryId,
      userName: companion.userName,
      isFree: companion.isFree,
      global: companion.global || false,
      createdAt: companion.createdAt,
      _count: { messages: companion._count?.messages || 0 }
    }));
    
    // Create cache data structure
    const cacheData = {
      categories,
      companions: processedCompanions,
      totalCompanions,
      currentPage: 1,
      pageSize: 12,
      generation: {
        timestamp: Date.now(),
        version: '1.0'
      }
    };
    
    // Write to file
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cacheData, null, 2));
    
    console.log(`✅ Static cache generated successfully: ${CACHE_FILE}`);
    console.log(`Cache contains ${companions.length} companions and ${categories.length} categories`);
    return true;
  } catch (error) {
    console.error('❌ Static cache generation error:', error);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

generateStaticCache()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  }); 