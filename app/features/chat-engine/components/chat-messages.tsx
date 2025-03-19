"use client"

import { ElementRef, useEffect, useRef, useState } from "react"
import { Companion } from "@prisma/client"

import { ChatMessage, ChatMessageProps } from "@/components/chat-message"

interface ChatMessagesProps {
  messages: ChatMessageProps[]
  isLoading: boolean
}

export const ChatMessages = ({
  messages = [],
  isLoading,
}: ChatMessagesProps) => {
  const scrollRef = useRef<ElementRef<"div">>(null)
  const [fakeLoading, setFakeLoading] = useState(messages.length === 0)

  useEffect(() => {
    const timeout = setTimeout(() => {
      setFakeLoading(false)
    }, 1000)

    return () => {
      clearTimeout(timeout)
    }
  }, [])

  useEffect(() => {
    const scrollToBottom = () => {
      if (scrollRef.current) {
        scrollRef.current.scrollIntoView({ behavior: "smooth" })
      }
    }

    scrollToBottom()

    const delayedScroll = setTimeout(scrollToBottom, 100)

    return () => clearTimeout(delayedScroll)
  }, [messages, isLoading])

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 w-full">
      <div className="flex flex-col w-full max-w-5xl mx-auto">
        {messages.map((message, index) => {
          // Check if this is the last user message to add the "typing" indicator
          const isLastUserMessage =
            message.role === "user" &&
            index ===
              messages.findIndex((m, i) => m.role === "user" && i >= index)

          return (
            <div
              key={message.id || index}
              className={`flex w-full ${
                message.role === "user"
                  ? "justify-end flex-wrap"
                  : "justify-start"
              } mb-1`}
            >
              <ChatMessage
                src={message.role === "user" ? "" : message.src}
                name={message.name}
                content={message.content}
                role={message.role}
                isLoading={message.isLoading}
                messageStatus={message.messageStatus}
                reactions={message.reactions}
                readBy={message.readBy}
                activeTypingBot={message.activeTypingBot}
              />
            </div>
          )
        })}
        {isLoading && (
          <div className="flex justify-start">
            <ChatMessage role="system" isLoading />
          </div>
        )}
        <div ref={scrollRef} />
      </div>
    </div>
  )
}
