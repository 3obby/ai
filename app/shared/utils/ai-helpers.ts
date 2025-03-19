import { OpenAI } from 'openai';
import { StreamingTextResponse, OpenAIStream } from 'ai';
import { ChatCompletionMessageParam, ChatCompletionSystemMessageParam, ChatCompletionUserMessageParam } from 'openai/resources/chat/completions';

// Create a singleton OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export type AIModel = 'gpt-4o' | 'gpt-4-turbo' | 'gpt-3.5-turbo';

// Extend OpenAI's chat message type for our needs
export type ChatMessage = ChatCompletionMessageParam;

export interface CompanionConfig {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  model: AIModel;
  temperature?: number;
  responseOrder?: 'sequential' | 'parallel';
}

/**
 * Stream a chat completion response from OpenAI
 */
export async function streamChatCompletion(
  messages: ChatMessage[],
  options?: {
    model?: AIModel;
    temperature?: number;
    max_tokens?: number;
  }
) {
  const response = await openai.chat.completions.create({
    model: options?.model || 'gpt-4o',
    messages,
    temperature: options?.temperature || 0.7,
    max_tokens: options?.max_tokens,
    stream: true,
  });

  // Create a stream from the OpenAI response
  // @ts-ignore - Type incompatibility between AI package and OpenAI v4
  const stream = OpenAIStream(response);
  
  // Return a StreamingTextResponse, which sets the correct headers
  return new StreamingTextResponse(stream);
}

/**
 * Handle a multi-companion conversation where responses can be processed
 * sequentially or in parallel depending on project settings
 */
export async function handleMultiCompanionChat(
  companions: CompanionConfig[],
  messages: ChatMessage[],
  responseOrder: 'sequential' | 'parallel' = 'sequential'
) {
  if (responseOrder === 'sequential') {
    // Process companions one after another in a sequence
    const responses = [];
    
    for (const companion of companions) {
      const systemMessage: ChatCompletionSystemMessageParam = {
        role: 'system',
        content: companion.systemPrompt
      };
      
      const companionMessages = [
        systemMessage,
        ...messages
      ];
      
      const response = await openai.chat.completions.create({
        model: companion.model,
        messages: companionMessages,
        temperature: companion.temperature || 0.7,
      });
      
      responses.push({
        companionId: companion.id,
        companionName: companion.name,
        content: response.choices[0].message.content
      });
    }
    
    return responses;
  } else {
    // Process all companions in parallel
    const responsePromises = companions.map(async (companion) => {
      const systemMessage: ChatCompletionSystemMessageParam = {
        role: 'system',
        content: companion.systemPrompt
      };
      
      const companionMessages = [
        systemMessage,
        ...messages
      ];
      
      const response = await openai.chat.completions.create({
        model: companion.model,
        messages: companionMessages,
        temperature: companion.temperature || 0.7,
      });
      
      return {
        companionId: companion.id,
        companionName: companion.name,
        content: response.choices[0].message.content
      };
    });
    
    return Promise.all(responsePromises);
  }
}

/**
 * Analyze and extract structured data from user input
 */
export async function analyzeUserInput(text: string) {
  const systemMessage: ChatCompletionSystemMessageParam = {
    role: 'system',
    content: 'Extract structured information from user input. Identify key entities, intents, and sentiment.'
  };
  
  const userMessage: ChatCompletionUserMessageParam = {
    role: 'user',
    content: text
  };
  
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [systemMessage, userMessage],
    response_format: { type: 'json_object' }
  });
  
  try {
    return JSON.parse(response.choices[0].message.content || '{}');
  } catch (e) {
    console.error('Failed to parse JSON response', e);
    return {};
  }
}

/**
 * Generate diagnostic information for debugging
 */
export function generateDiagnosticInfo(data: any) {
  return {
    timestamp: new Date().toISOString(),
    requestId: crypto.randomUUID(),
    modelInfo: data.model || 'unknown',
    promptTokens: data.usage?.prompt_tokens || 0,
    completionTokens: data.usage?.completion_tokens || 0,
    totalTokens: data.usage?.total_tokens || 0,
    latency: data.latency || 0,
  };
} 