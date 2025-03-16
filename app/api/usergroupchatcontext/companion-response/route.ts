import { NextResponse } from "next/server";
import { OpenAI } from "openai";

// Initialize the OpenAI client (server-side)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

// Helper function to create a system message based on companion's personality
function createSystemMessageForCompanion(companion: any): string {
  const { personality, domainInterests, name, role, description } = companion;
  
  return `You are ${name}, a ${role}. ${description}

Your personality traits are:
- Openness: ${personality.openness}/10 ${getTraitDescription('openness', personality.openness)}
- Conscientiousness: ${personality.conscientiousness}/10 ${getTraitDescription('conscientiousness', personality.conscientiousness)}
- Extraversion: ${personality.extraversion}/10 ${getTraitDescription('extraversion', personality.extraversion)}
- Agreeableness: ${personality.agreeableness}/10 ${getTraitDescription('agreeableness', personality.agreeableness)}
- Neuroticism: ${personality.neuroticism}/10 ${getTraitDescription('neuroticism', personality.neuroticism)}

Your domain interests are:
- Technical topics: ${domainInterests.technical}/10
- Creative topics: ${domainInterests.creative}/10
- Management topics: ${domainInterests.management}/10

Guidelines:
1. Maintain a consistent personality based on the traits above.
2. If you feel a topic isn't in your domain of expertise, mention that but still try to be helpful.
3. Your responses should reflect your personality traits - e.g., if you're highly agreeable, be supportive and positive.
4. Be concise but thorough.
5. If you find yourself generating a generic response, try again with a more nuanced perspective.
6. Always stay in character as ${name}.
7. Never mention that you are an AI model - act as though you are truly ${name} with these personality traits.

Your response format should be natural conversation, not labeling your traits. Show your personality through your tone, word choice, and perspective.`;
}

// Helper function to get trait descriptions based on score
function getTraitDescription(trait: string, score: number): string {
  const traits: Record<string, string[]> = {
    openness: [
      'You strongly prefer conventional, practical thinking over creativity and innovation.',
      'You are somewhat traditional and practical in your approach.',
      'You have a balance of conventional thinking and openness to new ideas.',
      'You are quite curious and open to new experiences and ideas.',
      'You are extremely imaginative, curious, and value innovation highly.'
    ],
    conscientiousness: [
      'You tend to be spontaneous and flexible rather than organized and detailed.',
      'You are somewhat relaxed about goals and deadlines.',
      'You have a balanced approach to organization and spontaneity.',
      'You are quite organized, reliable, and focused on goals.',
      'You are extremely organized, disciplined, and detail-oriented.'
    ],
    extraversion: [
      'You strongly prefer solitary activities and deep thinking over social interaction.',
      'You are somewhat reserved and value your alone time.',
      'You have a balance between social energy and solitary reflection.',
      'You are quite outgoing and energized by social interaction.',
      'You are extremely sociable, talkative, and energetic in groups.'
    ],
    agreeableness: [
      'You tend to be analytical, objective, and willing to challenge others.',
      'You are somewhat direct and straightforward in your approach.',
      'You have a balance between compassion and objectivity.',
      'You are quite cooperative, empathetic, and focused on harmony.',
      'You are extremely compassionate, trusting, and conflict-averse.'
    ],
    neuroticism: [
      'You are extremely calm, stable, and resilient under pressure.',
      'You are quite emotionally stable and rarely get stressed.',
      'You have a balanced emotional response to challenges.',
      'You can be somewhat sensitive to stress and emotional stimuli.',
      'You are highly responsive to stress and emotional situations.'
    ]
  };
  
  // Map the 0-10 score to one of the five descriptions (0-1 → 0, 2-3 → 1, etc.)
  const index = Math.min(Math.floor(score / 2), 4);
  return traits[trait][index];
}

// Calculate temperature based on personality traits
function calculateTemperatureFromPersonality(companion: any): number {
  const { personality } = companion;
  
  // Higher openness → higher temperature (more creative)
  // Lower conscientiousness → higher temperature (less structured)
  // Higher neuroticism → slightly higher temperature (more varied emotions)
  
  const baseTemperature = 0.7;
  const opennessEffect = (personality.openness - 5) * 0.03;
  const conscientiousnessEffect = (5 - personality.conscientiousness) * 0.02;
  const neuroticismEffect = (personality.neuroticism - 5) * 0.01;
  
  // Calculate final temperature between 0.5 and 1.0
  return Math.max(0.5, Math.min(1.0, baseTemperature + opennessEffect + conscientiousnessEffect + neuroticismEffect));
}

// Calculate max tokens based on effort level
function calculateMaxTokensFromEffort(companion: any): number {
  // Higher effort → more tokens (longer, more thorough responses)
  const baseTokens = 500;
  return baseTokens + (companion.effort * 100);
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

    // Create a system message based on companion's personality
    const systemMessage = createSystemMessageForCompanion(companion);
    
    // Prepare the messages for OpenAI
    const messages = [
      { role: 'system', content: systemMessage },
      ...chatHistory,
      { role: 'user', content: userMessage }
    ];

    // Call the OpenAI API with GPT-4 Turbo
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview', // Using GPT-4 for best quality responses
      messages: messages as any,
      temperature: calculateTemperatureFromPersonality(companion),
      max_tokens: calculateMaxTokensFromEffort(companion),
      presence_penalty: 0.6, // Encourage diverse responses
      frequency_penalty: 0.5, // Reduce repetition
    });

    // Get the generated text
    const generatedText = response.choices[0]?.message?.content || 
      "I'm not sure how to respond to that.";
    
    // For debugging "under the hood"
    const debugInfo = {
      personality: companion.personality,
      domainInterests: companion.domainInterests,
      effort: companion.effort,
      temperature: calculateTemperatureFromPersonality(companion),
      maxTokens: calculateMaxTokensFromEffort(companion),
      model: 'gpt-4-turbo-preview',
      promptTokens: response.usage?.prompt_tokens,
      completionTokens: response.usage?.completion_tokens,
      totalTokens: response.usage?.total_tokens,
    };

    return NextResponse.json({
      response: generatedText,
      debugInfo
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