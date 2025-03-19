'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import useSWR from 'swr';
import axios from 'axios';
import { Companion } from '@/app/shared/types/companion';

interface CompanionsState {
  companions: Companion[];
  isLoading: boolean;
  error: any;
  selectedCategory: string | null;
  searchQuery: string;
  mutateCompanions: () => void;
  setSelectedCategory: (category: string | null) => void;
  setSearchQuery: (query: string) => void;
}

const CompanionsContext = createContext<CompanionsState | undefined>(undefined);

export const CompanionsProvider = ({ children }: { children: ReactNode }) => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Build a key based on the filters
  const getKey = () => {
    let key = '/api/companions';
    const params = new URLSearchParams();
    
    if (selectedCategory) {
      params.append('categoryId', selectedCategory);
    }
    
    if (searchQuery) {
      params.append('name', searchQuery);
    }
    
    if (params.toString()) {
      key += `?${params.toString()}`;
    }
    
    return key;
  };

  // SWR hook for data fetching with caching and revalidation
  const { data, error, isLoading, mutate } = useSWR<{ companions: Companion[] }>(
    getKey(),
    async (url) => {
      const response = await axios.get(url);
      return response.data;
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 10000, // 10 seconds
    }
  );

  // Provide the state and actions to all children
  const value: CompanionsState = {
    companions: data?.companions || [],
    isLoading,
    error,
    selectedCategory,
    searchQuery,
    mutateCompanions: mutate,
    setSelectedCategory,
    setSearchQuery,
  };

  return (
    <CompanionsContext.Provider value={value}>
      {children}
    </CompanionsContext.Provider>
  );
};

export const useCompanions = (): CompanionsState => {
  const context = useContext(CompanionsContext);
  
  if (context === undefined) {
    throw new Error('useCompanions must be used within a CompanionsProvider');
  }
  
  return context;
}; 