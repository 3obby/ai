"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { Poppins } from "next/font/google";
import { cn } from "@/lib/utils";

const font = Poppins({ weight: "600", subsets: ["latin"] });

export const AnimatedLogo = () => {
  const containerRef = useRef<HTMLDivElement>(null);

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
  
  return (
    <Link href="/" className="block">
      <div 
        ref={containerRef} 
        className="relative flex items-center justify-start w-auto h-12 rounded-md overflow-hidden group px-1"
      >
        <div className="absolute inset-0 bg-gradient-to-tr from-orange-100/30 to-blue-100/20 dark:from-orange-500/20 dark:to-blue-400/10 group-hover:opacity-90 transition-all"></div>
        
        {/* Square logo container */}
        <div className="relative flex items-center justify-center w-10 h-10 z-10">
          <Image
            src="/feather.png"
            alt="Feather Logo"
            width={32}
            height={32}
            className="transform transition-transform duration-700 group-hover:scale-110"
          />
        </div>
        
        {/* Text with spacing - using thematic orange color */}
        <div className="ml-3 mr-4 relative z-10">
          <span className={cn(
            "text-lg font-bold text-orange-500 dark:text-orange-400",
            font.className
          )}>
            GCBB
          </span>
        </div>
      </div>
    </Link>
  );
}; 