'use client'

import Image from 'next/image';
import { useState } from 'react';
import { cn } from '@/app/shared/utils/cn';
import { BotIcon, UserIcon } from 'lucide-react';

export interface ServerAvatarProps {
  src: string;
  alt: string;
  className?: string;
  fallbackClassName?: string;
}

export function ServerAvatar({
  src,
  alt,
  className,
  fallbackClassName,
}: ServerAvatarProps) {
  const [error, setError] = useState(false);

  const getFallbackIcon = () => {
    // Determine fallback icon based on alt text or src
    if (alt.toLowerCase().includes("user") || src.toLowerCase().includes("user")) {
      return <UserIcon className={cn("h-6 w-6", fallbackClassName)} />;
    }
    return <BotIcon className={cn("h-6 w-6", fallbackClassName)} />;
  };

  if (error || !src) {
    return (
      <div 
        className={cn(
          "flex items-center justify-center bg-muted rounded-full overflow-hidden",
          className
        )}
      >
        {getFallbackIcon()}
      </div>
    );
  }

  return (
    <div className={cn("relative rounded-full overflow-hidden", className)}>
      <Image
        src={src}
        alt={alt}
        fill
        className="object-cover"
        onError={() => setError(true)}
      />
    </div>
  );
} 