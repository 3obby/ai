/**
 * Application-wide constants
 */

// API and Cache related durations
export const CACHE_TIMES = {
  SHORT: 1000 * 60 * 5,      // 5 minutes
  MEDIUM: 1000 * 60 * 30,    // 30 minutes
  LONG: 1000 * 60 * 60 * 24, // 24 hours
};

// Token costs for different operations
export const TOKENS_PER_MESSAGE = 100;  // Base cost for a message
export const TOKENS_PER_GROUP_MESSAGE = 150;  // Cost for group chat messages
export const TOKENS_PER_IMAGE_GENERATION = 500;  // Cost for generating an image
export const TOKENS_PER_AUDIO_MINUTE = 200;  // Cost per minute of audio processing

// Companion XP and leveling
export const XP_PER_MESSAGE = 2;
export const XP_PER_FEEDBACK = 5;
export const XP_LEVELS = {
  NOVICE: 0,
  BEGINNER: 50,
  INTERMEDIATE: 200,
  ADVANCED: 500,
  EXPERT: 1000,
  MASTER: 2000,
};

// Pagination defaults
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// Message settings
export const MAX_MESSAGE_LENGTH = 4000;  // Maximum length of a user message
export const DEFAULT_SYSTEM_PROMPT = "You are a helpful AI assistant. Respond concisely and accurately.";

// UI constants
export const MOBILE_BREAKPOINT = 768;  // px
export const SIDEBAR_WIDTH = 280;  // px
export const ANIMATION_DURATION = 300;  // ms

// API rate limits
export const RATE_LIMIT_MAX = 100;  // requests
export const RATE_LIMIT_WINDOW = 60 * 1000;  // 1 minute in ms 