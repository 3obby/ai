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
  checkSubscription,
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

    // Check if user has enough XP
    const userUsage = await prismadb.userUsage.findUnique({
      where: { userId: userId },
    })
    if (!userUsage) {
      return new NextResponse("User usage record not found", { status: 404 })
    }
    if (userUsage.availableTokens < XP_PER_MESSAGE) {
      return new NextResponse("Please purchase more XP to continue chatting", {
        status: 402,
        statusText: `Need ${
          XP_PER_MESSAGE - userUsage.availableTokens
        } more XP`,
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
    await (prismadb.message as any).create({
      data: {
        content:
          allMessages[allMessages.length - 1]?.content || "(no user input)",
        role: isFollowUp ? "system" : "user",
        companionId: params.chatId,
        userId: userId,
      },
    })

    // Deduct XP
    await prismadb.userUsage.update({
      where: { userId: userId },
      data: {
        availableTokens: { decrement: XP_PER_MESSAGE },
        totalSpent: { increment: XP_PER_MESSAGE },
      },
    })

    // Update bot's tokens burned count
    await prismadb.companion.update({
      where: { id: params.chatId },
      data: { xpEarned: { increment: TOKENS_PER_MESSAGE } },
    })

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
    await (prismadb.message as any).create({
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
    await (prismadb.message as any).deleteMany({
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
