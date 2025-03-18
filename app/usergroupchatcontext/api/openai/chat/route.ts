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

    // Create completion request
    const completionRequest: any = {
      model: body.model,
      messages: body.messages,
      temperature: body.temperature ?? 0.7,
      max_tokens: body.max_tokens,
    };

    // Add tools if specified
    if (body.tools && body.tools.length > 0) {
      completionRequest.tools = body.tools;
      completionRequest.tool_choice = body.tool_choice || 'auto';
    }

    // Call OpenAI API
    const response = await openai.chat.completions.create(completionRequest);

    // Return the response
    return NextResponse.json(response);

  } catch (error: any) {
    console.error('Error in OpenAI chat completion:', error);
    
    const status = error.status || 500;
    const message = error.message || 'An unknown error occurred';
    
    return NextResponse.json(
      { error: message },
      { status }
    );
  }
} 