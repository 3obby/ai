import dotenv from "dotenv"
import { auth } from "@/lib/auth-helpers"
import { NextResponse } from "next/server"
import { OpenAI } from "openai"
import prismadb from "@/lib/prismadb"
import { Role } from "@prisma/client"
import { StreamingTextResponse, OpenAIStream } from "ai"

import { MemoryManager } from "@/lib/memory"
import { rateLimit } from "@/lib/rate-limit"
import {
  trackTokenUsage
} from "@/lib/token-usage"
import { TOKENS_PER_MESSAGE } from "@/lib/token-usage"

import { processPrompt } from "@/lib/utils/prompt-utils"
import { getSystemPromptForCompanion } from "@/lib/utils/ai-helpers"
import { getUserXP } from "@/lib/utils/user-utils"

// Force dynamic rendering for API routes
export const dynamic = "force-dynamic";

dotenv.config({ path: `.env` })

const XP_PER_MESSAGE = 2

// Delay params
const typingDelay = 1000 // ms standard delay for typing indicator for slow typists
const minResponseDelay = 800 // ms min additional delay
const maxResponseDelay = 2500 // ms max additional delay - should be higher for slow bots

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

    // Pre-process the prompt if not a follow-up
    let prompt = isFollowUp ? null : allMessages[allMessages.length - 1].content
    const processedPrompt = isFollowUp
      ? null
      : await processPrompt(prompt as string, companion.name)

    // If there's a processed prompt and it's not a follow-up, replace it
    if (processedPrompt && !isFollowUp) {
      allMessages[allMessages.length - 1].content = processedPrompt
      console.log("Processed prompt:", processedPrompt)
    }

    // Wait for a delay based on companion settings or defaults
    const botDelay = companion.messageDelay || 0
    const randomAdditional = Math.floor(
      Math.random() * (maxResponseDelay - minResponseDelay + 1) + minResponseDelay
    )
    const totalDelay = typingDelay + botDelay + randomAdditional

    // Format messages for OpenAI
    const systemPrompt = getSystemPromptForCompanion(companion)
    const openAIMessages = [
      { role: "system", content: systemPrompt },
      ...allMessages.map((msg: any) => ({
        role: msg.role,
        content: msg.content,
        name: msg.role === "user" ? "user" : undefined // Only include name for user messages
      })),
    ]

    // Update token burning counters
    try {
      await prismadb.$transaction([
        // Update user-specific token burning counter for this bot
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

    // Get a completion from the API with streaming
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: openAIMessages,
      stream: true
    });

    // Create a stream
    const stream = OpenAIStream(response);

    // Respond with the stream
    return new StreamingTextResponse(stream);
  } catch (error: any) {
    console.error("Error in POST route:", error)
    return new NextResponse(`Error: ${error.message}`, { status: 500 })
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

    // Clear all messages for this companion
    const clearResult = await prismadb.message.deleteMany({
      where: {
        companionId: params.chatId,
        userId: userId,
      },
    })

    return NextResponse.json(clearResult)
  } catch (error) {
    console.error("[CHAT_DELETE]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
