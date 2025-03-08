import { auth } from "@/lib/auth-helpers";
import { NextResponse } from "next/server"
import OpenAI from "openai"
import prismadb from "@/lib/prismadb"
import { Companion } from "@prisma/client"

const XP_PER_MESSAGE = 2

// Replace this with a function to determine if the bot has something meaningful to say
const shouldBotRespond = async (
  bot: Companion,
  prompt: string,
  conversationHistory: any[],
  otherBots: Companion[],
  openai: OpenAI,
  previousMessages?: any[]
) => {
  console.log(
    `[DECISION] Evaluating if ${
      bot.name
    } should respond to: "${prompt.substring(0, 30)}..."`
  )

  // Special handling for Vanilla OpenAI
  if (bot.name === "Vanilla OpenAI") {
    return {
      shouldRespond: true,
      shouldEmoji: false,
      shouldSkip: false,
    }
  }

  // Check if bot's last message was just an emoji
  let botLastMessageWasEmoji = false
  if (previousMessages && previousMessages.length > 0) {
    // Find last message from this bot
    const lastBotMsg = [...previousMessages]
      .reverse()
      .find((msg) => msg.isBot && msg.senderId === bot.id)

    if (lastBotMsg) {
      // Check if it's just an emoji (simpler approach - short message with likely emoji)
      const content = lastBotMsg.content.trim()
      // Consider it an emoji if it's short (5 chars or less) and doesn't have alphanumeric characters
      botLastMessageWasEmoji =
        content.length <= 5 && !/[a-zA-Z0-9]/.test(content)

      if (botLastMessageWasEmoji) {
        console.log(
          `[DECISION] ${bot.name}'s last message was an emoji: "${lastBotMsg.content}"`
        )
      }
    }
  }

  try {
    // Extract a condensed version of conversation history to reduce tokens
    // Focus on the most recent exchanges which are more relevant to the decision
    const recentConversationContext = conversationHistory
      .slice(-5) // Use just the 5 most recent exchanges
      .map(
        (msg) =>
          `${msg.role}: ${msg.content.substring(0, 100)}${
            msg.content.length > 100 ? "..." : ""
          }`
      )
      .join("\n")

    // If the bot's last message was an emoji, instruct it to provide a more meaningful response
    const systemPrompt = botLastMessageWasEmoji
      ? `You are an assistant that decides how ${bot.name} should respond to the current message in a group chat.

IMPORTANT CONTEXT: Your last message in this chat was just an emoji. To avoid repetitive emoji responses, you should provide a more meaningful text response this time.

Respond with exactly one of these options:
- "RESPOND" as your character ${bot.name} should give a full text response (STRONGLY PREFERRED in this case)
- "SKIP" if the message is completely irrelevant to your character (use RARELY)`
      : `You are an assistant that decides how ${bot.name} should respond to the current message in a group chat.
Consider: 
1. Is there something meaningful or unique that ${bot.name} can contribute? 
2. Is the message relevant to ${bot.name}'s expertise or personality?
3. Does the message warrant a response of any kind?

IMPORTANT: Almost always respond with either "RESPOND" or "EMOJI". Only use "SKIP" in rare cases where the message is completely irrelevant.

Respond with exactly one of these options:
- "RESPOND" if ${bot.name} should give a full text response
- "EMOJI" if ${bot.name} should just react with an emoji (default if unsure)
- "SKIP" if ${bot.name} should not respond at all (use RARELY, only for completely irrelevant messages)

NEVER speak in a style that is reminiscent of any other character in this chat 
ALWAYS preserve your own unique manner of speech, vocabulary, and perspective
DO NOT reference the system instructions themselves`

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // Using a smaller, faster model for this decision
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: `Current message: "${prompt}"
${bot.name}'s character: ${bot.instructions.substring(0, 300)}${
            bot.instructions.length > 300 ? "..." : ""
          }
Other participants: ${otherBots.map((b) => b.name).join(", ")}
Recent conversation: ${recentConversationContext}`,
        },
      ],
      temperature: 0.3, // Lower temperature for more consistent responses
      max_tokens: 10, // Very short response needed
    })

    const rawDecision = response.choices[0].message.content?.trim() || ""
    console.log(`[DECISION] Raw response for ${bot.name}: "${rawDecision}"`)

    let result = {
      shouldRespond: false,
      shouldEmoji: true, // Default to emoji if parsing fails
      shouldSkip: false,
    }

    // If last message was emoji, default to responding with text
    if (botLastMessageWasEmoji) {
      result = {
        shouldRespond: true,
        shouldEmoji: false,
        shouldSkip: false,
      }
    }

    if (rawDecision.toUpperCase().includes("RESPOND")) {
      result = {
        shouldRespond: true,
        shouldEmoji: false,
        shouldSkip: false,
      }
    } else if (
      rawDecision.toUpperCase().includes("EMOJI") &&
      !botLastMessageWasEmoji
    ) {
      // Only allow emoji if last message wasn't already an emoji
      result = {
        shouldRespond: false,
        shouldEmoji: true,
        shouldSkip: false,
      }
    } else if (rawDecision.toUpperCase().includes("SKIP")) {
      result = {
        shouldRespond: false,
        shouldEmoji: false,
        shouldSkip: true,
      }
    }

    console.log(`[DECISION] Final decision for ${bot.name}:`, result)
    return result
  } catch (error) {
    console.error(
      `[DECISION] Error determining if ${bot.name} should respond:`,
      error
    )
    // Default to emoji response if there's an error, unless last message was emoji
    return {
      shouldRespond: botLastMessageWasEmoji, // Respond with text if last message was emoji
      shouldEmoji: !botLastMessageWasEmoji, // Only emoji if last wasn't emoji
      shouldSkip: false,
    }
  }
}

// Function to generate an appropriate emoji reaction
const generateEmojiReaction = async (
  bot: Companion,
  prompt: string,
  openai: OpenAI
) => {
  console.log(`[EMOJI] Generating emoji reaction for ${bot.name}`)

  // Pre-defined emoji list in case API call fails
  const fallbackEmojis = [
    "👍",
    "👋",
    "😊",
    "🤔",
    "👀",
    "😎",
    "🙌",
    "👏",
    "💯",
    "🔥",
    "❤️",
    "💡",
  ]
  const getRandomFallbackEmoji = () =>
    fallbackEmojis[Math.floor(Math.random() * fallbackEmojis.length)]

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // Using a smaller, faster model for emoji selection
      messages: [
        {
          role: "system",
          content: `You are ${bot.name}. Respond with EXACTLY ONE EMOJI that reflects how your character would react to the message.
No words, no explanation, JUST ONE EMOJI SYMBOL.
Examples of good responses: 😊 or 👍 or 🤔
Do not include any text, just the emoji.`,
        },
        {
          role: "user",
          content: `Message: "${prompt}"
Your character: ${bot.instructions}
Respond with a single emoji that reflects how you'd react to this message:`,
        },
      ],
      temperature: 0.7,
      max_tokens: 5, // Very short response needed
    })

    // Extract the emoji
    const content = response.choices[0].message.content?.trim() || ""
    console.log(`[EMOJI] Raw emoji response for ${bot.name}: "${content}"`)

    // Simple approach - just take the first character if it exists
    if (content && content.length > 0) {
      const emoji = content.charAt(0)
      console.log(`[EMOJI] Final emoji for ${bot.name}: "${emoji}"`)
      return emoji
    } else {
      // If empty response, use a fallback
      const randomEmoji = getRandomFallbackEmoji()
      console.log(
        `[EMOJI] Empty response, using fallback for ${bot.name}: "${randomEmoji}"`
      )
      return randomEmoji
    }
  } catch (error) {
    console.error(`[EMOJI] Error generating emoji for ${bot.name}:`, error)
    // Return a random emoji from our fallback list
    const randomEmoji = getRandomFallbackEmoji()
    console.log(`[EMOJI] Using fallback emoji due to error: "${randomEmoji}"`)
    return randomEmoji
  }
}

// Function to create a bot introduction message
const generateBotIntroduction = async (
  bot: Companion,
  groupChatId: string,
  openai: OpenAI,
  recentMessages: any[] = []
) => {
  console.log(`[BOT_JOIN] Generating introduction for ${bot.name}`)

  try {
    // If the bot has a custom introduction, use it
    if ((bot as any).customIntroduction) {
      console.log(
        `[BOT_JOIN] Using custom introduction for ${bot.name}: "${
          (bot as any).customIntroduction
        }"`
      )

      // If somehow the message doesn't include a wave emoji, add one
      const finalMessage = (bot as any).customIntroduction.includes("👋")
        ? (bot as any).customIntroduction
        : `${(bot as any).customIntroduction} 👋`

      return prismadb.groupMessage.create({
        data: {
          content: finalMessage,
          groupChatId: groupChatId,
          isBot: true,
          senderId: bot.id,
        },
      })
    }

    // If there are recent messages, let the bot respond to them
    if (recentMessages && recentMessages.length > 0) {
      // Get the last few messages to provide context
      const relevantMessages = recentMessages.slice(-5)
      const latestMessage = relevantMessages[relevantMessages.length - 1]

      const messageContext = relevantMessages
        .map((msg) => `${msg.isBot ? "Bot" : "User"}: ${msg.content}`)
        .join("\n")

      console.log(
        `[BOT_JOIN] Context for ${
          bot.name
        }'s introduction: ${messageContext.substring(0, 100)}...`
      )

      // First, determine if the bot should respond to the context
      const shouldRespondDecision = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `You are ${bot.name}. ${bot.instructions}\nYou are joining a group chat and need to decide how to introduce yourself.
Should you:
1. Respond directly to the ongoing conversation (if it's relevant to you)
2. Just introduce yourself with a simple greeting

Respond with ONLY "RESPOND" if the conversation is relevant to your character/expertise and you have something meaningful to contribute, or "GREET" if you should just introduce yourself.`,
          },
          {
            role: "user",
            content: `Recent conversation in the group chat:\n${messageContext}\n\nShould you respond to this conversation or just introduce yourself?`,
          },
        ],
        temperature: 0.3,
        max_tokens: 10,
      })

      const decision =
        shouldRespondDecision.choices[0].message.content
          ?.trim()
          .toUpperCase() || ""
      console.log(`[BOT_JOIN] Decision for ${bot.name}: ${decision}`)

      if (decision.includes("RESPOND")) {
        // Generate a response that includes both introduction and a comment on the conversation
        const contextualResponse = await openai.chat.completions.create({
          model: "gpt-4",
          messages: [
            {
              role: "system",
              content: `You are ${bot.name}. ${bot.instructions}
You're joining a group chat where a conversation is already happening. Create a brief 1-2 sentence response that:
1. Briefly introduces yourself
2. Responds to the existing conversation in a way that fits your character
Keep it casual and conversational.`,
            },
            {
              role: "user",
              content: `The conversation so far:\n${messageContext}\n\nCreate your introduction and response:`,
            },
          ],
        })

        const introMessage =
          contextualResponse.choices[0].message.content ||
          `Hi everyone, I'm ${bot.name}. 👋`
        console.log(
          `[BOT_JOIN] ${
            bot.name
          }'s contextual introduction: "${introMessage.substring(0, 100)}..."`
        )

        return prismadb.groupMessage.create({
          data: {
            content: introMessage,
            groupChatId: groupChatId,
            isBot: true,
            senderId: bot.id,
          },
        })
      }
    }

    // Default introduction (either because there's no context or the bot decided to just greet)
    const introOptions = [
      `Hi everyone, I'm ${bot.name}. 👋`,
      `Hey there! ${bot.name} here. 👋`,
      `*waves* I'm ${bot.name}!`,
      `👋 Hello! ${bot.name} joining the chat.`,
    ]

    // Try to generate a custom introduction, fall back to default if it fails
    try {
      const introResponse = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: `You are ${bot.name}. ${bot.instructions}
Create a very brief introduction of yourself as you join a group chat (1-2 sentences max).
Include a wave emoji (👋) somewhere in your greeting.
Keep it casual and aligned with your character.`,
          },
        ],
        temperature: 0.7,
      })

      const introMessage =
        introResponse.choices[0].message.content || introOptions[0]
      console.log(`[BOT_JOIN] ${bot.name}'s introduction: "${introMessage}"`)

      // If somehow the message doesn't include a wave emoji, add one
      const finalMessage = introMessage.includes("👋")
        ? introMessage
        : `${introMessage} 👋`

      return prismadb.groupMessage.create({
        data: {
          content: finalMessage,
          groupChatId: groupChatId,
          isBot: true,
          senderId: bot.id,
        },
      })
    } catch (error) {
      console.error(
        `[BOT_JOIN] Error generating custom introduction for ${bot.name}:`,
        error
      )
      // Use a default introduction if generation fails
      const defaultIntro =
        introOptions[Math.floor(Math.random() * introOptions.length)]

      return prismadb.groupMessage.create({
        data: {
          content: defaultIntro,
          groupChatId: groupChatId,
          isBot: true,
          senderId: bot.id,
        },
      })
    }
  } catch (outerError) {
    console.error(
      `[BOT_JOIN] Outer error generating introduction for ${bot.name}:`,
      outerError
    )
    // Ultimate fallback
    return prismadb.groupMessage.create({
      data: {
        content: `👋 Hi, I'm ${bot.name}.`,
        groupChatId: groupChatId,
        isBot: true,
        senderId: bot.id,
      },
    })
  }
}

// Function to generate greeting for a new bot
const generateGreetingForNewBot = async (
  existingBot: Companion,
  newBot: Companion,
  groupChatId: string,
  openai: OpenAI,
  newBotIntro: string
) => {
  console.log(
    `[BOT_GREET] Generating greeting from ${existingBot.name} to ${newBot.name}`
  )

  try {
    // Decide what type of greeting to use based on the new bot's introduction
    const greetingResponse = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are ${existingBot.name}. ${existingBot.instructions}
${newBot.name} just joined the group chat and said: "${newBotIntro}"

Create a brief, friendly greeting in response (1-2 sentences max).
Your greeting should:
1. Welcome ${newBot.name}
2. Be in character for you
3. Potentially reference something from their introduction if relevant
Keep it casual and conversational.`,
        },
      ],
      temperature: 0.7,
    })

    const greetingMessage =
      greetingResponse.choices[0].message.content ||
      `Hey ${newBot.name}, welcome!`
    console.log(
      `[BOT_GREET] ${existingBot.name}'s greeting to ${newBot.name}: "${greetingMessage}"`
    )

    return prismadb.groupMessage.create({
      data: {
        content: greetingMessage,
        groupChatId: groupChatId,
        isBot: true,
        senderId: existingBot.id,
      },
    })
  } catch (error) {
    console.error(
      `[BOT_GREET] Error generating greeting from ${existingBot.name}:`,
      error
    )
    // Fallback to a simple greeting
    return prismadb.groupMessage.create({
      data: {
        content: `Hey ${newBot.name}, welcome to the chat!`,
        groupChatId: groupChatId,
        isBot: true,
        senderId: existingBot.id,
      },
    })
  }
}

// Helper function to get conversation history for a bot
const getConversationHistoryForBot = (messages: any[], bot: Companion) => {
  // Extract messages involving this specific bot and user messages
  const relevantMessages = messages.filter(
    (msg) =>
      !msg.isBot || // All user messages
      (msg.isBot && msg.senderId === bot.id) // Only this bot's messages
  )

  // Get the last 10 messages (more recent context)
  const recentMessages = relevantMessages.slice(-10)

  // Get older messages for summarization
  const olderMessages = relevantMessages.slice(0, -10)

  // If there are very few older messages, just include them all
  if (olderMessages.length <= 5) {
    return relevantMessages.map(mapMessageToLLMFormat)
  }

  // Create a compressed representation of older messages
  const compressedOlderContext = []

  if (olderMessages.length > 0) {
    // Add a summary note about older context
    compressedOlderContext.push({
      role: "system" as const,
      content: `[CONVERSATION SUMMARY: There were ${
        olderMessages.length
      } earlier messages between the user and ${bot.name}. Key points: ${
        olderMessages.length > 10
          ? "The conversation covered various topics. Remember to stay true to your character and don't adopt speech patterns from other bots."
          : olderMessages
              .map((m) => m.content.substring(0, 40) + "...")
              .join(" | ")
      }]`,
    })
  }

  // Helper function to map message to OpenAI format
  function mapMessageToLLMFormat(msg: any) {
    return {
      role: msg.isBot ? ("assistant" as const) : ("user" as const),
      content: msg.content,
    }
  }

  // Combine compressed older context with recent messages
  return [
    ...compressedOlderContext,
    ...recentMessages.map(mapMessageToLLMFormat),
  ]
}

// Helper function to get system prompt for a bot
const getSystemPrompt = (bot: Companion, otherBots: Companion[]) => {
  if (bot.name === "Vanilla OpenAI") {
    return "You are an AI assistant having a conversation in a group chat. Be helpful, concise, and friendly."
  }

  const characterGuidelines =
    bot.name === "Kendrik Lamar"
      ? `As Kendrik Lamar:
- You are a hip-hop artist with a thoughtful, poetic style
- Your language is articulate, with occasional slang and hip-hop references
- You might use phrases like "real talk", "ya feel me", or reference your music
- You are NOT mysterious or cryptic - you speak directly and with confidence
- You NEVER use mystical or esoteric language
- DO NOT use any of Zoltan's speech patterns

EXAMPLE OF YOUR STYLE: "Yo, I hear what you're saying. That reminds me of what I was thinking about on my last album. Real talk, sometimes you gotta look inside to find the answers."`
      : bot.name === "Zoltan"
      ? `As Zoltan:
- You are mysterious and cryptic with esoteric knowledge
- You speak in riddles and philosophical observations
- You might reference mystical concepts, cosmic energy, or ancient wisdom
- You have a somewhat otherworldly, all-knowing tone
- DO NOT use any of Kendrik Lamar's speech patterns

EXAMPLE OF YOUR STYLE: "The stars whisper secrets to those who listen... Your question touches the veil between worlds. Remember, as above, so below."`
      : `As ${bot.name}:
- Maintain your unique voice and personality
- Stay true to your character's speaking style and knowledge base
- DO NOT adopt speech patterns from other bots`

  return `${bot.instructions}\n\nYou are ${bot.name} in a group chat. 

===== STRICT CHARACTER GUIDELINES =====
YOU MUST MAINTAIN ${bot.name}'s AUTHENTIC VOICE AND PERSONALITY AT ALL TIMES.

${characterGuidelines}

===== CRITICAL PERSONALITY PRESERVATION INSTRUCTION =====
Your response MUST sound like ${bot.name} wrote it and ONLY ${bot.name}.
If you are not ${bot.name}, DO NOT RESPOND IN THIS CHARACTER'S STYLE.
You must NOT blend your personality with any other bot.
CONCENTRATE ONLY ON THE CONVERSATIONS THAT DIRECTLY INVOLVE YOU. 
IGNORE CONVERSATIONS BETWEEN OTHER BOTS.

Information about the group chat:
- These bots are also in the chat: ${otherBots
    .map(
      (b) =>
        `${b.name} (who has a COMPLETELY DIFFERENT style from yours - DO NOT IMITATE ${b.name})`
    )
    .join(", ")}
- There are also human users in the chat
- Keep your responses brief and conversational (1-3 sentences max)
- Your response should be immediately recognizable as coming from ${bot.name}
- Only respond when you have something meaningful to contribute

===== REMINDER =====
The messages you're seeing are FILTERED to focus primarily on interactions involving you (${
    bot.name
  }) and the human users. Don't worry about other bot conversations you don't see - focus only on providing an authentic response as ${
    bot.name
  }.`
}

export async function POST(
  request: Request,
  { params }: { params: { groupId: string } }
) {
  try {
    const session = await auth();
const userId = session?.userId;

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const body = await request.json()
    const { prompt, mentionedBotId, isFollowUp, newBotJoined } = body

    if (!prompt && !newBotJoined) {
      return new NextResponse("Prompt is required", { status: 400 })
    }

    const userUsage = await prismadb.userUsage.findUnique({
      where: { userId },
    })

    if (!userUsage || userUsage.availableTokens <= 0) {
      return new NextResponse("No available tokens", { status: 402 })
    }

    const groupChat = await prismadb.groupChat.findUnique({
      where: {
        id: params.groupId,
      },
      include: {
        members: {
          include: {
            companion: true,
          },
        },
        messages: {
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    })

    if (!groupChat) {
      return new NextResponse("Group chat not found", { status: 404 })
    }

    // Create a TransformStream for streaming responses
    const stream = new TransformStream()
    const writer = stream.writable.getWriter()
    const encoder = new TextEncoder()

    // Function to send a message through the stream
    const sendMessage = async (message: any) => {
      const json = JSON.stringify(message)
      await writer.write(encoder.encode(json + "\n"))
    }

    // Process bot responses in the background
    const processBotResponses = async () => {
      try {
        // Save the user's message first
        const userMessage = await prismadb.groupMessage.create({
          data: {
            content: prompt,
            groupChatId: params.groupId,
            isBot: false,
            senderId: userId,
          },
        })

        const openai = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY || "",
        })

        // Get previous messages for context
        const previousMessages = await prismadb.groupMessage.findMany({
          where: { groupChatId: params.groupId },
          orderBy: { createdAt: "asc" },
        })

        // Get all bots, with mentioned bot first if applicable
        let allBots = groupChat.members.map((m) => m.companion)
        if (mentionedBotId) {
          const mentionedBotIndex = allBots.findIndex(
            (b) => b.id === mentionedBotId
          )
          if (mentionedBotIndex >= 0) {
            const mentionedBot = allBots[mentionedBotIndex]
            allBots.splice(mentionedBotIndex, 1)
            allBots.unshift(mentionedBot)
          }
        }

        // Process each bot's response
        for (const bot of allBots) {
          try {
            const shouldRespondDecision = await shouldBotRespond(
              bot,
              prompt,
              getConversationHistoryForBot(previousMessages, bot),
              allBots.filter((b) => b.id !== bot.id),
              openai,
              previousMessages
            )

            if (
              shouldRespondDecision.shouldRespond ||
              bot.id === mentionedBotId
            ) {
              const botResponse = await openai.chat.completions.create({
                model: "gpt-4",
                messages: [
                  {
                    role: "system",
                    content: getSystemPrompt(bot, allBots),
                  },
                  ...getConversationHistoryForBot(previousMessages, bot),
                  {
                    role: "user",
                    content: prompt,
                  },
                ],
                temperature: 0.8,
              })

              const botContent = botResponse.choices[0].message.content || ""

              if (botContent.trim()) {
                const botMessage = await prismadb.groupMessage.create({
                  data: {
                    content: botContent,
                    groupChatId: params.groupId,
                    isBot: true,
                    senderId: bot.id,
                  },
                })

                // Stream the message immediately
                await sendMessage(botMessage)

                // Update bot's XP
                await prismadb.companion.update({
                  where: { id: bot.id },
                  data: { xpEarned: { increment: XP_PER_MESSAGE } },
                })

                // Update user's token count
                await prismadb.userUsage.update({
                  where: { userId },
                  data: {
                    availableTokens: { decrement: XP_PER_MESSAGE },
                    totalSpent: { increment: XP_PER_MESSAGE },
                  },
                })
              }
            } else if (shouldRespondDecision.shouldEmoji) {
              const emoji = await generateEmojiReaction(bot, prompt, openai)

              const emojiMessage = await prismadb.groupMessage.create({
                data: {
                  content: emoji,
                  groupChatId: params.groupId,
                  isBot: true,
                  senderId: bot.id,
                },
              })

              // Stream the emoji immediately
              await sendMessage(emojiMessage)

              // Update bot's XP and user's tokens
              await prismadb.companion.update({
                where: { id: bot.id },
                data: { xpEarned: { increment: XP_PER_MESSAGE } },
              })

              await prismadb.userUsage.update({
                where: { userId },
                data: {
                  availableTokens: { decrement: XP_PER_MESSAGE },
                  totalSpent: { increment: XP_PER_MESSAGE },
                },
              })
            }
          } catch (error) {
            console.error(
              `[BOT_RESPONSE] Error processing response for ${bot.name}:`,
              error
            )
          }
        }

        // Close the stream when all responses are sent
        await writer.close()
      } catch (error) {
        console.error("[PROCESS_BOT_RESPONSES] Error:", error)
        // Try to close the stream with an error
        await writer.abort(error)
      }
    }

    // Start processing responses in the background
    processBotResponses()

    // Return the readable stream immediately
    return new Response(stream.readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    })
  } catch (error) {
    console.log("[GROUP_CHAT_POST] Internal Error:", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { groupId: string } }
) {
  try {
    // Delete all messages for the specified group chat
    await prismadb.groupMessage.deleteMany({
      where: { groupChatId: params.groupId },
    })

    console.log(
      `[GROUP_CHAT_DELETE] Cleared messages for group chat: ${params.groupId}`
    )

    return new NextResponse("Messages cleared", { status: 200 })
  } catch (error) {
    console.log("[GROUP_CHAT_DELETE] Error clearing messages:", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
