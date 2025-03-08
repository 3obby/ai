"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"
import { signIn, useSession } from "next-auth/react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowRight, Mail, Github } from "lucide-react"
import { FcGoogle } from "react-icons/fc"
import Image from "next/image"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { status } = useSession()

  // Redirect if user is already authenticated
  useEffect(() => {
    if (status === "authenticated") {
      router.push("/dashboard")
    }
  }, [status, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      await signIn("email", {
        email,
        callbackUrl: "/dashboard",
      })
      toast({
        title: "Magic link sent",
        description: "Check your email for a login link",
      })
    } catch (error) {
      console.error(error)
      toast({
        title: "Error",
        description: "Something went wrong",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // If still checking authentication status, show loading state
  if (status === "loading") {
    return (
      <div className="flex items-center justify-center w-full h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    )
  }

  // Only show login options if not authenticated
  if (status === "unauthenticated") {
    return (
      <div className="flex flex-col items-center justify-center w-full max-w-md mx-auto p-6 space-y-8">
        <div className="flex flex-col items-center space-y-2 mb-6">
          <Image 
            src="/logo.png" 
            alt="Logo" 
            width={80} 
            height={80} 
            className="mb-4"
          />
          <h1 className="text-2xl font-bold text-center">Welcome back</h1>
          <p className="text-muted-foreground text-center">Sign in to continue</p>
        </div>

        <div className="w-full space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                type="email"
                required
                disabled={isLoading}
                className="bg-background"
              />
            </div>
            <Button 
              type="submit" 
              disabled={isLoading} 
              className="w-full"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-r-transparent" />
                  Sending link...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Continue with Email
                </span>
              )}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-700"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button 
              variant="outline"
              onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
              className="w-full"
            >
              <FcGoogle className="h-5 w-5" />
            </Button>
            <Button 
              variant="outline"
              onClick={() => signIn("github", { callbackUrl: "/dashboard" })}
              className="w-full"
            >
              <Github className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Fallback - should never be seen, but just in case
  return null
}
