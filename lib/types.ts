// Structured Group Chat Configuration Types

// Response ordering strategies
export type ResponseOrderingStrategy = 
  | 'round-robin'  // Each bot responds in a fixed order
  | 'custom-order' // Custom defined order
  | 'parallel'     // All bots respond at once
  | 'conditional'  // Conditional branching based on message content

// Session persistence types
export type SessionPersistenceType = 
  | 'persistent'   // Chat history is saved and persists between sessions
  | 'one-time'     // Chat history is cleared after session ends
  | 'scheduled'    // Chat occurs on a schedule and may be persistent or one-time

// Input visibility configuration
export type InputVisibilityType = 
  | 'user-only'    // Bots only see user messages
  | 'all-messages' // Bots see all messages including other bots
  | 'selected'     // Bots see messages from selected participants

// Compute intensity levels
export type ComputeIntensityLevel = 
  | 'economy'     // Minimal token usage, basic responses
  | 'balanced'    // Default token usage and response complexity
  | 'enhanced'    // Higher token usage for more detailed responses
  | 'maximum'     // Maximum token usage for most complex responses
  | 'custom'      // Custom defined token usage

// External tool access permissions
export type ExternalToolAccess = {
  webSearch: boolean;      // Can perform web searches
  vectorDBLookup: boolean; // Can search vector databases
  fileAccess: boolean;     // Can access files
  apiCalls: boolean;       // Can make API calls
  codeExecution: boolean;  // Can execute code
};

// Custom participant ordering
export type CustomParticipantOrder = {
  participantIds: string[];  // Ordered list of participant IDs
};

// Chat Configuration Interface
export interface ChatConfigManifest {
  // Unique identifier
  id: string;
  
  // Basic information
  name: string;
  description?: string;
  
  // Chat dynamics settings
  dynamics: {
    responseOrdering: ResponseOrderingStrategy;
    customOrder?: CustomParticipantOrder;
    sessionPersistence: SessionPersistenceType;
    scheduledConfig?: {
      frequency: string;  // cron expression
      duration?: number;  // in minutes
    };
    messageFormatting?: {
      allowFormatting: boolean;
      allowImages: boolean;
      allowLinks: boolean;
    };
    timingControl?: {
      messageDelay: number;  // Delay between messages in ms
      typingIndicator: boolean;
    };
  };
  
  // Input handling settings
  inputHandling: {
    visibility: InputVisibilityType;
    selectedParticipants?: string[];  // Only used if visibility is 'selected'
    preprocessing?: {
      formatValidation: boolean;
      contentFiltering: boolean;
      lengthLimits?: {
        min?: number;
        max?: number;
      };
    };
  };
  
  // Execution rules
  executionRules: {
    instructions: {
      system?: string;  // Global system instructions
      preInput?: string;  // Instructions before user input
      postInput?: string;  // Instructions after user input
      preOutput?: string;  // Instructions before bot output
      postOutput?: string;  // Instructions after bot output
    };
    externalTools: ExternalToolAccess;
    allowedBehaviors?: string[];  // List of explicitly allowed behaviors
    disallowedBehaviors?: string[];  // List of explicitly disallowed behaviors
    tokenUsage: {
      intensity: ComputeIntensityLevel;
      maxTokensPerMessage?: number;
      budgetCeiling?: number;  // Maximum tokens to spend in the session
      customSettings?: {
        temperature?: number;
        topP?: number;
        frequencyPenalty?: number;
        presencePenalty?: number;
      };
    };
  };
  
  // UI Configuration
  uiConfig?: {
    showDebugPanel: boolean;
    showTokenUsage: boolean;
    customTheme?: string;
    layout?: 'standard' | 'compact' | 'expanded';
  };
  
  // Metadata
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    createdBy: string;
    isTemplate: boolean;
    templateCategory?: string;
  };
}

// Chat Template Interface (used for predefined templates)
export interface ChatConfigTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  configuration: Omit<ChatConfigManifest, 'id' | 'metadata'>;
  popularity: number;
  createdBy: string;
  isPublic: boolean;
} 