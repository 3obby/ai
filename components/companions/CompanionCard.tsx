'use client';

import { useState } from 'react';
import Image from 'next/image';

interface CompanionCardProps {
  id: string;
  name: string;
  description: string;
  avatar: string;
  isSelected?: boolean;
  onSelect?: () => void;
  onRemove?: () => void;
}

export default function CompanionCard({
  id,
  name,
  description,
  avatar,
  isSelected = false,
  onSelect,
  onRemove,
}: CompanionCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={`
        relative flex flex-col rounded-xl overflow-hidden 
        border transition-all duration-200 ease-in-out
        ${isSelected 
          ? 'border-primary-500 bg-dark-800 shadow-md shadow-primary-500/20' 
          : 'border-dark-700 bg-dark-900 hover:bg-dark-800'
        }
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onSelect}
    >
      {/* Optional remove button */}
      {onRemove && (
        <button
          className="absolute top-2 right-2 z-10 w-6 h-6 flex items-center justify-center 
                    bg-dark-700 hover:bg-dark-600 rounded-full opacity-0 transition-opacity 
                    duration-200 ease-in-out group-hover:opacity-100"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          aria-label={`Remove ${name}`}
          style={{ opacity: isHovered ? 1 : 0 }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-dark-300"
          >
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      )}

      {/* Avatar */}
      <div className="relative h-32 w-full bg-gradient-to-b from-dark-700 to-dark-900">
        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2">
          <div className={`
            w-20 h-20 rounded-full border-4 overflow-hidden
            ${isSelected ? 'border-primary-500' : 'border-dark-800'}
          `}>
            <Image
              src={avatar || `/companions/default-avatar.png`}
              alt={name}
              width={80}
              height={80}
              className="object-cover"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="pt-12 p-4 flex flex-col items-center">
        <h3 className="text-lg font-semibold text-white mb-1">{name}</h3>
        <p className="text-sm text-dark-300 text-center line-clamp-3">{description}</p>
        
        {/* Selection indicator */}
        {isSelected && (
          <div className="mt-3 py-1 px-3 bg-primary-500/20 rounded-full">
            <span className="text-xs text-primary-400">Selected</span>
          </div>
        )}
      </div>
    </div>
  );
} 