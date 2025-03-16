"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"
import { signIn, useSession } from "next-auth/react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowRight, Mail, Github, Check, RefreshCw } from "lucide-react"
import { FcGoogle } from "react-icons/fc"
import Image from "next/image"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [isTimerRunning, setIsTimerRunning] = useState(false)
  const [timeoutProgress, setTimeoutProgress] = useState(0)
  const progressInterval = useRef<NodeJS.Timeout | null>(null)
  const resetTimeout = useRef<NodeJS.Timeout | null>(null)
  const progressDuration = 6000 // 6 seconds
  const progressStep = 50 // Update every 50ms
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const returnUrl = searchParams.get('returnUrl') || "/dashboard"
  const { status } = useSession()

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (progressInterval.current) clearInterval(progressInterval.current)
      if (resetTimeout.current) clearTimeout(resetTimeout.current)
    }
  }, [])

  // Reset states and clear timeouts
  const resetStates = () => {
    if (progressInterval.current) clearInterval(progressInterval.current)
    if (resetTimeout.current) clearTimeout(resetTimeout.current)
    setIsSuccess(false)
    setIsTimerRunning(false)
    setTimeoutProgress(0)
  }

  // Redirect if user is already authenticated
  useEffect(() => {
    if (status === "authenticated") {
      router.push(returnUrl)
    }
  }, [status, router, returnUrl])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    resetStates()
    setIsLoading(true)

    try {
      await signIn("email", {
        email,
        callbackUrl: returnUrl,
        redirect: false, // Prevent redirect to check-email page
      })
      
      // Show success state
      setIsLoading(false)
      setIsSuccess(true)
      setIsTimerRunning(true)
      
      // Start progress animation
      let progress = 0
      progressInterval.current = setInterval(() => {
        progress += (progressStep / progressDuration) * 100
        setTimeoutProgress(Math.min(progress, 100))
        
        if (progress >= 100) {
          if (progressInterval.current) clearInterval(progressInterval.current)
          resetStates()
        }
      }, progressStep)
      
      toast({
        title: "Magic link sent",
        description: "Check your email for a login link. You can retry in a few seconds if needed.",
      })
    } catch (error) {
      console.error(error)
      toast({
        title: "Error sending email",
        description: "Please check your email address and try again.",
        variant: "destructive",
      })
      resetStates()
      setIsLoading(false)
    }
  }

  const handleRetry = () => {
    resetStates()
    setEmail("")
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
      <div className="flex flex-col items-center justify-center w-full mx-auto p-6 space-y-8 backdrop-blur-sm bg-black/60 rounded-lg shadow-xl">
        <div className="flex flex-col items-center space-y-2 mb-6">
          <div className="relative w-24 h-24 rounded-full overflow-hidden border-4 border-white/50 shadow-lg mb-4">
            <Image 
              src="/feather.png" 
              alt="Logo" 
              fill
              sizes="96px"
              className="object-cover"
            />
          </div>
          <h1 className="text-2xl font-bold text-center text-white">GCBB - Beta</h1>
          <div className="flex items-center justify-center space-x-3">
            <p className="text-white/80">v2.0.19</p>
            <Link 
              href="/updates" 
              className="text-white/60 hover:text-white text-xs underline"
            >
              updates
            </Link>
          </div>
          <p className="text-sm text-white/60">gcbb@formulax.dev</p>
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
                disabled={isLoading || isTimerRunning}
                className="bg-white/10 border-white/30 text-white placeholder-white/50"
              />
            </div>
            <div className="relative">
              <Button 
                type="submit" 
                disabled={isLoading || isTimerRunning} 
                className={`w-full transition-all duration-300 overflow-hidden ${
                  isSuccess 
                    ? "bg-amber-600/80 hover:bg-amber-600/80 text-white border-amber-500" 
                    : "bg-white/20 hover:bg-white/30 text-white"
                }`}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-r-transparent" />
                    Sending link...
                  </span>
                ) : isSuccess ? (
                  <span className="flex items-center gap-2">
                    <Check className="h-5 w-5" />
                    Check your email
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Continue with Email
                  </span>
                )}
              </Button>
              
              {/* Progress bar animation */}
              {isTimerRunning && (
                <div 
                  className="absolute top-0 left-0 h-full bg-amber-800/50 transition-all duration-50 ease-linear"
                  style={{ width: `${timeoutProgress}%` }}
                ></div>
              )}
            </div>
            {isSuccess && (
              <div className="flex justify-center mt-1">
                <button 
                  type="button"
                  onClick={handleRetry}
                  className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1"
                >
                  <RefreshCw className="h-3 w-3" />
                  Retry with a different email
                </button>
              </div>
            )}
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/30"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-2 text-white/70 bg-black/30">Or continue with</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button 
              variant="outline"
              onClick={() => toast({
                title: "Provider unavailable",
                description: "Google login is pending review",
                variant: "destructive",
              })}
              className="w-full border-white/30 bg-white/10 hover:bg-white/20 text-white opacity-50 cursor-not-allowed"
              disabled={true}
            >
              <FcGoogle className="h-5 w-5" />
            </Button>
            <Button 
              variant="outline"
              onClick={() => toast({
                title: "Provider unavailable",
                description: "GitHub login is pending review",
                variant: "destructive",
              })}
              className="w-full border-white/30 bg-white/10 hover:bg-white/20 text-white opacity-50 cursor-not-allowed"
              disabled={true}
            >
              <Github className="h-5 w-5" />
            </Button>
          </div>
          <p className="text-center text-xs text-white/50 italic">OAuth providers pending review</p>
        </div>
      </div>
    )
  }

  // Fallback - should never be seen, but just in case
  return null
}
