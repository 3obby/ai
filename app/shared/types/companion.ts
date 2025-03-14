import { Companion } from "@prisma/client";

// Re-export the Companion type
export type { Companion };

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
    analytical: number; // 0-10 scale (analytical vs. creative)
    formal: number; // 0-10 scale (formal vs. casual)
    serious: number; // 0-10 scale (serious vs. humorous)
    reserved: number; // 0-10 scale (reserved vs. enthusiastic)
    practical: number; // 0-10 scale (practical vs. theoretical)
  };
  voice: {
    humor: number; // 0-10 scale
    directness: number; // 0-10 scale
    warmth: number; // 0-10 scale
  };
  responseFormat: {
    length: 'concise' | 'balanced' | 'detailed';
    style: 'academic' | 'conversational' | 'technical' | 'narrative' | 'casual';
  };
}

// Knowledge Configuration
export interface KnowledgeConfigType {
  expertise: {
    primaryDomain: string;
    secondaryDomains: string[];
    knowledgeDepth: number; // 0-10 scale
  };
  confidence: {
    uncertaintyThreshold: number; // 0-10 scale
  };
  sources: {
    preferredSourceTypes: ('academic' | 'industry' | 'news' | 'general')[];
    citationStyle: 'none' | 'inline' | 'footnote' | 'comprehensive';
  };
}

// Interaction Pattern Configuration
export interface InteractionConfigType {
  initiative: number; // 0-10 scale (passive to proactive)
  memory: 'minimal' | 'moderate' | 'extensive';
  followUp: 'none' | 'occasional' | 'frequent';
  feedbackRequests: boolean;
  multiTurnReasoning: boolean;
}

// Tool Integration Configuration
export interface ToolConfigType {
  webSearch: {
    enabled: boolean;
    providers: string[];
    maxResults: number;
  };
  codeExecution: {
    enabled: boolean;
    languages: string[];
  };
  dataVisualization: boolean;
  documentAnalysis: boolean;
  calculationTools: boolean;
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
    analytical: 5,
    formal: 5,
    serious: 5,
    reserved: 5,
    practical: 5,
  },
  voice: {
    humor: 5,
    directness: 5,
    warmth: 5,
  },
  responseFormat: {
    length: 'balanced',
    style: 'conversational',
  },
};

export const DEFAULT_KNOWLEDGE_CONFIG: KnowledgeConfigType = {
  expertise: {
    primaryDomain: '',
    secondaryDomains: [],
    knowledgeDepth: 5,
  },
  confidence: {
    uncertaintyThreshold: 5,
  },
  sources: {
    preferredSourceTypes: ['general'],
    citationStyle: 'none',
  },
};

export const DEFAULT_INTERACTION_CONFIG: InteractionConfigType = {
  initiative: 5,
  memory: 'moderate',
  followUp: 'occasional',
  feedbackRequests: false,
  multiTurnReasoning: true,
};

export const DEFAULT_TOOL_CONFIG: ToolConfigType = {
  webSearch: {
    enabled: true,
    providers: ['default'],
    maxResults: 3,
  },
  codeExecution: {
    enabled: false,
    languages: [],
  },
  dataVisualization: false,
  documentAnalysis: false,
  calculationTools: true,
};

// Sample Personality Templates
export const PERSONALITY_TEMPLATES: PersonalityTemplateType[] = [
  {
    id: 'academic',
    name: 'Academic Expert',
    description: 'Formal, thorough, and precise with an academic tone',
    config: {
      traits: {
        analytical: 8, // Highly analytical
        formal: 2, // Quite formal
        serious: 2, // Serious
        reserved: 4, // Somewhat reserved
        practical: 7, // More theoretical
      },
      voice: {
        humor: 2, // Very little humor
        directness: 8, // Very direct
        warmth: 4, // Somewhat cool
      },
      responseFormat: {
        length: 'detailed',
        style: 'academic',
      },
    }
  },
  {
    id: 'friendly-tutor',
    name: 'Friendly Tutor',
    description: 'Approachable, patient, and encouraging teaching style',
    config: {
      traits: {
        analytical: 6, // Balanced with slight analytical lean
        formal: 7, // Fairly casual
        serious: 6, // Balanced with slight humor
        reserved: 8, // Enthusiastic
        practical: 4, // Slightly practical
      },
      voice: {
        humor: 6, // Moderate humor
        directness: 6, // Fairly direct
        warmth: 9, // Very warm
      },
      responseFormat: {
        length: 'balanced',
        style: 'conversational',
      },
    }
  },
  {
    id: 'creative-collaborator',
    name: 'Creative Collaborator',
    description: 'Imaginative, inspiring, and idea-focused',
    config: {
      traits: {
        analytical: 9, // Highly creative
        formal: 6, // Somewhat casual
        serious: 7, // Somewhat humorous
        reserved: 9, // Very enthusiastic
        practical: 5, // Balanced
      },
      voice: {
        humor: 7, // More humorous
        directness: 5, // Balanced directness
        warmth: 8, // Quite warm
      },
      responseFormat: {
        length: 'balanced',
        style: 'narrative',
      },
    }
  },
  {
    id: 'technical-expert',
    name: 'Technical Expert',
    description: 'Precise, detailed, and technically-focused',
    config: {
      traits: {
        analytical: 9, // Highly analytical
        formal: 4, // Somewhat formal
        serious: 3, // Mostly serious
        reserved: 5, // Balanced
        practical: 3, // Practical
      },
      voice: {
        humor: 3, // Little humor
        directness: 9, // Very direct
        warmth: 5, // Neutral warmth
      },
      responseFormat: {
        length: 'detailed',
        style: 'technical',
      },
    }
  }
];

export interface Category {
  id: string;
  name: string;
} 