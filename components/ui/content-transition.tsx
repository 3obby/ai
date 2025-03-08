"use client"

import { usePathname } from "next/navigation"
import { useState, useEffect, ReactNode } from "react"
import { AnimatePresence, motion } from "framer-motion"

interface ContentTransitionProps {
  children: ReactNode
}

export function ContentTransition({ children }: ContentTransitionProps) {
  const pathname = usePathname()
  const [displayChildren, setDisplayChildren] = useState(children)
  const [isAnimating, setIsAnimating] = useState(false)

  // Update the displayed children when pathname changes
  useEffect(() => {
    // Start animation if children is updated
    if (children !== displayChildren) {
      setIsAnimating(true)
    }
  }, [children, displayChildren])

  // When animation completes, update the displayed children
  const onAnimationComplete = () => {
    setDisplayChildren(children)
    setIsAnimating(false)
  }

  return (
    <AnimatePresence mode="wait" onExitComplete={onAnimationComplete}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0.7, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0.7, y: -10 }}
        transition={{ duration: 0.2 }}
        className="h-full w-full"
      >
        {isAnimating ? displayChildren : children}
      </motion.div>
    </AnimatePresence>
  )
} 