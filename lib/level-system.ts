/**
 * Level System
 *
 * This module implements an exponential level scaling system where:
 * - Early levels are easy to achieve
 * - Later levels become progressively harder
 * - XP is earned through usage rather than spent as currency
 */

/**
 * Calculate user level based on total XP earned
 * Uses an exponential scale where each level requires more XP than the previous
 */
export const calculateLevel = (totalXP: number): number => {
  // Exponential scaling formula
  // Example: Level 1 = 100 XP, Level 2 = 250 XP, Level 3 = 500 XP, Level 4 = 1000 XP, etc.
  if (totalXP < 100) return 0
  return Math.floor(Math.log2(totalXP / 100) + 1)
}

/**
 * Calculate XP required to reach a specific level
 */
export const getXPForLevel = (level: number): number => {
  // Calculate XP needed for this level using inverse of level calculation
  if (level <= 0) return 0
  return Math.pow(2, level - 1) * 100
}

/**
 * Get XP required for the next level
 */
export const getXPForNextLevel = (currentLevel: number): number => {
  return getXPForLevel(currentLevel + 1)
}

/**
 * Calculate progress percentage to next level (0-100)
 */
export const getProgressToNextLevel = (totalXP: number): number => {
  const currentLevel = calculateLevel(totalXP)
  const currentLevelXP = getXPForLevel(currentLevel)
  const nextLevelXP = getXPForLevel(currentLevel + 1)

  // If totalXP is already at or above next level requirement, return 100%
  if (totalXP >= nextLevelXP) return 100

  // Calculate percentage between current level minimum and next level minimum
  return Math.min(
    ((totalXP - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100,
    100
  )
}

/**
 * Get all level thresholds up to a specified maximum level
 * Useful for UI displays showing level progress
 */
export const getLevelThresholds = (
  maxLevel: number = 20
): Record<number, number> => {
  const thresholds: Record<number, number> = {}
  for (let i = 1; i <= maxLevel; i++) {
    thresholds[i] = getXPForLevel(i)
  }
  return thresholds
}

/**
 * Calculate XP earned from token usage
 * @param tokenAmount Number of tokens used
 * @param computeCost Cost of compute for this usage
 */
export const calculateXPEarned = (
  tokenAmount: number,
  computeCost: number
): number => {
  // Base XP from token usage (1 XP per 100 tokens)
  const tokenXP = Math.ceil(tokenAmount / 100)

  // Additional XP from compute cost (1000 XP per $1 spent)
  const computeXP = Math.ceil(computeCost * 1000)

  return tokenXP + computeXP
}
