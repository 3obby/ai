import dotenv from "dotenv"
import { auth, currentUser } from "@clerk/nextjs"
import { NextResponse } from "next/server"
import OpenAI from "openai"
import prismadb from "@/lib/prismadb"

import { MemoryManager } from "@/lib/memory"
import { rateLimit } from "@/lib/rate-limit"

dotenv.config({ path: `.env` })

const XP_PER_MESSAGE = 2

export async function POST(
  request: Request,
  { params }: { params: { chatId: string } }
) {
  try {
    const { allMessages, isFollowUp } = await request.json()
    const user = await currentUser()

    if (!user?.id) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    // Check if user has enough XP
    const userUsage = await prismadb.userUsage.findUnique({
      where: { userId: user.id },
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

    // Initiate both the delay and the OpenAI request together
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "" })
    const [aiResponse] = await Promise.all([
      openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: openAIMessages, // ← pass the entire conversation
        stream: false,
      }),
      new Promise((resolve) => setTimeout(resolve, totalDelay)),
    ])

    const responseContent = aiResponse.choices[0]?.message?.content || ""

    // Transactionally store the new user AI messages, update XP, etc.
    // You can decide how you want to store them, or skip storing if you
    // prefer ephemeral context from the client only.
    await prismadb.$transaction([
      prismadb.message.create({
        data: {
          content:
            allMessages[allMessages.length - 1]?.content || "(no user input)",
          role: isFollowUp ? "system" : "user",
          companionId: params.chatId,
          userId: user.id,
        },
      }),
      prismadb.message.create({
        data: {
          content: responseContent,
          role: "system",
          companionId: params.chatId,
          userId: user.id,
        },
      }),
      prismadb.companion.update({
        where: { id: params.chatId },
        data: { xpEarned: { increment: XP_PER_MESSAGE } },
      }),
      prismadb.userUsage.update({
        where: { userId: user.id },
        data: {
          availableTokens: { decrement: XP_PER_MESSAGE },
          totalSpent: { increment: XP_PER_MESSAGE },
        },
      }),
    ])

    return new NextResponse(responseContent)
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
    const user = await currentUser()

    if (!user || !user.id) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    // Delete all messages for this chat
    await prismadb.message.deleteMany({
      where: {
        companionId: params.chatId,
        userId: user.id,
      },
    })

    return new NextResponse("Chat deleted successfully", { status: 200 })
  } catch (error) {
    console.log("[CHAT_DELETE]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
