import { Companion, ChatHistoryItem } from "../types/companions";
import { generateCompanionResponse } from "./openai-service";

// Pre-configured companions for the demo
export const PRE_CONFIGURED_COMPANIONS: Companion[] = [
  {
    id: "assistant-1",
    name: "Alex",
    description: "Technical advisor with expertise in programming and systems architecture",
    imageUrl: "/images/companion-1.png",
    role: "Technical Advisor",
    personality: {
      openness: 7,
      conscientiousness: 8,
      extraversion: 4,
      agreeableness: 6,
      neuroticism: 3
    },
    domainInterests: {
      technical: 9,
      creative: 4,
      management: 6
    },
    effort: 8
  },
  {
    id: "assistant-2",
    name: "Morgan",
    description: "Creative brainstormer who helps generate innovative ideas",
    imageUrl: "/images/companion-2.png",
    role: "Creative Lead",
    personality: {
      openness: 9,
      conscientiousness: 5,
      extraversion: 8,
      agreeableness: 7,
      neuroticism: 4
    },
    domainInterests: {
      technical: 4,
      creative: 9,
      management: 5
    },
    effort: 7
  },
  {
    id: "assistant-3",
    name: "Taylor",
    description: "Project manager who helps organize tasks and track progress",
    imageUrl: "/images/companion-3.png",
    role: "Project Manager",
    personality: {
      openness: 6,
      conscientiousness: 9,
      extraversion: 7,
      agreeableness: 7,
      neuroticism: 4
    },
    domainInterests: {
      technical: 6,
      creative: 5,
      management: 9
    },
    effort: 8
  },
  {
    id: "assistant-4",
    name: "Jordan",
    description: "Data analyst specializing in insights and metrics interpretation",
    imageUrl: "/images/companion-4.png",
    role: "Data Analyst",
    personality: {
      openness: 7,
      conscientiousness: 8,
      extraversion: 3,
      agreeableness: 6,
      neuroticism: 5
    },
    domainInterests: {
      technical: 8,
      creative: 3,
      management: 7
    },
    effort: 9
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
  const chatHistory: ChatHistoryItem[] = messageHistory.map(msg => ({
    role: msg.isUser ? 'user' : 'assistant',
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