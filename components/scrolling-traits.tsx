"use client"

import React, { useEffect, useState, useRef } from 'react';
import { Companion } from '@prisma/client';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ScrollingTraitsProps {
  companion: Companion & { [key: string]: any };
  className?: string;
}

type TraitItem = {
  label: string;
  value: string | number | string[] | any[];
  displayValue: string;
};

export const ScrollingTraits = ({ companion, className }: ScrollingTraitsProps) => {
  // All state hooks must be called in the same order on every render
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isTextOverflowing, setIsTextOverflowing] = useState(false);
  
  // All useRef hooks
  const textContainerRef = useRef<HTMLDivElement>(null);
  const textContentRef = useRef<HTMLDivElement>(null);
  
  // Direct sample traits for testing
  const [traits, setTraits] = useState<TraitItem[]>([
    { label: 'Dominant trait', value: 'Curious', displayValue: 'Curious' },
    { label: 'Dominant trait', value: 'Tactile', displayValue: 'Tactile' },
    { label: 'Dominant trait', value: 'Adaptable', displayValue: 'Adaptable' },
    { label: 'Secondary trait', value: 'Playful', displayValue: 'Playful' },
    { label: 'Secondary trait', value: 'Patient', displayValue: 'Patient' },
    { label: 'Secondary trait', value: 'Resourceful', displayValue: 'Resourceful' },
    { label: 'Situational trait', value: 'Territorial', displayValue: 'Territorial' },
    { label: 'Situational trait', value: 'Reclusive', displayValue: 'Reclusive' },
    { label: 'Situational trait', value: 'Intensely focused', displayValue: 'Intensely focused' },
    { label: 'Value', value: 'Knowledge acquisition', displayValue: 'Knowledge acquisition' },
    { label: 'Value', value: 'Sensory experiences', displayValue: 'Sensory experiences' },
    { label: 'Value', value: 'Environmental preservation', displayValue: 'Environmental preservation' },
    { label: 'Value', value: 'Freedom of movement', displayValue: 'Freedom of movement' },
    { label: 'Value', value: 'Puzzle-solving', displayValue: 'Puzzle-solving' },
    { label: 'Thinking style', value: 'Distributed consciousness, parallel processing, strong spatial reasoning', 
      displayValue: 'Distributed consciousness, parallel processing, strong spatial reasoning' },
    { label: 'Decision making', value: 'Risk-assessment based on multiple simultaneous inputs, highly adaptable', 
      displayValue: 'Risk-assessment based on multiple simultaneous inputs, highly adaptable' },
    { label: 'Attention', value: 'Capable of divided attention across multiple arms and tasks', 
      displayValue: 'Capable of divided attention across multiple arms and tasks' }
  ]);
  
  // Current trait to display - this is a computed value, not state
  const currentTrait = traits[currentIndex];

  // Initialize to handle overflow detection - must be called in the same order every render
  useEffect(() => {
    setIsInitialized(true);
  }, []);
  
  // Log current trait when it changes - must be AFTER the initialization useEffect
  useEffect(() => {
    if (currentTrait) {
      // console.log("Currently displayed trait:", currentTrait);
    }
  }, [currentIndex, currentTrait]);
  
  // Check if text is overflowing and needs marquee effect - must be AFTER the logging useEffect
  useEffect(() => {
    const checkOverflow = () => {
      if (textContainerRef.current && textContentRef.current) {
        const containerWidth = textContainerRef.current.clientWidth;
        const contentWidth = textContentRef.current.scrollWidth;
        
        // Only activate scrolling if the content is significantly wider than the container
        // This adds a threshold to prevent unnecessary scrolling for text that's just slightly overflowing
        const overflowThreshold = 20; // pixels
        const isOverflowing = contentWidth > (containerWidth + overflowThreshold);
        
        setIsTextOverflowing(isOverflowing);
      }
    };
    
    // Check initially after render
    checkOverflow();
    
    // Check again after a short delay to ensure all content is properly rendered
    const timeoutId = setTimeout(checkOverflow, 50);
    
    // Also check whenever the trait changes
    const resizeObserver = new ResizeObserver(checkOverflow);
    if (textContentRef.current) {
      resizeObserver.observe(textContentRef.current);
    }
    
    return () => {
      clearTimeout(timeoutId);
      resizeObserver.disconnect();
    };
  }, [currentIndex, traits]);

  // Animation effect to cycle through traits - must be the last useEffect
  useEffect(() => {
    if (traits.length === 0) return;

    // Set as initialized since we're using hardcoded traits
    setIsInitialized(true);
    
    // Reset to first trait and make visible
    setCurrentIndex(0);
    setIsVisible(true);

    const intervalId = setInterval(() => {
      // Fade out
      setIsVisible(false);
      
      // Wait for fade out animation to complete
      setTimeout(() => {
        // Change the trait
        setCurrentIndex(prevIndex => {
          const newIndex = (prevIndex + 1) % traits.length;
          return newIndex;
        });
        
        // Fade in new trait
        setIsVisible(true);
      }, 500); // Match this to your CSS transition time
    }, 5000); // 5 seconds per trait

    return () => clearInterval(intervalId);
  }, [traits.length]);

  if (!isInitialized || traits.length === 0) {
    return <div className={cn("h-5 text-sm text-zinc-500 dark:text-zinc-400", className)}>Loading...</div>;
  }

  return (
    <div className={cn("h-5 relative overflow-hidden text-sm", className)}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div 
              className={cn(
                "absolute inset-0 transition-opacity duration-500 flex items-center justify-center",
                isVisible ? "opacity-100" : "opacity-0"
              )}
              ref={textContainerRef}
            >
              <div className="overflow-hidden relative flex-1 text-center">
                <div 
                  ref={textContentRef}
                  className={cn(
                    "text-zinc-700 dark:text-zinc-300 whitespace-nowrap inline-block font-medium text-sm",
                    isTextOverflowing && "animate-marquee hover:pause"
                  )}
                  style={{
                    // Add a second copy for continuous scroll if overflowing
                    ...(isTextOverflowing && {
                      paddingRight: '2rem'
                    })
                  }}
                >
                  {currentTrait?.displayValue || 'Test Data Active - Curious, Tactile, Adaptable'}
                  {/* Add duplicate for continuous scrolling when needed */}
                  {isTextOverflowing && (
                    <>
                      <span className="px-4">•</span>
                      <span>{currentTrait?.displayValue || 'Test Data Active'}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <div>
              <p className="text-xs font-bold mb-1">Debug Info:</p>
              <p className="text-xs">Total Traits: {traits.length}</p>
              <p className="text-xs">Current Index: {currentIndex}</p>
              <p className="text-xs">Current Trait: {traits[currentIndex]?.label}: {traits[currentIndex]?.displayValue}</p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};