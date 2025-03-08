import React from "react";
import { cn } from "@/lib/utils";

interface VisuallyHiddenProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
}

/**
 * VisuallyHidden component hides content visually but keeps it accessible to screen readers.
 * This follows accessibility best practices by making content available to screen readers
 * while not showing it visually.
 */
export function VisuallyHidden({ children, className, ...props }: VisuallyHiddenProps) {
  return (
    <span
      className={cn(
        "absolute w-px h-px p-0 overflow-hidden whitespace-nowrap border-0",
        "clip-rect-0 m-[-1px]", // Using Tailwind equivalent for clip: rect(0 0 0 0)
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
} 