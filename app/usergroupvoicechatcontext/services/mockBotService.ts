import { Bot, Message } from '../types';
import { ToolDefinition } from '../types/bots';

interface FallbackBotResponseOptions {
  includeToolCalls?: boolean;
  availableTools?: ToolDefinition[];
}

// Simple deterministic pseudo-random number generator based on input string
// This ensures same "random" values on server and client for the same inputs
function seededRandom(seed: string): () => number {
  let s = Array.from(seed).reduce((a, b) => a + b.charCodeAt(0), 0);
  
  return function() {
    s = Math.sin(s) * 10000;
    return s - Math.floor(s);
  };
}

// Helper function to call real OpenAI API for the default bot
async function callOpenAIApi(bot: Bot, userMessage: string, chatHistory: Message[], options: FallbackBotResponseOptions = {}): Promise<string> {
  try {
    // Convert our message format to OpenAI's format
    const messages: any[] = [];
    
    // Add system prompt
    messages.push({
      role: 'system',
      content: bot.systemPrompt
    });
    
    // Add chat history (limited to last 20 messages to manage context window)
    for (const message of chatHistory.slice(-20)) {
      // Skip system messages
      if (message.role === 'system') continue;
      
      messages.push({
        role: message.role,
        content: message.content
      });
    }
    
    // Add the current user message
    messages.push({
      role: 'user',
      content: userMessage
    });
    
    // Prepare the API call
    const requestBody: any = {
      model: bot.model,
      messages,
      temperature: bot.temperature,
      max_tokens: bot.maxTokens
    };
    
    // Add tools if the bot is configured to use them
    if (options.includeToolCalls && bot.useTools && options.availableTools && options.availableTools.length > 0) {
      requestBody.tools = options.availableTools;
      requestBody.tool_choice = 'auto';
    }
    
    // Call the OpenAI API
    const response = await fetch('/api/openai/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    // Check for errors
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    // Parse the response
    const data = await response.json();
    
    // Extract the assistant's message
    if (data.choices && data.choices.length > 0) {
      return data.choices[0].message.content || '';
    } else {
      throw new Error('No response content received from OpenAI');
    }
  } catch (error) {
    console.error('Error calling OpenAI:', error);
    return "Sorry! I can't reach the internet right now. Please check your network settings.";
  }
}

// This function attempts to get a bot response, with fallback mechanisms for reliability
export async function getFallbackBotResponse(
  bot: Bot, 
  userMessage: string, 
  chatHistory: Message[],
  options: FallbackBotResponseOptions = {}
): Promise<string> {
  // For the default bot, try to use the real OpenAI API
  if (bot.id === 'default') {
    try {
      return await callOpenAIApi(bot, userMessage, chatHistory, options);
    } catch (error) {
      console.error('Failed to call OpenAI API, falling back to generated response:', error);
      // Fall back to generated response if API call fails
    }
  }
  
  // Create a deterministic random function based on user message and bot ID
  const random = seededRandom(bot.id + userMessage.slice(0, 20));
  
  // Determine if we should include a tool call - using seeded random
  const shouldIncludeToolCall = options.includeToolCalls && 
    bot.useTools && 
    options.availableTools && 
    options.availableTools.length > 0 &&
    random() > 0.6; // 40% chance when tools are available
  
  // Default response for the default bot
  if (bot.id === 'default') {
    const defaultResponses = [
      `I'm your AI assistant. About "${userMessage}" - I'd like to help, but I'm currently in offline mode. Please check your connection settings.`,
      `Regarding "${userMessage}" - I'm currently operating in offline mode. Please check your connection to access my full capabilities.`,
      `I'd like to respond to "${userMessage}" but I'm currently in offline mode. Please check your network connection.`
    ];
    const randomIndex = Math.floor(random() * defaultResponses.length);
    return defaultResponses[randomIndex];
  }
  
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
  
  // Select a "random" response based on seeded random
  const randomIndex = Math.floor(random() * botResponses.length);
  let response = botResponses[randomIndex];
  
  // Add a tool call if appropriate
  if (shouldIncludeToolCall && options.availableTools) {
    // Select a tool using seeded random
    const randomToolIndex = Math.floor(random() * options.availableTools.length);
    const selectedTool = options.availableTools[randomToolIndex];
    
    // Generate appropriate fallback parameters based on the tool
    const toolParams: Record<string, any> = {};
    
    if (selectedTool.name === 'web_search') {
      // Try to extract a search query from the user message
      const searchTerms = userMessage.split(' ').slice(0, 3).join(' ');
      toolParams.query = `${searchTerms}`;
    } 
    else if (selectedTool.name === 'get_weather') {
      // Use a "random" city based on seeded random
      const cities = ['New York', 'London', 'Tokyo', 'Paris', 'Sydney'];
      toolParams.location = cities[Math.floor(random() * cities.length)];
    }
    else if (selectedTool.name === 'calculate') {
      // Generate a "random" simple calculation
      const num1 = Math.floor(random() * 100);
      const num2 = Math.floor(random() * 100);
      const ops = ['+', '-', '*', '/'];
      const op = ops[Math.floor(random() * ops.length)];
      toolParams.expression = `${num1} ${op} ${num2}`;
    }
    
    // Add tool call to response
    response += `\n\nI need to use a tool to help with this.\n\n`;
    response += "```json\n";
    response += JSON.stringify({
      name: selectedTool.name,
      parameters: toolParams
    }, null, 2);
    response += "\n```\n\n";
    
    response += `Let me ${selectedTool.name === 'web_search' ? 'search for' : 
                 selectedTool.name === 'get_weather' ? 'check the weather in' : 
                 'calculate'} that for you.`;
  }
  
  // Add a consistent delay for both server and client (minimal for better UX)
  const delay = 100;
  await new Promise(resolve => setTimeout(resolve, delay));
  
  return response;
} 