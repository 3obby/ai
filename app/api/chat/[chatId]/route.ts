import dotenv from "dotenv"
import { auth } from "@/lib/auth-helpers"
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
    const user = session?.user

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    // Check if user has enough tokens
    const userUsage = await prismadb.userUsage.findUnique({
      where: { userId: userId },
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
    interface CompanionWithConfig extends Companion {
      personalityConfig?: any;
      knowledgeConfig?: any;
      interactionConfig?: any;
      toolConfig?: any;
    }
    
    const companionWithConfig = companion as CompanionWithConfig;

    // Calculate a random delay
    const baseDelay = companion.messageDelay * 1000
    const randomDelay = Math.floor(Math.random() * 3000)
    const totalDelay = baseDelay + randomDelay

    // Generate system instructions based on companion configuration
    let systemInstructions = companion.instructions;
    
    // Add configuration-based instructions if available
    if (companionWithConfig.personalityConfig || companionWithConfig.knowledgeConfig || companionWithConfig.interactionConfig) {
      try {
        // Parse configuration data
        const personalityConfig = companionWithConfig.personalityConfig ? JSON.parse(JSON.stringify(companionWithConfig.personalityConfig)) : null;
        const knowledgeConfig = companionWithConfig.knowledgeConfig ? JSON.parse(JSON.stringify(companionWithConfig.knowledgeConfig)) : null;
        const interactionConfig = companionWithConfig.interactionConfig ? JSON.parse(JSON.stringify(companionWithConfig.interactionConfig)) : null;
        
        // Add personality configuration
        if (personalityConfig) {
          const personalityTraits = [];
          
          // Add analytical vs creative trait
          if (personalityConfig.traits?.analytical_creative !== undefined) {
            if (personalityConfig.traits.analytical_creative <= 3) {
              personalityTraits.push("You are highly analytical and logical in your approach.");
            } else if (personalityConfig.traits.analytical_creative >= 7) {
              personalityTraits.push("You are highly creative and innovative in your thinking.");
            }
          }
          
          // Add formal vs casual trait
          if (personalityConfig.traits?.formal_casual !== undefined) {
            if (personalityConfig.traits.formal_casual <= 3) {
              personalityTraits.push("You use formal language and maintain a professional tone.");
            } else if (personalityConfig.traits.formal_casual >= 7) {
              personalityTraits.push("You use casual, conversational language.");
            }
          }
          
          // Add serious vs humorous trait
          if (personalityConfig.traits?.serious_humorous !== undefined) {
            if (personalityConfig.traits.serious_humorous <= 3) {
              personalityTraits.push("You are serious and straightforward.");
            } else if (personalityConfig.traits.serious_humorous >= 7) {
              personalityTraits.push("You often incorporate appropriate humor and wit.");
            }
          }
          
          // Add reserved vs enthusiastic trait
          if (personalityConfig.traits?.reserved_enthusiastic !== undefined) {
            if (personalityConfig.traits.reserved_enthusiastic <= 3) {
              personalityTraits.push("You are reserved and measured in your responses.");
            } else if (personalityConfig.traits.reserved_enthusiastic >= 7) {
              personalityTraits.push("You are enthusiastic and passionate in your responses.");
            }
          }
          
          // Add response length preference
          if (personalityConfig.responseLength) {
            if (personalityConfig.responseLength === 'concise') {
              personalityTraits.push("You provide concise, to-the-point responses.");
            } else if (personalityConfig.responseLength === 'detailed') {
              personalityTraits.push("You provide detailed, comprehensive responses.");
            }
          }
          
          // Add writing style preference
          if (personalityConfig.writingStyle) {
            if (personalityConfig.writingStyle === 'academic') {
              personalityTraits.push("You write in an academic style with precise language and formal structure.");
            } else if (personalityConfig.writingStyle === 'technical') {
              personalityTraits.push("You write in a technical style with specialized terminology and precise details.");
            } else if (personalityConfig.writingStyle === 'narrative') {
              personalityTraits.push("You write in a narrative style, using storytelling techniques.");
            } else if (personalityConfig.writingStyle === 'casual') {
              personalityTraits.push("You write in a casual, relaxed style with colloquial language.");
            }
          }
          
          // Add personality traits to instructions
          if (personalityTraits.length > 0) {
            systemInstructions += "\n\nPersonality traits:\n" + personalityTraits.join("\n");
          }
        }
        
        // Add knowledge configuration
        if (knowledgeConfig) {
          const knowledgeInstructions = [];
          
          // Add primary expertise
          if (knowledgeConfig.primaryExpertise) {
            knowledgeInstructions.push(`Your primary area of expertise is ${knowledgeConfig.primaryExpertise}.`);
          }
          
          // Add secondary expertise areas
          if (knowledgeConfig.secondaryExpertise && knowledgeConfig.secondaryExpertise.length > 0) {
            knowledgeInstructions.push(`Your secondary areas of expertise include: ${knowledgeConfig.secondaryExpertise.join(', ')}.`);
          }
          
          // Add knowledge depth
          if (knowledgeConfig.knowledgeDepth !== undefined) {
            if (knowledgeConfig.knowledgeDepth <= 3) {
              knowledgeInstructions.push("You have broad general knowledge across many domains rather than deep expertise in specific areas.");
            } else if (knowledgeConfig.knowledgeDepth >= 7) {
              knowledgeInstructions.push("You have specialized, deep knowledge in your areas of expertise.");
            }
          }
          
          // Add confidence threshold
          if (knowledgeConfig.confidenceThreshold !== undefined) {
            if (knowledgeConfig.confidenceThreshold <= 3) {
              knowledgeInstructions.push("You express uncertainty frequently and are cautious about making definitive claims.");
            } else if (knowledgeConfig.confidenceThreshold >= 7) {
              knowledgeInstructions.push("You express confidence in your knowledge and only express uncertainty when very unsure.");
            }
          }
          
          // Add citation style
          if (knowledgeConfig.citationStyle) {
            if (knowledgeConfig.citationStyle === 'none') {
              knowledgeInstructions.push("You do not include citations unless explicitly asked.");
            } else if (knowledgeConfig.citationStyle === 'inline') {
              knowledgeInstructions.push("You briefly mention sources within your responses when relevant.");
            } else if (knowledgeConfig.citationStyle === 'footnote') {
              knowledgeInstructions.push("You provide numbered references at the end of your responses when citing information.");
            } else if (knowledgeConfig.citationStyle === 'comprehensive') {
              knowledgeInstructions.push("You provide detailed bibliographic information for sources you reference.");
            }
          }
          
          // Add knowledge instructions to system instructions
          if (knowledgeInstructions.length > 0) {
            systemInstructions += "\n\nKnowledge profile:\n" + knowledgeInstructions.join("\n");
          }
        }
        
        // Add interaction configuration
        if (interactionConfig) {
          const interactionInstructions = [];
          
          // Add initiative level
          if (interactionConfig.initiativeLevel !== undefined) {
            if (interactionConfig.initiativeLevel <= 3) {
              interactionInstructions.push("You primarily respond to direct questions and rarely make unprompted suggestions.");
            } else if (interactionConfig.initiativeLevel >= 7) {
              interactionInstructions.push("You proactively offer suggestions and guide the conversation when appropriate.");
            }
          }
          
          // Add conversational memory
          if (interactionConfig.conversationalMemory) {
            if (interactionConfig.conversationalMemory === 'minimal') {
              interactionInstructions.push("You focus primarily on recent messages without extensive reference to earlier conversation.");
            } else if (interactionConfig.conversationalMemory === 'extensive') {
              interactionInstructions.push("You maintain detailed knowledge of the conversation history and reference past interactions when relevant.");
            }
          }
          
          // Add follow-up behavior
          if (interactionConfig.followUpBehavior) {
            if (interactionConfig.followUpBehavior === 'none') {
              interactionInstructions.push("You respond directly without asking clarifying questions.");
            } else if (interactionConfig.followUpBehavior === 'frequent') {
              interactionInstructions.push("You regularly ask clarifying questions to better understand the user's needs.");
            }
          }
          
          // Add feedback loop
          if (interactionConfig.feedbackLoop) {
            interactionInstructions.push("Occasionally ask for feedback on your responses to better serve the user.");
          }
          
          // Add multi-turn reasoning
          if (interactionConfig.multiTurnReasoning) {
            interactionInstructions.push("For complex topics, break down your reasoning into clear, step-by-step explanations.");
          }
          
          // Add interaction instructions to system instructions
          if (interactionInstructions.length > 0) {
            systemInstructions += "\n\nInteraction style:\n" + interactionInstructions.join("\n");
          }
        }
        
      } catch (error) {
        console.error("Error parsing companion configuration:", error);
        // Continue with base instructions if there's an error parsing configuration
      }
    }

    // Prepare your messages for OpenAI
    // If you have special instructions for the system or the first user message,
    // you can still insert them at the beginning
    const openAIMessages = isFollowUp
      ? allMessages
      : [
          {
            role: "system",
            content: `${systemInstructions}\n\nYou are ${companion.name}, \n\nSeed personality: `,
          },
          ...allMessages,
        ]

    // Store the user message first
    await prismadb.message.create({
      data: {
        content:
          allMessages[allMessages.length - 1]?.content || "(no user input)",
        role: isFollowUp ? "system" : "user",
        companionId: params.chatId,
        userId: userId,
      },
    })

    // Deduct tokens from user's allocation
    await prismadb.userUsage.update({
      where: { userId: userId },
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
              userId: userId,
              companionId: params.chatId,
            },
          },
          create: {
            userId: userId,
            companionId: params.chatId,
            tokensBurned: TOKENS_PER_MESSAGE,
          },
          update: {
            tokensBurned: { increment: TOKENS_PER_MESSAGE },
          },
        })
      ]);
    } catch (error) {
      console.error("Failed to update token burning records:", error);
      // Proceed anyway since this isn't critical to message functionality
    }

    // Wait for the delay
    await new Promise((resolve) => setTimeout(resolve, totalDelay))

    // Initialize OpenAI
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "" })

    // Get a completion from the API without streaming
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: openAIMessages,
    });

    // Calculate tokens used from the API response
    const promptTokens = completion.usage?.prompt_tokens || 0;
    const completionTokens = completion.usage?.completion_tokens || 0;
    const totalTokens = promptTokens + completionTokens;
    
    // Default minimum tokens if API doesn't return usage
    const tokensToDeduct = Math.max(totalTokens, TOKENS_PER_MESSAGE);
    
    // Deduct tokens from user's allocation based on actual usage
    await prismadb.userUsage.update({
      where: { userId: userId },
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
            ${userId}, 
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
        userId: userId,
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

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    // Delete all messages for this chat
    await prismadb.message.deleteMany({
      where: {
        companionId: params.chatId,
        userId: userId,
      },
    })

    return new NextResponse("Chat deleted successfully", { status: 200 })
  } catch (error) {
    console.log("[CHAT_DELETE]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
