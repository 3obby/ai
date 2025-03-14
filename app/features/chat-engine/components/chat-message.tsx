"use client"

import { BeatLoader } from "react-spinners"
import { Copy, Check, CheckCheck } from "lucide-react"
import { useTheme } from "next-themes"
import { useState } from "react"
import * as Popover from "@radix-ui/react-popover"
import Image from "next/image"

import { cn } from "@/lib/utils"
import { BotAvatar } from "@/components/bot-avatar"
import { UserAvatar } from "@/components/user-avatar"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"

export interface ChatMessageProps {
  role: "user" | "system" | "assistant"
  content?: string
  isLoading?: boolean
  src?: string
  id?: string
  name?: string
  messageStatus?: "sent" | "delivered" | "read"
  reactions?: { emoji: string; from: string; botSrc?: string }[]
  readBy?: { name: string; src: string }[]
  activeTypingBot?: { name: string; src: string }
}

const EMOJI_OPTIONS = ["👍", "❤️", "😂", "😮", "😢", "👏", "🔥", "🎉"]

export const ChatMessage = ({
  role,
  content,
  isLoading,
  src,
  name,
  messageStatus = "read",
  reactions = [],
  readBy = [],
  activeTypingBot,
}: ChatMessageProps) => {
  const { toast } = useToast()
  const { theme } = useTheme()
  const [showEmojis, setShowEmojis] = useState(false)
  const [localReactions, setLocalReactions] =
    useState<{ emoji: string; from: string; botSrc?: string }[]>(reactions)

  const onCopy = () => {
    if (!content) {
      return
    }

    navigator.clipboard.writeText(content)
    toast({
      description: "Message copied to clipboard.",
      duration: 3000,
    })
  }

  const addReaction = (emoji: string) => {
    // Add reaction with info about who added it
    // In a real app, you would use the current user's information
    const newReaction = { emoji, from: "Current User" }
    setLocalReactions((prev) => [...prev, newReaction])
    setShowEmojis(false)
  }

  return (
    <div className="flex flex-col w-full overflow-hidden pb-4">
      <div
        className={cn(
          "group grid grid-cols-[48px_1fr_48px] items-start break-words overflow-hidden",
          content ? (content.length < 40 ? "py-0" : "py-1") : "py-1"
        )}
      >
        {/* Left column - Bot avatar or empty space for user messages */}
        <div className="flex justify-center items-start">
          {role !== "user" && src && (
            <div className="flex flex-col items-center justify-start">
              <BotAvatar src={src} className="h-12 w-12" />
            </div>
          )}
          {role === "system" && isLoading && activeTypingBot && (
            <div className="flex flex-col items-center justify-start">
              <BotAvatar src={activeTypingBot.src} className="h-12 w-12" />
            </div>
          )}
        </div>

        {/* Middle column - Message content */}
        <div
          className={cn(
            "px-3 overflow-hidden w-full",
            role === "user" ? "flex justify-end" : "flex justify-start"
          )}
        >
          <div
            className={cn(
              "rounded-md px-4 py-2 text-sm bg-primary/10 relative overflow-hidden break-words whitespace-normal",
              role === "user" ? "max-w-[95%]" : "max-w-[95%]",
              // For short content, use less padding but maintain consistent height
              content &&
                content.length < 40 &&
                "py-1 min-h-[48px] flex items-center"
            )}
          >
            {isLoading ? (
              <div className="flex items-center justify-center space-x-1">
                <div className="h-2 w-2 rounded-full bg-gray-500 animate-bounce"></div>
                <div className="h-2 w-2 rounded-full bg-gray-500 animate-bounce animation-delay-200"></div>
                <div className="h-2 w-2 rounded-full bg-gray-500 animate-bounce animation-delay-400"></div>
              </div>
            ) : (
              content
            )}
          </div>
        </div>

        {/* Right column - User avatar or buttons for bot messages */}
        <div className="flex justify-center items-start">
          {role === "user" ? (
            <div className="flex flex-col items-center justify-start">
              <UserAvatar />
            </div>
          ) : (
            <div
              className={cn(
                "flex gap-1",
                content && content.length < 40 ? "flex-row" : "flex-col",
                "self-center"
              )}
            >
              {!isLoading && (
                <Button
                  onClick={onCopy}
                  className="opacity-0 group-hover:opacity-100 transition"
                  size="icon"
                  variant="ghost"
                  style={{
                    height: content && content.length < 40 ? "24px" : "40px",
                    width: content && content.length < 40 ? "24px" : "40px",
                  }}
                >
                  <Copy className="w-3.5 h-3.5" />
                </Button>
              )}

              {/* Emoji reaction button - only show for bot messages */}
              {!isLoading && (
                <Popover.Root open={showEmojis} onOpenChange={setShowEmojis}>
                  <Popover.Trigger asChild>
                    <Button
                      onClick={() => setShowEmojis(true)}
                      className="opacity-0 group-hover:opacity-100 transition"
                      size="icon"
                      variant="ghost"
                      style={{
                        height:
                          content && content.length < 40 ? "24px" : "40px",
                        width: content && content.length < 40 ? "24px" : "40px",
                      }}
                    >
                      😀
                    </Button>
                  </Popover.Trigger>
                  <Popover.Portal>
                    <Popover.Content
                      className="w-full p-2 z-50 rounded-md border bg-popover text-popover-foreground shadow-md"
                      align="end"
                    >
                      <div className="flex flex-wrap gap-2 justify-center">
                        {EMOJI_OPTIONS.map((emoji) => (
                          <button
                            key={emoji}
                            className="text-2xl hover:bg-primary/10 p-1 rounded cursor-pointer"
                            onClick={() => addReaction(emoji)}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </Popover.Content>
                  </Popover.Portal>
                </Popover.Root>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Message status indicators for user messages - Moved outside the message container */}
      {role === "user" && !isLoading && content && (
        <div className="flex justify-end pr-[60px] mt-1">
          <div className="text-xs text-gray-500 flex flex-col items-end">
            <div className="flex items-center">
              {messageStatus === "sent" && <Check className="h-3 w-3" />}
              {messageStatus === "delivered" && <Check className="h-3 w-3" />}
              {messageStatus === "read" && (
                <CheckCheck
                  className={cn(
                    "h-3 w-3",
                    readBy.length > 0 ? "text-green-500" : "text-gray-400"
                  )}
                />
              )}
              <span className="ml-1">
                {messageStatus === "read" && readBy.length > 0
                  ? `read by ${readBy.length}`
                  : messageStatus}
              </span>
            </div>

            {/* Show emoji reactions next to read receipt for user messages */}
            <div
              className={cn(
                "flex gap-1 mt-1",
                localReactions.length === 0 && "min-h-0" // No minimum height when empty
              )}
            >
              {localReactions.map((reaction, index) => (
                <div
                  key={`${reaction.emoji}-${index}`}
                  className="bg-primary/5 rounded-full px-2 py-1 text-xs flex items-center gap-1"
                  title={`Reaction from ${reaction.from}`}
                >
                  {reaction.botSrc && (
                    <div className="h-4 w-4 rounded-full overflow-hidden relative">
                      <Image
                        src={reaction.botSrc}
                        alt={reaction.from}
                        fill
                        sizes="16px"
                        className="object-cover"
                      />
                    </div>
                  )}
                  {reaction.emoji}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Emoji reactions display for bot messages only */}
      <div
        className={cn(
          "flex gap-1 -mt-1 mb-1",
          "justify-start ml-16",
          role === "user" && "hidden",
          localReactions.length === 0 && "min-h-0 mb-0" // No minimum height when empty
        )}
      >
        {localReactions.map((reaction, index) => (
          <div
            key={`${reaction.emoji}-${index}`}
            className="bg-primary/5 rounded-full px-2 py-1 text-xs flex items-center gap-1"
            title={`Reaction from ${reaction.from}`}
          >
            {reaction.botSrc && (
              <div className="h-4 w-4 rounded-full overflow-hidden relative">
                <Image
                  src={reaction.botSrc}
                  alt={reaction.from}
                  fill
                  sizes="16px"
                  className="object-cover"
                />
              </div>
            )}
            {reaction.emoji}
          </div>
        ))}
      </div>
    </div>
  )
}
