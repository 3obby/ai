"use client"

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react"
import axios from "axios"
import { useCurrentUser } from "@/lib/hooks/use-current-user"
import { toast } from "@/components/ui/use-toast"

export interface Prompt {
  id: string
  text: string
  isActive: boolean
}

interface PromptsContextType {
  prompts: Prompt[]
  addPrompt: (text: string) => void
  removePrompt: (id: string) => void
  togglePrompt: (id: string) => void
  updatePromptText: (id: string, text: string) => void
  isLoading: boolean
}

// Default prompts used only while loading
const defaultPrompts: Prompt[] = []

const PromptsContext = createContext<PromptsContextType | undefined>(undefined)

export function PromptsProvider({ children }: { children: ReactNode }) {
  const [prompts, setPrompts] = useState<Prompt[]>(defaultPrompts)
  const [isLoading, setIsLoading] = useState(true)
  const { user, isLoading: isUserLoading } = useCurrentUser()

  const isSignedIn = !!user
  const userId = user?.id

  // Load prompts from the database on auth load
  useEffect(() => {
    const fetchPrompts = async () => {
      if (isUserLoading) {
        return
      }

      if (!isSignedIn) {
        // If user is not logged in, we can exit early
        setIsLoading(false)
        return
      }

      try {
        const response = await axios.get("/api/user-prompts")
        setPrompts(response.data)
      } catch (error) {
        console.error("Failed to load prompts:", error)
        toast({
          title: "Error",
          description: "Failed to load your prompts. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchPrompts()
  }, [isUserLoading, isSignedIn])

  // Add a new prompt
  const addPrompt = async (text: string) => {
    if (!isSignedIn || !text.trim()) return

    try {
      const response = await axios.post("/api/user-prompts", {
        text: text.trim(),
      })
      setPrompts((current) => [...current, response.data])
      toast({
        title: "Prompt added",
        description: "Your prompt has been saved.",
      })
    } catch (error) {
      console.error("Failed to add prompt:", error)
      toast({
        title: "Error",
        description: "Failed to add prompt. Please try again.",
        variant: "destructive",
      })
    }
  }

  // Remove a prompt
  const removePrompt = async (id: string) => {
    if (!isSignedIn) return

    try {
      await axios.delete(`/api/user-prompts?id=${id}`)
      setPrompts((current) => current.filter((prompt) => prompt.id !== id))
      toast({
        title: "Prompt removed",
        description: "Your prompt has been deleted.",
      })
    } catch (error) {
      console.error("Failed to remove prompt:", error)
      toast({
        title: "Error",
        description: "Failed to remove prompt. Please try again.",
        variant: "destructive",
      })
    }
  }

  // Toggle prompt active status
  const togglePrompt = async (id: string) => {
    if (!isSignedIn) return

    try {
      const prompt = prompts.find((p) => p.id === id)
      if (!prompt) return

      // Optimistically update the UI
      const newIsActive = !prompt.isActive

      setPrompts((current) =>
        current.map((p) => (p.id === id ? { ...p, isActive: newIsActive } : p))
      )

      // Update in the database
      const response = await axios.put("/api/user-prompts", {
        id,
        isActive: newIsActive,
      })

      // Ensure we're in sync with the server
      if (response.data && response.data.isActive !== newIsActive) {
        setPrompts((current) =>
          current.map((p) =>
            p.id === id ? { ...p, isActive: response.data.isActive } : p
          )
        )
      }
    } catch (error) {
      console.error("Failed to toggle prompt:", error)
      // Revert the optimistic update on error
      const currentPrompt = prompts.find((p) => p.id === id)
      if (currentPrompt) {
        setPrompts((current) =>
          current.map((p) =>
            p.id === id ? { ...p, isActive: !currentPrompt.isActive } : p
          )
        )
      }
      toast({
        title: "Error",
        description: "Failed to update prompt status. Please try again.",
        variant: "destructive",
      })
    }
  }

  // Update prompt text
  const updatePromptText = async (id: string, text: string) => {
    if (!isSignedIn) return

    try {
      // Optimistically update the UI
      setPrompts((current) =>
        current.map((p) => (p.id === id ? { ...p, text } : p))
      )

      // Update in the database
      await axios.put("/api/user-prompts", { id, text })
      toast({
        title: "Prompt updated",
        description: "Your changes have been saved.",
      })
    } catch (error) {
      console.error("Failed to update prompt:", error)
      // Revert the optimistic update on error
      const originalPrompt = prompts.find((p) => p.id === id)
      if (originalPrompt) {
        setPrompts((current) =>
          current.map((p) => (p.id === id ? originalPrompt : p))
        )
      }
      toast({
        title: "Error",
        description: "Failed to update prompt. Please try again.",
        variant: "destructive",
      })
    }
  }

  return (
    <PromptsContext.Provider
      value={{
        prompts,
        addPrompt,
        removePrompt,
        togglePrompt,
        updatePromptText,
        isLoading,
      }}
    >
      {children}
    </PromptsContext.Provider>
  )
}

export function usePrompts() {
  const context = useContext(PromptsContext)

  if (context === undefined) {
    throw new Error("usePrompts must be used within a PromptsProvider")
  }

  return context
}
