import { NextResponse } from "next/server";
import { OpenAI } from "openai";

// Mock function for generating responses if the OpenAI API isn't available
function generateMockResponse(companion: any, userMessage: string): string {
  const { name } = companion;
  
  // Simple predefined responses based on bot personality
  const responses = [
    `As ${name}, I'd say that "${userMessage}" is quite interesting.`,
    `Well, from my perspective, "${userMessage}" makes me think about...`,
    `Interesting question about "${userMessage}". Let me share some thoughts...`,
    `I've been considering "${userMessage}" and here's what I think...`,
    `"${userMessage}" is a fascinating topic! Here's my take on it...`
  ];
  
  // Select a random response
  return responses[Math.floor(Math.random() * responses.length)];
}

export async function POST(request: Request) {
  try {
    const { companion, userMessage, chatHistory } = await request.json();

    if (!companion || !userMessage) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    let generatedText = "";
    let usedMockService = false;
    
    try {
      // Try to use OpenAI if available
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY || '',
      });
      
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('OpenAI API key not configured');
      }
      
      // Create a simple system message
      const systemMessage = `You are ${companion.name}, a helpful assistant with the following description: ${companion.description}`;
      
      // Prepare the messages for OpenAI
      const messages = [
        { role: 'system', content: systemMessage },
        ...chatHistory,
        { role: 'user', content: userMessage }
      ];

      // Call the OpenAI API
      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo', // Using a simpler model for testing
        messages: messages as any,
        temperature: 0.7,
        max_tokens: 500,
      });

      generatedText = response.choices[0]?.message?.content || 
        "I'm not sure how to respond to that.";
        
    } catch (apiError) {
      console.warn('OpenAI API error, using mock response:', apiError);
      // Fall back to mock response
      generatedText = generateMockResponse(companion, userMessage);
      usedMockService = true;
    }

    return NextResponse.json({
      response: generatedText,
      mockService: usedMockService
    });
    
  } catch (error) {
    console.error('API error generating companion response:', error);
    return NextResponse.json(
      { 
        error: "Failed to generate response", 
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
} 