"use client";

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useProModal } from "@/hooks/use-pro-modal"
import Cookies from 'js-cookie';

interface CreateGroupChatModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (name: string) => void
  companionName: string
  isLoading?: boolean
  userId?: string;
}

export const CreateGroupChatModal = ({
  isOpen,
  onClose,
  onConfirm,
  companionName,
  isLoading = false,
  userId,
}: CreateGroupChatModalProps) => {
  const [name, setName] = useState(`${companionName}'s Group`)
  const [userXP, setUserXP] = useState(0)
  const proModal = useProModal()

  useEffect(() => {
    const fetchUserXP = async () => {
      try {
        // Check for anonymous user ID in props or cookies
        const anonymousUserId = userId || Cookies.get('anonymousUserId');
        const url = anonymousUserId ? `/api/user-progress?userId=${anonymousUserId}` : '/api/user-progress';
        
        const response = await fetch(url);
        const data = await response.json();
        setUserXP(data.remainingTokens);
      } catch (error) {
        console.error("Error fetching user XP:", error)
      }
    }
    fetchUserXP()
  }, [userId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (userXP < 50) {
      proModal.onOpen()
      return
    }
    onConfirm(name)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Group Chat</DialogTitle>
          <DialogDescription>
            Create a new group chat starting with {companionName}. You can add
            more companions later.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="name">Group Name</label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter group name"
                className="col-span-3"
                disabled={isLoading}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Creating..." : "Create Group"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
