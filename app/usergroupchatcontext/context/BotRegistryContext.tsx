'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Bot } from '../types';
import { sampleBots } from '../data/sampleBots';

type BotRegistryContextType = {
  bots: Bot[];
  addBot: (bot: Bot) => void;
  updateBot: (id: string, updates: Partial<Bot>) => void;
  removeBot: (id: string) => void;
  getBot: (id: string) => Bot | undefined;
};

const BotRegistryContext = createContext<BotRegistryContextType | undefined>(undefined);

export function BotRegistryProvider({ 
  children,
  initialBots = sampleBots
}: { 
  children: ReactNode;
  initialBots?: Bot[];
}) {
  const [bots, setBots] = useState<Bot[]>(initialBots);

  const addBot = (bot: Bot) => {
    setBots((prevBots) => {
      // Check if bot with same ID already exists
      if (prevBots.some(b => b.id === bot.id)) {
        return prevBots;
      }
      return [...prevBots, bot];
    });
  };

  const updateBot = (id: string, updates: Partial<Bot>) => {
    setBots((prevBots) => 
      prevBots.map(bot => 
        bot.id === id
          ? { ...bot, ...updates }
          : bot
      )
    );
  };

  const removeBot = (id: string) => {
    setBots((prevBots) => prevBots.filter(bot => bot.id !== id));
  };

  const getBot = (id: string) => {
    return bots.find(bot => bot.id === id);
  };

  return (
    <BotRegistryContext.Provider value={{ bots, addBot, updateBot, removeBot, getBot }}>
      {children}
    </BotRegistryContext.Provider>
  );
}

export function useBotRegistry() {
  const context = useContext(BotRegistryContext);
  
  if (!context) {
    throw new Error('useBotRegistry must be used within a BotRegistryProvider');
  }
  
  return context;
} 