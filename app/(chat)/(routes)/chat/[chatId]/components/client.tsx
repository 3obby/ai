"use client"

import { useChat } from "ai/react"
import { FormEvent, useState, useEffect } from "react"
import { Companion, Message } from "@prisma/client"
import { useRouter } from "next/navigation"
import { useChatLimit } from "@/store/use-chat-limit"
import { usePrompts } from "@/store/use-prompts"

import { ChatForm } from "@/components/chat-form"
import { ChatHeader } from "@/components/chat-header"
import { ChatMessages } from "@/components/chat-messages"
import { ChatMessageProps } from "@/components/chat-message"

interface ChatClientProps {
  companion: Companion & {
    messages: Message[]
    _count: {
      messages: number
    }
  }
}

export const ChatClient = ({ companion }: ChatClientProps) => {
  const router = useRouter()
  const { prompts } = usePrompts()
  const activePrompts = prompts.filter((prompt) => prompt.isActive)

  const [messages, setMessages] = useState<ChatMessageProps[]>(
    companion.messages.length === 0
      ? [
          {
            role: "system",
            content:
              (companion as any).customIntroduction ||
              `Hi there! I'm ${companion.name}. 👋`,
            src: companion.src,
          },
        ]
      : companion.messages
  )
  const { decrementRemaining } = useChatLimit()
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isClearingMessages, setIsClearingMessages] = useState(false)

  const handleInputChange = (
    e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>
  ) => {
    setInput(e.target.value)
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage: ChatMessageProps = {
      role: "user",
      content: input,
      messageStatus: "sent",
      readBy: [],
      reactions: [],
    }

    setMessages((prevMessages) => [...prevMessages, userMessage])
    setInput("")
    setIsLoading(true)

    try {
      setTimeout(() => {
        setMessages((prevMessages) => {
          return prevMessages.map((msg) => {
            if (msg === userMessage) {
              return { ...msg, messageStatus: "delivered" }
            }
            return msg
          })
        })
      }, 500)

      setTimeout(() => {
        setMessages((prevMessages) => {
          return prevMessages.map((msg) => {
            if (msg.role === "user" && msg.content === userMessage.content) {
              return {
                ...msg,
                messageStatus: "read",
                readBy: [{ name: companion.name, src: companion.src }],
              }
            }
            return msg
          })
        })

        if (Math.random() > 0.5) {
          const emojis = ["👍", "❤️", "😂", "😮", "😢", "👏", "🔥", "🎉"]
          const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)]

          setMessages((prevMessages) => {
            return prevMessages.map((msg) => {
              if (msg.role === "user" && msg.content === userMessage.content) {
                return {
                  ...msg,
                  reactions: [
                    ...(msg.reactions || []),
                    {
                      emoji: randomEmoji,
                      from: companion.name,
                      botSrc: companion.src,
                    },
                  ],
                }
              }
              return msg
            })
          })
        }
      }, 1500)

      let messageWithPrompts = [...messages, userMessage]

      if (activePrompts.length > 0) {
        const systemMessageIndex = messageWithPrompts.findIndex(
          (msg) => msg.role === "system"
        )

        if (systemMessageIndex >= 0) {
          const systemMessage = messageWithPrompts[systemMessageIndex]
          const promptsText = activePrompts
            .map((prompt) => `- ${prompt.text}`)
            .join("\n")

          messageWithPrompts[systemMessageIndex] = {
            ...systemMessage,
            content: `${systemMessage.content}\n\nAdditional instructions:\n${promptsText}`,
          }
        } else {
          const promptsText = activePrompts
            .map((prompt) => `- ${prompt.text}`)
            .join("\n")

          messageWithPrompts.unshift({
            role: "system",
            content: `Additional instructions:\n${promptsText}`,
          })
        }
      }

      const response = await fetch(`/api/chat/${companion.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          allMessages: messageWithPrompts,
          isFollowUp: false,
        }),
      })

      if (!response.ok) {
        throw new Error(response.statusText)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error("Failed to get response reader")
      }

      const assistantMessage: ChatMessageProps = {
        role: "system",
        content: "",
        isLoading: true,
        src: companion.src,
        activeTypingBot: {
          name: companion.name,
          src: companion.src,
        },
      }

      setMessages((prev) => [...prev, assistantMessage])

      let accumulatedContent = ""

      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()

        if (done) {
          break
        }

        const chunk = decoder.decode(value, { stream: true })
        accumulatedContent += chunk

        setMessages((prevMessages) => {
          const updatedMessages = [...prevMessages]
          const lastMessageIndex = updatedMessages.length - 1
          if (
            lastMessageIndex >= 0 &&
            updatedMessages[lastMessageIndex].role === "system" &&
            updatedMessages[lastMessageIndex].isLoading
          ) {
            updatedMessages[lastMessageIndex] = {
              ...updatedMessages[lastMessageIndex],
              content: accumulatedContent,
            }
          }
          return updatedMessages
        })
      }

      setMessages((prevMessages) => {
        const updatedMessages = [...prevMessages]
        const lastMessageIndex = updatedMessages.length - 1
        if (
          lastMessageIndex >= 0 &&
          updatedMessages[lastMessageIndex].role === "system" &&
          updatedMessages[lastMessageIndex].isLoading
        ) {
          updatedMessages[lastMessageIndex] = {
            role: "assistant",
            content: accumulatedContent,
            src: companion.src,
            name: companion.name,
          }
        }
        return updatedMessages
      })

      decrementRemaining()

      if (companion.sendMultipleMessages) {
        console.log("📱 Multiple messages enabled for this companion")
        const doubleMessageRoll = Math.random() * 100
        console.log(
          `🎲 Double message roll: ${doubleMessageRoll.toFixed(
            2
          )}% (needs ≤ 15%)`
        )

        if (doubleMessageRoll <= 15) {
          console.log("🎯 Triggering second message...")
          setMessages((current) => [
            ...current,
            {
              role: "system",
              content: "",
              isLoading: true,
              src: companion.src,
            },
          ])

          try {
            let followUpPrompt = `Reply in a short, casual style—like texting—with a friendly tone.`

            if (activePrompts.length > 0) {
              const promptsText = activePrompts
                .map((prompt) => `- ${prompt.text}`)
                .join("\n")
              followUpPrompt += `\n\nAdditional instructions:\n${promptsText}`
            }

            followUpPrompt += `\n\nHere's my previous message:\n"${accumulatedContent}"`

            const followUpResponse = await fetch(`/api/chat/${companion.id}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                prompt: followUpPrompt,
                isFollowUp: true,
              }),
            })

            const secondMessage = await followUpResponse.text()
            console.log("🤖 Second message received")

            setMessages((current) => {
              const messages = current.filter((message) => !message.isLoading)
              return [
                ...messages,
                {
                  role: "system",
                  content: secondMessage,
                  src: companion.src,
                },
              ]
            })
            decrementRemaining()

            const tripleMessageRoll = Math.random() * 100
            console.log(
              `🎲 Triple message roll: ${tripleMessageRoll.toFixed(
                2
              )}% (needs ≤ 5%)`
            )

            if (tripleMessageRoll <= 5) {
              console.log("🎯 Triggering third message...")
              setMessages((current) => [
                ...current,
                {
                  role: "system",
                  content: "",
                  isLoading: true,
                  src: companion.src,
                },
              ])

              let thirdPrompt = accumulatedContent + "\n\n" + secondMessage

              if (activePrompts.length > 0) {
                const promptsText = activePrompts
                  .map((prompt) => `- ${prompt.text}`)
                  .join("\n")
                thirdPrompt = `Additional instructions:\n${promptsText}\n\n${thirdPrompt}`
              }

              const thirdResponse = await fetch(`/api/chat/${companion.id}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  prompt: thirdPrompt,
                  isFollowUp: true,
                }),
              })

              const thirdMessage = await thirdResponse.text()
              console.log("🤖 Third message received")

              setMessages((current) => {
                const messages = current.filter((message) => !message.isLoading)
                return [
                  ...messages,
                  {
                    role: "system",
                    content: thirdMessage,
                    src: companion.src,
                  },
                ]
              })
              decrementRemaining()
            }
          } catch (error) {
            console.error("Error in follow-up message:", error)
          }
        }
      }
    } catch (error) {
      console.error("Error in handleSubmit:", error)
    } finally {
      setIsLoading(false)
      router.refresh()
    }
  }

  const onClear = async (onClose: () => void) => {
    try {
      setIsClearingMessages(true)
      await fetch(`/api/chat/${companion.id}`, {
        method: "DELETE",
      })

      setMessages([])
      router.refresh()
      onClose()
    } catch (error) {
      console.error("Failed to clear chat:", error)
    } finally {
      setIsClearingMessages(false)
    }
  }

  const handleInputFocus = () => {
    setTimeout(() => {
      window.scrollTo({
        top: document.body.scrollHeight,
        behavior: "smooth",
      })
    }, 100)
  }

  return (
    <div className="flex flex-col h-full p-4 space-y-2">
      <ChatHeader
        companion={companion}
        onClear={onClear}
        isGroupChat={false}
        isClearingMessages={isClearingMessages}
      />
      <ChatMessages isLoading={isLoading} messages={messages} />
      <ChatForm
        isLoading={isLoading}
        input={input}
        handleInputChange={handleInputChange}
        onSubmit={handleSubmit}
        onFocus={handleInputFocus}
      />
    </div>
  )
}
