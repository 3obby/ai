import { Bot, Message } from '../types';

// This function generates a mock response for testing purposes
export async function getMockBotResponse(bot: Bot, userMessage: string, chatHistory: Message[]): Promise<string> {
  // Simple response generation based on bot's name and user message
  const responses = {
    'researcher': [
      `Based on my research, I'd say that "${userMessage}" is an interesting topic to explore. Let me find some information for you.`,
      `Looking at ${userMessage} from a research perspective, I can provide some insights.`,
      `That's a great question about "${userMessage}". Here's what the data shows...`
    ],
    'critic': [
      `Critically examining "${userMessage}", I think we should consider a few different perspectives.`,
      `I have some thoughts about "${userMessage}". Have you considered these potential issues?`,
      `Interesting point about "${userMessage}". Let me play devil's advocate for a moment...`
    ],
    'creative': [
      `"${userMessage}" sparks so many creative possibilities! Have you thought about...`,
      `What if we approached "${userMessage}" from a completely different angle?`,
      `I love the idea of "${userMessage}"! Here's how we could expand on it...`
    ],
    'coder': [
      `I can help with "${userMessage}". Here's how you might implement that in code:`,
      `For "${userMessage}", you'll want to consider this approach in your code...`,
      `When coding "${userMessage}", make sure to handle these edge cases...`
    ],
    'summarizer': [
      `To summarize "${userMessage}" concisely: it's about...`,
      `The key points from "${userMessage}" are...`,
      `In essence, "${userMessage}" boils down to these main ideas...`
    ]
  };

  // Get appropriate responses for this bot
  const botResponses = responses[bot.id as keyof typeof responses] || 
    [`As ${bot.name}, I'd like to respond to "${userMessage}" but I'm not sure how to help with that specifically.`];
  
  // Select a random response
  const randomIndex = Math.floor(Math.random() * botResponses.length);
  
  // Add a small delay to simulate processing time (between 500ms and 2000ms)
  const delay = Math.floor(Math.random() * 1500) + 500;
  await new Promise(resolve => setTimeout(resolve, delay));
  
  return botResponses[randomIndex];
} 