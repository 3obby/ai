import dotenv from "dotenv"
import { auth } from "@/lib/auth-helpers"
import { NextResponse } from "next/server"
import OpenAI from "openai"
import prismadb from "@/lib/prismadb"
import { Role } from "@prisma/client"
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

    // Calculate a random delay
    const baseDelay = companion.messageDelay * 1000
    const randomDelay = Math.floor(Math.random() * 3000)
    const totalDelay = baseDelay + randomDelay

    // Prepare your messages for OpenAI
    // If you have special instructions for the system or the first user message,
    // you can still insert them at the beginning
    const openAIMessages = isFollowUp
      ? allMessages
      : [
          {
            role: "system",
            content: `${companion.instructions}\n\nYou are ${companion.name}, \n\nSeed personality: `,
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
