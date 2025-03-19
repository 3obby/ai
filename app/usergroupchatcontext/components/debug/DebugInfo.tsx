'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

interface DebugInfoProps {
  metadata: any;
  className?: string;
}

export function DebugInfo({ metadata, className }: DebugInfoProps) {
  // Processing info
  const processingInfo = metadata?.processingInfo || {};
  const toolResults = metadata?.toolResults || [];
  
  return (
    <div className={cn("text-xs border rounded-md overflow-hidden", className)}>
      <div className="bg-muted/50 px-2 py-1 font-medium text-muted-foreground">
        Debug Information
      </div>
      
      {/* Processing Information */}
      {Object.keys(processingInfo).length > 0 && (
        <div className="border-t">
          <div className="bg-muted/30 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            Processing Info
          </div>
          <div className="px-2 py-1 space-y-1">
            {processingInfo.processingTime && (
              <div className="flex justify-between">
                <span>Processing Time:</span>
                <span className="font-mono">{processingInfo.processingTime.toFixed(2)}ms</span>
              </div>
            )}
            {processingInfo.reprocessingDepth !== undefined && (
              <div className="flex justify-between">
                <span>Reprocessing Depth:</span>
                <span className="font-mono">{processingInfo.reprocessingDepth}</span>
              </div>
            )}
            {processingInfo.preProcessed !== undefined && (
              <div className="flex justify-between">
                <span>Pre-processed:</span>
                <span className="font-mono">{processingInfo.preProcessed ? 'Yes' : 'No'}</span>
              </div>
            )}
            {processingInfo.postProcessed !== undefined && (
              <div className="flex justify-between">
                <span>Post-processed:</span>
                <span className="font-mono">{processingInfo.postProcessed ? 'Yes' : 'No'}</span>
              </div>
            )}
          </div>
          
          {/* Show pre/post processed content if available */}
          {(processingInfo.originalContent || processingInfo.modifiedContent) && (
            <DebugContentDiff
              original={processingInfo.originalContent}
              modified={processingInfo.modifiedContent}
            />
          )}
        </div>
      )}
      
      {/* Tool Results */}
      {toolResults.length > 0 && (
        <div className="border-t">
          <div className="bg-muted/30 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            Tool Results ({toolResults.length})
          </div>
          <div className="divide-y">
            {toolResults.map((tool: any, idx: number) => (
              <div key={idx} className="px-2 py-1 space-y-1">
                <div className="flex justify-between font-medium">
                  <span>{tool.toolName}</span>
                  {tool.executionTime && (
                    <span className="font-mono text-[10px]">{tool.executionTime.toFixed(2)}ms</span>
                  )}
                </div>
                
                {tool.error ? (
                  <div className="px-2 py-1 bg-destructive/10 text-destructive rounded text-[10px]">
                    {tool.error}
                  </div>
                ) : (
                  <div className="font-mono text-[10px] bg-muted/30 p-1 rounded overflow-x-auto">
                    {typeof tool.result === 'object' 
                      ? JSON.stringify(tool.result, null, 2)
                      : String(tool.result)
                    }
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* No debug info */}
      {Object.keys(processingInfo).length === 0 && toolResults.length === 0 && (
        <div className="px-2 py-1 text-center text-muted-foreground">
          No debug information available
        </div>
      )}
    </div>
  );
}

// Helper component to show differences between original and modified content
function DebugContentDiff({ 
  original, 
  modified 
}: { 
  original?: string; 
  modified?: string;
}) {
  const [showDiff, setShowDiff] = useState(false);
  
  if (!original && !modified) return null;
  
  return (
    <div className="border-t">
      <button
        type="button"
        onClick={() => setShowDiff(!showDiff)}
        className="w-full bg-muted/30 px-2 py-0.5 text-[10px] font-medium text-muted-foreground text-left hover:bg-muted/50 transition-colors"
      >
        {showDiff ? 'Hide Content Changes' : 'Show Content Changes'}
      </button>
      
      {showDiff && (
        <div className="px-2 py-1 space-y-2">
          {original && (
            <div>
              <div className="text-[10px] font-medium text-muted-foreground">Original:</div>
              <div className="font-mono text-[10px] bg-muted/30 p-1 rounded overflow-x-auto">
                {original}
              </div>
            </div>
          )}
          
          {modified && (
            <div>
              <div className="text-[10px] font-medium text-muted-foreground">Modified:</div>
              <div className="font-mono text-[10px] bg-muted/30 p-1 rounded overflow-x-auto">
                {modified}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 