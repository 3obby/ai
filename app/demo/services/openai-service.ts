import { Companion } from '../types/companions';

export async function generateCompanionResponse({
  companion,
  userMessage,
  chatHistory,
}: {
  companion: Companion;
  userMessage: string;
  chatHistory: { role: 'user' | 'assistant' | 'system'; content: string; name?: string }[];
}) {
  try {
    // Call our API endpoint instead of using OpenAI client directly
    const response = await fetch('/api/demo/companion-response', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        companion,
        userMessage,
        chatHistory,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.details || 'Failed to generate response');
    }

    const data = await response.json();
    return {
      response: data.response,
      debugInfo: data.debugInfo,
    };
  } catch (error) {
    console.error('Error generating companion response:', error);
    return { 
      response: "I'm having trouble connecting right now. Please try again later.",
      debugInfo: { error: error instanceof Error ? error.message : String(error) }
    };
  }
} 
