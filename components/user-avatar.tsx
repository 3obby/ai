"use client"

import { useCurrentUser } from "@/lib/hooks/use-current-user"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { useMemo } from "react"
import { User } from "next-auth"
import { cn } from "@/lib/utils"
import { QuestionMarkIcon } from "@radix-ui/react-icons"

// Extend the User interface to include isAnonymous property
interface ExtendedUser extends User {
  isAnonymous?: boolean;
}

interface UserAvatarProps {
  src?: string
  user?: ExtendedUser
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
  const user = propUser || (contextUser as ExtendedUser | undefined)
  
  // Check if this is an anonymous user
  const isAnonymous = user?.isAnonymous || (user?.email && user.email.startsWith('anon-'));
  
  const avatarUrl = useMemo(() => {
    // For anonymous users, don't generate an avatar
    if (isAnonymous) return "";
    
    if (src) return src;
    if (user?.image) return user.image;
    
    // If no image, generate one based on email or name
    const baseIdentifier = user?.email || user?.name || "user";
    return generateAvatarUrl(baseIdentifier);
  }, [src, user, isAnonymous]);
  
  // Get username for display
  const username = useMemo(() => {
    if (!user) return "U";
    
    // For anonymous users, return "?" for the avatar fallback
    if (isAnonymous) return "?";
    
    if (user.email && user.email.includes('@')) {
      return user.email.split('@')[0];
    }
    
    return user.name?.split(' ')[0] || "User";
  }, [user, isAnonymous]);

  return (
    <Avatar className={cn(className || "h-8 w-8", "flex-shrink-0")}>
      {isAnonymous ? (
        <AvatarFallback className="bg-muted text-muted-foreground">
          <QuestionMarkIcon className="h-4 w-4" />
        </AvatarFallback>
      ) : (
        <>
          <AvatarImage src={avatarUrl} />
          <AvatarFallback className="bg-primary/10 text-primary text-xs">
            {username.substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </>
      )}
    </Avatar>
  )
}
