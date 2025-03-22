'use client';

import React, { createContext, useContext, useReducer, ReactNode, useCallback } from 'react';

// Define the processing state type
interface ProcessingState {
  processingStages: Record<string, string>;
  activeTools: Record<string, string[]>;
  reprocessingCounts: Record<string, number>;
}

// Define actions for the reducer
type ProcessingAction =
  | { type: 'SET_PROCESSING_STAGE'; botId: string; stage: string }
  | { type: 'CLEAR_PROCESSING_STAGE'; botId: string }
  | { type: 'SET_ACTIVE_TOOLS'; botId: string; tools: string[] }
  | { type: 'CLEAR_ACTIVE_TOOLS'; botId: string }
  | { type: 'INCREMENT_REPROCESSING_COUNT'; botId: string }
  | { type: 'RESET_REPROCESSING_COUNT'; botId: string }
  | { type: 'RESET_ALL' };

// Initial state
const initialState: ProcessingState = {
  processingStages: {},
  activeTools: {},
  reprocessingCounts: {}
};

// Create context
interface ProcessingStateContextType {
  state: ProcessingState;
  dispatch: React.Dispatch<ProcessingAction>;
  setProcessingStage: (botId: string, stage: string) => void;
  clearProcessingStage: (botId: string) => void;
  setActiveTools: (botId: string, tools: string[]) => void;
  incrementReprocessingCount: (botId: string) => number;
  getReprocessingCount: (botId: string) => number;
}

const ProcessingStateContext = createContext<ProcessingStateContextType | undefined>(undefined);

// Reducer function
function processingReducer(state: ProcessingState, action: ProcessingAction): ProcessingState {
  switch (action.type) {
    case 'SET_PROCESSING_STAGE':
      return {
        ...state,
        processingStages: {
          ...state.processingStages,
          [action.botId]: action.stage
        }
      };
    case 'CLEAR_PROCESSING_STAGE':
      const newProcessingStages = { ...state.processingStages };
      delete newProcessingStages[action.botId];
      return {
        ...state,
        processingStages: newProcessingStages
      };
    case 'SET_ACTIVE_TOOLS':
      return {
        ...state,
        activeTools: {
          ...state.activeTools,
          [action.botId]: action.tools
        }
      };
    case 'CLEAR_ACTIVE_TOOLS':
      const newActiveTools = { ...state.activeTools };
      delete newActiveTools[action.botId];
      return {
        ...state,
        activeTools: newActiveTools
      };
    case 'INCREMENT_REPROCESSING_COUNT':
      const currentCount = state.reprocessingCounts[action.botId] || 0;
      return {
        ...state,
        reprocessingCounts: {
          ...state.reprocessingCounts,
          [action.botId]: currentCount + 1
        }
      };
    case 'RESET_REPROCESSING_COUNT':
      const newReprocessingCounts = { ...state.reprocessingCounts };
      delete newReprocessingCounts[action.botId];
      return {
        ...state,
        reprocessingCounts: newReprocessingCounts
      };
    case 'RESET_ALL':
      return initialState;
    default:
      return state;
  }
}

// Provider component
interface ProcessingStateProviderProps {
  children: ReactNode;
}

export function ProcessingStateProvider({ children }: ProcessingStateProviderProps) {
  const [state, dispatch] = useReducer(processingReducer, initialState);

  // Helper methods
  const setProcessingStage = useCallback((botId: string, stage: string) => {
    dispatch({ type: 'SET_PROCESSING_STAGE', botId, stage });
  }, []);

  const clearProcessingStage = useCallback((botId: string) => {
    dispatch({ type: 'CLEAR_PROCESSING_STAGE', botId });
  }, []);

  const setActiveTools = useCallback((botId: string, tools: string[]) => {
    dispatch({ type: 'SET_ACTIVE_TOOLS', botId, tools });
  }, []);

  const incrementReprocessingCount = useCallback((botId: string) => {
    dispatch({ type: 'INCREMENT_REPROCESSING_COUNT', botId });
    return (state.reprocessingCounts[botId] || 0) + 1;
  }, [state.reprocessingCounts]);

  const getReprocessingCount = useCallback((botId: string) => {
    return state.reprocessingCounts[botId] || 0;
  }, [state.reprocessingCounts]);

  return (
    <ProcessingStateContext.Provider 
      value={{ 
        state, 
        dispatch, 
        setProcessingStage, 
        clearProcessingStage, 
        setActiveTools, 
        incrementReprocessingCount,
        getReprocessingCount
      }}
    >
      {children}
    </ProcessingStateContext.Provider>
  );
}

// Hook for consuming the context
export function useProcessingState() {
  const context = useContext(ProcessingStateContext);
  if (context === undefined) {
    throw new Error('useProcessingState must be used within a ProcessingStateProvider');
  }
  return context;
} 