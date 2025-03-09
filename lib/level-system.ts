/**
 * Level System
 *
 * This module implements an exponential level scaling system where:
 * - Each level requires progressively more tokens to reach
 * - Tokens are burned through usage rather than spent as currency
 */

/**
 * Calculate user level based on total tokens burned
 * Uses an exponential scale where each level requires more tokens than the previous
 */
export const calculateLevel = (totalTokens: number): number => {
  // Exponential scaling formula
  // Example: Level 1 = 100 tokens, Level 2 = 250 tokens, Level 3 = 500 tokens, Level 4 = 1000 tokens, etc.
  if (totalTokens < 100) return 0
  return Math.floor(Math.log2(totalTokens / 100) + 1)
}

/**
 * Calculate tokens required to reach a specific level
 */
export const getXPForLevel = (level: number): number => {
  // Calculate tokens needed for this level using inverse of level calculation
  return Math.pow(2, level - 1) * 100
}

/**
 * Get tokens required for the next level
 */
export const getXPForNextLevel = (currentLevel: number): number => {
  return getXPForLevel(currentLevel + 1)
}

/**
 * Calculate progress percentage toward the next level
 * @returns percentage from 0-100
 */
export const getProgressToNextLevel = (totalTokens: number): number => {
  const currentLevel = calculateLevel(totalTokens)
  const currentLevelTokens = getXPForLevel(currentLevel)
  const nextLevelTokens = getXPForLevel(currentLevel + 1)

  // If totalTokens is already at or above next level requirement, return 100%
  if (totalTokens >= nextLevelTokens) return 100

  return Math.min(
    Math.max(
      ((totalTokens - currentLevelTokens) / (nextLevelTokens - currentLevelTokens)) * 100,
      0
    ),
    100
  )
}

/**
 * Generate an array of token thresholds for each level
 */
export const getLevelThresholds = (
  maxLevel: number
): Record<number, number> => {
  const thresholds: Record<number, number> = {}
  for (let i = 0; i <= maxLevel; i++) {
    thresholds[i] = getXPForLevel(i)
  }
  return thresholds
}

/**
 * Calculate tokens burned from token usage
 * @param tokenAmount The number of tokens used
 * @param computeCost The cost in USD of compute for this request
 */
export const calculateXPEarned = (
  tokenAmount: number,
  computeCost: number
): number => {
  // Base tokens from token usage (1 token per 100 tokens)
  const tokenXP = Math.ceil(tokenAmount / 100)

  // Additional tokens from compute cost (1000 tokens per $1 spent)
  const computeXP = Math.ceil(computeCost * 1000)

  return tokenXP + computeXP
}
