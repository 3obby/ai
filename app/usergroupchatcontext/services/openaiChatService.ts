import { Bot, Message } from '../types';
import { ToolDefinition } from '../types/bots';

interface OpenAIChatOptions {
  includeToolCalls?: boolean;
  availableTools?: ToolDefinition[];
}

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant' | 'function';
  content: string;
  name?: string;
}

export async function getOpenAIChatResponse(
  bot: Bot,
  userMessage: string,
  chatHistory: Message[],
  options: OpenAIChatOptions = {}
): Promise<string> {
  try {
    // Convert our message format to OpenAI's format
    const messages: OpenAIMessage[] = [];
    
    // Add system prompt
    messages.push({
      role: 'system',
      content: bot.systemPrompt
    });
    
    // Add chat history
    for (const message of chatHistory) {
      // Skip system messages (they're not part of the conversation context)
      if (message.role === 'system') continue;
      
      // Skip messages older than the last 20 messages to manage context window
      if (chatHistory.length > 20 && 
          chatHistory.indexOf(message) < chatHistory.length - 20) {
        continue;
      }
      
      // Add the message
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
    const response = await fetch('/usergroupchatcontext/api/openai/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    // Check for errors
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `API error: ${response.status}`);
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
    
    // Return a graceful error message
    return "Sorry! I can't reach the internet right now. Please check your network settings.";
  }
} 