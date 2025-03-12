"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { v4 as uuidv4 } from 'uuid'
import Cookies from 'js-cookie'
import axios from "axios"
import { setAnonymousUserCookie } from "@/app/actions/user-actions"
import { fetchWithBaseUrl, getAbsoluteUrl } from '@/lib/url-helper'
import api from '@/lib/axios-config' // Import our pre-configured axios

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { BotAvatar } from "@/components/bot-avatar"
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import NoResults from '@/components/ui/no-results'
import { useToast } from "@/components/ui/use-toast"

interface Companion {
  id: string
  name: string
  src: string
  description: string
  categoryId: string
  _count: {
    messages: number
  }
}

// Define origin helper for absolute URLs (required in Next.js 15)
const getOrigin = () => {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return process.env.NEXT_PUBLIC_APP_URL || 
         process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` :
         'http://localhost:3000';
};

const GroupChatStartPage = () => {
  const [companions, setCompanions] = useState<Companion[]>([])
  const [loading, setLoading] = useState(true)
  const [groupName, setGroupName] = useState("My Group Chat")
  const [selectedCompanion, setSelectedCompanion] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const router = useRouter()
  const { data: session } = useSession()
  const { toast } = useToast()

  // Get or create anonymous user ID
  const getAnonymousUserId = () => {
    // Check localStorage first
    if (typeof window !== 'undefined') {
      const storedId = localStorage.getItem('anonymousUserId')
      if (storedId) return storedId
    }
    
    // Generate a new one
    const anonymousId = uuidv4()
    
    // Store the ID in localStorage for redundancy
    if (typeof window !== 'undefined') {
      localStorage.setItem('anonymousUserId', anonymousId)
    }
    
    // Use the API directly to set cookies (works more reliably in Next.js 15)
    fetchWithBaseUrl('/api/auth/anonymous', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId: anonymousId }),
    }).catch(err => {
      console.error('Error setting anonymous cookie:', err)
    })
    
    return anonymousId
  }

  const fetchCompanions = async () => {
    setLoading(true)
    try {
      // Use our pre-configured axios instance which handles the base URL automatically
      const response = await api.get("/api/companions", {
        params: {
          public: true
        }
      });
      
      setCompanions(response.data.companions)
    } catch (error) {
      console.error("Error fetching companions:", error)
      toast({
        variant: "destructive",
        description: "Failed to load companions",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCompanions()
  }, [])

  const createGroupChat = async () => {
    if (!selectedCompanion) {
      toast({
        variant: "destructive",
        description: "Please select a companion to start with",
      })
      return
    }
    
    if (!groupName.trim()) {
      toast({
        variant: "destructive",
        description: "Please enter a group name",
      })
      return
    }
    
    setIsCreating(true)
    
    try {
      // Get effective user ID from either session or anonymous ID
      const effectiveUserId = session?.user?.id || getAnonymousUserId()
      console.log("Creating group chat with user ID:", effectiveUserId)
      
      // Use our pre-configured axios instance with proper URL handling for Next.js 15
      const response = await api.post("/api/group-chat", {
        name: groupName,
        initialCompanionId: selectedCompanion,
        userId: effectiveUserId // Pass userId in body instead of URL for cleaner code
      })
      
      toast({
        description: "Group chat created successfully!",
      })
      
      // Navigation: Always add the userId as a parameter to maintain anonymous session
      const isAnonymous = !session?.user?.id
      const navigationUrl = isAnonymous 
        ? `/group-chat/${response.data.id}?userId=${effectiveUserId}`
        : `/group-chat/${response.data.id}`
      
      console.log("Navigating to:", navigationUrl)  
      
      // Navigate to the new group chat with the userId parameter if needed
      router.push(navigationUrl)
    } catch (error) {
      console.error("Error creating group chat:", error)
      toast({
        variant: "destructive",
        description: "Failed to create group chat",
      })
    } finally {
      setIsCreating(false)
    }
  }

  // Filter companions based on search query
  const filteredCompanions = companions.filter(companion => 
    companion.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    companion.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold mb-4">Start a Group Chat</h1>
        <p className="text-muted-foreground mb-6">
          Select a companion to start your group chat with. You can add more companions later.
        </p>
        
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Group Chat Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Group Name</label>
                <Input 
                  value={groupName} 
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Enter group name"
                  className="max-w-md"
                />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <div className="mb-4">
          <Input
            placeholder="Search companions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-md"
          />
        </div>
      </div>
      
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-muted rounded-lg h-48"></div>
          ))}
        </div>
      ) : (
        <>
          {filteredCompanions.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-muted-foreground">No companions found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCompanions.map((companion) => (
                <Card 
                  key={companion.id}
                  className={`cursor-pointer transition-all ${
                    selectedCompanion === companion.id 
                      ? 'ring-2 ring-primary shadow-lg' 
                      : 'hover:shadow-md'
                  }`}
                  onClick={() => setSelectedCompanion(companion.id)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <BotAvatar src={companion.src} />
                      <div>
                        <h3 className="font-semibold">{companion.name}</h3>
                        <p className="text-muted-foreground text-sm line-clamp-2">
                          {companion.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
      
      <div className="mt-8 flex justify-end">
        <Button
          onClick={() => router.back()}
          variant="outline"
          className="mr-2"
          disabled={isCreating}
        >
          Cancel
        </Button>
        <Button
          onClick={createGroupChat}
          disabled={!selectedCompanion || isCreating}
          className="bg-orange-500 hover:bg-orange-600 text-white"
        >
          {isCreating ? "Creating..." : "Create Group Chat"}
        </Button>
      </div>
    </div>
  )
}

export default GroupChatStartPage 