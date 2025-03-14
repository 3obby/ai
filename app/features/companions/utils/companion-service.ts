import { Companion } from '@/app/shared/types/companion';
import prismadb from '@/lib/prismadb';
import { cache } from 'react';

interface GetCompanionsParams {
  categoryId?: string;
  searchQuery?: string;
  limit?: number;
  userId?: string;
}

// Cache the companions fetch operation
export const getCompanions = cache(async ({ 
  categoryId, 
  searchQuery, 
  limit = 8,
  userId
}: GetCompanionsParams): Promise<Companion[]> => {
  try {
    const whereClause: any = {};

    // Add filtering conditions if provided
    if (categoryId) {
      whereClause.categoryId = categoryId;
    }
    
    if (searchQuery) {
      whereClause.name = {
        contains: searchQuery,
        mode: 'insensitive'
      };
    }
    
    if (userId) {
      whereClause.userId = userId;
    }

    // Query the database
    const companions = await prismadb.companion.findMany({
      where: whereClause,
      take: limit,
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        _count: {
          select: {
            messages: true
          }
        }
      }
    });

    return companions;
  } catch (error) {
    console.error('Error fetching companions:', error);
    return [];
  }
});

// Cache the companion by ID fetch operation
export const getCompanionById = cache(async (id: string): Promise<Companion | null> => {
  try {
    const companion = await prismadb.companion.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            messages: true
          }
        }
      }
    });
    
    return companion;
  } catch (error) {
    console.error(`Error fetching companion with id ${id}:`, error);
    return null;
  }
});

export interface Category {
  id: string;
  name: string;
}

// Cache the categories fetch operation
export const getCategories = cache(async (): Promise<Category[]> => {
  try {
    const categories = await prismadb.category.findMany({
      orderBy: {
        name: 'asc'
      }
    });
    
    return categories;
  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
}); 