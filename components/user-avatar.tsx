"use client"

import { useCurrentUser } from "@/lib/hooks/use-current-user"
import { Avatar, AvatarImage } from "@/components/ui/avatar"

interface UserAvatarProps {
  src?: string
}

export const UserAvatar = ({ src }: UserAvatarProps) => {
  const { user } = useCurrentUser()

  return (
    <Avatar className="h-7 w-7">
      <AvatarImage src={src || user?.image || "/placeholder.svg"} />
    </Avatar>
  )
}
