import axios from "axios"
import SubscribeClient from "./components/subscribe-client"
import { auth } from "@/lib/auth-helpers";
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, Lock } from "lucide-react"

export default async function SubscribePage() {
  const session = await auth()
  const userId = session?.userId

  // If not logged in, show a page that explains the subscription options
  // but encourages the user to log in first
  if (!userId) {
    return (
      <div className="container mx-auto px-4 py-10 max-w-5xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">AI Companion Subscription</h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Subscribe for weekly tokens or purchase tokens directly
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Subscription option */}
          <div className="bg-secondary/50 rounded-lg p-8 border border-accent-600/30 flex flex-col">
            <div className="mb-4">
              <h2 className="text-2xl font-bold mb-2">Weekly Subscription</h2>
              <p className="text-muted-foreground">Basic weekly subscription with regular token refreshes</p>
            </div>
            
            <div className="mb-6">
              <div className="flex items-center gap-x-2 mb-1">
                <span className="text-3xl font-bold">$4.99</span>
                <span className="text-muted-foreground">/week</span>
              </div>
              <p className="text-sm text-muted-foreground">Includes 200,000 tokens per week</p>
            </div>
            
            <ul className="mb-8 space-y-2 flex-grow">
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-1">✓</span>
                <span>200,000 tokens weekly refresh</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-1">✓</span>
                <span>Access to all AI companions</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-1">✓</span>
                <span>Ability to purchase additional tokens</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-1">✓</span>
                <span>Create and share unlimited companions</span>
              </li>
            </ul>
            
            <Link href="/login?returnUrl=/subscribe">
              <Button className="w-full bg-accent-600 hover:bg-accent-700 text-white">
                <Lock className="h-4 w-4 mr-2" /> 
                Log in to Subscribe
              </Button>
            </Link>
          </div>
          
          {/* Token packages */}
          <div className="bg-secondary/50 rounded-lg p-8 border border-accent-600/30 flex flex-col">
            <div className="mb-4">
              <h2 className="text-2xl font-bold mb-2">Token Packages</h2>
              <p className="text-muted-foreground">For subscribers who need more tokens</p>
            </div>
            
            <div className="mb-6">
              <div className="flex items-center gap-x-2 mb-1">
                <span className="text-3xl font-bold">$5.00</span>
                <span className="text-muted-foreground">/package</span>
              </div>
              <p className="text-sm text-muted-foreground">250,000 tokens per package</p>
            </div>
            
            <ul className="mb-8 space-y-2 flex-grow">
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-1">✓</span>
                <span>250,000 tokens per package</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-1">✓</span>
                <span>Subscribers only benefit</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-1">✓</span>
                <span>Tokens never expire</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-1">✓</span>
                <span>Stack multiple packages as needed</span>
              </li>
            </ul>
            
            <Link href="/login?returnUrl=/subscribe">
              <Button className="w-full bg-accent-600 hover:bg-accent-700 text-white">
                <Lock className="h-4 w-4 mr-2" /> 
                Log in to Purchase
              </Button>
            </Link>
          </div>
        </div>
        
        <div className="text-center mt-12">
          <p className="text-muted-foreground mb-4">
            Need more information about our pricing and token system?
          </p>
          <Link href="/landing-page" className="text-accent-500 hover:text-accent-400 underline">
            Learn more about our platform
          </Link>
        </div>
      </div>
    )
  }

  return <SubscribeClient userId={userId} />
}
