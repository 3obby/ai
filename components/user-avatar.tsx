"use client"

import { useCurrentUser } from "@/lib/hooks/use-current-user"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { useMemo } from "react"
import { User } from "next-auth"
import { cn } from "@/lib/utils"

interface UserAvatarProps {
  src?: string
  user?: User
  className?: string
}

// Function to generate a deterministic avatar URL based on email or username
const generateAvatarUrl = (input: string) => {
  // Extract the first part of the email (before @) or use the input as is
  const identifier = input.includes('@') ? input.split('@')[0] : input;
  
  // Using DiceBear API to generate robot-like avatars
  // Using bottts style for robot avatars - matches the companion bot style
  // Making the seed deterministic so same email always gets same avatar
  return `https://api.dicebear.com/7.x/bottts/png?seed=${encodeURIComponent(identifier)}&size=200&backgroundColor=b6e3f4,c0aede,d1d4f9`;
}

export const UserAvatar = ({ src, user: propUser, className }: UserAvatarProps) => {
  const { user: contextUser } = useCurrentUser()
  const user = propUser || contextUser
  
  const avatarUrl = useMemo(() => {
    if (src) return src;
    if (user?.image) return user.image;
    
    // If no image, generate one based on email or name
    const baseIdentifier = user?.email || user?.name || "user";
    return generateAvatarUrl(baseIdentifier);
  }, [src, user]);
  
  // Get username for display
  const username = useMemo(() => {
    if (!user) return null;
    
    if (user.email && user.email.includes('@')) {
      return user.email.split('@')[0];
    }
    
    return user.name?.split(' ')[0] || "User";
  }, [user]);

  return (
    <Avatar className={cn(className || "h-8 w-8", "flex-shrink-0")}>
      <AvatarImage src={avatarUrl} />
      <AvatarFallback className="bg-primary/10 text-primary text-xs">
        {username ? username.substring(0, 2).toUpperCase() : "U"}
      </AvatarFallback>
    </Avatar>
  )
}
