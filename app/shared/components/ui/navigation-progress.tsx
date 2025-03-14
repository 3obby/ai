"use client"

import { useEffect, useState } from "react"
import { usePathname, useSearchParams } from "next/navigation"

export function NavigationProgress() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  
  const [isAnimating, setIsAnimating] = useState(false)
  const [progress, setProgress] = useState(0)
  
  useEffect(() => {
    // When pathname or search params change, trigger the animation
    let timeoutId: NodeJS.Timeout
    
    setIsAnimating(true)
    setProgress(0)
    
    // Fast progress to 60% immediately to give the perception of speed
    timeoutId = setTimeout(() => {
      setProgress(60)
      
      // Then proceed more slowly to 90%
      timeoutId = setTimeout(() => {
        setProgress(90)
      }, 100)
    }, 10)
    
    // Complete the animation when the transition is likely done
    timeoutId = setTimeout(() => {
      setProgress(100)
      
      // Reset after the transition completes
      timeoutId = setTimeout(() => {
        setIsAnimating(false)
        setProgress(0)
      }, 200)
    }, 300)
    
    return () => {
      clearTimeout(timeoutId)
    }
  }, [pathname, searchParams])
  
  if (!isAnimating) {
    return null
  }
  
  return (
    <div className="fixed top-0 left-0 right-0 h-1 z-50">
      <div 
        className="h-full bg-orange-500 transition-all ease-out duration-300"
        style={{ width: `${progress}%` }}
      />
    </div>
  )
} 