"use client"

import Image from "next/image"
import Link from "next/link"
import { Companion } from "@prisma/client"
import { MessagesSquare, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import React, { useState } from "react";

import { Card, CardFooter, CardHeader } from "@/components/ui/card"

interface CompanionsProps {
  data: (Companion & {
    _count: {
      messages: number
    },
  })[];
  userId?: string;
}

export const Companions = ({
  data,
  userId
}: CompanionsProps) => {
  const [currentPage, setCurrentPage] = React.useState(1);
  const [isMobile, setIsMobile] = React.useState(false);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  
  React.useEffect(() => {
    setIsMobile(window.innerWidth < 640);
    
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Add useEffect for scroll to top when page changes
  React.useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }, [currentPage]);

  const companionsPerPage = isMobile ? 7 : 10;

  // No more filtering needed here since it's handled in the database query
  const indexOfLastCompanion = currentPage * companionsPerPage;
  const indexOfFirstCompanion = indexOfLastCompanion - companionsPerPage;
  const currentCompanions = data.slice(indexOfFirstCompanion, indexOfLastCompanion);
  const totalPages = Math.ceil(data.length / companionsPerPage);

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
      </div>
    )
  }

  return (
    <div className="space-y-4 mb-8">
      <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 px-4">
        {currentCompanions.map((item) => (
          <Card key={item.name} className="bg-[#DEDEDE] dark:bg-zinc-800 rounded-2xl cursor-pointer border-2 border-zinc-300/50 dark:border-zinc-700 shadow-lg overflow-hidden flex flex-col h-full">
            <Link href={`/chat/${item.id}`} className="flex flex-col h-full">
              <CardHeader className="flex items-center justify-center text-center p-4 space-y-3">
                <div className="relative w-32 h-32">
                  <Image
                    src={item.src}
                    fill
                    sizes="(max-width: 768px) 100px, 128px"
                    className="rounded-2xl object-cover shadow-md"
                    alt="Character"
                  />
                </div>
                <p className="font-semibold text-lg text-zinc-800 dark:text-foreground">
                  {item.name}
                </p>
              </CardHeader>
              <CardFooter className="flex items-center justify-between px-4 py-3 border-t border-zinc-300/50 dark:border-zinc-700 bg-[#BDBDBD] dark:bg-zinc-900/50 mt-auto">
                <p className="text-xs text-zinc-600 dark:text-muted-foreground font-medium">@{item.userName}</p>
              </CardFooter>
            </Link>
          </Card>
        ))}
      </div>
      {totalPages > 1 && (
        <div className="flex justify-center gap-4 pt-4">
          {currentPage > 1 && (
            <Button
              variant="secondary"
              size="icon"
              className="rounded-full w-10 h-10 p-2 bg-[#C0C1C3] hover:bg-[#B0B1B3] dark:bg-[#505052] dark:hover:bg-[#606062]"
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
          <div className="flex items-center gap-4">
            {[...Array(totalPages)].map((_, index) => (
              <Button
                key={index + 1}
                variant={currentPage === index + 1 ? "default" : "outline"}
                className="rounded-full w-10 h-10 p-0"
                onClick={() => setCurrentPage(index + 1)}
              >
                {index + 1}
              </Button>
            ))}
          </div>
          {currentPage < totalPages && (
            <Button
              variant="secondary"
              size="icon"
              className="rounded-full w-10 h-10 p-2 bg-[#C0C1C3] hover:bg-[#B0B1B3] dark:bg-[#505052] dark:hover:bg-[#606062]"
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}
    </div>
  )
}