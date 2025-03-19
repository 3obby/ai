"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Plus, Trash2, Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import { usePrompts } from "../../hooks/usePrompts"
import { Prompt } from "../../types"

interface PromptsPanelProps {
  initialPrompts?: Prompt[]
}

export function PromptsPanel({ initialPrompts = [] }: PromptsPanelProps) {
  const {
    prompts,
    loading: isLoading,
    fetchPrompts,
    addPrompt,
    removePrompt,
    togglePrompt,
    updatePromptText,
  } = usePrompts(initialPrompts)
  
  const [newPromptText, setNewPromptText] = useState("")

  // Fetch prompts if no initial prompts provided
  useEffect(() => {
    if (initialPrompts.length === 0) {
      fetchPrompts();
    }
  }, [fetchPrompts, initialPrompts.length]);

  const handleAddPrompt = () => {
    if (newPromptText.trim()) {
      addPrompt(newPromptText.trim())
      setNewPromptText("")
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Your Prompts</h2>
      </div>
      
      <p className="text-sm text-muted-foreground">
        Add, edit, and manage prompts that will be applied to your conversations. 
        Toggle the switch to activate or deactivate each prompt.
      </p>
      
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-start gap-3 p-3 border rounded-md">
              <Skeleton className="h-6 w-6 rounded-md" />
              <Skeleton className="h-24 w-full rounded-md" />
              <Skeleton className="h-8 w-8 rounded-md" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence>
            {prompts.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-12 text-center bg-muted/20 rounded-xl border-2 border-dashed"
              >
                <p className="text-muted-foreground mb-4">You don&apos;t have any prompts yet.</p>
                <Button
                  onClick={() => setNewPromptText("You're an AI assistant who helps me with")}
                  variant="outline"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Prompt
                </Button>
              </motion.div>
            ) : (
              prompts.map((prompt) => (
                <PromptCard
                  key={prompt.id}
                  prompt={prompt}
                  onToggle={() => togglePrompt(prompt.id)}
                  onUpdate={(text) => updatePromptText(prompt.id, text)}
                  onDelete={() => removePrompt(prompt.id)}
                />
              ))
            )}
          </AnimatePresence>
        </div>
      )}
      
      <div className="space-y-2 mt-6">
        <Textarea
          placeholder="Add a new prompt..."
          value={newPromptText}
          onChange={(e) => setNewPromptText(e.target.value)}
          className="w-full min-h-[120px] resize-y"
          onKeyDown={(e) => {
            if (e.key === "Enter" && e.ctrlKey) handleAddPrompt()
          }}
        />
        <div className="flex justify-between items-center mt-1">
          <span className="text-xs text-muted-foreground">
            Press Ctrl+Enter to add
          </span>
          <Button onClick={handleAddPrompt}>
            <Plus className="h-4 w-4 mr-2" />
            Add Prompt
          </Button>
        </div>
      </div>
    </div>
  )
}

interface PromptCardProps {
  prompt: Prompt
  onToggle: () => void
  onUpdate: (text: string) => void
  onDelete: () => void
}

function PromptCard({ prompt, onToggle, onUpdate, onDelete }: PromptCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState(prompt.text)
  
  const handleSave = () => {
    if (editText.trim()) {
      onUpdate(editText)
      setIsEditing(false)
    }
  }
  
  const handleCancel = () => {
    setEditText(prompt.text)
    setIsEditing(false)
  }
  
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex items-start gap-3 p-3 border rounded-md"
    >
      <div className="mt-1">
        <Switch
          checked={prompt.isActive}
          onCheckedChange={onToggle}
        />
      </div>
      <div className="flex-1">
        {isEditing ? (
          <Textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            className="w-full min-h-[100px] resize-y"
            autoFocus
          />
        ) : (
          <div 
            className="cursor-pointer p-2 rounded-md hover:bg-muted/50 transition-colors"
            onClick={() => setIsEditing(true)}
          >
            <p className="whitespace-pre-wrap text-sm">{prompt.text}</p>
          </div>
        )}
        
        {isEditing && (
          <div className="flex justify-end gap-2 mt-2">
            <Button 
              size="sm" 
              variant="outline"
              onClick={handleCancel}
            >
              <X className="h-3 w-3 mr-1" />
              Cancel
            </Button>
            <Button 
              size="sm"
              onClick={handleSave}
            >
              <Check className="h-3 w-3 mr-1" />
              Save
            </Button>
          </div>
        )}
      </div>
      
      {!isEditing && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onDelete}
          className="h-9 w-9 text-destructive hover:text-destructive/90 hover:bg-destructive/10"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </motion.div>
  )
} 