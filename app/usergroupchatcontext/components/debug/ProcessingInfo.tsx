'use client';

import React, { useState } from 'react';

export interface ProcessingMetadata {
  preProcessed?: boolean;
  postProcessed?: boolean;
  recursionDepth?: number;
  processingTime?: number;
  originalContent?: string;
  modifiedContent?: string;
  preprocessedContent?: string;
  postprocessedContent?: string;
}

interface ProcessingInfoProps {
  metadata?: ProcessingMetadata;
}

export function ProcessingInfo({ metadata }: ProcessingInfoProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  if (!metadata) {
    return null;
  }
  
  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };
  
  return (
    <div className="text-xs border border-muted rounded-md mt-2 overflow-hidden">
      <button
        onClick={toggleExpanded}
        className="w-full p-2 flex justify-between items-center bg-muted/20 hover:bg-muted/30 text-left"
      >
        <span className="font-medium">
          Processing Info {metadata.recursionDepth && metadata.recursionDepth > 0 ? `(Depth: ${metadata.recursionDepth})` : ''}
        </span>
        <span className="text-muted-foreground">
          {isExpanded ? '▼' : '▶'}
        </span>
      </button>
      
      {isExpanded && (
        <div className="p-2 space-y-2">
          <div className="flex justify-between">
            <span>Pre-processed:</span>
            <span>{metadata.preProcessed ? '✓' : '✗'}</span>
          </div>
          
          <div className="flex justify-between">
            <span>Post-processed:</span>
            <span>{metadata.postProcessed ? '✓' : '✗'}</span>
          </div>
          
          <div className="flex justify-between">
            <span>Recursion depth:</span>
            <span>{metadata.recursionDepth || 0}</span>
          </div>
          
          <div className="flex justify-between">
            <span>Processing time:</span>
            <span>{metadata.processingTime ? `${metadata.processingTime.toFixed(2)} ms` : 'N/A'}</span>
          </div>
          
          {metadata.originalContent && (
            <div className="pt-1">
              <div className="text-muted-foreground mb-1">Original content:</div>
              <div className="p-2 bg-muted/20 rounded-md break-words max-h-20 overflow-y-auto">
                {metadata.originalContent}
              </div>
            </div>
          )}
          
          {metadata.modifiedContent && metadata.originalContent !== metadata.modifiedContent && (
            <div className="pt-1">
              <div className="text-muted-foreground mb-1">Modified content:</div>
              <div className="p-2 bg-muted/20 rounded-md break-words max-h-20 overflow-y-auto">
                {metadata.modifiedContent}
              </div>
            </div>
          )}
          
          {metadata.preprocessedContent && (
            <div className="pt-1">
              <div className="text-muted-foreground mb-1">Pre-processed content:</div>
              <div className="p-2 bg-muted/20 rounded-md break-words max-h-20 overflow-y-auto">
                {metadata.preprocessedContent}
              </div>
            </div>
          )}
          
          {metadata.postprocessedContent && (
            <div className="pt-1">
              <div className="text-muted-foreground mb-1">Post-processed content:</div>
              <div className="p-2 bg-muted/20 rounded-md break-words max-h-20 overflow-y-auto">
                {metadata.postprocessedContent}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 