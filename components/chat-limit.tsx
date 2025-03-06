"use client"

import { useEffect, useState } from "react"
import * as Progress from "@radix-ui/react-progress"
import { Trophy, Zap, ChevronRight, Star, Coins } from "lucide-react"
import React from "react"
import { useCurrentUser } from "@/lib/hooks/use-current-user"
import {
  calculateLevel,
  getXPForNextLevel,
  getProgressToNextLevel,
} from "@/lib/level-system"

interface ChatLimitProps {
  userId: string
  onXpChange?: (newXp: number) => void
}

interface UserProgress {
  earnedXP: number
  level: number
  nextLevelXP: number
  progressToNextLevel: number
  usedTokens: number
  remainingTokens: number
  baseTokenAllocation: number
  isSubscribed: boolean
}

export const ChatLimit = ({ userId, onXpChange }: ChatLimitProps) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [progress, setProgress] = useState<UserProgress | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [tokensUpdated, setTokensUpdated] = useState(false)
  const { user } = useCurrentUser()

  const fetchProgress = async () => {
    try {
      console.log("Fetching user progress...")
      setFetchError(null)
      const response = await fetch("/api/user-progress")

      if (!response.ok) {
        console.error("Failed to fetch user progress:", response.statusText)
        setFetchError(
          `Failed to fetch: ${response.status} ${response.statusText}`
        )
        return
      }

      const data = await response.json()
      console.log("Fetched user progress:", data) // Debug log

      if (!data) {
        console.error("No data returned from user progress API")
        setFetchError("No data returned from API")
        return
      }

      // If we already had progress data and tokens increased significantly,
      // show a visual indicator
      if (progress && data.remainingTokens > progress.remainingTokens + 10000) {
        setTokensUpdated(true)
        // Hide the indicator after 5 seconds
        setTimeout(() => setTokensUpdated(false), 5000)
      }

      setProgress({
        earnedXP: data.earnedXP || 0,
        level: data.level || 0,
        nextLevelXP: data.nextLevelXP || 0,
        progressToNextLevel: data.progressToNextLevel || 0,
        usedTokens: data.usedTokens || 0,
        remainingTokens: data.remainingTokens || 0,
        baseTokenAllocation: data.baseTokenAllocation || 0,
        isSubscribed: data.isSubscribed || false,
      })

      onXpChange?.(data.remainingTokens)
    } catch (error) {
      console.error("Error fetching progress:", error)
      setFetchError(error instanceof Error ? error.message : "Unknown error")
    }
  }

  useEffect(() => {
    fetchProgress()
    // Use a shorter interval for better responsiveness
    const interval = setInterval(fetchProgress, 5000)
    return () => clearInterval(interval)
  }, [fetchProgress])

  // Check for Stripe success or canceled parameters, indicating a return from Stripe
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Check if URL has parameters indicating a return from Stripe
      const urlParams = new URLSearchParams(window.location.search)
      const hasStripeParams =
        urlParams.has("payment_intent") ||
        urlParams.has("setup_intent") ||
        urlParams.has("redirect_status")

      // If we detect we've returned from Stripe, immediately fetch updated progress
      if (hasStripeParams) {
        console.log(
          "Detected return from Stripe - fetching updated token balance"
        )
        fetchProgress()
      }
    }
  }, [fetchProgress])

  const formatTokens = (tokens: number): string => {
    if (tokens >= 1000000) {
      return `${(tokens / 1000000).toFixed(1)}M`
    }
    if (tokens >= 1000) {
      return `${(tokens / 1000).toFixed(1)}k`
    }
    return tokens.toString()
  }

  // Show loading state if no progress data is available yet
  if (!progress) {
    return (
      <div className="flex items-center gap-x-2">
        <div className="h-4 w-4 animate-pulse bg-secondary rounded-full"></div>
        <span className="text-xs text-muted-foreground">
          {fetchError ? `Error: ${fetchError}` : "Loading..."}
        </span>
      </div>
    )
  }

  const xpNeededForNextLevel = progress.nextLevelXP - progress.earnedXP

  const levelInfoText =
    xpNeededForNextLevel > 0
      ? `Need ${xpNeededForNextLevel} more XP to reach Level ${
          progress.level + 1
        }`
      : "Ready to level up!"

  // Function to determine badge color based on level
  const getLevelBadgeColor = (level: number) => {
    if (level < 5) return "bg-blue-500"
    if (level < 10) return "bg-emerald-500"
    if (level < 20) return "bg-purple-500"
    if (level < 50) return "bg-amber-500"
    return "bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500"
  }

  // Function to determine level title
  const getLevelTitle = (level: number) => {
    if (level < 3) return "Novice"
    if (level < 7) return "Apprentice"
    if (level < 15) return "Adept"
    if (level < 25) return "Expert"
    if (level < 40) return "Master"
    return "Grandmaster"
  }

  return (
    <div className="relative">
      {/* Desktop view - Enhanced stylized display */}
      <div
        className={`hidden md:flex items-center gap-x-4 cursor-pointer px-2 ${
          tokensUpdated ? "animate-pulse" : ""
        }`}
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
      >
        {/* Level badge */}
        <div className="flex items-center gap-x-2">
          <div
            className={`flex items-center justify-center rounded-full p-1 ${getLevelBadgeColor(
              progress.level
            )}`}
          >
            <Trophy className="h-4 w-4 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">
              {getLevelTitle(progress.level)}
            </span>
            <span className="text-sm font-semibold">
              Level {progress.level}
            </span>
          </div>
        </div>

        {/* Tokens remaining */}
        <div className="flex items-center gap-x-2 border-l pl-4">
          <div className="flex items-center justify-center rounded-full p-1 bg-amber-500/20">
            <Coins className="h-4 w-4 text-amber-500" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">Tokens</span>
            <span className="text-sm font-semibold">
              {formatTokens(progress.remainingTokens)}
            </span>
          </div>
        </div>

        {/* Progress to next level - Mini progress bar */}
        <div className="hidden lg:flex flex-col gap-y-1 border-l pl-4">
          <div className="flex items-center justify-between w-24">
            <span className="text-xs text-muted-foreground">Next Level</span>
            <span className="text-xs font-medium">
              {Math.floor(progress.progressToNextLevel)}%
            </span>
          </div>
          <div className="w-24 h-1.5 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-300"
              style={{ width: `${progress.progressToNextLevel}%` }}
            />
          </div>
        </div>
      </div>

      {/* Mobile view - Simplified to focus on tokens which is the most important info */}
      <div
        className={`md:hidden flex items-center gap-x-2 cursor-pointer overflow-hidden ${
          tokensUpdated ? "animate-pulse" : ""
        }`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-x-1 min-w-0 w-full">
          <div className="flex items-center justify-center rounded-full p-1 bg-amber-500/20 shrink-0">
            <Coins className="h-4 w-4 text-amber-500" />
          </div>
          <div className="flex flex-col min-w-0 flex-1 overflow-hidden">
            <span className="text-xs text-muted-foreground truncate w-full">
              Tokens
            </span>
            <span className="text-sm font-semibold truncate w-full">
              {formatTokens(progress.remainingTokens)}
            </span>
          </div>
        </div>
      </div>

      {/* If tokens were updated, show a tooltip/notification */}
      {tokensUpdated && (
        <div className="absolute -bottom-10 left-0 bg-green-500 text-white text-xs py-1 px-2 rounded-md z-50">
          Tokens updated! Your subscription is active.
        </div>
      )}

      {/* Expanded detail popup */}
      {isExpanded && (
        <div
          className="absolute md:right-0 right-auto -left-24 top-12 w-80 p-5 rounded-xl shadow-lg bg-secondary/95 border backdrop-blur-sm z-50"
          onMouseEnter={() => setIsExpanded(true)}
          onMouseLeave={() => setIsExpanded(false)}
        >
          <div className="space-y-5">
            {/* Level header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-x-2">
                <div
                  className={`flex items-center justify-center rounded-full p-1.5 ${getLevelBadgeColor(
                    progress.level
                  )}`}
                >
                  <Trophy className="h-5 w-5 text-white" />
                </div>
                <div>
                  <span className="block text-sm text-muted-foreground">
                    {getLevelTitle(progress.level)}
                  </span>
                  <span className="text-lg font-bold">
                    Level {progress.level}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="block text-xs text-muted-foreground">
                  Total XP
                </span>
                <span className="text-lg font-bold">
                  {progress.earnedXP.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Level Progress Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground font-medium">
                  Progress to Level {progress.level + 1}
                </span>
                <span className="text-emerald-500 font-semibold">
                  {progress.earnedXP.toLocaleString()} /{" "}
                  {progress.nextLevelXP.toLocaleString()} XP
                </span>
              </div>

              {/* Progress Bar */}
              <div className="relative w-full h-3 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-300"
                  style={{ width: `${progress.progressToNextLevel}%` }}
                />
              </div>

              {/* XP Needed */}
              <p className="text-xs text-muted-foreground">
                {xpNeededForNextLevel > 0
                  ? `${xpNeededForNextLevel.toLocaleString()} XP needed for next level`
                  : "Ready to level up!"}
              </p>
            </div>

            {/* Stats Section */}
            <div className="grid grid-cols-2 gap-4 p-3 bg-secondary/50 rounded-lg">
              <div className="space-y-1">
                <div className="flex items-center gap-x-2">
                  <Coins className="h-4 w-4 text-amber-500" />
                  <span className="text-xs text-muted-foreground">
                    Remaining Tokens
                  </span>
                </div>
                <p className="text-sm font-semibold">
                  {progress.remainingTokens.toLocaleString()} /{" "}
                  {progress.baseTokenAllocation.toLocaleString()}
                </p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-x-2">
                  <Star className="h-4 w-4 text-emerald-500" />
                  <span className="text-xs text-muted-foreground">XP Rate</span>
                </div>
                <p className="text-sm font-semibold">+1 XP / 100 tokens</p>
              </div>
            </div>

            {/* Info Section */}
            <div className="space-y-3 text-sm text-muted-foreground border-t pt-3">
              <p className="font-semibold text-primary">How it works:</p>
              <ul className="space-y-2 text-xs">
                <li className="flex items-center gap-x-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  {progress.isSubscribed
                    ? "Your subscription includes 1M tokens per month"
                    : "You have 10,000 free tokens to use"}
                </li>
                <li className="flex items-center gap-x-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Earn XP by using the AI features
                </li>
                <li className="flex items-center gap-x-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Level up to unlock badges and recognition
                </li>
              </ul>
              <p className="text-xs font-medium text-emerald-500 pt-2">
                {levelInfoText}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Create a context to share XP updates across components
export const XpContext = React.createContext<{
  updateXp: (remainingTokens: number) => void
}>({
  updateXp: () => {},
})

// Usage in chat component:
export const useChatXp = () => {
  const context = React.useContext(XpContext)
  return context.updateXp
}
