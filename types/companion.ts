import { Companion } from "@prisma/client";

export interface CompanionWithMessageCount extends Companion {
  _count: {
    messages: number;
  };
  userBurnedTokens?: UserBurnedTokens[];
}

// User Burned Tokens interface
export interface UserBurnedTokens {
  id: string;
  userId: string;
  companionId: string;
  tokensBurned: number;
  createdAt: Date;
  updatedAt: Date;
}

// New type definitions for companion customization

// Personality Configuration
export interface PersonalityConfigType {
  traits: {
    analytical_creative: number; // 0-10 scale (0: highly analytical, 10: highly creative)
    formal_casual: number; // 0-10 scale (0: very formal, 10: very casual)
    serious_humorous: number; // 0-10 scale (0: serious, 10: humorous)
    reserved_enthusiastic: number; // 0-10 scale (0: reserved, 10: enthusiastic)
    practical_theoretical: number; // 0-10 scale (0: practical, 10: theoretical)
  };
  voice: {
    humor: number; // 0-10 scale
    directness: number; // 0-10 scale
    warmth: number; // 0-10 scale
  };
  responseLength: 'concise' | 'balanced' | 'detailed';
  writingStyle: 'academic' | 'conversational' | 'technical' | 'narrative' | 'casual';
  templateId?: string; // Reference to a personality template if used
}

// Knowledge Configuration
export interface KnowledgeConfigType {
  expertiseAreas: string[]; // Array of expertise domains
  primaryExpertise: string; // Main area of expertise
  secondaryExpertise: string[]; // Secondary areas of expertise
  knowledgeDepth: number; // 0-10 scale (0: general, 10: specialized)
  confidenceThreshold: number; // 0-10 scale (when to express uncertainty)
  sourcePreferences: ('academic' | 'industry' | 'news' | 'general')[]; // Types of sources to prefer
  citationStyle: 'none' | 'inline' | 'footnote' | 'comprehensive';
}

// Interaction Pattern Configuration
export interface InteractionConfigType {
  initiativeLevel: number; // 0-10 scale (0: passive, 10: proactive)
  conversationalMemory: 'minimal' | 'moderate' | 'extensive';
  followUpBehavior: 'none' | 'occasional' | 'frequent';
  feedbackLoop: boolean; // Whether to ask for feedback on responses
  multiTurnReasoning: boolean; // Whether to enable step-by-step reasoning
}

// Tool Integration Configuration
export interface ToolConfigType {
  webSearch: {
    enabled: boolean;
    searchProvider?: 'google' | 'bing' | 'duckduckgo';
    maxResults?: number;
  };
  codeExecution: {
    enabled: boolean;
    languages?: string[];
  };
  dataVisualization: {
    enabled: boolean;
  };
  documentAnalysis: {
    enabled: boolean;
  };
  calculationTools: {
    enabled: boolean;
  };
  otherTools: Record<string, boolean>;
}

// Full companion configuration
export interface CompanionConfigType {
  personality: PersonalityConfigType;
  knowledge: KnowledgeConfigType;
  interaction: InteractionConfigType;
  tools: ToolConfigType;
}

// Personality templates
export interface PersonalityTemplateType {
  id: string;
  name: string;
  description: string;
  config: PersonalityConfigType;
}

// Default configurations for new companions
export const DEFAULT_PERSONALITY_CONFIG: PersonalityConfigType = {
  traits: {
    analytical_creative: 5, // Balanced
    formal_casual: 5, // Balanced
    serious_humorous: 5, // Balanced
    reserved_enthusiastic: 5, // Balanced
    practical_theoretical: 5, // Balanced
  },
  voice: {
    humor: 5, // Moderate humor
    directness: 7, // Fairly direct
    warmth: 7, // Fairly warm
  },
  responseLength: 'balanced',
  writingStyle: 'conversational',
};

export const DEFAULT_KNOWLEDGE_CONFIG: KnowledgeConfigType = {
  expertiseAreas: [],
  primaryExpertise: '',
  secondaryExpertise: [],
  knowledgeDepth: 5, // Balanced
  confidenceThreshold: 7, // Fairly high
  sourcePreferences: ['general'],
  citationStyle: 'inline',
};

export const DEFAULT_INTERACTION_CONFIG: InteractionConfigType = {
  initiativeLevel: 5, // Balanced
  conversationalMemory: 'moderate',
  followUpBehavior: 'occasional',
  feedbackLoop: false,
  multiTurnReasoning: false,
};

export const DEFAULT_TOOL_CONFIG: ToolConfigType = {
  webSearch: {
    enabled: false,
  },
  codeExecution: {
    enabled: false,
  },
  dataVisualization: {
    enabled: false,
  },
  documentAnalysis: {
    enabled: false,
  },
  calculationTools: {
    enabled: false,
  },
  otherTools: {},
};

// Sample Personality Templates
export const PERSONALITY_TEMPLATES: PersonalityTemplateType[] = [
  {
    id: 'academic',
    name: 'Academic Expert',
    description: 'Formal, thorough, and precise with an academic tone',
    config: {
      traits: {
        analytical_creative: 8, // Highly analytical
        formal_casual: 2, // Quite formal
        serious_humorous: 2, // Serious
        reserved_enthusiastic: 4, // Somewhat reserved
        practical_theoretical: 7, // More theoretical
      },
      voice: {
        humor: 2, // Very little humor
        directness: 8, // Very direct
        warmth: 4, // Somewhat cool
      },
      responseLength: 'detailed',
      writingStyle: 'academic',
    }
  },
  {
    id: 'friendly-tutor',
    name: 'Friendly Tutor',
    description: 'Approachable, patient, and encouraging teaching style',
    config: {
      traits: {
        analytical_creative: 6, // Balanced with slight analytical lean
        formal_casual: 7, // Fairly casual
        serious_humorous: 6, // Balanced with slight humor
        reserved_enthusiastic: 8, // Enthusiastic
        practical_theoretical: 4, // Slightly practical
      },
      voice: {
        humor: 6, // Moderate humor
        directness: 6, // Fairly direct
        warmth: 9, // Very warm
      },
      responseLength: 'balanced',
      writingStyle: 'conversational',
    }
  },
  {
    id: 'creative-collaborator',
    name: 'Creative Collaborator',
    description: 'Imaginative, inspiring, and idea-focused',
    config: {
      traits: {
        analytical_creative: 9, // Highly creative
        formal_casual: 6, // Somewhat casual
        serious_humorous: 7, // Somewhat humorous
        reserved_enthusiastic: 9, // Very enthusiastic
        practical_theoretical: 5, // Balanced
      },
      voice: {
        humor: 7, // More humorous
        directness: 5, // Balanced directness
        warmth: 8, // Quite warm
      },
      responseLength: 'balanced',
      writingStyle: 'narrative',
    }
  },
  {
    id: 'technical-expert',
    name: 'Technical Expert',
    description: 'Precise, detailed, and technically-focused',
    config: {
      traits: {
        analytical_creative: 9, // Highly analytical
        formal_casual: 4, // Somewhat formal
        serious_humorous: 3, // Mostly serious
        reserved_enthusiastic: 5, // Balanced
        practical_theoretical: 3, // Practical
      },
      voice: {
        humor: 3, // Little humor
        directness: 9, // Very direct
        warmth: 5, // Neutral warmth
      },
      responseLength: 'detailed',
      writingStyle: 'technical',
    }
  }
]; 