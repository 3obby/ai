import { Companion, ChatHistoryItem } from "../types/companions";
import { generateCompanionResponse } from "./openai-service";
import { DEFAULT_TOOL_SETTINGS } from "../types/tools";

const DEFAULT_AVATAR = '/images/user-icon.png';

// Pre-configured companions for the demo
export const PRE_CONFIGURED_COMPANIONS: Companion[] = [
  {
    id: 'sage',
    name: 'Sage',
    role: 'AI Research Assistant',
    description: 'A knowledgeable and thoughtful AI research assistant.',
    avatar: DEFAULT_AVATAR,
    toolCallingEnabled: true,
    voiceConfig: {
      voice: 'sage',
      vadMode: 'auto',
      modality: 'both',
      temperature: 0.7
    }
  },
  {
    id: 'echo',
    name: 'Echo',
    role: 'Technical Expert',
    description: 'A technical expert focused on coding and development.',
    avatar: DEFAULT_AVATAR,
    toolCallingEnabled: true,
    voiceConfig: {
      voice: 'echo',
      vadMode: 'auto',
      modality: 'both',
      temperature: 0.6
    }
  },
  {
    id: 'coral',
    name: 'Coral',
    role: 'Creative Assistant',
    description: 'A creative assistant for brainstorming and ideation.',
    avatar: DEFAULT_AVATAR,
    toolCallingEnabled: true,
    voiceConfig: {
      voice: 'coral',
      vadMode: 'auto',
      modality: 'both',
      temperature: 0.8
    }
  }
];

// Determine which companions should respond to a message
export function determineResponsiveCompanions(
  userMessage: string,
  companions: Companion[]
): Companion[] {
  // Check if the message is directed to a specific companion
  const lowerMessage = userMessage.toLowerCase();
  let targetCompanions: Companion[] = [];
  
  // Check for direct addressing patterns like "Name:" or "@Name"
  companions.forEach(companion => {
    const namePrefix = `${companion.name.toLowerCase()}:`;
    const atNamePrefix = `@${companion.name.toLowerCase()}`;
    
    if (lowerMessage.startsWith(namePrefix) || lowerMessage.includes(atNamePrefix)) {
      // Message is directly addressed to this companion
      targetCompanions.push(companion);
    }
  });
  
  // If not specifically addressed, calculate which companions might respond
  // based on their interests and the message content
  if (targetCompanions.length === 0) {
    // Analyze message for domain relevance
    const messageTopics = {
      technical: lowerMessage.includes('code') || 
                lowerMessage.includes('tech') || 
                lowerMessage.includes('programming') || 
                lowerMessage.includes('develop') || 
                lowerMessage.includes('build') ? 1 : 0.3,
                
      creative: lowerMessage.includes('idea') || 
               lowerMessage.includes('design') || 
               lowerMessage.includes('creative') || 
               lowerMessage.includes('brainstorm') ? 1 : 0.3,
               
      management: lowerMessage.includes('project') || 
                  lowerMessage.includes('timeline') || 
                  lowerMessage.includes('team') || 
                  lowerMessage.includes('manage') || 
                  lowerMessage.includes('plan') ? 1 : 0.3
    };
    
    // For each companion, calculate interest level and determine if they should respond
    companions.forEach(companion => {
      const interestLevel = 
        companion.domainInterests.technical * messageTopics.technical +
        companion.domainInterests.creative * messageTopics.creative +
        companion.domainInterests.management * messageTopics.management;
        
      // Companion will respond if interest level is high enough
      // Higher extraversion also increases chance of response
      const responseThreshold = 5 - (companion.personality.extraversion * 0.3);
      if (interestLevel > responseThreshold || Math.random() < interestLevel/10) {
        targetCompanions.push(companion);
      }
    });
    
    // Ensure at least one companion responds
    if (targetCompanions.length === 0) {
      // Pick the most suitable companion based on message
      let highestInterest = -1;
      let mostInterestedCompanion = companions[0];
      
      companions.forEach(companion => {
        const interestLevel = 
          companion.domainInterests.technical * messageTopics.technical +
          companion.domainInterests.creative * messageTopics.creative +
          companion.domainInterests.management * messageTopics.management;
          
        if (interestLevel > highestInterest) {
          highestInterest = interestLevel;
          mostInterestedCompanion = companion;
        }
      });
      
      targetCompanions.push(mostInterestedCompanion);
    }
  }
  
  return targetCompanions;
}

// Generate a response for a specific companion
export async function generateCompanionResponseWithHistory(
  companion: Companion,
  userMessage: string,
  messageHistory: { content: string; isUser: boolean; senderId: string }[]
): Promise<{ response: string; debugInfo: any }> {
  // Convert message history to the format expected by the OpenAI service
  const chatHistory = messageHistory.map(msg => ({
    role: msg.isUser ? 'user' as const : 'assistant' as const,
    content: msg.content,
    name: !msg.isUser ? msg.senderId : undefined
  }));
  
  // Get companion response
  return await generateCompanionResponse({
    companion,
    userMessage,
    chatHistory
  });
}

// Calculate response time based on personality traits
export function calculateResponseTime(companion: Companion, responseSpeed: number): number {
  // Higher conscientiousness = faster response
  // Higher extraversion = faster response
  // Higher effort = slower response (more thoughtful)
  const baseDelay = Math.max(800, 2500 - (responseSpeed * 200));
  const personalityFactor = 
    ((10 - companion.personality.conscientiousness) * 100) + 
    ((10 - companion.personality.extraversion) * 50) +
    (companion.effort * 200);
  const randomFactor = Math.random() * 1000;
  
  return baseDelay + personalityFactor + randomFactor;
} 