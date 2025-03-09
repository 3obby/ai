"use client"

import Image from "next/image"
import Link from "next/link"
import { Companion } from "@prisma/client"
import { MessagesSquare, ChevronLeft, ChevronRight, Globe, Flame, Loader2, Bot, Info, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import React, { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { CompanionActions } from "@/components/companion-actions";

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
  const router = useRouter();
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

  const [userTokens, setUserTokens] = useState<number>(0);
  
  // Fetch user token balance
  useEffect(() => {
    if (!userId) return;
    
    const fetchUserTokens = async () => {
      try {
        const response = await fetch(`/api/user-progress?userId=${userId}`);
        const data = await response.json();
        setUserTokens(data.availableTokens || 0);
      } catch (error) {
        console.error("Failed to fetch user tokens:", error);
      }
    };
    
    fetchUserTokens();
  }, [userId]);

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
    <div className="space-y-4 mb-8 max-w-full overflow-hidden">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 md:gap-3 px-1 sm:px-2 md:px-4 max-w-full">
        {data.map((item) => (
          <Card key={item.name} className="bg-[#DEDEDE] dark:bg-zinc-800 rounded-xl cursor-pointer border border-zinc-300/50 dark:border-zinc-700 shadow-md overflow-hidden flex flex-col h-full max-w-full">
            <div className="relative flex flex-col h-full">
              {/* Configure button - Outside the Link */}
              <button 
                className="absolute top-2 right-2 z-10 p-1 bg-zinc-800/70 hover:bg-zinc-800 rounded-lg transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/companion/${item.id}/configure`);
                }}
              >
                <Settings className="h-4 w-4 text-zinc-200" />
              </button>
              
              <Link href={`/chat/${item.id}`} className="flex flex-col h-full">
                <CardHeader className="flex items-center justify-center text-center p-2 pb-1 space-y-1">
                  <div className="relative w-20 h-20 sm:w-24 sm:h-24">
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
                      sizes="(max-width: 640px) 80px, (max-width: 768px) 96px, 96px"
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
                      <p className="font-semibold text-base sm:text-base text-zinc-800 dark:text-foreground truncate max-w-[200px] sm:max-w-[140px]">
                        {item.name}
                      </p>
                      <p className="text-sm sm:text-xs text-zinc-600 dark:text-muted-foreground font-medium truncate max-w-[200px] sm:max-w-[140px]">@{item.userName}</p>
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
                          <p className="text-sm sm:text-xs text-zinc-700 dark:text-zinc-300 line-clamp-2 text-left">
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
                      <Skeleton className="h-5 w-16" />
                    ) : (
                      <Badge variant="secondary" className="text-sm sm:text-xs px-2 py-0.5 h-6 sm:h-5">
                        <div className="flex items-center gap-1.5">
                          <Globe className="h-3.5 w-3.5 sm:h-3 sm:w-3 text-blue-500" />
                          <span className="text-sm sm:text-xs font-medium truncate">
                            {((item as any).tokensBurned || (item as any).xpEarned || 0).toLocaleString()}
                          </span>
                        </div>
                      </Badge>
                    )}
                    
                    {/* User-specific tokens burned - Always show, even if 0 */}
                    {!loadingImages[item.id] && userId && (
                      <Badge variant="secondary" className="text-sm sm:text-xs px-2 py-0.5 h-6 sm:h-5">
                        <div className="flex items-center gap-1.5">
                          <Flame className="h-3.5 w-3.5 sm:h-3 sm:w-3 text-red-500" />
                          <span className="text-sm sm:text-xs font-medium truncate">
                            {(item as any).userBurnedTokens && 
                             (item as any).userBurnedTokens.length > 0 ? 
                             (item as any).userBurnedTokens[0].tokensBurned.toLocaleString() : "0"}
                          </span>
                        </div>
                      </Badge>
                    )}
                    {loadingImages[item.id] && (
                      <Skeleton className="h-5 w-16" />
                    )}
                  </div>
                  
                  {/* Message count indicator */}
                  {!loadingImages[item.id] && (
                    <div className="flex items-center w-full justify-center mt-1">
                      <div className="inline-flex items-center rounded-full px-3 py-1 text-sm sm:text-xs font-semibold bg-transparent text-zinc-500 dark:text-zinc-400 border border-zinc-300 dark:border-zinc-700">
                        <div className="flex items-center gap-1.5">
                          <MessagesSquare className="h-3.5 w-3.5 sm:h-3 sm:w-3" />
                          <span className="text-sm sm:text-xs">
                            {item._count.messages} {item._count.messages === 1 ? 'message' : 'messages'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </CardFooter>
              </Link>
              
              {/* Add companion actions component */}
              <div className="px-3 py-2">
                <CompanionActions 
                  companion={item}
                  currentUser={userId ? { id: userId } : null}
                  availableTokens={userTokens}
                />
              </div>
            </div>
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
            size="sm"
            className="flex items-center gap-1 h-8 px-2"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Previous</span>
          </Button>
          <div className="text-sm text-center">
            <span className="font-medium">{currentPage}</span>
            <span className="mx-1 text-muted-foreground">/</span>
            <span>{totalPages}</span>
          </div>
          <Button
            onClick={() => {
              const searchParams = new URLSearchParams(window.location.search);
              searchParams.set('page', String(currentPage + 1));
              window.location.search = searchParams.toString();
            }}
            disabled={currentPage >= totalPages}
            variant="outline"
            size="sm"
            className="flex items-center gap-1 h-8 px-2"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}