import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { PromptsState, PromptsAction, TogglePrompt, ToggleContainer } from '../types/prompts';

const initialState: PromptsState = {
  containers: [
    {
      id: 'default-container',
      title: 'My Custom Prompts',
      enabled: true,
      prompts: [
        {
          id: 'prompt-1',
          text: 'I prefer terse, casual output',
          enabled: true,
        },
        {
          id: 'prompt-2',
          text: 'I\'m allergic to shellfish and garlic, and prefer cheap dishes',
          enabled: false,
        },
        {
          id: 'prompt-3',
          text: 'Assume I don\'t know what I\'m talking about- could you help me identify an easier strategy for my goals?',
          enabled: true,
        },
      ],
    },
  ],
  standalonePrompts: [],
  isDrawerOpen: false,
};

function promptsReducer(state: PromptsState, action: PromptsAction): PromptsState {
  switch (action.type) {
    case 'TOGGLE_DRAWER':
      return { ...state, isDrawerOpen: !state.isDrawerOpen };
    case 'OPEN_DRAWER':
      return { ...state, isDrawerOpen: true };
    case 'CLOSE_DRAWER':
      return { ...state, isDrawerOpen: false };
      
    case 'ADD_PROMPT':
      return {
        ...state,
        standalonePrompts: [...state.standalonePrompts, action.prompt],
      };
      
    case 'REMOVE_PROMPT': {
      const newStandalonePrompts = state.standalonePrompts.filter(
        prompt => prompt.id !== action.promptId
      );
      return { ...state, standalonePrompts: newStandalonePrompts };
    }
    
    case 'UPDATE_PROMPT': {
      // Update in standalone prompts
      const updatedStandalonePrompts = state.standalonePrompts.map(prompt => 
        prompt.id === action.promptId 
          ? { ...prompt, ...action.updates } 
          : prompt
      );
      
      // Update in containers
      const updatedContainers = state.containers.map(container => {
        const updatedPrompts = container.prompts.map(prompt => 
          prompt.id === action.promptId 
            ? { ...prompt, ...action.updates } 
            : prompt
        );
        return { ...container, prompts: updatedPrompts };
      });
      
      return {
        ...state,
        standalonePrompts: updatedStandalonePrompts,
        containers: updatedContainers,
      };
    }
    
    case 'TOGGLE_PROMPT': {
      // Toggle in standalone prompts
      const toggledStandalonePrompts = state.standalonePrompts.map(prompt => 
        prompt.id === action.promptId 
          ? { ...prompt, enabled: !prompt.enabled } 
          : prompt
      );
      
      // Toggle in containers
      const toggledContainers = state.containers.map(container => {
        const toggledPrompts = container.prompts.map(prompt => 
          prompt.id === action.promptId 
            ? { ...prompt, enabled: !prompt.enabled } 
            : prompt
        );
        return { ...container, prompts: toggledPrompts };
      });
      
      return {
        ...state,
        standalonePrompts: toggledStandalonePrompts,
        containers: toggledContainers,
      };
    }
    
    case 'ADD_CONTAINER':
      return {
        ...state,
        containers: [...state.containers, action.container],
      };
      
    case 'REMOVE_CONTAINER': {
      const newContainers = state.containers.filter(
        container => container.id !== action.containerId
      );
      
      // Move any prompts from the removed container to standalone
      const containerToRemove = state.containers.find(
        container => container.id === action.containerId
      );
      
      const newStandalonePrompts = containerToRemove
        ? [...state.standalonePrompts, ...containerToRemove.prompts]
        : state.standalonePrompts;
        
      return { 
        ...state, 
        containers: newContainers,
        standalonePrompts: newStandalonePrompts
      };
    }
    
    case 'UPDATE_CONTAINER': {
      const updatedContainers = state.containers.map(container => 
        container.id === action.containerId 
          ? { ...container, ...action.updates } 
          : container
      );
      
      return { ...state, containers: updatedContainers };
    }
    
    case 'TOGGLE_CONTAINER': {
      const toggledContainers = state.containers.map(container => 
        container.id === action.containerId 
          ? { ...container, enabled: !container.enabled } 
          : container
      );
      
      return { ...state, containers: toggledContainers };
    }
    
    case 'ADD_PROMPT_TO_CONTAINER': {
      // Find the prompt in standalone prompts
      const promptToAdd = state.standalonePrompts.find(
        prompt => prompt.id === action.promptId
      );
      
      if (!promptToAdd) return state;
      
      // Remove from standalone prompts
      const newStandalonePrompts = state.standalonePrompts.filter(
        prompt => prompt.id !== action.promptId
      );
      
      // Add to container
      const updatedContainers = state.containers.map(container => 
        container.id === action.containerId 
          ? { ...container, prompts: [...container.prompts, promptToAdd] } 
          : container
      );
      
      return {
        ...state,
        standalonePrompts: newStandalonePrompts,
        containers: updatedContainers,
      };
    }
    
    case 'REMOVE_PROMPT_FROM_CONTAINER': {
      // Find the container with the prompt
      const containerWithPrompt = state.containers.find(container => 
        container.prompts.some(prompt => prompt.id === action.promptId)
      );
      
      if (!containerWithPrompt) return state;
      
      // Extract the prompt
      const promptToExtract = containerWithPrompt.prompts.find(
        prompt => prompt.id === action.promptId
      );
      
      // Remove from container
      const updatedContainers = state.containers.map(container => 
        container.id === containerWithPrompt.id 
          ? { 
              ...container, 
              prompts: container.prompts.filter(prompt => prompt.id !== action.promptId) 
            } 
          : container
      );
      
      return {
        ...state,
        standalonePrompts: [...state.standalonePrompts, promptToExtract!],
        containers: updatedContainers,
      };
    }
    
    case 'MOVE_PROMPT': {
      let newState = { ...state };
      let promptToMove: TogglePrompt | undefined;
      
      // Remove prompt from source
      if (action.fromContainerId) {
        // Remove from container
        const containerWithPrompt = state.containers.find(
          container => container.id === action.fromContainerId
        );
        
        if (containerWithPrompt) {
          // Find the prompt
          promptToMove = containerWithPrompt.prompts.find(
            prompt => prompt.id === action.promptId
          );
          
          // Remove from container
          newState.containers = state.containers.map(container => 
            container.id === action.fromContainerId 
              ? { 
                  ...container, 
                  prompts: container.prompts.filter(prompt => prompt.id !== action.promptId) 
                } 
              : container
          );
        }
      } else {
        // Remove from standalone
        promptToMove = state.standalonePrompts.find(
          prompt => prompt.id === action.promptId
        );
        
        newState.standalonePrompts = state.standalonePrompts.filter(
          prompt => prompt.id !== action.promptId
        );
      }
      
      if (!promptToMove) return state;
      
      // Add to destination
      if (action.toContainerId) {
        // Add to container
        newState.containers = newState.containers.map(container => 
          container.id === action.toContainerId 
            ? { ...container, prompts: [...container.prompts, promptToMove!] } 
            : container
        );
      } else {
        // Add to standalone
        newState.standalonePrompts = [...newState.standalonePrompts, promptToMove];
      }
      
      return newState;
    }
    
    default:
      return state;
  }
}

interface PromptsContextType {
  state: PromptsState;
  dispatch: React.Dispatch<PromptsAction>;
}

const PromptsContext = createContext<PromptsContextType | undefined>(undefined);

export function PromptsProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(promptsReducer, initialState);
  
  return (
    <PromptsContext.Provider value={{ state, dispatch }}>
      {children}
    </PromptsContext.Provider>
  );
}

export function usePromptsContext() {
  const context = useContext(PromptsContext);
  if (context === undefined) {
    throw new Error('usePromptsContext must be used within a PromptsProvider');
  }
  return context;
} 