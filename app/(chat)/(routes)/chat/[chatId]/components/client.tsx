"use client"

import { useCompletion } from "ai/react"
import { FormEvent, useState } from "react"
import { Companion, Message } from "@prisma/client"
import { useRouter } from "next/navigation"
import { useChatLimit } from "@/store/use-chat-limit"

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
    }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setIsLoading(true)

    try {
      const response = await fetch(`/api/chat/${companion.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          allMessages: newMessages,
          isFollowUp: false,
        }),
      })

      const completion = await response.text()
      console.log("🤖 First message received")

      const aiMessage: ChatMessageProps = {
        role: "assistant",
        content: completion,
        src: companion.src,
      }
      setMessages((current) => [...current, aiMessage])
      setInput("")
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
            const followUpResponse = await fetch(`/api/chat/${companion.id}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                prompt: `Reply in a short, casual style—like texting—with a friendly tone. 
Here's my previous message:
"${completion}"`,
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

              const thirdResponse = await fetch(`/api/chat/${companion.id}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  prompt: completion + "\n\n" + secondMessage,
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
            setMessages((current) =>
              current.filter((message) => !message.isLoading)
            )
            console.error("❌ Error sending follow-up messages:", error)
          }
        }
      }

      router.refresh()
    } catch (error) {
      console.error("Failed to send message:", error)
    } finally {
      setIsLoading(false)
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
