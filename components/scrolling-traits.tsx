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
  const [traits, setTraits] = useState<TraitItem[]>([]);
  
  // All useRef hooks
  const textContainerRef = useRef<HTMLDivElement>(null);
  const textContentRef = useRef<HTMLDivElement>(null);
  
  // Extract traits from the companion object when component mounts
  useEffect(() => {
    // Set of traits to extract from companion
    const extractedTraits: TraitItem[] = [];
    
    try {
      // Extract traits from description - fallback
      if (companion.description) {
        extractedTraits.push({
          label: 'Description',
          value: companion.description,
          displayValue: companion.description.slice(0, 100) + (companion.description.length > 100 ? '...' : '')
        });
      }
      
      // Extract from personalityConfig if available
      if (companion.personalityConfig) {
        const personalityConfig = typeof companion.personalityConfig === 'string' 
          ? JSON.parse(companion.personalityConfig) 
          : companion.personalityConfig;
        
        // Extract traits if they exist
        if (personalityConfig.traits) {
          // Dominant traits
          if (personalityConfig.traits.dominant && personalityConfig.traits.dominant.length > 0) {
            extractedTraits.push({
              label: 'Dominant traits',
              value: personalityConfig.traits.dominant,
              displayValue: `Dominant: ${personalityConfig.traits.dominant.join(', ')}`
            });
          }
          
          // Secondary traits
          if (personalityConfig.traits.secondary && personalityConfig.traits.secondary.length > 0) {
            extractedTraits.push({
              label: 'Secondary traits',
              value: personalityConfig.traits.secondary,
              displayValue: `Secondary: ${personalityConfig.traits.secondary.join(', ')}`
            });
          }
        }
        
        // Extract response length if available
        if (personalityConfig.responseLength) {
          extractedTraits.push({
            label: 'Response style',
            value: personalityConfig.responseLength,
            displayValue: `Response style: ${personalityConfig.responseLength}`
          });
        }
        
        // Extract writing style if available
        if (personalityConfig.writingStyle) {
          extractedTraits.push({
            label: 'Writing style',
            value: personalityConfig.writingStyle,
            displayValue: `Writing style: ${personalityConfig.writingStyle}`
          });
        }
      }
      
      // Extract from knowledgeConfig if available
      if (companion.knowledgeConfig) {
        const knowledgeConfig = typeof companion.knowledgeConfig === 'string'
          ? JSON.parse(companion.knowledgeConfig)
          : companion.knowledgeConfig;
        
        // Extract primary expertise
        if (knowledgeConfig.primaryExpertise) {
          extractedTraits.push({
            label: 'Expertise',
            value: knowledgeConfig.primaryExpertise,
            displayValue: `Expert in: ${knowledgeConfig.primaryExpertise}`
          });
        }
        
        // Extract secondary expertise areas
        if (knowledgeConfig.secondaryExpertise && knowledgeConfig.secondaryExpertise.length > 0) {
          extractedTraits.push({
            label: 'Secondary expertise',
            value: knowledgeConfig.secondaryExpertise,
            displayValue: `Knowledgeable about: ${knowledgeConfig.secondaryExpertise.join(', ')}`
          });
        }
      }
      
      // If we still don't have any traits, use the description as a fallback
      if (extractedTraits.length === 0 && companion.instructions) {
        // Take the first sentence or two from instructions as a fallback
        const firstSentences = companion.instructions.split(/(?<=[.!?])\s+/).slice(0, 2).join(' ');
        extractedTraits.push({
          label: 'About',
          value: firstSentences,
          displayValue: firstSentences
        });
      }
      
      // If still empty, add a generic trait
      if (extractedTraits.length === 0) {
        extractedTraits.push({
          label: 'AI Companion',
          value: companion.name,
          displayValue: `${companion.name} - AI Companion`
        });
      }
      
      // Update state with the extracted traits
      setTraits(extractedTraits);
      
    } catch (error) {
      console.error('Error extracting traits from companion:', error);
      // Fallback
      setTraits([{
        label: 'Name',
        value: companion.name,
        displayValue: companion.name
      }]);
    }
  }, [companion]);

  // Initialize to handle overflow detection - must be called in the same order every render
  useEffect(() => {
    setIsInitialized(true);
  }, []);
  
  // Check if text is overflowing and needs marquee effect
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
    
    // Reset to first trait and make visible
    setCurrentIndex(0);
    setIsVisible(true);

    const intervalId = setInterval(() => {
      // If only one trait, don't bother cycling
      if (traits.length <= 1) return;
      
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

  // Show loading state while waiting for traits to be processed
  if (!isInitialized || traits.length === 0) {
    return <div className={cn("h-5 text-sm text-zinc-500 dark:text-zinc-400", className)}>Loading traits...</div>;
  }

  // Get current trait to display
  const currentTrait = traits[currentIndex];
  
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
                  {currentTrait?.displayValue || companion.name}
                  {/* Add duplicate for continuous scrolling when needed */}
                  {isTextOverflowing && (
                    <>
                      <span className="px-4">•</span>
                      <span>{currentTrait?.displayValue || companion.name}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <div>
              <p className="text-xs font-bold mb-1">{companion.name}</p>
              <p className="text-xs">Trait: {currentTrait?.label}</p>
              {Array.isArray(currentTrait?.value) ? (
                <p className="text-xs">{currentTrait?.value.join(', ')}</p>
              ) : (
                <p className="text-xs">{String(currentTrait?.value).substring(0, 100)}{String(currentTrait?.value).length > 100 ? '...' : ''}</p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};