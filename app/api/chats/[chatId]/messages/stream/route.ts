import { NextResponse } from 'next/server';
import { getUserIdForApi } from '@/lib/auth';
import { OpenAI } from 'openai';
import prismadb from '@/lib/prismadb';
import { TOKENS_PER_MESSAGE } from '@/app/shared/utils/constants';
import { processInBackground } from '@/app/shared/utils/streaming';

export const maxDuration = 300; // 5 minutes maximum duration

// Define a custom streaming response class for text streams
class StreamingResponse extends Response {
  constructor(body: ReadableStream) {
    super(body);
    this.headers.set('Content-Type', 'text/plain; charset=utf-8');
    this.headers.set('Transfer-Encoding', 'chunked');
    this.headers.set('Cache-Control', 'no-cache');
  }
}

/**
 * Stream chat message responses
 * This endpoint handles sending a message and receiving a streaming response.
 */
export async function POST(
  request: Request,
  { params }: { params: { chatId: string } }
) {
  try {
    // Extract chat ID from params
    const { chatId } = params;
    
    // Authenticate user
    const { userId, isAuthenticated, isAnonymous } = await getUserIdForApi(request);
    
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    
    // Parse request body
    const { message } = await request.json();
    
    if (!message || typeof message !== 'string') {
      return new NextResponse("Message is required", { status: 400 });
    }
    
    // Verify the chat exists and user has access
    const chat = await prismadb.userChat.findUnique({
      where: {
        id: chatId,
      },
      include: {
        companions: true,
      }
    });
    
    if (!chat || chat.userId !== userId) {
      return new NextResponse("Chat not found", { status: 404 });
    }
    
    // Check user has enough tokens
    const userUsage = await prismadb.userUsage.findUnique({
      where: { userId },
    });
    
    if (!userUsage || userUsage.availableTokens < TOKENS_PER_MESSAGE) {
      return new NextResponse(
        "Insufficient tokens", 
        { 
          status: 402, 
          statusText: `Need ${TOKENS_PER_MESSAGE - (userUsage?.availableTokens || 0)} more tokens` 
        }
      );
    }
    
    // Find the companion in this chat
    const companion = chat.companions[0]; // Simplifying to use the first companion
    
    if (!companion) {
      return new NextResponse("No companion found in this chat", { status: 400 });
    }
    
    // Get recent messages for context
    const recentMessages = await prismadb.message.findMany({
      where: { 
        companionId: companion.id,
        userId,
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    
    // Setup OpenAI client
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    // Set up streaming
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();
    const encoder = new TextEncoder();
    
    // Save the user message first
    await prismadb.message.create({
      data: {
        content: message,
        role: 'user',
        companionId: companion.id,
        userId,
      }
    });
    
    // Process the companion response in the background
    processInBackground(async () => {
      try {
        // Format conversation history for the AI
        const conversationHistory = recentMessages
          .reverse()
          .map(msg => ({
            role: msg.role === 'user' ? 'user' as const : 'assistant' as const,
            content: msg.content,
          }));
        
        // Generate AI response with streaming
        const systemPrompt = `You are ${companion.name}, ${companion.description || 'an AI assistant'}. ${companion.instructions || ''}`;
        
        const aiResponse = await openai.chat.completions.create({
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
        
        // Process each chunk from the stream
        for await (const chunk of aiResponse) {
          // Extract the content
          const content = chunk.choices[0]?.delta?.content || '';
          fullResponse += content;
          
          // Write to our stream
          if (content) {
            await writer.write(encoder.encode(content));
          }
        }
        
        // Save the complete AI response to the database
        await prismadb.message.create({
          data: {
            content: fullResponse,
            role: 'assistant',
            companionId: companion.id,
            userId,
          }
        });
        
        // Deduct tokens
        await prismadb.$transaction([
          // Update global tokens burned counter for the companion
          prismadb.companion.update({
            where: { id: companion.id },
            data: { tokensBurned: { increment: TOKENS_PER_MESSAGE } },
          }),
          // Update user's token usage
          prismadb.userUsage.update({
            where: { userId },
            data: {
              availableTokens: { decrement: TOKENS_PER_MESSAGE },
              totalSpent: { increment: TOKENS_PER_MESSAGE },
            },
          }),
        ]);
        
      } catch (error) {
        console.error('Error processing AI response:', error);
        // Try to write an error message to the stream
        try {
          await writer.write(encoder.encode('\n\nAn error occurred while generating the response.'));
        } catch (e) {
          // Stream might already be closed
        }
      } finally {
        // Always close the writer when done
        try {
          await writer.close();
        } catch (e) {
          // Writer might already be closed
        }
      }
    });
    
    // Return the streaming response immediately
    return new StreamingResponse(stream.readable);
    
  } catch (error) {
    console.error('[CHAT_STREAM_ERROR]', error);
    return new NextResponse("Internal server error", { status: 500 });
  }
} 