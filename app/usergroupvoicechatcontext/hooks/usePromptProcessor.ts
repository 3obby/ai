'use client';

import { useState, useCallback } from 'react';
import { Bot } from '../types/bots';
import { Message } from '../types/messages';
import { GroupChatSettings } from '../types/settings';
import { 
  processMessage, 
  ProcessingContext 
} from '../services/prompt-processor-service';

interface UsePromptProcessorOptions {
  settings: GroupChatSettings;
  messages: Message[];
}

interface UsePromptProcessorResult {
  processUserMessage: (
    userMessage: Message, 
    bots: Bot[], 
    onBotResponse: (botMessage: Message) => void
  ) => Promise<void>;
  isProcessing: boolean;
  currentRecursionDepth: number;
  processingStats: {
    totalProcessingTime: number;
    preProcessingTime: number;
    postProcessingTime: number;
    recursionCount: number;
  };
  resetStats: () => void;
}

export function usePromptProcessor({
  settings,
  messages
}: UsePromptProcessorOptions): UsePromptProcessorResult {
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentRecursionDepth, setCurrentRecursionDepth] = useState(0);
  const [processingStats, setProcessingStats] = useState({
    totalProcessingTime: 0,
    preProcessingTime: 0,
    postProcessingTime: 0,
    recursionCount: 0
  });

  const resetStats = useCallback(() => {
    setProcessingStats({
      totalProcessingTime: 0,
      preProcessingTime: 0,
      postProcessingTime: 0,
      recursionCount: 0
    });
  }, []);

  const updateStats = useCallback((message: Message) => {
    const processingInfo = message.metadata?.processingInfo;
    
    if (!processingInfo) return;
    
    setProcessingStats(prev => ({
      totalProcessingTime: prev.totalProcessingTime + processingInfo.processingTime,
      preProcessingTime: prev.preProcessingTime + (processingInfo.preProcessed ? processingInfo.processingTime / 2 : 0),
      postProcessingTime: prev.postProcessingTime + (processingInfo.postProcessed ? processingInfo.processingTime / 2 : 0),
      recursionCount: prev.recursionCount + (processingInfo.recursionDepth > 0 ? 1 : 0)
    }));
    
    // Update current recursion depth
    setCurrentRecursionDepth(processingInfo.recursionDepth);
  }, []);

  const processUserMessage = useCallback(async (
    userMessage: Message,
    bots: Bot[],
    onBotResponse: (botMessage: Message) => void
  ) => {
    if (!bots.length) return;
    
    setIsProcessing(true);
    
    try {
      // Process message with each bot
      const processingPromises = bots.map(bot => {
        const context: ProcessingContext = {
          settings,
          messages,
          currentDepth: 0
        };
        
        return new Promise<void>((resolve) => {
          processMessage(
            userMessage,
            bot,
            context,
            (botMessage) => {
              // Update stats and forward the message
              updateStats(botMessage);
              onBotResponse(botMessage);
              resolve();
            }
          );
        });
      });
      
      // Wait for all bots to finish processing
      await Promise.all(processingPromises);
    } catch (error) {
      console.error('Error processing messages:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [settings, messages, updateStats]);

  return {
    processUserMessage,
    isProcessing,
    currentRecursionDepth,
    processingStats,
    resetStats
  };
} 