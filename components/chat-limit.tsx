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
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Progress as UiProgress } from "@/components/ui/progress"
import { useProModal } from "@/hooks/use-pro-modal"
import { useRouter } from "next/navigation"
import { toast } from "react-hot-toast"

// Simple in-memory cache to reduce API calls
const progressCache = new Map<string, {data: any, timestamp: number}>();
const CACHE_TTL = 10000; // 10 seconds

// For sharing user progress data across components
const USER_PROGRESS_EVENT = 'user-progress-updated';

// Broadcast user progress updates to all components
export const broadcastProgress = (data: any) => {
  if (typeof window !== 'undefined') {
    const event = new CustomEvent(USER_PROGRESS_EVENT, { detail: data });
    window.dispatchEvent(event);
  }
};

// Listen for progress updates from other components
export const useProgressUpdates = (callback: (data: any) => void) => {
  useEffect(() => {
    const handler = (event: any) => callback(event.detail);
    
    if (typeof window !== 'undefined') {
      window.addEventListener(USER_PROGRESS_EVENT, handler);
      return () => window.removeEventListener(USER_PROGRESS_EVENT, handler);
    }
  }, [callback]);
};

interface ChatLimitProps {
  userId?: string
  onXpChange?: (tokens: number) => void
  className?: string
}

interface UserProgress {
  earnedTokens: number
  level: number
  nextLevelTokens: number
  progressToNextLevel: number
  usedTokens: number
  remainingTokens: number
  baseTokenAllocation: number
  isSubscribed: boolean
}

export const ChatLimit = ({ userId, onXpChange, className }: ChatLimitProps) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [progress, setProgress] = useState<UserProgress | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [tokensUpdated, setTokensUpdated] = useState(false)
  const { user } = useCurrentUser()
  const proModal = useProModal()

  const fetchProgress = async () => {
    try {
      console.log("Fetching user progress...")
      setFetchError(null)
      
      // Use cache if available and fresh
      const cacheKey = userId || 'anonymous';
      const cachedData = progressCache.get(cacheKey);
      const now = Date.now();
      
      if (cachedData && (now - cachedData.timestamp < CACHE_TTL)) {
        console.log("Using cached progress data");
        const data = cachedData.data;
        
        // If we already had progress data and tokens increased significantly,
        // show a visual indicator
        if (progress && data.remainingTokens > progress.remainingTokens + 10000) {
          setTokensUpdated(true);
          // Hide the indicator after 5 seconds
          setTimeout(() => setTokensUpdated(false), 5000);
        }
        
        setProgress({
          earnedTokens: data.burnedTokens || 0,
          level: data.level || 0,
          nextLevelTokens: data.nextLevelTokens || 0,
          progressToNextLevel: data.progressToNextLevel || 0,
          usedTokens: data.usedTokens || 0,
          remainingTokens: data.remainingTokens || 0,
          baseTokenAllocation: data.baseTokenAllocation || 0,
          isSubscribed: data.isSubscribed || false,
        });
        
        onXpChange?.(data.remainingTokens);
        return;
      }
      
      // Fetch new data if no cache or cache expired
      const response = await fetch(`/api/user-progress${userId ? `?userId=${userId}` : ''}`)

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
      
      // Store in cache
      progressCache.set(cacheKey, {
        data,
        timestamp: now
      });

      // If we already had progress data and tokens increased significantly,
      // show a visual indicator
      if (progress && data.remainingTokens > progress.remainingTokens + 10000) {
        setTokensUpdated(true)
        // Hide the indicator after 5 seconds
        setTimeout(() => setTokensUpdated(false), 5000)
      }

      setProgress({
        earnedTokens: data.burnedTokens || 0,
        level: data.level || 0,
        nextLevelTokens: data.nextLevelTokens || 0,
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
      <div className={`flex items-center gap-x-2 ${className || ''}`}>
        <div className="h-4 w-4 animate-pulse bg-secondary rounded-full"></div>
        <span className="text-xs text-muted-foreground">
          {fetchError ? `Error: ${fetchError}` : "Loading..."}
        </span>
      </div>
    )
  }

  const tokensNeededForNextLevel = progress.nextLevelTokens - progress.earnedTokens

  const levelInfoText =
    tokensNeededForNextLevel > 0
      ? `Need ${tokensNeededForNextLevel} more tokens to reach Level ${
          progress.level + 1
        }`
      : "Ready to level up!"

  // Function to get level badge colors based on level
  const getLevelBadgeColor = (level: number) => {
    if (level < 5) return "bg-zinc-700"
    if (level < 10) return "bg-green-600"
    if (level < 15) return "bg-blue-600"
    if (level < 20) return "bg-purple-600"
    if (level < 25) return "bg-amber-500"
    return "bg-red-600"
  }

  // Function to get level titles based on level
  const getLevelTitle = (level: number) => {
    if (level < 5) return "Novice Burner"
    if (level < 10) return "Token Torcher"
    if (level < 15) return "Flame Forger"
    if (level < 20) return "Inferno Invoker"
    if (level < 25) return "Blaze Master"
    return "Pyromancer"
  }

  return (
    <div className={`relative ${className || ''}`}>
      {/* Desktop view - Simplified to only show tokens */}
      <div
        className={`hidden md:flex items-center gap-x-4 cursor-pointer px-2 ${
          tokensUpdated ? "animate-pulse" : ""
        }`}
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
      >
        {/* Tokens remaining */}
        <div className="flex items-center gap-x-2">
          <div className="flex items-center justify-center rounded-full p-1 bg-amber-500/20">
            <Coins className="h-4 w-4 text-amber-500" />
          </div>
          <div className="flex flex-col min-w-[80px]">
            <span className="text-xs text-muted-foreground">Tokens</span>
            <span className="text-sm font-semibold">
              {formatTokens(progress.remainingTokens)}
            </span>
          </div>
        </div>
        
        {/* Show Buy Tokens button only for subscribers */}
        {progress.isSubscribed && (
          <Link href="/subscribe">
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
              <Coins className="h-3 w-3 mr-1 text-amber-500" />
              Buy Tokens
            </Button>
          </Link>
        )}
      </div>

      {/* Mobile view - Already simplified */}
      <div
        className={`md:hidden flex items-center gap-x-2 cursor-pointer overflow-hidden ${
          tokensUpdated ? "animate-pulse" : ""
        }`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-x-2 min-w-0 w-full">
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

      {/* Expanded detail popup - Keep this to show full details when clicked */}
      {isExpanded && (
        <div
          className="absolute right-0 top-12 w-80 p-5 rounded-xl shadow-lg bg-secondary/95 border backdrop-blur-sm z-50"
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
                  Total Tokens Burned
                </span>
                <span className="text-lg font-bold">
                  {progress.earnedTokens.toLocaleString()}
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
                  {progress.earnedTokens.toLocaleString()} /{" "}
                  {progress.nextLevelTokens.toLocaleString()} tokens
                </span>
              </div>

              {/* Progress Bar */}
              <div className="relative w-full h-3 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-300"
                  style={{ width: `${progress.progressToNextLevel}%` }}
                />
              </div>

              {/* Tokens Needed */}
              <p className="text-xs text-muted-foreground">
                {tokensNeededForNextLevel > 0
                  ? `${tokensNeededForNextLevel.toLocaleString()} more tokens to burn for next level`
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
                  <span className="text-red-500">🔥</span>
                  <span className="text-xs text-muted-foreground">Burn Rate</span>
                </div>
                <p className="text-sm font-semibold">+1 token / 100 tokens</p>
              </div>
            </div>

            {/* Info Section */}
            <div className="space-y-3 text-sm text-muted-foreground border-t pt-3">
              <div className="space-y-2 mt-4">
                <div className="flex items-center gap-x-2">
                  <span className="text-xs">♟</span>
                  <span className="text-sm font-medium">How it works:</span>
                </div>
                <ul className="text-xs space-y-1.5 text-muted-foreground">
                  <li className="flex items-center gap-x-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Burn tokens by using the AI features
                  </li>
                  <li className="flex items-center gap-x-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Reach new levels as you burn more tokens
                  </li>
                  <li className="flex items-center gap-x-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Unlock new features with higher levels
                  </li>
                </ul>
              </div>
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
