/**
 * Format a large number with K/M suffixes
 * @param number The number to format
 * @returns Formatted string with K/M suffix for large numbers
 */
export const formatLargeNumber = (number: number): string => {
  if (number >= 1000000) {
    return `${(number / 1000000).toFixed(1)}M`;
  }
  if (number >= 1000) {
    return `${(number / 1000).toFixed(1)}K`;
  }
  return number.toString();
}; 