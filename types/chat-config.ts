import { z } from "zod";

// Response Ordering Types
export enum ResponseOrderingType {
  ROUND_ROBIN = "ROUND_ROBIN",
  CUSTOM_ORDER = "CUSTOM_ORDER",
  PARALLEL = "PARALLEL",
  CONDITIONAL_BRANCHING = "CONDITIONAL_BRANCHING"
}

// Session Persistence Types
export enum SessionPersistenceType {
  PERSISTENT = "PERSISTENT",
  ONE_TIME = "ONE_TIME",
  SCHEDULED = "SCHEDULED"
}

// Input Consideration Types
export enum InputConsiderationType {
  USER_ONLY = "USER_ONLY",
  USER_AND_BOTS = "USER_AND_BOTS",
  SELECTED_PARTICIPANTS = "SELECTED_PARTICIPANTS"
}

// Tool Permission Types
export enum ToolPermissionType {
  WEB_SEARCH = "WEB_SEARCH",
  EXTERNAL_API = "EXTERNAL_API",
  VECTOR_DB = "VECTOR_DB",
  CODE_EXECUTION = "CODE_EXECUTION",
  FILE_ACCESS = "FILE_ACCESS"
}

// Template Category Types
export enum TemplateCategoryType {
  ENTREPRENEURIAL_ADVISOR = "ENTREPRENEURIAL_ADVISOR",
  DND_GAME_MASTER = "DND_GAME_MASTER",
  BRAINSTORMING = "BRAINSTORMING",
  TECHNICAL_DEBUGGING = "TECHNICAL_DEBUGGING",
  CUSTOM = "CUSTOM"
}

// Chat Dynamics Schema
export const chatDynamicsSchema = z.object({
  responseOrdering: z.nativeEnum(ResponseOrderingType),
  customOrderIds: z.array(z.string()).optional(),
  sessionPersistence: z.nativeEnum(SessionPersistenceType),
  scheduleConfig: z.object({
    frequency: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional()
  }).optional(),
  messageFormattingRules: z.string().optional(),
  typingIndicatorDelay: z.number().default(1000),
  minResponseDelay: z.number().default(500),
  maxResponseDelay: z.number().default(3000)
});

// Input Handling Schema
export const inputHandlingSchema = z.object({
  inputConsideration: z.nativeEnum(InputConsiderationType),
  selectedParticipantIds: z.array(z.string()).optional(),
  maxContextWindowSize: z.number().default(10),
  preprocessingRules: z.string().optional(),
  fileAccessPermissions: z.array(z.string()).optional(), // Array of file group IDs
});

// Execution Rules Schema
export const executionRulesSchema = z.object({
  preInputInstructions: z.string().optional(),
  postInputInstructions: z.string().optional(),
  preOutputInstructions: z.string().optional(),
  postOutputInstructions: z.string().optional(),
  toolPermissions: z.array(z.nativeEnum(ToolPermissionType)).default([]),
  allowedBehaviors: z.string().optional(),
  disallowedBehaviors: z.string().optional(),
  computeIntensity: z.number().min(1).max(10).default(5), // 1-10 scale for compute intensity
  tokenBudgetCeiling: z.number().optional(), // Max tokens to spend per session
  economyMode: z.boolean().default(true), // Default to economy mode to save tokens
});

// UI Configuration Schema
export const uiConfigSchema = z.object({
  showDebugPanel: z.boolean().default(false),
  customTheme: z.string().optional(),
  showTypingIndicator: z.boolean().default(true),
  showParticipantAvatars: z.boolean().default(true),
  compactMode: z.boolean().default(false)
});

// Main Chat Config Schema
export const chatConfigSchema = z.object({
  id: z.string().optional(), // Optional for creation, required for updates
  name: z.string(),
  description: z.string().optional(),
  isTemplate: z.boolean().default(false),
  templateCategory: z.nativeEnum(TemplateCategoryType).optional(),
  dynamics: chatDynamicsSchema,
  inputHandling: inputHandlingSchema,
  executionRules: executionRulesSchema,
  uiConfig: uiConfigSchema.optional(),
  userId: z.string().optional(),
  companionId: z.string().nullable().optional(),
  groupChatId: z.string().nullable().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

// TypeScript types generated from the schemas
export type ChatDynamics = z.infer<typeof chatDynamicsSchema>;
export type InputHandling = z.infer<typeof inputHandlingSchema>;
export type ExecutionRules = z.infer<typeof executionRulesSchema>;
export type UIConfig = z.infer<typeof uiConfigSchema>;
export type ChatConfig = z.infer<typeof chatConfigSchema>;

// Predefined templates
export const CHAT_CONFIG_TEMPLATES: Record<TemplateCategoryType, ChatConfig> = {
  [TemplateCategoryType.ENTREPRENEURIAL_ADVISOR]: {
    name: "Entrepreneurial Advisor",
    description: "Strategic business advice from multiple expert perspectives",
    isTemplate: true,
    templateCategory: TemplateCategoryType.ENTREPRENEURIAL_ADVISOR,
    dynamics: {
      responseOrdering: ResponseOrderingType.ROUND_ROBIN,
      sessionPersistence: SessionPersistenceType.PERSISTENT,
      typingIndicatorDelay: 1000,
      minResponseDelay: 500,
      maxResponseDelay: 2000
    },
    inputHandling: {
      inputConsideration: InputConsiderationType.USER_ONLY,
      maxContextWindowSize: 15
    },
    executionRules: {
      toolPermissions: [ToolPermissionType.WEB_SEARCH, ToolPermissionType.VECTOR_DB],
      computeIntensity: 8,
      tokenBudgetCeiling: 5000,
      allowedBehaviors: "Market analysis, business strategy, financial planning, growth hacking",
      disallowedBehaviors: "Legal advice, investment recommendations",
      economyMode: true
    },
    uiConfig: {
      showDebugPanel: false,
      showTypingIndicator: true,
      showParticipantAvatars: true,
      compactMode: false
    },
    companionId: null,
    groupChatId: null
  },
  [TemplateCategoryType.DND_GAME_MASTER]: {
    name: "D&D Game Master",
    description: "Interactive role-playing game with storytelling and character dynamics",
    isTemplate: true,
    templateCategory: TemplateCategoryType.DND_GAME_MASTER,
    dynamics: {
      responseOrdering: ResponseOrderingType.CUSTOM_ORDER,
      customOrderIds: [], // Will be filled when used
      sessionPersistence: SessionPersistenceType.PERSISTENT,
      typingIndicatorDelay: 1500,
      minResponseDelay: 1000,
      maxResponseDelay: 4000
    },
    inputHandling: {
      inputConsideration: InputConsiderationType.USER_AND_BOTS,
      maxContextWindowSize: 20
    },
    executionRules: {
      toolPermissions: [],
      computeIntensity: 9,
      preInputInstructions: "Remember character attributes and previous storyline elements",
      postOutputInstructions: "Always maintain character consistency and world rules",
      allowedBehaviors: "Storytelling, character role-playing, world-building, game mechanics",
      disallowedBehaviors: "Breaking character, meta-gaming",
      economyMode: true
    },
    uiConfig: {
      showDebugPanel: false,
      showTypingIndicator: true,
      showParticipantAvatars: true,
      compactMode: false
    },
    companionId: null,
    groupChatId: null
  },
  [TemplateCategoryType.BRAINSTORMING]: {
    name: "Brainstorming & Ideation",
    description: "Collaborative idea generation with diverse perspectives",
    isTemplate: true,
    templateCategory: TemplateCategoryType.BRAINSTORMING,
    dynamics: {
      responseOrdering: ResponseOrderingType.PARALLEL,
      sessionPersistence: SessionPersistenceType.ONE_TIME,
      typingIndicatorDelay: 800,
      minResponseDelay: 300,
      maxResponseDelay: 1500
    },
    inputHandling: {
      inputConsideration: InputConsiderationType.USER_ONLY,
      maxContextWindowSize: 10
    },
    executionRules: {
      toolPermissions: [ToolPermissionType.VECTOR_DB],
      computeIntensity: 7,
      preInputInstructions: "Focus on quantity of ideas over quality initially",
      allowedBehaviors: "Creative thinking, challenging assumptions, building on others' ideas",
      disallowedBehaviors: "Early criticism, fixation on single solutions",
      economyMode: true
    },
    uiConfig: {
      showDebugPanel: true,
      showTypingIndicator: true,
      showParticipantAvatars: true,
      compactMode: false
    },
    companionId: null,
    groupChatId: null
  },
  [TemplateCategoryType.TECHNICAL_DEBUGGING]: {
    name: "Technical Debugging & Analysis",
    description: "Collaborative problem-solving for technical issues",
    isTemplate: true,
    templateCategory: TemplateCategoryType.TECHNICAL_DEBUGGING,
    dynamics: {
      responseOrdering: ResponseOrderingType.ROUND_ROBIN,
      sessionPersistence: SessionPersistenceType.PERSISTENT,
      typingIndicatorDelay: 1000,
      minResponseDelay: 500,
      maxResponseDelay: 2000
    },
    inputHandling: {
      inputConsideration: InputConsiderationType.USER_ONLY,
      maxContextWindowSize: 15,
      fileAccessPermissions: [] // Will be filled when used
    },
    executionRules: {
      toolPermissions: [ToolPermissionType.CODE_EXECUTION, ToolPermissionType.FILE_ACCESS, ToolPermissionType.WEB_SEARCH],
      computeIntensity: 9,
      tokenBudgetCeiling: 4000,
      allowedBehaviors: "Code analysis, error diagnostics, solution proposal, testing strategies",
      disallowedBehaviors: "Introducing security vulnerabilities, untested solutions",
      economyMode: true
    },
    uiConfig: {
      showDebugPanel: true,
      showTypingIndicator: true,
      showParticipantAvatars: true,
      compactMode: true
    },
    companionId: null,
    groupChatId: null
  },
  [TemplateCategoryType.CUSTOM]: {
    name: "Custom Configuration",
    description: "Custom chat configuration",
    isTemplate: true,
    templateCategory: TemplateCategoryType.CUSTOM,
    dynamics: {
      responseOrdering: ResponseOrderingType.ROUND_ROBIN,
      sessionPersistence: SessionPersistenceType.PERSISTENT,
      typingIndicatorDelay: 1000,
      minResponseDelay: 500,
      maxResponseDelay: 2000
    },
    inputHandling: {
      inputConsideration: InputConsiderationType.USER_ONLY,
      maxContextWindowSize: 10
    },
    executionRules: {
      toolPermissions: [],
      computeIntensity: 5,
      economyMode: true
    },
    uiConfig: {
      showDebugPanel: false,
      showTypingIndicator: true,
      showParticipantAvatars: true,
      compactMode: false
    },
    companionId: null,
    groupChatId: null
  }
}; 