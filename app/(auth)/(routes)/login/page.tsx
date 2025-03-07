"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"
import axios from "axios"
import Link from "next/link"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      await axios.post("/api/auth/login", { email })
      setEmailSent(true)
      toast({
        title: "Magic link sent!",
        description: "Check your email for a login link.",
      })
    } catch (error) {
      console.error(error)
      toast({
        title: "Error",
        description: "Failed to send login link. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-md p-8 space-y-8 bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Welcome Back
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Sign in to continue to GroupChatBotBuilder
          </p>
        </div>

        {emailSent ? (
          <div className="text-center p-4 border rounded-md bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300">
            <h3 className="font-medium">Check your email</h3>
            <p className="mt-2">We've sent a magic link to {email}</p>
            <p className="mt-1 text-sm">
              Click the link in your email to sign in
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Sending link..." : "Send Magic Link"}
            </Button>
          </form>
        )}

        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome back
          </h1>
          <p className="text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="underline text-sky-500">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
