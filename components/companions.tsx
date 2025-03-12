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
import { ScrollingTraits } from "@/components/scrolling-traits";

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
        {data.map((item, index) => (
          <Card key={item.name} className="bg-[#DEDEDE] dark:bg-zinc-800 rounded-xl cursor-pointer border border-zinc-300/50 dark:border-zinc-700 shadow-md overflow-hidden flex flex-col h-full max-w-full w-full">
            <div className="relative flex flex-col h-full">
              {/* Configure button - Now in top left corner */}
              <button 
                className="absolute top-2 left-2 z-10 p-1 bg-zinc-800/70 hover:bg-zinc-800 rounded-lg transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/companion/${item.id}/configure`);
                }}
              >
                <Settings className="h-4 w-4 text-zinc-200" />
              </button>
              
              <Link href={`/chat/${item.id}`} className="flex flex-col h-full">
                {/* Top section with image on left and stats on right */}
                <div className="flex flex-row p-3 items-center justify-between">
                  {/* Left side: Avatar - now much larger but responsive */}
                  <div className="relative w-24 h-24 xs:w-28 xs:h-28 sm:w-32 sm:h-32 flex-shrink-0 ml-2 xs:ml-4 sm:ml-6">
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
                      className={cn(
                        "rounded-xl object-cover transition-opacity duration-300", 
                        loadingImages[item.id] ? "opacity-0" : "opacity-100"
                      )}
                      alt={item.name}
                      onLoad={() => handleImageLoaded(item.id)}
                      onError={() => handleImageError(item.id)}
                      sizes="(max-width: 640px) 96px, (max-width: 768px) 112px, 128px"
                      priority={index < 8} // Prioritize loading first 8 images
                      placeholder="blur"
                      blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+P+/HgAEhQJ/e2imzgAAAABJRU5ErkJggg=="
                    />
                  </div>
                  
                  {/* Right side: Stats (stacked vertically) */}
                  <div className="flex flex-col space-y-1.5 justify-start items-end min-w-[60px]">
                    {/* Global tokens burned */}
                    {!loadingImages[item.id] ? (
                      <Badge variant="secondary" className="text-xs px-2 py-0.5 h-5 w-full flex justify-end">
                        <div className="flex items-center gap-1.5">
                          <Globe className="h-3 w-3 text-blue-500 flex-shrink-0" />
                          <span className="text-xs font-medium truncate">
                            {((item as any).tokensBurned || 0).toLocaleString()}
                          </span>
                        </div>
                      </Badge>
                    ) : (
                      <Skeleton className="h-5 w-16" />
                    )}
                    
                    {/* User-specific tokens burned */}
                    {!loadingImages[item.id] && userId && (
                      <Badge variant="secondary" className="text-xs px-2 py-0.5 h-5 w-full flex justify-end">
                        <div className="flex items-center gap-1.5">
                          <Flame className="h-3 w-3 text-red-500 flex-shrink-0" />
                          <span className="text-xs font-medium truncate">
                            {(item as any).userBurnedTokens && 
                             (item as any).userBurnedTokens.length > 0 ? 
                             (item as any).userBurnedTokens[0].tokensBurned.toLocaleString() : "0"}
                          </span>
                        </div>
                      </Badge>
                    )}
                    
                    {/* Message count indicator */}
                    {!loadingImages[item.id] && (
                      <div className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium text-zinc-500 dark:text-zinc-400 border border-zinc-300 dark:border-zinc-700 w-full justify-end">
                        <div className="flex items-center gap-1.5">
                          <MessagesSquare className="h-3 w-3 flex-shrink-0" />
                          <span className="text-xs">
                            {item._count?.messages || 0}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Technical Description */}
                <CardContent className="px-3 py-2 flex-grow flex items-center min-h-[2.5rem] h-[2.5rem] overflow-hidden border-y border-zinc-300/50 dark:border-zinc-700 bg-[#D6D6D6] dark:bg-zinc-900/50">
                  {loadingImages[item.id] ? (
                    <div className="space-y-1 w-full">
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-3/4" />
                    </div>
                  ) : (
                    <ScrollingTraits companion={item} className="min-h-[1.25rem] w-full" />
                  )}
                </CardContent>
                
                {/* Bottom section with name and username */}
                <div className="flex flex-col items-center justify-center py-2 px-3 text-center relative">
                  {loadingImages[item.id] ? (
                    <div className="space-y-1.5">
                      <Skeleton className="h-5 w-24 mx-auto" />
                      <Skeleton className="h-4 w-20 mx-auto" />
                    </div>
                  ) : (
                    <div className="space-y-0.5">
                      <p className="font-semibold text-base text-zinc-800 dark:text-foreground truncate max-w-[200px]">
                        {item.name}
                      </p>
                      <p className="text-sm text-zinc-600 dark:text-muted-foreground font-medium truncate max-w-[200px]">
                        @{item.userName}
                      </p>
                    </div>
                  )}
                  
                  {/* + Button in bottom right */}
                  <button 
                    className="absolute bottom-2 right-2 w-7 h-7 rounded-full bg-zinc-200 hover:bg-orange-500 dark:bg-zinc-700 dark:hover:bg-orange-500 flex items-center justify-center transition-colors shadow-sm"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      window.location.href = `/chat/${item.id}`;
                    }}
                  >
                    <span className="text-zinc-800 hover:text-white dark:text-zinc-200 dark:hover:text-white text-lg font-semibold">+</span>
                  </button>
                </div>
                
                {/* Actions at the bottom */}
                <div className="px-3 py-2 border-t border-zinc-300/50 dark:border-zinc-700 bg-[#CACACA] dark:bg-zinc-900/70">
                  <CompanionActions 
                    companion={item}
                    currentUser={userId ? { id: userId } : null}
                    availableTokens={userTokens}
                  />
                </div>
              </Link>
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