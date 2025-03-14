import { NextResponse } from 'next/server';
import { getUserIdForApi } from '@/lib/auth';
import { OpenAI } from 'openai';
import prismadb from '@/lib/prismadb';

export const maxDuration = 300; // Maximum duration in seconds (5 minutes)

export async function POST(
  request: Request,
  { params }: { params: { chatId: string } }
) {
  try {
    // In Next.js 15, we need to await the params object
    const { chatId } = await params;

    // Authenticate the request
    const auth = await getUserIdForApi(request);
    const { userId, isAuthenticated } = auth;

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Parse request data
    const data = await request.json();
    const { message } = data;

    if (!message || typeof message !== 'string') {
      return new NextResponse("Message is required", { status: 400 });
    }

    // Retrieve the chat to validate user access
    const chat = await prismadb.chat.findUnique({
      where: {
        id: chatId,
      },
      include: {
        participants: {
          include: {
            companion: true,
          },
        },
      },
    });

    if (!chat) {
      return new NextResponse("Chat not found", { status: 404 });
    }

    // Retrieve recent chat context (last 10 messages)
    const recentMessages = await prismadb.message.findMany({
      where: {
        chatId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
      include: {
        companion: true,
      },
    });

    // Create conversational context from recent messages
    const conversationHistory = recentMessages
      .reverse()
      .map((msg) => {
        return {
          role: msg.role === 'user' ? 'user' as const : 'assistant' as const,
          content: msg.content,
        };
      });

    // For a simple response, determine which companion to respond as
    const companion = chat.participants.find(p => p.companion)?.companion;
    
    if (!companion) {
      return new NextResponse("No companion found for this chat", { status: 400 });
    }

    // Set up streaming with OpenAI directly
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Set up streaming response
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();
    const encoder = new TextEncoder();

    // Save the user message to the database
    await prismadb.message.create({
      data: {
        content: message,
        role: 'user',
        chatId,
        userId,
      },
    });

    // Start the generation process in the background
    const streamingCall = async () => {
      try {
        // Prepare system prompt and conversation
        const systemPrompt = `You are ${companion.name}, ${companion.description || 'an AI assistant'}. ${companion.instructions || ''}`;
        
        // Create the streaming completion
        const completion = await openai.chat.completions.create({
          model: companion.modelName || 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: systemPrompt },
            ...conversationHistory,
            { role: 'user', content: message },
          ],
          stream: true,
          temperature: companion.temperature || 0.7,
        });
        
        let fullResponse = '';
        
        // Process the streaming response
        for await (const chunk of completion) {
          const content = chunk.choices[0]?.delta?.content || '';
          if (content) {
            fullResponse += content;
            await writer.write(encoder.encode(content));
          }
        }
        
        // Save the AI response to the database
        await prismadb.message.create({
          data: {
            content: fullResponse,
            role: 'assistant',
            chatId,
            companionId: companion.id,
          },
        });
        
      } catch (error) {
        console.error('Streaming error:', error);
        try {
          await writer.write(encoder.encode('\n\nAn error occurred during generation.'));
        } catch (e) {
          // Writer might be closed
        }
      } finally {
        try {
          await writer.close();
        } catch (e) {
          // Writer might be closed
        }
      }
    };
    
    // Start the streaming process in the background
    streamingCall();

    // Create a custom streaming response
    const response = new Response(stream.readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'Cache-Control': 'no-cache',
      },
    });
    
    return response;
    
  } catch (error) {
    console.error("[CHAT_STREAM_ERROR]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
} 