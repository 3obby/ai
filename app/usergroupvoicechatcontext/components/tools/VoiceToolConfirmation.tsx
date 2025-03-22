'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, AlertCircle } from 'lucide-react';

export interface VoiceToolConfirmationProps {
  isOpen: boolean;
  toolName: string;
  confidence: number;
  arguments: Record<string, any>;
  onConfirm: () => void;
  onDeny: () => void;
  onClose: () => void;
  timeout?: number; // Auto-close timeout in ms (default: 10000)
}

export const VoiceToolConfirmation: React.FC<VoiceToolConfirmationProps> = ({
  isOpen,
  toolName,
  confidence,
  arguments: toolArgs,
  onConfirm,
  onDeny,
  onClose,
  timeout = 10000,
}) => {
  const [timeLeft, setTimeLeft] = useState(timeout);
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null);

  // Effect to handle the countdown timer
  useEffect(() => {
    if (isOpen && timeout > 0) {
      // Clear any existing intervals
      if (intervalId) {
        clearInterval(intervalId);
      }
      
      setTimeLeft(timeout);
      
      // Create a new interval
      const id = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 100) {
            clearInterval(id);
            onClose();
            return 0;
          }
          return prev - 100;
        });
      }, 100);
      
      setIntervalId(id);
      
      return () => {
        if (id) clearInterval(id);
      };
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isOpen, timeout, onClose, intervalId]);

  // Format arguments for display
  const formatArgs = (args: Record<string, any>): string => {
    try {
      return JSON.stringify(args, null, 2);
    } catch (e) {
      return 'Unable to display arguments';
    }
  };

  // Get confidence level class
  const getConfidenceClass = (conf: number): string => {
    if (conf >= 0.8) return 'text-green-400';
    if (conf >= 0.5) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-20 left-0 right-0 mx-auto max-w-sm z-50 p-4"
        >
          <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-lg overflow-hidden">
            <div className="p-4 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-white">Tool Call Detected</h3>
                <div className={getConfidenceClass(confidence)}>
                  {Math.round(confidence * 100)}% confident
                </div>
              </div>
              <div className="mt-1 text-sm text-gray-400 flex items-center">
                <AlertCircle size={14} className="mr-1" />
                Would you like to run this tool?
              </div>
            </div>
            
            <div className="p-4">
              <div className="mb-2">
                <span className="text-gray-400 text-xs uppercase tracking-wide">Tool Name</span>
                <div className="text-white font-mono mt-1 p-1 bg-gray-800 rounded">{toolName}</div>
              </div>
              
              <div>
                <span className="text-gray-400 text-xs uppercase tracking-wide">Arguments</span>
                <pre className="text-white font-mono text-xs mt-1 p-2 bg-gray-800 rounded overflow-x-auto max-h-24">
                  {formatArgs(toolArgs)}
                </pre>
              </div>
            </div>
            
            <div className="flex items-center p-3 bg-gray-800">
              <button 
                onClick={onDeny}
                className="flex items-center justify-center p-2 rounded-full bg-red-500 bg-opacity-20 hover:bg-opacity-30 text-red-400 transition-colors mr-2"
              >
                <X size={18} />
              </button>
              
              <button 
                onClick={onConfirm}
                className="flex items-center justify-center p-2 rounded-full bg-green-500 bg-opacity-20 hover:bg-opacity-30 text-green-400 transition-colors mr-auto"
              >
                <Check size={18} />
              </button>
              
              <div className="h-1 bg-gray-700 rounded-full overflow-hidden w-24">
                <div 
                  className="h-full bg-blue-500 rounded-full" 
                  style={{ width: `${(timeLeft / timeout) * 100}%`, transition: 'width 100ms linear' }} 
                />
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default VoiceToolConfirmation; 