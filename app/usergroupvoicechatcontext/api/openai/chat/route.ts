import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Define the request body type
interface ChatRequestBody {
  messages: {
    role: 'system' | 'user' | 'assistant' | 'function';
    content: string;
    name?: string;
  }[];
  model: string;
  temperature?: number;
  max_tokens?: number;
  tools?: any[];
  tool_choice?: 'auto' | 'none' | { type: 'function'; function: { name: string } };
}

// List of known chat models
const CHAT_MODELS = [
  'gpt-4o', 
  'gpt-4o-mini',
  'gpt-4-turbo', 
  'gpt-4-1106-preview', 
  'gpt-4-vision-preview', 
  'gpt-4', 
  'gpt-4-32k',
  'gpt-3.5-turbo', 
  'gpt-3.5-turbo-16k',
  'gpt-4o-2024-05-13',
  'gpt-4-0613',
  'gpt-4-32k-0613',
  'gpt-3.5-turbo-0613',
  'gpt-3.5-turbo-16k-0613'
];

// Models that support realtime interactions but should use the chat completion endpoint
const REALTIME_MODELS = [
  'gpt-4o-realtime',
  'gpt-4o-realtime-preview'
];

export async function POST(req: NextRequest) {
  try {
    // Validate environment variable
    if (!process.env.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY is not set');
      return NextResponse.json(
        { error: 'OpenAI API key is not configured' },
        { status: 500 }
      );
    }

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Parse request body
    const body = await req.json() as ChatRequestBody;

    // Validate request body
    if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request: messages array is required' },
        { status: 400 }
      );
    }

    if (!body.model) {
      return NextResponse.json(
        { error: 'Invalid request: model is required' },
        { status: 400 }
      );
    }
    
    // Validate the model is a chat model
    let modelToUse = body.model;
    const isKnownChatModel = CHAT_MODELS.some(model => 
      body.model.includes(model) || body.model.startsWith(model)
    );
    
    const isRealtimeModel = REALTIME_MODELS.some(model => 
      body.model.includes(model) || body.model.startsWith(model)
    );
    
    // If it's not a known chat model or realtime model, reject the request
    if (!isKnownChatModel && !isRealtimeModel) {
      console.warn(`Unsupported model: "${body.model}" requested`);
      return NextResponse.json(
        { 
          error: `Model "${body.model}" is not supported for chat completions. Use a GPT model like gpt-4o, gpt-4, or gpt-3.5-turbo.`,
          supportedModels: CHAT_MODELS
        },
        { status: 400 }
      );
    }
    
    // For realtime models, map to their non-realtime equivalent if needed
    if (isRealtimeModel) {
      modelToUse = 'gpt-4o'; // Default fallback
      console.log(`Using ${modelToUse} as chat model instead of realtime model ${body.model}`);
    }

    // Validate message content - no undefined or null values allowed
    const invalidMessages = body.messages.filter(msg => 
      msg.content === undefined || 
      msg.content === null || 
      (typeof msg.content === 'string' && msg.content.trim() === '')
    );
    
    if (invalidMessages.length > 0) {
      console.warn('Invalid message content detected:', invalidMessages);
      return NextResponse.json(
        { 
          error: 'Invalid message content: Messages cannot contain undefined, null, or empty content',
          invalidMessages: invalidMessages.map(msg => ({ role: msg.role }))
        },
        { status: 400 }
      );
    }

    // Create completion request
    const completionRequest: any = {
      model: modelToUse,
      messages: body.messages,
      temperature: body.temperature ?? 0.7,
      max_tokens: body.max_tokens,
    };

    // Add tools if specified
    if (body.tools && body.tools.length > 0) {
      completionRequest.tools = body.tools;
      completionRequest.tool_choice = body.tool_choice || 'auto';
    }

    // Log request details (debugging only)
    console.log(`Making chat completion request with model ${modelToUse}`);

    // Call OpenAI API
    const response = await openai.chat.completions.create(completionRequest);

    // Return the response
    return NextResponse.json(response);

  } catch (error: any) {
    console.error('Error in OpenAI chat completion:', error);
    
    const status = error.status || 500;
    let message = error.message || 'An unknown error occurred';
    
    // Enhance error messages for common issues
    if (error.status === 404 && message.includes('This is not a chat model')) {
      message = `The model you requested is not compatible with the chat completions API. Please use a GPT model like gpt-4o, gpt-4, or gpt-3.5-turbo.`;
    }
    
    return NextResponse.json(
      { error: message },
      { status }
    );
  }
} 