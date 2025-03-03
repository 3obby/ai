"use client"

import { BeatLoader } from "react-spinners"
import { Copy, Check, CheckCheck } from "lucide-react"
import { useTheme } from "next-themes"
import { useState } from "react"
import * as Popover from "@radix-ui/react-popover"

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
    <div className="flex flex-col">
      <div
        className={cn(
          "group flex items-start gap-x-3 py-4 max-w-[80%] break-words",
          role === "user" && "justify-end ml-auto"
        )}
      >
        {role !== "user" && src && (
          <div className="flex flex-col items-center gap-y-1">
            <BotAvatar src={src} />
          </div>
        )}
        {role === "system" && isLoading && activeTypingBot && (
          <div className="flex flex-col items-center gap-y-1">
            <BotAvatar src={activeTypingBot.src} />
          </div>
        )}
        <div className="rounded-md px-4 py-2 max-w-sm text-sm bg-primary/10 relative">
          {isLoading ? (
            <div className="flex items-center justify-center space-x-1">
              <div className="h-2 w-2 rounded-full bg-gray-500 animate-bounce"></div>
              <div className="h-2 w-2 rounded-full bg-gray-500 animate-bounce animation-delay-200"></div>
              <div className="h-2 w-2 rounded-full bg-gray-500 animate-bounce animation-delay-400"></div>
            </div>
          ) : (
            content
          )}

          {/* Message status indicators for user messages */}
          {role === "user" && !isLoading && (
            <div className="absolute bottom-0 right-0 -mb-5 text-xs text-gray-500 flex flex-col items-end">
              <div className="flex items-center mb-1">
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
                    ? `read by ${readBy.map((bot) => bot.name).join(", ")}`
                    : messageStatus}
                </span>
              </div>
            </div>
          )}
        </div>
        {role === "user" && <UserAvatar />}

        {/* Copy and reaction buttons */}
        <div className="flex flex-col gap-2">
          {role !== "user" && !isLoading && (
            <Button
              onClick={onCopy}
              className="opacity-0 group-hover:opacity-100 transition"
              size="icon"
              variant="ghost"
            >
              <Copy className="w-4 h-4" />
            </Button>
          )}

          {/* Emoji reaction button */}
          <Popover.Root open={showEmojis} onOpenChange={setShowEmojis}>
            <Popover.Trigger asChild>
              <Button
                onClick={() => setShowEmojis(true)}
                className="opacity-0 group-hover:opacity-100 transition"
                size="icon"
                variant="ghost"
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
        </div>
      </div>

      {/* Emoji reactions display */}
      {localReactions.length > 0 && (
        <div
          className={cn(
            "flex gap-1 -mt-2 mb-2",
            role === "user" ? "justify-end" : "justify-start ml-10"
          )}
        >
          {localReactions.map((reaction, index) => (
            <div
              key={`${reaction.emoji}-${index}`}
              className="bg-primary/5 rounded-full px-2 py-1 text-xs flex items-center gap-1"
              title={`Reaction from ${reaction.from}`}
            >
              {reaction.botSrc && (
                <div className="h-4 w-4 rounded-full overflow-hidden">
                  <img
                    src={reaction.botSrc}
                    alt={reaction.from}
                    className="h-full w-full object-cover"
                  />
                </div>
              )}
              {reaction.emoji}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
