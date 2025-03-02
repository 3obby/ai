import { auth, currentUser } from "@clerk/nextjs"
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
  openai: OpenAI
) => {
  console.log(
    `[DECISION] Evaluating if ${
      bot.name
    } should respond to: "${prompt.substring(0, 30)}..."`
  )

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // Using a smaller, faster model for this decision
      messages: [
        {
          role: "system",
          content: `You are an assistant that decides how ${bot.name} should respond to the current message in a group chat.
Consider: 
1. Is there something meaningful or unique that ${bot.name} can contribute? 
2. Is the message relevant to ${bot.name}'s expertise or personality?
3. Does the message warrant a response of any kind?

IMPORTANT: Almost always respond with either "RESPOND" or "EMOJI". Only use "SKIP" in rare cases where the message is completely irrelevant.

Respond with exactly one of these options:
- "RESPOND" if ${bot.name} should give a full text response
- "EMOJI" if ${bot.name} should just react with an emoji (default if unsure)
- "SKIP" if ${bot.name} should not respond at all (use RARELY, only for completely irrelevant messages)`,
        },
        {
          role: "user",
          content: `Current message: "${prompt}"
${bot.name}'s character: ${bot.instructions}
Other participants: ${otherBots.map((b) => b.name).join(", ")}
Recent conversation: ${conversationHistory
            .slice(-5)
            .map((msg) => `${msg.role}: ${msg.content}`)
            .join("\n")}`,
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

    if (rawDecision.toUpperCase().includes("RESPOND")) {
      result = {
        shouldRespond: true,
        shouldEmoji: false,
        shouldSkip: false,
      }
    } else if (rawDecision.toUpperCase().includes("EMOJI")) {
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
    // Default to emoji response if there's an error
    return {
      shouldRespond: false,
      shouldEmoji: true,
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

export async function POST(
  request: Request,
  { params }: { params: { groupId: string } }
) {
  try {
    const { prompt, mentionedBotId, newBotJoined } = await request.json()
    const user = await currentUser()

    console.log("[GROUP_CHAT_POST] Request received with params:", params)
    console.log("[GROUP_CHAT_POST] User:", user)

    if (!user || !user.id) {
      console.log("[GROUP_CHAT_POST] Unauthorized access attempt")
      return new NextResponse("Unauthorized", { status: 401 })
    }

    // Check if user has enough XP
    const userUsage = await prismadb.userUsage.findUnique({
      where: { userId: user.id },
    })

    console.log("[GROUP_CHAT_POST] User usage:", userUsage)

    if (!userUsage) {
      console.log("[GROUP_CHAT_POST] User usage record not found")
      return new NextResponse("User usage record not found", { status: 404 })
    }

    if (userUsage.availableTokens < XP_PER_MESSAGE) {
      console.log("[GROUP_CHAT_POST] Insufficient XP")
      return new NextResponse("Please purchase more XP to continue chatting", {
        status: 402,
        statusText: `Need ${
          XP_PER_MESSAGE - userUsage.availableTokens
        } more XP`,
      })
    }

    // Get the group chat and its members
    const groupChat = await prismadb.groupChat.findUnique({
      where: { id: params.groupId },
      include: {
        members: {
          include: { companion: true },
        },
      },
    })

    console.log("[GROUP_CHAT_POST] Group chat:", groupChat)

    if (!groupChat) {
      console.log("[GROUP_CHAT_POST] Group chat not found")
      return new NextResponse("Group chat not found", { status: 404 })
    }

    // Handle new bot joining event
    if (newBotJoined) {
      const newBot = groupChat.members.find(
        (m) => m.companion.id === newBotJoined
      )?.companion

      if (!newBot) {
        return new NextResponse("New bot not found", { status: 404 })
      }

      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY || "",
      })

      // Get recent messages for context
      const recentMessages = await prismadb.groupMessage.findMany({
        where: { groupChatId: params.groupId },
        orderBy: { createdAt: "desc" },
        take: 10,
      })

      console.log(
        `[BOT_JOIN] Found ${recentMessages.length} recent messages for context`
      )

      // Generate introduction from the new bot (with conversation context)
      const introMessage = await generateBotIntroduction(
        newBot,
        params.groupId,
        openai,
        recentMessages.reverse() // Reverse to get chronological order
      )

      // Let other bots greet the new bot (max 3 random bots will greet)
      const existingBots = groupChat.members
        .map((m) => m.companion)
        .filter((bot) => bot.id !== newBot.id)
        .sort(() => Math.random() - 0.5)
        .slice(0, Math.min(3, groupChat.members.length - 1))

      const greetingMessages = await Promise.all(
        existingBots.map((bot) =>
          generateGreetingForNewBot(
            bot,
            newBot,
            params.groupId,
            openai,
            introMessage.content
          )
        )
      )

      const allMessages = [introMessage, ...greetingMessages]

      // Update XP for the bots that responded
      await Promise.all(
        allMessages.map((msg) =>
          prismadb.companion.update({
            where: { id: msg.senderId },
            data: { xpEarned: { increment: XP_PER_MESSAGE } },
          })
        )
      )

      // Charge the user for these messages
      await prismadb.userUsage.update({
        where: { userId: user.id },
        data: {
          availableTokens: Math.max(
            0,
            userUsage.availableTokens - XP_PER_MESSAGE * allMessages.length
          ),
          totalSpent: { increment: XP_PER_MESSAGE * allMessages.length },
        },
      })

      return NextResponse.json({
        botMessages: allMessages.map((msg) => ({
          id: msg.id,
          content: msg.content,
          isBot: true,
          senderId: msg.senderId,
          createdAt: msg.createdAt,
        })),
        respondingBots: [...existingBots, newBot].map((bot) => ({
          id: bot.id,
          name: bot.name,
          messageDelay: bot.messageDelay,
        })),
      })
    }

    // Regular message flow
    // Save the user's message first
    const userMessage = await prismadb.groupMessage.create({
      data: {
        content: prompt,
        groupChatId: params.groupId,
        isBot: false,
        senderId: user.id,
      },
    })

    console.log("[GROUP_CHAT_POST] User message saved:", userMessage)

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || "",
    })

    // Process bot responses
    const processBotResponses = async () => {
      // Get previous messages to build conversation history
      const previousMessages = await prismadb.groupMessage.findMany({
        where: { groupChatId: params.groupId },
        orderBy: { createdAt: "asc" },
        include: {
          groupChat: {
            include: {
              members: {
                include: { companion: true },
              },
            },
          },
        },
      })

      // Create a conversation history for the LLM
      const buildConversationHistory = (messages: any[]) => {
        return messages.map((msg) => {
          // For user messages
          if (!msg.isBot) {
            return {
              role: "user" as const,
              content: msg.content,
            }
          }
          // For bot messages
          else {
            return {
              role: "assistant" as const,
              content: msg.content,
            }
          }
        })
      }

      const conversationHistory = buildConversationHistory(previousMessages)

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

      const responses = []

      // Check which bots responded last to prevent emoji spam
      const recentMessages = previousMessages.slice(-10)
      const lastUserMsgIndex = recentMessages.findLastIndex((msg) => !msg.isBot)

      // Get bots that responded after the last user message (to avoid duplicate responses)
      const recentlyRespondedBotIds =
        lastUserMsgIndex >= 0
          ? recentMessages
              .slice(lastUserMsgIndex + 1)
              .filter((msg) => msg.isBot)
              .map((msg) => msg.senderId)
          : []

      console.log(
        `[RESPONSE_FILTER] Bots that recently responded: ${recentlyRespondedBotIds.join(
          ", "
        )}`
      )

      // Prepare bot info to include in each bot's context
      const botsInfo = allBots.map((bot) => ({
        id: bot.id,
        name: bot.name,
      }))

      // Have each bot independently decide whether to respond
      for (const bot of allBots) {
        const otherBots = allBots.filter((b) => b.id !== bot.id)
        console.log(`[BOT_RESPONSE] Processing response for ${bot.name}`)

        // Check if this bot has responded after the last user message
        const hasRecentlyResponded = recentlyRespondedBotIds.includes(bot.id)
        if (hasRecentlyResponded && bot.id !== mentionedBotId) {
          console.log(
            `[BOT_RESPONSE] ${bot.name} already responded to this conversation thread, skipping`
          )
          continue
        }

        try {
          // If the bot was mentioned, they should always respond with text
          if (mentionedBotId === bot.id) {
            console.log(
              `[BOT_RESPONSE] ${bot.name} was mentioned directly, generating text response`
            )
            // Generate full text response
            const botResponse = await openai.chat.completions.create({
              model: "gpt-4",
              messages: [
                {
                  role: "system",
                  content: `${bot.instructions}\n\nYou are ${
                    bot.name
                  } in a group chat.
Information about the group chat:
- These bots are also in the chat: ${otherBots.map((b) => b.name).join(", ")}
- There are also human users in the chat
- Keep your responses brief and conversational (1-3 sentences max)
- Be distinctive and stay true to your character
- You were mentioned directly, so you should definitely respond
- React naturally to what others say`,
                },
                ...conversationHistory,
                {
                  role: "user",
                  content: prompt,
                },
              ],
            })

            const botContent = botResponse.choices[0].message.content || ""
            console.log(
              `[BOT_RESPONSE] ${
                bot.name
              }'s response (mentioned): "${botContent.substring(0, 50)}..."`
            )

            // Save the text response
            if (botContent.trim()) {
              const botMessage = await prismadb.groupMessage.create({
                data: {
                  content: botContent,
                  groupChatId: params.groupId,
                  isBot: true,
                  senderId: bot.id,
                },
              })

              responses.push(botMessage)
              console.log(
                `[BOT_RESPONSE] Saved ${bot.name}'s text response with ID: ${botMessage.id}`
              )
            } else {
              console.log(
                `[BOT_RESPONSE] ${bot.name}'s response was empty, not saving`
              )
            }
          } else {
            // For non-mentioned bots, check if they should respond
            console.log(
              `[BOT_RESPONSE] Determining if ${bot.name} should respond`
            )
            const responseDecision = await shouldBotRespond(
              bot,
              prompt,
              conversationHistory,
              otherBots,
              openai
            )

            if (responseDecision.shouldRespond) {
              console.log(
                `[BOT_RESPONSE] ${bot.name} decided to respond with text`
              )
              // Generate full text response
              const botResponse = await openai.chat.completions.create({
                model: "gpt-4",
                messages: [
                  {
                    role: "system",
                    content: `${bot.instructions}\n\nYou are ${
                      bot.name
                    } in a group chat.
Information about the group chat:
- These bots are also in the chat: ${otherBots.map((b) => b.name).join(", ")}
- There are also human users in the chat
- Keep your responses brief and conversational (1-3 sentences max)
- Be distinctive and stay true to your character
- You don't need to respond to every message, only when you have something meaningful to contribute
- React naturally to what others say`,
                  },
                  ...conversationHistory,
                  {
                    role: "user",
                    content: prompt,
                  },
                ],
              })

              const botContent = botResponse.choices[0].message.content || ""
              console.log(
                `[BOT_RESPONSE] ${
                  bot.name
                }'s text response: "${botContent.substring(0, 50)}..."`
              )

              // Save the text response
              if (botContent.trim()) {
                const botMessage = await prismadb.groupMessage.create({
                  data: {
                    content: botContent,
                    groupChatId: params.groupId,
                    isBot: true,
                    senderId: bot.id,
                  },
                })

                responses.push(botMessage)
                console.log(
                  `[BOT_RESPONSE] Saved ${bot.name}'s text response with ID: ${botMessage.id}`
                )
              } else {
                console.log(
                  `[BOT_RESPONSE] ${bot.name}'s response was empty, not saving`
                )
              }
            } else if (
              responseDecision.shouldEmoji ||
              responseDecision.shouldSkip
            ) {
              // Even if "skip" is chosen, we'll do emoji anyway to ensure some response
              console.log(
                `[BOT_RESPONSE] ${bot.name} decided to ${
                  responseDecision.shouldEmoji
                    ? "respond with emoji"
                    : "convert skip to emoji"
                }`
              )
              // Generate emoji reaction
              const emoji = await generateEmojiReaction(bot, prompt, openai)
              console.log(
                `[BOT_RESPONSE] ${bot.name}'s emoji reaction: "${emoji}"`
              )

              // Save the emoji response
              const emojiMessage = await prismadb.groupMessage.create({
                data: {
                  content: emoji,
                  groupChatId: params.groupId,
                  isBot: true,
                  senderId: bot.id,
                },
              })

              responses.push(emojiMessage)
              console.log(
                `[BOT_RESPONSE] Saved ${bot.name}'s emoji response with ID: ${emojiMessage.id}`
              )
            }
          }
        } catch (error) {
          console.error(
            `[BOT_RESPONSE] Error processing response for ${bot.name}:`,
            error
          )
          // Try to add a default emoji response if something went wrong
          try {
            const emojiMessage = await prismadb.groupMessage.create({
              data: {
                content: "❓",
                groupChatId: params.groupId,
                isBot: true,
                senderId: bot.id,
              },
            })
            responses.push(emojiMessage)
            console.log(
              `[BOT_RESPONSE] Added fallback emoji for ${bot.name} due to error`
            )
          } catch (innerError) {
            console.error(
              `[BOT_RESPONSE] Failed to add fallback emoji for ${bot.name}:`,
              innerError
            )
          }
        }
      }

      // Introducing random response delays
      const getRandomDelay = () => Math.floor(Math.random() * 3) * 1000 // 0-2 second delays
      await new Promise((resolve) => setTimeout(resolve, getRandomDelay()))

      // Update XP for all responding bots
      await Promise.all(
        responses.map((msg) =>
          prismadb.companion.update({
            where: { id: msg.senderId },
            data: { xpEarned: { increment: XP_PER_MESSAGE } },
          })
        )
      )

      // Update user XP once for all responses
      const userUsage = await prismadb.userUsage.findUnique({
        where: { userId: user.id },
      })

      const newTokens = Math.max(
        0,
        (userUsage?.availableTokens || 0) - XP_PER_MESSAGE * responses.length
      )

      await prismadb.userUsage.update({
        where: { userId: user.id },
        data: {
          availableTokens: newTokens,
          totalSpent: { increment: XP_PER_MESSAGE * responses.length },
        },
      })

      return responses
    }

    const botResponses = await processBotResponses()

    return NextResponse.json({
      botMessages: botResponses.map((msg) => ({
        id: msg.id,
        content: msg.content,
        isBot: true,
        senderId: msg.senderId,
        createdAt: msg.createdAt,
      })),
      respondingBots: groupChat.members
        .map((m) => m.companion)
        .filter((bot) => botResponses.some((msg) => msg.senderId === bot.id))
        .map((bot) => ({
          id: bot.id,
          name: bot.name,
          messageDelay: bot.messageDelay,
        })),
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
