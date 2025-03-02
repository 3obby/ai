"use client"

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react"

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
}

const LOCAL_STORAGE_KEY = "prompts-storage"

const defaultPrompts: Prompt[] = [
  {
    id: "1",
    text: "remember to optimize for my long-term happiness",
    isActive: false,
  },
]

const PromptsContext = createContext<PromptsContextType | undefined>(undefined)

export function PromptsProvider({ children }: { children: ReactNode }) {
  const [prompts, setPrompts] = useState<Prompt[]>(defaultPrompts)
  const [isInitialized, setIsInitialized] = useState(false)

  // Load prompts from localStorage on first render
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const savedPrompts = localStorage.getItem(LOCAL_STORAGE_KEY)
        if (savedPrompts) {
          setPrompts(JSON.parse(savedPrompts))
        }
      } catch (error) {
        console.error("Failed to load prompts from localStorage:", error)
      }
      setIsInitialized(true)
    }
  }, [])

  // Save prompts to localStorage whenever they change
  useEffect(() => {
    if (isInitialized && typeof window !== "undefined") {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(prompts))
    }
  }, [prompts, isInitialized])

  const addPrompt = (text: string) => {
    setPrompts((currentPrompts) => [
      ...currentPrompts,
      {
        id: Date.now().toString(),
        text,
        isActive: true,
      },
    ])
  }

  const removePrompt = (id: string) => {
    setPrompts((currentPrompts) =>
      currentPrompts.filter((prompt) => prompt.id !== id)
    )
  }

  const togglePrompt = (id: string) => {
    setPrompts((currentPrompts) =>
      currentPrompts.map((prompt) =>
        prompt.id === id ? { ...prompt, isActive: !prompt.isActive } : prompt
      )
    )
  }

  const updatePromptText = (id: string, text: string) => {
    setPrompts((currentPrompts) =>
      currentPrompts.map((prompt) =>
        prompt.id === id ? { ...prompt, text } : prompt
      )
    )
  }

  return (
    <PromptsContext.Provider
      value={{
        prompts,
        addPrompt,
        removePrompt,
        togglePrompt,
        updatePromptText,
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
