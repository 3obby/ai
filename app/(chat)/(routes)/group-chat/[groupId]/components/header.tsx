"use client"

import { useState } from "react"
import axios from "axios"
import {
  ChevronLeft,
  MessagesSquare,
  MoreVertical,
  Plus,
  Trash,
  Users,
  X,
  Edit,
  Loader2,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useCurrentUser } from "@/lib/hooks/use-current-user"
import * as Popover from "@radix-ui/react-popover"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useToast } from "@/components/ui/use-toast"
import { ConfirmationModal } from "@/components/modals/confirmation-modal"
import { AddCompanionModal } from "@/components/modals/add-companion-modal"
import { BotAvatar } from "@/components/bot-avatar"

interface GroupChatHeaderProps {
  groupChat: {
    id: string
    name: string
    creatorId: string
    members: {
      companion: {
        id: string
        name: string
        src: string
      }
    }[]
  }
  onClear: () => void
}

export const GroupChatHeader = ({
  groupChat,
  onClear,
}: GroupChatHeaderProps) => {
  const router = useRouter()
  const { user } = useCurrentUser()
  const { toast } = useToast()
  const [showClearConfirmation, setShowClearConfirmation] = useState(false)
  const [showAddCompanion, setShowAddCompanion] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)
  const [companionToRemove, setCompanionToRemove] = useState<string | null>(
    null
  )
  const [isAdding, setIsAdding] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [newGroupName, setNewGroupName] = useState(groupChat.name)

  const onDelete = async () => {
    try {
      setIsDeleting(true)
      await axios.delete(`/api/group-chat/${groupChat.id}`)

      toast({
        description: "Group chat deleted successfully.",
      })

      router.refresh()
      router.push("/")
    } catch (error) {
      toast({
        variant: "destructive",
        description: "Something went wrong.",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const onAddCompanion = async (companionId: string) => {
    try {
      setIsAdding(true)
      const response = await axios.post(
        `/api/group-chat/${groupChat.id}/members`,
        {
          companionId,
        }
      )

      toast({
        description: "Companion added to group!",
      })

      setShowAddCompanion(false)

      // Use Next.js router methods instead of window.location.href
      // First refresh the data
      router.refresh()

      // Then navigate to the same page to show the updated messages
      // This is gentler than a full page reload
      setTimeout(() => {
        router.push(`/group-chat/${groupChat.id}`)
      }, 300)
    } catch (error) {
      toast({
        variant: "destructive",
        description: "Failed to add companion to group.",
      })
    } finally {
      setIsAdding(false)
    }
  }

  const onRemoveMember = async () => {
    if (!companionToRemove) return

    try {
      setIsDeleting(true)
      await axios.delete(
        `/api/group-chat/${groupChat.id}/members/${companionToRemove}`
      )

      toast({
        description: "Companion removed from group",
      })

      setCompanionToRemove(null)
      router.refresh()
    } catch (error) {
      toast({
        variant: "destructive",
        description: "Failed to remove companion",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const onEdit = async () => {
    try {
      setIsEditing(true)
      await axios.patch(`/api/group-chat/${groupChat.id}`, {
        name: newGroupName,
      })

      toast({
        description: "Group name updated successfully.",
      })

      setShowEditModal(false)
      router.refresh()
    } catch (error) {
      toast({
        variant: "destructive",
        description: "Failed to update group name.",
      })
    } finally {
      setIsEditing(false)
    }
  }

  return (
    <>
      <div className="flex w-full justify-between items-center border-b border-primary/10 pb-4">
        <div className="flex gap-x-2 items-center">
          <Button onClick={() => router.back()} size="icon" variant="ghost">
            <ChevronLeft className="h-8 w-8" />
          </Button>
          <div className="flex flex-col gap-y-1">
            <div className="flex items-center gap-x-2">
              <p className="font-bold">{groupChat.name}</p>
              <Popover.Root>
                <Popover.Trigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-primary flex items-center gap-x-1"
                  >
                    <Users className="h-5 w-5" />
                    <span className="text-xs">{groupChat.members.length}</span>
                  </Button>
                </Popover.Trigger>
                <Popover.Content
                  className="bg-background border rounded-lg shadow-lg p-2 w-[200px] z-[100]"
                  sideOffset={4}
                >
                  <div className="flex flex-col gap-y-1">
                    {groupChat.members.map((member) => (
                      <div
                        key={member.companion.id}
                        className="flex items-center gap-x-2 p-2 hover:bg-primary/10 rounded-md"
                      >
                        <BotAvatar src={member.companion.src} />
                        <span className="text-foreground text-sm">
                          {member.companion.name}
                        </span>
                        {user?.id === groupChat.creatorId && (
                          <Button
                            onClick={() =>
                              setCompanionToRemove(member.companion.id)
                            }
                            variant="ghost"
                            size="sm"
                            className="ml-auto text-muted-foreground hover:text-red-500 p-1 h-auto"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </Popover.Content>
              </Popover.Root>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-x-2">
          <Button
            onClick={() => setShowAddCompanion(true)}
            size="sm"
            variant="ghost"
            className="text-muted-foreground hover:text-primary"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Bot
          </Button>

          <Button
            onClick={() => setShowClearConfirmation(true)}
            size="icon"
            variant="ghost"
            className="text-muted-foreground hover:text-red-500"
          >
            <Trash className="h-5 w-5" />
          </Button>

          {user?.id === groupChat.creatorId && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" size="icon">
                  <MoreVertical />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setShowEditModal(true)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Name
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setShowDeleteConfirmation(true)}
                >
                  <Trash className="w-4 h-4 mr-2" />
                  Delete Group
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      <ConfirmationModal
        isOpen={showClearConfirmation}
        onClose={() => setShowClearConfirmation(false)}
        onConfirm={onClear}
        title="Clear Chat History"
        description="Are you sure you want to clear all messages? This action cannot be undone."
      />

      <AddCompanionModal
        isOpen={showAddCompanion}
        onClose={() => setShowAddCompanion(false)}
        onConfirm={onAddCompanion}
        existingCompanionIds={groupChat.members.map((m) => m.companion.id)}
        isLoading={isAdding}
      />

      <ConfirmationModal
        isOpen={!!companionToRemove}
        onClose={() => setCompanionToRemove(null)}
        onConfirm={onRemoveMember}
        title="Remove Companion"
        description="Are you sure you want to remove this companion from the group?"
        isLoading={isDeleting}
      />

      <ConfirmationModal
        isOpen={showDeleteConfirmation}
        onClose={() => setShowDeleteConfirmation(false)}
        onConfirm={onDelete}
        title="Delete Group"
        description="Are you sure you want to delete this group? This will remove all messages and cannot be undone."
        isLoading={isDeleting}
      />

      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Group Name</DialogTitle>
          </DialogHeader>
          <div className="p-4">
            <Input
              placeholder="Group name"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setShowEditModal(false)}
              disabled={isEditing}
            >
              Cancel
            </Button>
            <Button
              onClick={onEdit}
              disabled={
                !newGroupName || newGroupName === groupChat.name || isEditing
              }
            >
              {isEditing ? (
                <div className="flex items-center gap-x-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </div>
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
