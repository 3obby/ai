"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Plus, Trash2 } from "lucide-react"

import { useSettingsModal } from "@/hooks/use-settings-modal"
import { usePrompts, Prompt } from "@/store/use-prompts"

export const SettingsModal = () => {
  const { isOpen, onClose } = useSettingsModal()
  const { prompts, addPrompt, removePrompt, togglePrompt, updatePromptText } =
    usePrompts()
  const [newPromptText, setNewPromptText] = useState("")

  const handleAddPrompt = () => {
    if (newPromptText.trim()) {
      addPrompt(newPromptText.trim())
      setNewPromptText("")
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Settings</DialogTitle>
          <DialogDescription>
            Manage your personalized prompts. These will be applied to your
            conversations.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Your Prompts</h3>
            <p className="text-sm text-muted-foreground">
              Add, edit, and manage prompts that will be applied to your
              conversations. Toggle the switch to activate or deactivate each
              prompt.
            </p>

            <div className="space-y-4">
              {prompts.map((prompt) => (
                <div
                  key={prompt.id}
                  className="flex items-start gap-3 p-3 border rounded-md"
                >
                  <div className="mt-1">
                    <Switch
                      checked={prompt.isActive}
                      onCheckedChange={() => togglePrompt(prompt.id)}
                    />
                  </div>
                  <div className="flex-1">
                    <Textarea
                      value={prompt.text}
                      onChange={(e) =>
                        updatePromptText(prompt.id, e.target.value)
                      }
                      className="w-full min-h-[80px] resize-y"
                      placeholder="Enter prompt text..."
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removePrompt(prompt.id)}
                    className="h-9 w-9 text-destructive hover:text-destructive/90"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-2 mt-4">
              <Textarea
                placeholder="Add a new prompt..."
                value={newPromptText}
                onChange={(e) => setNewPromptText(e.target.value)}
                className="w-full min-h-[80px] resize-y"
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
                  Add
                </Button>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={onClose}>Save & Close</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
