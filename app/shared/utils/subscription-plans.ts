export interface SubscriptionPlan {
  id: string
  name: string
  description: string
  weeklyPrice: number // in USD
  features: string[]
  includeBaseTokens: number // Weekly included tokens
  additionalTokenCost: number // Cost per additional token
  stripePriceId: string
  tokensPerMonth: number // Alias for includeBaseTokens for more readable code
}

export const SUBSCRIPTION_PLAN: SubscriptionPlan = {
  id: "standard",
  name: "Standard Plan",
  description: "All features, generous token allowance",
  weeklyPrice: 4.99,
  features: [
    "200,000 tokens included per week",
    "Create unlimited AI personas",
    "Join and create group chats",
    "Access to community voting",
    "Custom prompts and AI customization",
  ],
  includeBaseTokens: 200000,
  additionalTokenCost: 0.00003, // $0.00003 per additional token
  stripePriceId: process.env.STRIPE_STANDARD_PRICE_ID || "",
  tokensPerMonth: 200000, // Same as includeBaseTokens
}

// For backward compatibility
export const SUBSCRIPTION_PLANS: Record<string, SubscriptionPlan> = {
  standard: SUBSCRIPTION_PLAN,
}

// Cost per token for additional usage beyond the weekly included amount
export const COMPUTE_COST_PER_TOKEN = 0.00003 // $0.00003 per token
