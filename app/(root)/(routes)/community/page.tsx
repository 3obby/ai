"use client"

import { useState, useEffect } from "react"
import { Plus, ThumbsUp, ThumbsDown, Search, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useProModal } from "@/hooks/use-pro-modal"
import { useToast } from "@/components/ui/use-toast"

interface IdeaType {
  id: string
  title: string
  description: string
  upvotes: number
  downvotes: number
  hasVoted?: "up" | "down" | null
  createdAt: Date
}

const IDEA_SUBMISSION_COST = 20000
const UPVOTE_COST = 10000
const DOWNVOTE_COST = 3000

const CommunityPage = () => {
  const [ideas, setIdeas] = useState<IdeaType[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState("netScore")
  const [newIdea, setNewIdea] = useState({ title: "", description: "" })
  const [isSubmitOpen, setIsSubmitOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [votingStates, setVotingStates] = useState<Record<string, boolean>>({})
  const proModal = useProModal()
  const { toast } = useToast()

  const handleVote = async (ideaId: string, voteType: "up" | "down") => {
    try {
      setVotingStates((prev) => ({ ...prev, [ideaId]: true }))

      const voteCost = voteType === "up" ? UPVOTE_COST : DOWNVOTE_COST

      const response = await fetch(`/api/community/${ideaId}/vote`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ voteType }),
      })

      if (response.status === 403) {
        proModal.onOpen()
        toast({
          variant: "destructive",
          title: "Insufficient XP",
          description: `You need ${voteCost} tokens to ${voteType}vote.`,
        })
        return
      }

      if (!response.ok) {
        throw new Error("Failed to vote")
      }

      const updatedIdea = await response.json()
      updatedIdea.createdAt = new Date(updatedIdea.createdAt)
      setIdeas((currentIdeas) =>
        currentIdeas.map((idea) =>
          idea.id === ideaId ? { ...updatedIdea, hasVoted: voteType } : idea
        )
      )

      toast({
        title: "Success",
        description: `Your ${voteType} vote has been recorded.`,
      })
    } catch (error) {
      console.error("Error voting:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to record your vote. Please try again.",
      })
    } finally {
      setVotingStates((prev) => ({ ...prev, [ideaId]: false }))
    }
  }

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true)
      const response = await fetch("/api/community", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newIdea),
      })

      if (response.status === 403) {
        proModal.onOpen()
        toast({
          variant: "destructive",
          title: "Insufficient XP",
          description: `You need ${IDEA_SUBMISSION_COST} XP to submit an idea.`,
        })
        return
      }

      if (!response.ok) {
        throw new Error("Failed to create idea")
      }

      const idea = await response.json()
      idea.createdAt = new Date(idea.createdAt)
      setIdeas((prev) => [idea, ...prev])
      setNewIdea({ title: "", description: "" })
      setIsSubmitOpen(false)

      toast({
        title: "Success",
        description: "Your idea has been submitted successfully!",
      })
    } catch (error) {
      console.error("Error creating idea:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to submit your idea. Please try again.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  useEffect(() => {
    const fetchIdeas = async () => {
      try {
        setIsLoading(true)
        const response = await fetch("/api/community")
        if (!response.ok) {
          throw new Error("Failed to fetch ideas")
        }
        const data = await response.json()
        setIdeas(
          data.map((idea: any) => ({
            ...idea,
            createdAt: new Date(idea.createdAt),
          }))
        )
      } catch (error) {
        console.error("Error fetching ideas:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchIdeas()
  }, [])

  const filteredAndSortedIdeas = ideas
    .filter(
      (idea) =>
        idea.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        idea.description.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case "recent":
          if (!(a.createdAt instanceof Date))
            a.createdAt = new Date(a.createdAt)
          if (!(b.createdAt instanceof Date))
            b.createdAt = new Date(b.createdAt)
          return b.createdAt.getTime() - a.createdAt.getTime()
        case "mostLiked":
          return b.upvotes - a.upvotes
        case "mostDisliked":
          return b.downvotes - a.downvotes
        case "netScore":
          return b.upvotes - b.downvotes - (a.upvotes - a.downvotes)
        default:
          return 0
      }
    })

  return (
    <div className="h-full p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Community Ideas</h1>
          <p className="text-muted-foreground">Vote on feature suggestions</p>
        </div>
        <Dialog open={isSubmitOpen} onOpenChange={setIsSubmitOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Submit Idea
              <span className="text-xs text-muted-foreground ml-1">
                ({IDEA_SUBMISSION_COST} tokens)
              </span>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Submit a New Idea</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Title</Label>
                <Input
                  value={newIdea.title}
                  onChange={(e) =>
                    setNewIdea((prev) => ({ ...prev, title: e.target.value }))
                  }
                  placeholder="Enter your idea title"
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={newIdea.description}
                  onChange={(e) =>
                    setNewIdea((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Describe your idea in detail"
                  disabled={isSubmitting}
                />
              </div>
              <Button
                onClick={handleSubmit}
                className="w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit"
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search ideas..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="netScore">Net Score</SelectItem>
            <SelectItem value="recent">Most Recent</SelectItem>
            <SelectItem value="mostLiked">Most Liked</SelectItem>
            <SelectItem value="mostDisliked">Most Disliked</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Separator />

      <div className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredAndSortedIdeas.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            No ideas found. Be the first to submit one!
          </div>
        ) : (
          filteredAndSortedIdeas.map((idea) => (
            <div
              key={idea.id}
              className="p-4 border rounded-lg hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <h3 className="font-semibold">{idea.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {idea.description}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant={idea.hasVoted === "up" ? "default" : "outline"}
                    onClick={() => handleVote(idea.id, "up")}
                    className="flex items-center gap-2"
                    disabled={votingStates[idea.id]}
                  >
                    {votingStates[idea.id] ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ThumbsUp className="w-4 h-4" />
                    )}
                    <span className="flex items-center gap-1">
                      <span>{idea.upvotes}</span>
                      <span className="text-xs text-muted-foreground">
                        ({UPVOTE_COST} tokens)
                      </span>
                    </span>
                  </Button>
                  <Button
                    variant={idea.hasVoted === "down" ? "default" : "outline"}
                    onClick={() => handleVote(idea.id, "down")}
                    className="flex items-center gap-2"
                    disabled={votingStates[idea.id]}
                  >
                    {votingStates[idea.id] ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ThumbsDown className="w-4 h-4" />
                    )}
                    <span className="flex items-center gap-1">
                      <span>{idea.downvotes}</span>
                      <span className="text-xs text-muted-foreground">
                        ({DOWNVOTE_COST} tokens)
                      </span>
                    </span>
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default CommunityPage
