import Image from "next/image";
import Link from "next/link";
import { Poppins } from "next/font/google";
import { cn } from "@/lib/utils";
import { Coins } from "lucide-react";
import { useState, useEffect } from "react";

const font = Poppins({ weight: "600", subsets: ["latin"] });

interface IntegratedLogoProps {
  userId: string;
}

export const IntegratedLogo = ({ userId }: IntegratedLogoProps) => {
  const [tokenBalance, setTokenBalance] = useState<string>("...");
  const [isLoading, setIsLoading] = useState(true);

  // Fetch token balance
  useEffect(() => {
    const fetchTokens = async () => {
      try {
        const response = await fetch("/api/user-progress");
        if (response.ok) {
          const data = await response.json();
          const tokens = data.remainingTokens || 0;
          setTokenBalance(formatTokens(tokens));
        } else {
          setTokenBalance("Error");
        }
      } catch (error) {
        console.error("Error fetching tokens:", error);
        setTokenBalance("Error");
      } finally {
        setIsLoading(false);
      }
    };

    fetchTokens();
    const interval = setInterval(fetchTokens, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  // Format tokens with K/M suffix for large numbers
  const formatTokens = (tokens: number): string => {
    if (tokens >= 1000000) {
      return `${(tokens / 1000000).toFixed(1)}M`;
    }
    if (tokens >= 1000) {
      return `${(tokens / 1000).toFixed(1)}K`;
    }
    return tokens.toString();
  };

  return (
    <Link href="/" className="block">
      <div className="relative flex items-center justify-end h-10 rounded-md overflow-hidden group">
        {/* Feather logo - now first */}
        <div className="relative flex items-center justify-center h-10 w-10 z-10 mr-2">
          <Image
            src="/feather.png"
            alt="Feather Logo"
            width={26}
            height={26}
            className="transform transition-transform duration-700 group-hover:scale-110"
          />
        </div>
        
        {/* Orange gradient background */}
        <div className="absolute inset-0 bg-gradient-to-tr from-orange-500/40 to-orange-400/20 hover:from-orange-500/50 hover:to-orange-400/30 dark:from-orange-500/30 dark:to-orange-400/20 transition-all"></div>
        
        {/* Text - GCBB */}
        <div className="relative z-10 flex items-center">
          <span className={cn(
            "text-lg font-bold text-zinc-800 dark:text-white",
            font.className
          )}>
            GCBB
          </span>
        </div>
        
        {/* Divider */}
        <div className="h-6 mx-2 w-px bg-zinc-300/50 dark:bg-zinc-700/50"></div>
        
        {/* Token balance */}
        <div className="mr-3 relative z-10 flex items-center">
          <div className="flex items-center gap-1.5">
            <Coins className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <span className={cn(
              "text-sm font-semibold text-zinc-800 dark:text-white",
              font.className,
              isLoading && "animate-pulse"
            )}>
              {tokenBalance}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}; 