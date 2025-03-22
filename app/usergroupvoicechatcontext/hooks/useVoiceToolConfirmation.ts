'use client';

import { useState, useCallback } from 'react';
import voiceToolCallingService from '../services/voiceToolCallingService';
import { ToolResult } from '../types';

interface ToolConfirmationState {
  isOpen: boolean;
  toolName: string;
  arguments: Record<string, any>;
  confidence: number;
}

export interface UseVoiceToolConfirmationResult {
  confirmationState: ToolConfirmationState;
  showToolConfirmation: (toolName: string, args: Record<string, any>, confidence: number) => void;
  hideToolConfirmation: () => void;
  confirmToolExecution: () => Promise<ToolResult | null>;
  denyToolExecution: () => void;
}

export function useVoiceToolConfirmation(): UseVoiceToolConfirmationResult {
  const [confirmationState, setConfirmationState] = useState<ToolConfirmationState>({
    isOpen: false,
    toolName: '',
    arguments: {},
    confidence: 0,
  });

  const showToolConfirmation = useCallback((
    toolName: string, 
    args: Record<string, any>, 
    confidence: number
  ) => {
    setConfirmationState({
      isOpen: true,
      toolName,
      arguments: args,
      confidence,
    });
  }, []);

  const hideToolConfirmation = useCallback(() => {
    setConfirmationState(prev => ({
      ...prev,
      isOpen: false,
    }));
  }, []);

  const confirmToolExecution = useCallback(async (): Promise<ToolResult | null> => {
    try {
      if (!confirmationState.toolName) {
        return null;
      }

      const result = await voiceToolCallingService.executeVoiceToolCall(
        confirmationState.toolName,
        confirmationState.arguments
      );

      hideToolConfirmation();
      return result;
    } catch (error) {
      console.error('Error executing tool:', error);
      hideToolConfirmation();
      return null;
    }
  }, [confirmationState.toolName, confirmationState.arguments, hideToolConfirmation]);

  const denyToolExecution = useCallback(() => {
    hideToolConfirmation();
  }, [hideToolConfirmation]);

  return {
    confirmationState,
    showToolConfirmation,
    hideToolConfirmation,
    confirmToolExecution,
    denyToolExecution,
  };
}

export default useVoiceToolConfirmation; 