import dotenv from "dotenv"
import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"
import { OpenAI } from "openai"
import prismadb from "@/lib/prismadb"
import { Role, Companion } from "@prisma/client"
import { StreamingTextResponse } from "ai"

import { MemoryManager } from "@/lib/memory"
import { rateLimit } from "@/lib/rate-limit"
import {
  trackTokenUsage
} from "@/lib/token-usage"
import { TOKENS_PER_MESSAGE } from "@/lib/token-usage"


// Force dynamic rendering for API routes
export const dynamic = "force-dynamic";

dotenv.config({ path: `.env` })

const XP_PER_MESSAGE = 2

export async function POST(
  request: Request,
  { params }: { params: { chatId: string } }
) {
  try {
    const { allMessages, isFollowUp } = await request.json()
    const session = await auth()
    const userId = session?.userId
    
    // Get the userId from the query if passed
    const url = new URL(request.url);
    const queryUserId = url.searchParams.get('userId');
    
    // Use query userId if provided and no session userId exists
    const effectiveUserId = userId || queryUserId;

    if (!effectiveUserId) {
      return new NextResponse("User ID is required", { status: 400 })
    }

    // Check if user has enough tokens
    const userUsage = await prismadb.userUsage.findUnique({
      where: { userId: effectiveUserId },
    })
    if (!userUsage) {
      return new NextResponse("User usage record not found", { status: 404 })
    }
    if (userUsage.availableTokens < TOKENS_PER_MESSAGE) {
      return new NextResponse("Please purchase more tokens to continue chatting", {
        status: 402,
        statusText: `Need ${
          TOKENS_PER_MESSAGE - userUsage.availableTokens
        } more tokens`,
      })
    }

    const companion = await prismadb.companion.findUnique({
      where: { id: params.chatId },
    })
    if (!companion) {
      return new NextResponse("Companion not found", { status: 404 })
    }

    // Type assertion for companion with extended properties
    interface CompanionWithConfig {
      id: string;
      userId: string;
      name: string;
      instructions: string;
      personalityConfig?: any;
      knowledgeConfig?: any;
      interactionConfig?: any;
      toolConfig?: any;
      [key: string]: any; // Allow other fields
    }
    
    const companionWithConfig = companion as CompanionWithConfig;

    // Calculate a random delay
    const baseDelay = companion.messageDelay * 1000
    const randomDelay = Math.floor(Math.random() * 3000)
    const totalDelay = baseDelay + randomDelay

    // Check for any chat configuration settings that may override defaults
    const chatConfig = await prismadb.chatConfig.findFirst({
      where: {
        companionId: params.chatId,
        userId: effectiveUserId
      }
    });

    // Determine token usage mode (economy vs full)
    const executionRulesJson = chatConfig?.executionRules as { economyMode?: boolean } | undefined;
    const economyMode = executionRulesJson?.economyMode !== false; // Default to economy mode if not specified

    // Generate system instructions based on companion configuration and economy mode
    let systemInstructions = "";
    
    if (economyMode) {
      // Ultra-condensed system prompt for economy mode
      systemInstructions = `You are ${companion.name}. ${companion.name}'s core traits: ${
        companion.instructions.split('.').slice(0, 3).join('.')
      }...`;
    } else {
      // Full system instructions for standard mode
      systemInstructions = companion.instructions;
      
      // Add configuration-based instructions if available
      if (companionWithConfig.personalityConfig || companionWithConfig.knowledgeConfig || companionWithConfig.interactionConfig) {
        try {
          // Parse configuration data
          const personalityConfig = companionWithConfig.personalityConfig ? JSON.parse(JSON.stringify(companionWithConfig.personalityConfig)) : null;
          const knowledgeConfig = companionWithConfig.knowledgeConfig ? JSON.parse(JSON.stringify(companionWithConfig.knowledgeConfig)) : null;
          const interactionConfig = companionWithConfig.interactionConfig ? JSON.parse(JSON.stringify(companionWithConfig.interactionConfig)) : null;
          
          // Build a condensed, token-efficient instruction set
          const configInstructions = [];
          
          // Add personality traits (condensed format)
          if (personalityConfig) {
            const personalityTraits = [];
            
            // Only include key personality aspects
            if (personalityConfig.analyticalCreative && personalityConfig.analyticalCreative !== 'balanced') {
              personalityTraits.push(`Style: ${personalityConfig.analyticalCreative === 'analytical' ? 'Analytical/logical' : 'Creative/intuitive'}`);
            }
            
            if (personalityConfig.formalCasual && personalityConfig.formalCasual !== 'balanced') {
              personalityTraits.push(`Tone: ${personalityConfig.formalCasual === 'formal' ? 'Formal' : 'Casual'}`);
            }
            
            if (personalityConfig.humorLevel && personalityConfig.humorLevel !== 'moderate') {
              personalityTraits.push(`Humor: ${personalityConfig.humorLevel}`);
            }
            
            if (personalityConfig.responseLength) {
              personalityTraits.push(`Length: ${personalityConfig.responseLength}`);
            }
            
            if (personalityTraits.length > 0) {
              configInstructions.push(`Personality: ${personalityTraits.join(', ')}`);
            }
          }
          
          // Add knowledge traits (condensed format)
          if (knowledgeConfig) {
            const knowledgeTraits = [];
            
            if (knowledgeConfig.expertiseAreas && knowledgeConfig.expertiseAreas.length > 0) {
              knowledgeTraits.push(`Expert in: ${knowledgeConfig.expertiseAreas.join(', ')}`);
            }
            
            if (knowledgeConfig.responseAccuracy && knowledgeConfig.responseAccuracy !== 'balanced') {
              knowledgeTraits.push(`Accuracy: ${knowledgeConfig.responseAccuracy}`);
            }
            
            if (knowledgeTraits.length > 0) {
              configInstructions.push(`Knowledge: ${knowledgeTraits.join(', ')}`);
            }
          }
          
          // Add interaction traits (condensed format)
          if (interactionConfig) {
            const interactionTraits = [];
            
            if (interactionConfig.initiativeLevel && interactionConfig.initiativeLevel !== 'balanced') {
              interactionTraits.push(`Initiative: ${interactionConfig.initiativeLevel}`);
            }
            
            if (interactionConfig.followUpQuestions === true) {
              interactionTraits.push("Ask follow-up questions");
            }
            
            if (interactionTraits.length > 0) {
              configInstructions.push(`Interaction: ${interactionTraits.join(', ')}`);
            }
          }
          
          // Add condensed configuration to system instructions
          if (configInstructions.length > 0) {
            systemInstructions += "\n\nConfig: " + configInstructions.join('. ');
          }
          
        } catch (error) {
          console.error("Error parsing companion configuration:", error);
          // Continue with base instructions if there's an error parsing configuration
        }
      }
    }

    // Prepare your messages for OpenAI with optimized system prompt
    const openAIMessages = isFollowUp
      ? allMessages
      : [
          {
            role: "system",
            content: systemInstructions
          },
          ...allMessages,
        ]

    // Apply message window optimization for longer conversations
    // Make more aggressive for economy mode
    const MAX_MESSAGES = economyMode ? 5 : 10; // Keep fewer messages in economy mode
    const optimizedMessages = openAIMessages.length > MAX_MESSAGES 
      ? [
          openAIMessages[0], // Keep the system prompt
          { 
            role: "system", 
            content: `[Previous conversation history summarized: ${openAIMessages.length - MAX_MESSAGES} earlier messages omitted]` 
          },
          ...openAIMessages.slice(-MAX_MESSAGES + 1) // Keep the most recent messages
        ]
      : openAIMessages;

    // Store the user message first
    await prismadb.message.create({
      data: {
        content:
          allMessages[allMessages.length - 1]?.content || "(no user input)",
        role: isFollowUp ? "system" : "user",
        companionId: params.chatId,
        userId: effectiveUserId,
      },
    })

    // Deduct tokens from user's allocation
    await prismadb.userUsage.update({
      where: { userId: effectiveUserId },
      data: {
        availableTokens: { decrement: TOKENS_PER_MESSAGE },
        totalSpent: { increment: TOKENS_PER_MESSAGE },
      },
    })

    // Run a Prisma transaction to update both bot's global tokens burned 
    // and the user-specific tokens burned for this bot
    try {
      await prismadb.$transaction([
        // Update global tokens burned counter for the bot
        prismadb.companion.update({
          where: { id: params.chatId },
          data: { tokensBurned: { increment: TOKENS_PER_MESSAGE } },
        }),
        // Create or update the user-specific tokens burned record
        prismadb.userBurnedTokens.upsert({
          where: {
            userId_companionId: {
              userId: effectiveUserId,
              companionId: params.chatId,
            },
          },
          create: {
            userId: effectiveUserId,
            companionId: params.chatId,
            tokensBurned: TOKENS_PER_MESSAGE,
          },
          update: {
            tokensBurned: { increment: TOKENS_PER_MESSAGE },
          },
        }),
      ])

      // Only award XP for regular users, not for anonymous users
      if (userId) {
        // Attempt to create XP record - this is a non-critical operation
        try {
          await prismadb.companion.update({
            where: { id: params.chatId },
            data: { xpEarned: { increment: XP_PER_MESSAGE } }
          })
        } catch (xpError) {
          console.error("Failed to award XP:", xpError)
          // Continue even if XP award fails
        }
      }
    } catch (txError) {
      console.error("Transaction error:", txError)
      // Continue even if the transaction fails - we don't want to block the chat
    }

    // Wait for the delay
    await new Promise((resolve) => setTimeout(resolve, totalDelay))

    // Initialize OpenAI
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "" })

    // Get a completion from the API without streaming
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: optimizedMessages,
    });

    // Calculate tokens used from the API response
    const promptTokens = completion.usage?.prompt_tokens || 0;
    const completionTokens = completion.usage?.completion_tokens || 0;
    const totalTokens = promptTokens + completionTokens;
    
    // Log token usage for debugging
    console.log(`[TOKEN_USAGE] Actual tokens used - Prompt: ${promptTokens}, Completion: ${completionTokens}, Total: ${totalTokens}`);
    
    // Token efficiency optimization
    // Economy mode uses an even lower minimum token count
    const MIN_TOKENS = economyMode ? 25 : 50;
    const tokensToDeduct = Math.max(totalTokens, MIN_TOKENS);

    // Update token usage with the actual token count
    await trackTokenUsage(effectiveUserId, tokensToDeduct, "chat")
      .catch((error) => console.error("[TRACK_TOKEN_USAGE_ERROR]", error));

    // Deduct tokens from user's allocation based on actual usage
    await prismadb.userUsage.update({
      where: { userId: effectiveUserId },
      data: {
        availableTokens: { decrement: tokensToDeduct },
        totalSpent: { increment: tokensToDeduct },
      },
    });
    
    // Update both global and user-specific token burning metrics
    try {
      // Use the updated transaction syntax with a callback function
      await prismadb.$transaction(async (tx) => {
        // Update global tokens burned counter for the bot
        await tx.$executeRaw`
          UPDATE "Companion" 
          SET "tokensBurned" = "tokensBurned" + ${tokensToDeduct},
              "xpEarned" = "xpEarned" + ${tokensToDeduct}
          WHERE "id" = ${params.chatId}
        `;
        
        // Upsert user-specific token burning record
        await tx.$executeRaw`
          INSERT INTO "UserBurnedTokens" ("id", "userId", "companionId", "tokensBurned", "createdAt", "updatedAt")
          VALUES (
            gen_random_uuid(), 
            ${effectiveUserId}, 
            ${params.chatId}, 
            ${tokensToDeduct}, 
            NOW(), 
            NOW()
          )
          ON CONFLICT ("userId", "companionId") 
          DO UPDATE SET 
            "tokensBurned" = "UserBurnedTokens"."tokensBurned" + ${tokensToDeduct},
            "updatedAt" = NOW()
        `;
      });
      
      console.log(`Updated token metrics: ${tokensToDeduct} tokens burned by interaction with ${params.chatId}`);
    } catch (error) {
      console.error("Failed to update token burning records:", error);
    }

    // Get the response content
    const responseContent = completion.choices[0].message.content || "";

    // Save the message to the database
    await prismadb.message.create({
      data: {
        content: responseContent,
        role: "assistant" as Role,
        companionId: params.chatId,
        userId: effectiveUserId,
      },
    });

    // Return the response content directly
    return new Response(responseContent);
  } catch (error) {
    console.log("Error in POST route:", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}

// DELETE endpoint to remove a specific chat
export async function DELETE(
  request: Request,
  { params }: { params: { chatId: string } }
) {
  try {
    const session = await auth()
    const userId = session?.userId
    
    // Get the userId from the query if passed
    const url = new URL(request.url);
    const queryUserId = url.searchParams.get('userId');
    
    // Use query userId if provided and no session userId exists
    const effectiveUserId = userId || queryUserId;

    if (!effectiveUserId) {
      return new NextResponse("User ID is required", { status: 400 })
    }

    // Delete all messages for this chat
    await prismadb.message.deleteMany({
      where: {
        companionId: params.chatId,
        userId: effectiveUserId,
      },
    })

    return new NextResponse("Chat deleted successfully", { status: 200 })
  } catch (error) {
    console.log("Error in DELETE route:", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
