'use client';

import React, { useState } from 'react';
import { Mic } from 'lucide-react';

export interface VoiceProcessingMetadata {
  transcriptionConfidence?: number;
  speechDuration?: number;
  speechModel?: string;
  interimTranscripts?: string[];
}

export interface ProcessingMetadata {
  preProcessed?: boolean;
  postProcessed?: boolean;
  recursionDepth?: number;
  reprocessingDepth?: number;
  processingTime?: number;
  originalContent?: string;
  modifiedContent?: string;
  preprocessedContent?: string;
  postprocessedContent?: string;
  voiceProcessing?: VoiceProcessingMetadata;
  needsReprocessing?: boolean;
  processingStage?: string;
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
  
  const hasVoiceMetadata = !!metadata.voiceProcessing;
  const isReprocessing = metadata.processingStage?.includes('reprocessing') || 
                         metadata.needsReprocessing === true || 
                         (metadata.reprocessingDepth !== undefined && metadata.reprocessingDepth > 0);
  const reprocessingDepth = metadata.reprocessingDepth || metadata.recursionDepth || 0;
  
  return (
    <div className="text-xs border border-muted rounded-md mt-2 overflow-hidden">
      <button
        onClick={toggleExpanded}
        className="w-full p-2 flex justify-between items-center bg-muted/20 hover:bg-muted/30 text-left"
      >
        <span className="font-medium flex items-center">
          Processing Info 
          {(reprocessingDepth > 0 || isReprocessing) && (
            <span className="ml-2 text-amber-500">
              Reprocessing {reprocessingDepth > 0 ? `(${reprocessingDepth})` : ''}
            </span>
          )}
          {hasVoiceMetadata && (
            <span className="ml-2 flex items-center text-primary">
              <Mic className="h-3 w-3 mr-0.5" />
              Voice
            </span>
          )}
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
            <span>Reprocessing depth:</span>
            <span>{reprocessingDepth}</span>
          </div>
          
          {metadata.needsReprocessing !== undefined && (
            <div className="flex justify-between">
              <span>Needs reprocessing:</span>
              <span>{metadata.needsReprocessing ? '✓' : '✗'}</span>
            </div>
          )}
          
          {metadata.processingStage && (
            <div className="flex justify-between">
              <span>Processing stage:</span>
              <span>{metadata.processingStage}</span>
            </div>
          )}
          
          <div className="flex justify-between">
            <span>Processing time:</span>
            <span>{metadata.processingTime ? `${metadata.processingTime.toFixed(2)} ms` : 'N/A'}</span>
          </div>
          
          {/* Voice Processing Section */}
          {hasVoiceMetadata && (
            <div className="border-t border-muted pt-2 mt-2">
              <div className="font-medium flex items-center mb-2">
                <Mic className="h-3 w-3 mr-1" />
                Voice Processing Details
              </div>
              
              {metadata.voiceProcessing?.transcriptionConfidence !== undefined && (
                <div className="flex justify-between">
                  <span>Transcription confidence:</span>
                  <span>{(metadata.voiceProcessing.transcriptionConfidence * 100).toFixed(1)}%</span>
                </div>
              )}
              
              {metadata.voiceProcessing?.speechDuration !== undefined && (
                <div className="flex justify-between">
                  <span>Speech duration:</span>
                  <span>{(metadata.voiceProcessing.speechDuration / 1000).toFixed(2)} seconds</span>
                </div>
              )}
              
              {metadata.voiceProcessing?.speechModel && (
                <div className="flex justify-between">
                  <span>Speech model:</span>
                  <span>{metadata.voiceProcessing.speechModel}</span>
                </div>
              )}
              
              {metadata.voiceProcessing?.interimTranscripts && metadata.voiceProcessing.interimTranscripts.length > 0 && (
                <div className="pt-1">
                  <div className="text-muted-foreground mb-1">Interim transcripts:</div>
                  <div className="p-2 bg-muted/20 rounded-md break-words max-h-20 overflow-y-auto">
                    {metadata.voiceProcessing.interimTranscripts.map((transcript, index) => (
                      <div key={index} className="mb-1 text-[10px]">
                        {transcript}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          
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