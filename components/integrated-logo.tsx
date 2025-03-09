"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Poppins } from "next/font/google";
import { Coins } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatLargeNumber } from "@/lib/format";

const font = Poppins({ weight: "600", subsets: ["latin"] });

interface IntegratedLogoProps {
  userId: string;
}

export const IntegratedLogo = ({ userId }: IntegratedLogoProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tokenBalance, setTokenBalance] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Add sparkle effect
  useEffect(() => {
    if (!containerRef.current) return;
    
    // Create the animation
    const container = containerRef.current;
    let animationFrameId: number;
    
    // Create and append the canvas
    const canvas = document.createElement('canvas');
    canvas.width = container.offsetWidth;
    canvas.height = container.offsetHeight;
    canvas.className = "absolute inset-0 z-0 opacity-75";
    container.appendChild(canvas);
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Animation parameters - reduced particle count
    const particleCount = 6;
    
    // Feather-like particles that float upward from bottom-left across the container
    const particles = Array.from({ length: particleCount }, () => ({
      x: canvas.width * 0.2 + (Math.random() * 0.2 - 0.1) * canvas.width,
      y: canvas.height * 0.7 + (Math.random() * 0.2 - 0.1) * canvas.height,
      size: Math.random() * 1.5 + 0.5,
      speedX: Math.random() * 0.15 + 0.05, // Slowed down
      speedY: -(Math.random() * 0.15 + 0.05), // Slowed down
      opacity: Math.random() * 0.25 + 0.1,
      hue: Math.floor(Math.random() * 40) + 30 // Golden hues (30-70)
    }));
    
    // Time-based animation parameters - slowed down
    let time = 0;
    
    const animate = () => {
      time += 0.005; // Slowed down
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Create a subtle gradient background that looks like light
      // Extended to cover the entire container including text
      const gradient = ctx.createRadialGradient(
        canvas.width * 0.15, // Origin further left
        canvas.height * 0.7,
        0, 
        canvas.width * 0.6, // Expand toward right side
        canvas.height * 0.4, 
        canvas.width
      );
      gradient.addColorStop(0, 'rgba(255, 210, 170, 0.1)'); // Warm light
      gradient.addColorStop(0.5, 'rgba(255, 250, 230, 0.05)'); // Soft glow
      gradient.addColorStop(1, 'rgba(200, 230, 255, 0)'); // Fade to transparency
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw and update particles
      particles.forEach(particle => {
        // Pulsating effect - slower
        const pulseFactor = Math.sin(time * 1.5 + particle.x * 0.05) * 0.2 + 0.8;
        
        // Draw particle
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size * pulseFactor, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${particle.hue}, 80%, 70%, ${particle.opacity * pulseFactor})`;
        ctx.fill();
        
        // Create subtle glow
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size * 2.5 * pulseFactor, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${particle.hue}, 80%, 70%, ${particle.opacity * 0.25 * pulseFactor})`;
        ctx.fill();
        
        // Update position - gentle floating motion - slowed down
        particle.x += particle.speedX + Math.sin(time * 2 + particle.y * 0.05) * 0.03;
        particle.y += particle.speedY + Math.cos(time * 1.5 + particle.x * 0.05) * 0.03;
        
        // Reset when out of bounds - allow particles to move across the entire width
        if (particle.x > canvas.width || particle.y < 0) {
          particle.x = canvas.width * 0.2 + (Math.random() * 0.2 - 0.1) * canvas.width;
          particle.y = canvas.height * 0.7 + (Math.random() * 0.2 - 0.1) * canvas.height;
          particle.opacity = Math.random() * 0.25 + 0.1;
        }
      });
      
      animationFrameId = requestAnimationFrame(animate);
    };
    
    animate();
    
    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      if (container.contains(canvas)) {
        container.removeChild(canvas);
      }
    };
  }, []);

  // Fetch token balance
  useEffect(() => {
    const fetchTokenBalance = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/user-progress?userId=${userId}`);
        if (response.ok) {
          const data = await response.json();
          setTokenBalance(data.remainingTokens || 0);
        }
      } catch (error) {
        console.error("Failed to fetch token balance:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTokenBalance();
    
    // Update every 30 seconds
    const intervalId = setInterval(fetchTokenBalance, 30000);
    
    return () => clearInterval(intervalId);
  }, [userId]);

  return (
    <Link href="/" className="h-full block">
      <div 
        ref={containerRef} 
        className="relative flex items-center justify-end h-full bg-gradient-to-tr from-orange-500/40 to-orange-400/20 group"
      >
        {/* GCBB Text first - using navbar gray color */}
        <div className="relative z-10 mx-3">
          <span className={cn(
            "text-lg font-bold text-secondary", // Using secondary color to match navbar
            font.className
          )}>
            GCBB
          </span>
        </div>
        
        {/* Feather Logo Second - removed white border */}
        <div className="relative flex items-center justify-center w-10 h-10 z-10">
          <Image
            src="/feather.png"
            alt="Feather Logo"
            width={32}
            height={32}
            className="transform transition-transform duration-700 group-hover:scale-110"
          />
        </div>
        
        {/* Token Balance Last */}
        <div className="relative z-10 mr-3 ml-3 flex items-center border-l pl-3 border-white/20">
          {isLoading ? (
            <div className="h-4 w-12 bg-white/20 animate-pulse rounded-sm"></div>
          ) : (
            <div className="flex items-center text-white">
              <Coins className="h-3.5 w-3.5 mr-1.5 text-white/90" />
              <span className="text-sm font-medium">
                {tokenBalance !== null ? formatLargeNumber(tokenBalance) : '0'}
              </span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}; 