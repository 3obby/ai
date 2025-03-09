"use client"

import Image from "next/image"
import Link from "next/link"
import { Companion } from "@prisma/client"
import { MessagesSquare, ChevronLeft, ChevronRight, Globe, Flame, Loader2, Bot, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import React, { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { Card, CardFooter, CardHeader, CardContent } from "@/components/ui/card"

// Define the UserBurnedTokens interface since it may not be exported yet
interface UserBurnedTokens {
  id: string;
  userId: string;
  companionId: string;
  tokensBurned: number;
  createdAt: Date;
  updatedAt: Date;
}

interface CompanionsProps {
  data: (Companion & {
    _count: {
      messages: number
    },
    userBurnedTokens?: UserBurnedTokens[]
  })[];
  userId?: string;
  currentPage: number;
  totalCompanions: number;
  pageSize: number;
}

// Function to generate a concise technical description
const generateTechDescription = (companion: Companion): string => {
  // If the name is too long, make the description shorter to fit card
  const maxLength = companion.name.length > 15 ? 60 : 80;
  
  // Extract key details from instructions
  let description = companion.instructions || "";
  
  // If description is too long, truncate and add ellipsis
  if (description.length > maxLength) {
    // Try to find a reasonable breakpoint
    const breakpoint = description.substring(0, maxLength).lastIndexOf('. ');
    if (breakpoint > maxLength / 2) {
      description = description.substring(0, breakpoint + 1);
    } else {
      description = description.substring(0, maxLength) + '...';
    }
  }
  
  return description;
};

export const Companions = ({
  data,
  userId,
  currentPage,
  totalCompanions,
  pageSize
}: CompanionsProps) => {
  const [isMobile, setIsMobile] = React.useState(false);
  // Keep track of images that are loading
  const [loadingImages, setLoadingImages] = useState<Record<string, boolean>>({});
  
  // Initialize all images as loading when the component mounts
  useEffect(() => {
    const initialLoadingState: Record<string, boolean> = {};
    data.forEach(item => {
      initialLoadingState[item.id] = true;
    });
    setLoadingImages(initialLoadingState);
  }, [data]);
  
  // Handle image load completion
  const handleImageLoaded = (id: string) => {
    setLoadingImages(prev => ({
      ...prev,
      [id]: false
    }));
  };
  
  // Handle image load error
  const handleImageError = (id: string) => {
    setLoadingImages(prev => ({
      ...prev,
      [id]: false
    }));
  };
  
  React.useEffect(() => {
    setIsMobile(window.innerWidth < 640);
    
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const totalPages = Math.ceil(totalCompanions / pageSize);

  if (data.length === 0) {
    return (
      <div className="pt-10 flex flex-col items-center justify-center space-y-3">
        <div className="relative w-60 h-60">
          <Image
            fill
            sizes="(max-width: 768px) 240px, 240px"
            className="grayscale"
            src="/empty.png"
            alt="Empty"
          />
        </div>
        <p className="text-sm text-muted-foreground">No companions found.</p>
        <p className="text-xs text-muted-foreground">There may be an issue with the database. Try refreshing the page.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 mb-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 px-4">
        {data.map((item) => (
          <Card key={item.name} className="bg-[#DEDEDE] dark:bg-zinc-800 rounded-xl cursor-pointer border border-zinc-300/50 dark:border-zinc-700 shadow-md overflow-hidden flex flex-col h-full">
            <Link href={`/chat/${item.id}`} className="flex flex-col h-full">
              <CardHeader className="flex items-center justify-center text-center p-2 pb-1 space-y-1">
                <div className="relative w-24 h-24">
                  {/* Show loader/placeholder while image is loading */}
                  {loadingImages[item.id] && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-200 dark:bg-zinc-700 rounded-xl">
                      <Bot className="h-8 w-8 text-zinc-400 dark:text-zinc-500 mb-1" />
                      <Loader2 className="h-5 w-5 text-primary animate-spin" />
                    </div>
                  )}
                  <Image
                    src={item.src}
                    fill
                    sizes="(max-width: 768px) 96px, 96px"
                    className={`rounded-xl object-cover shadow-md transition-opacity duration-300 ${loadingImages[item.id] ? 'opacity-0' : 'opacity-100'}`}
                    alt={item.name}
                    onLoad={() => handleImageLoaded(item.id)}
                    onError={() => handleImageError(item.id)}
                  />
                </div>
                {loadingImages[item.id] ? (
                  <Skeleton className="h-5 w-20 mx-auto" />
                ) : (
                  <div className="space-y-0">
                    <p className="font-semibold text-base text-zinc-800 dark:text-foreground">
                      {item.name}
                    </p>
                    <p className="text-xs text-zinc-600 dark:text-muted-foreground font-medium">@{item.userName}</p>
                  </div>
                )}
              </CardHeader>
              
              {/* Technical Description */}
              <CardContent className="px-3 py-1 flex-grow">
                {loadingImages[item.id] ? (
                  <div className="space-y-1">
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-3/4" />
                  </div>
                ) : (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <p className="text-xs text-zinc-700 dark:text-zinc-300 line-clamp-2 text-left">
                          {generateTechDescription(item)}
                        </p>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="text-xs">{item.instructions}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </CardContent>
              
              <CardFooter className="flex flex-col gap-1 px-3 py-2 border-t border-zinc-300/50 dark:border-zinc-700 bg-[#BDBDBD] dark:bg-zinc-900/50 mt-auto">
                <div className="flex items-center justify-between w-full">
                  {/* Global tokens burned */}
                  {loadingImages[item.id] ? (
                    <Skeleton className="h-4 w-14" />
                  ) : (
                    <Badge variant="secondary">
                      <div className="flex items-center gap-1">
                        <Globe className="h-3 w-3 text-blue-500" />
                        <span className="text-xs font-medium">
                          {/* Handle both field names for backward compatibility */}
                          {((item as any).tokensBurned || (item as any).xpEarned || 0).toLocaleString()}
                        </span>
                      </div>
                    </Badge>
                  )}
                  
                  {/* User-specific tokens burned - Always show, even if 0 */}
                  {!loadingImages[item.id] && userId && (
                    <Badge variant="secondary">
                      <div className="flex items-center gap-1">
                        <Flame className="h-3 w-3 text-red-500" />
                        <span className="text-xs font-medium">
                          {(item as any).userBurnedTokens && 
                           (item as any).userBurnedTokens.length > 0 ? 
                           (item as any).userBurnedTokens[0].tokensBurned.toLocaleString() : "0"}
                        </span>
                      </div>
                    </Badge>
                  )}
                  {loadingImages[item.id] && (
                    <Skeleton className="h-4 w-14" />
                  )}
                </div>
                
                {/* Message count indicator */}
                {!loadingImages[item.id] && (
                  <div className="flex items-center w-full justify-center">
                    <div className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold bg-transparent text-zinc-500 dark:text-zinc-400 border border-zinc-300 dark:border-zinc-700">
                      <div className="flex items-center gap-1">
                        <MessagesSquare className="h-3 w-3" />
                        <span className="text-xs">
                          {item._count.messages} {item._count.messages === 1 ? 'message' : 'messages'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </CardFooter>
            </Link>
          </Card>
        ))}
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-center mt-6 space-x-4">
          <Button
            onClick={() => {
              const searchParams = new URLSearchParams(window.location.search);
              searchParams.set('page', String(currentPage - 1));
              window.location.search = searchParams.toString();
            }}
            disabled={currentPage <= 1}
            variant="outline"
            className="flex items-center"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>
          <div className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </div>
          <Button
            onClick={() => {
              const searchParams = new URLSearchParams(window.location.search);
              searchParams.set('page', String(currentPage + 1));
              window.location.search = searchParams.toString();
            }}
            disabled={currentPage >= totalPages}
            variant="outline"
            className="flex items-center"
          >
            Next
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      )}
    </div>
  )
}