"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"
import { signIn } from "next-auth/react"

export default function RegisterPage() {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // Use NextAuth's signIn with email provider for magic link
      const result = await signIn("email", { 
        email, 
        redirect: false,
        callbackUrl: "/dashboard" 
      })

      if (result?.ok) {
        setEmailSent(true)
        toast({
          title: "Registration successful!",
          description: "Check your email for a login link.",
        })
      } else {
        throw new Error(result?.error || "Failed to register")
      }
    } catch (error) {
      console.error(error)
      toast({
        title: "Error",
        description: "Failed to register. Please try again.",
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
            Create an Account
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Sign up to get started with GroupChatBotBuilder
          </p>
        </div>

        {emailSent ? (
          <div className="text-center p-4 border rounded-md bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300">
            <h3 className="font-medium">Check your email</h3>
            <p className="mt-2">We've sent a magic link to {email}</p>
            <p className="mt-1 text-sm">
              Click the link in your email to complete registration
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
              {isLoading ? "Creating account..." : "Create Account"}
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
