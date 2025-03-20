'use client';

import React, { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Message, ProcessingMetadata, ToolResult } from '../../types';
import { ChevronDown, ChevronUp, Info, Wrench, Settings, Mic } from 'lucide-react';
import { ProcessingInfo } from '../debug/ProcessingInfo';
import { DebugInfo } from '../debug/DebugInfo';
import { useBotRegistry } from '../../context/BotRegistryProvider';

interface MessageItemProps {
  message: Message;
  showTimestamp?: boolean;
  showAvatar?: boolean;
  showDebugInfo?: boolean;
  onBotSettingsClick?: (botId: string) => void;
}

export function MessageItem({ 
  message, 
  showTimestamp = true, 
  showAvatar = true,
  showDebugInfo = false,
  onBotSettingsClick
}: MessageItemProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [preProcessingEnabled, setPreProcessingEnabled] = useState(!!message.metadata?.processing?.preProcessed);
  const [postProcessingEnabled, setPostProcessingEnabled] = useState(!!message.metadata?.processing?.postProcessed);
  const [preProcessingInstructions, setPreProcessingInstructions] = useState('');
  const [postProcessingInstructions, setPostProcessingInstructions] = useState('');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [displayedMessage, setDisplayedMessage] = useState(message.content);
  const [selectedInputContent, setSelectedInputContent] = useState<string | null>(null);
  const [showInputModal, setShowInputModal] = useState(false);
  const [processingModels, setProcessingModels] = useState({
    preProcessing: 'GPT-4o',
    toolCalling: 'Brave Search API',
    postProcessing: 'GPT-4o',
    botResponse: 'GPT-4o'
  });
  
  // For displaying tools that were used (readonly in signal chain), not for configuring
  const [toolsUsed, setToolsUsed] = useState<string[]>([]);
  
  const { dispatch: botRegistryDispatch, getBot } = useBotRegistry();
  const isUser = message.sender === 'user';
  const timestamp = new Date(message.timestamp);
  const isVoiceMessage = message.type === 'voice';
  
  // Only show timeAgo if timestamp is valid and not too far in the past
  // This prevents the "55 years ago" issue with Unix epoch or very old dates
  const timeAgo = timestamp.getTime() > 1000000000000 
    ? formatDistanceToNow(timestamp, { addSuffix: true })
    : '';

  // Extract metadata
  const toolResults = message.metadata?.toolResults || [];
  const hasToolResults = toolResults.length > 0;
  const hasProcessingMetadata = !!message.metadata?.processing;
  const showSignalChain = true; // Always show signal chain sections
  
  // Additional details
  const processingTime = message.metadata?.processing?.processingTime || 0;
  const reprocessingDepth = message.metadata?.processing?.reprocessingDepth || 0;
  
  // Separate displayedMessage management
  const getProcessedMessage = React.useCallback(() => {
    if (message.metadata?.processing?.postProcessed && message.role === 'assistant') {
      // Return the actual post-processed content
      return message.content;
    }
    return message.content;
  }, [message]);

  // Set initial displayed message
  useEffect(() => {
    setDisplayedMessage(getProcessedMessage());
  }, [getProcessedMessage]);

  // Apply pre-processing (shows visual indicator of enabled state only)
  useEffect(() => {
    if (preProcessingEnabled) {
      console.log("Pre-processing is enabled with instructions:", preProcessingInstructions);
    }
  }, [preProcessingEnabled, preProcessingInstructions]);

  // Handle bot configuration updates with a separate ref to prevent loops
  const configUpdatedRef = React.useRef(false);

  // Update bot configuration when post-processing is enabled/disabled
  useEffect(() => {
    // Skip if not an assistant message or already updated
    if (message.role !== 'assistant' || message.sender === 'user' || configUpdatedRef.current) {
      return;
    }
    
    const botId = message.sender;
    const bot = getBot(botId);
    
    if (bot) {
      // Initialize local state from bot configuration on first render only
      // Post-processing
      const hasPostProcessing = !!bot.postProcessingPrompt;
      if (hasPostProcessing) {
        setPostProcessingEnabled(true);
        setPostProcessingInstructions(bot.postProcessingPrompt || '');
      }
      
      // Pre-processing
      const hasPreProcessing = !!bot.preProcessingPrompt;
      if (hasPreProcessing) {
        setPreProcessingEnabled(true);
        setPreProcessingInstructions(bot.preProcessingPrompt || '');
      }
      
      // Mark as updated to prevent additional config updates
      configUpdatedRef.current = true;
    }
  }, [message.role, message.sender, getBot]);
  
  // Handle manual changes to post-processing
  const updateBotPostProcessing = (enabled: boolean, instructions?: string) => {
    if (message.role !== 'assistant' || message.sender === 'user') {
      return;
    }
    
    const botId = message.sender;
    const bot = getBot(botId);
    
    if (bot) {
      if (enabled) {
        const promptToUse = instructions || postProcessingInstructions;
        botRegistryDispatch({
          type: 'UPDATE_BOT',
          payload: { 
            id: botId, 
            updates: { 
              postProcessingPrompt: promptToUse 
            } 
          }
        });
        console.log(`Updated bot ${botId} with post-processing:`, promptToUse);
      } else {
        botRegistryDispatch({
          type: 'UPDATE_BOT',
          payload: { 
            id: botId, 
            updates: { 
              postProcessingPrompt: '' 
            } 
          }
        });
        console.log(`Cleared post-processing for bot ${botId}`);
      }
    }
  };

  // Handle manual changes to pre-processing
  const updateBotPreProcessing = (enabled: boolean, instructions?: string) => {
    if (message.role !== 'assistant' || message.sender === 'user') {
      return;
    }
    
    const botId = message.sender;
    const bot = getBot(botId);
    
    if (bot) {
      if (enabled) {
        const promptToUse = instructions || preProcessingInstructions;
        botRegistryDispatch({
          type: 'UPDATE_BOT',
          payload: { 
            id: botId, 
            updates: { 
              preProcessingPrompt: promptToUse 
            } 
          }
        });
        console.log(`Updated bot ${botId} with pre-processing:`, promptToUse);
      } else {
        botRegistryDispatch({
          type: 'UPDATE_BOT',
          payload: { 
            id: botId, 
            updates: { 
              preProcessingPrompt: '' 
            } 
          }
        });
        console.log(`Cleared pre-processing for bot ${botId}`);
      }
    }
  };

  const handleBotAvatarClick = () => {
    if (!isUser && onBotSettingsClick) {
      onBotSettingsClick(message.sender);
    }
  };

  const toggleSection = (toolId: string, section: string) => (e: React.MouseEvent) => {
    e.stopPropagation();
    const key = `${toolId}-${section}`;
    setExpandedSections(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const isSectionExpanded = (toolId: string, section: string) => {
    const key = `${toolId}-${section}`;
    return !!expandedSections[key];
  };

  // Show full input content in a modal
  const handleShowInputContent = (content: string) => {
    setSelectedInputContent(content);
    setShowInputModal(true);
  };

  // Close the input content modal
  const handleCloseInputModal = () => {
    setShowInputModal(false);
    setSelectedInputContent(null);
  };

  return (
    <div className={`flex w-full py-1.5 px-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {showAvatar && !isUser && (
        <div 
          className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs mr-1.5 mt-1 flex-shrink-0 cursor-pointer"
          onClick={handleBotAvatarClick}
          title="Click to edit bot settings"
        >
          {message.senderName?.charAt(0) || 'A'}
        </div>
      )}
      
      <div className={`flex flex-col max-w-[85%] ${isUser ? 'items-end' : 'items-start'}`}>
        {!isUser && message.senderName && (
          <div 
            className="text-xs font-medium text-muted-foreground mb-0.5 cursor-pointer flex items-center"
            onClick={handleBotAvatarClick}
          >
            {message.senderName}
            <Settings className="h-3 w-3 ml-1 text-muted-foreground/50" />
          </div>
        )}
        
        <div 
          className={`px-2.5 py-1.5 rounded-lg ${
            isUser 
              ? 'bg-primary text-primary-foreground rounded-br-sm' 
              : 'bg-muted text-foreground rounded-bl-sm'
          } cursor-pointer`}
          onClick={() => setShowDetails(!showDetails)}
        >
          <div className="whitespace-pre-wrap text-sm">{displayedMessage}</div>
        </div>
        
        <div className="flex items-center text-[10px] text-muted-foreground mt-0.5 px-1">
          {isVoiceMessage && (
            <div className="flex items-center mr-2" title="Voice message">
              <Mic className="h-2.5 w-2.5 mr-0.5" />
              <span>Voice</span>
            </div>
          )}
          {showTimestamp && timeAgo && timeAgo}
        </div>
        
        {showSignalChain && !isUser && (
          <div className={`mt-1 w-full transition-all duration-200 ease-in-out ${showDetails ? 'max-h-[1000px]' : 'max-h-0 overflow-hidden'}`}>
            <button 
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center text-xs text-muted-foreground hover:text-primary px-1"
            >
              {showDetails ? <ChevronUp className="h-3 w-3 mr-1" /> : <ChevronDown className="h-3 w-3 mr-1" />}
              {showDetails ? 'Hide' : 'Show'} signal chain
              {hasToolResults && ` (${toolResults.length} tool${toolResults.length !== 1 ? 's' : ''})`}
              {hasProcessingMetadata && hasToolResults && ', includes processing'}
              {hasProcessingMetadata && !hasToolResults && ' (processing details)'}
            </button>
            
            {showDetails && (
              <div className="mt-2 space-y-3 px-1">
                {/* Processing workflow visualization */}
                <div className="bg-muted/10 rounded p-2">
                  <div className="flex justify-between items-center mb-2">
                    <div className="font-medium text-xs">Signal Chain</div>
                    <div className="text-[10px] text-muted-foreground">This is a debug view and cannot be used to configure settings</div>
                  </div>
                  <table className="w-full text-xs text-muted-foreground">
                    <thead>
                      <tr className="border-b border-muted/20">
                        <th className="text-left py-1 font-medium">Process</th>
                        <th className="text-left py-1 font-medium">Model</th>
                        <th className="text-left py-1 font-medium">Input</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-muted/20">
                        <td className="py-1.5">User Input</td>
                        <td className="py-1.5">
                          <span className="text-[10px]">User</span>
                        </td>
                        <td className="py-1.5">
                          <button 
                            onClick={() => handleShowInputContent(message.metadata?.processing?.originalContent || "No input data available")}
                            className="text-[10px] text-primary-foreground bg-primary/20 px-1 py-0.5 rounded hover:bg-primary/30"
                          >
                            View Input
                          </button>
                        </td>
                      </tr>
                      <tr className="border-b border-muted/20">
                        <td className={`py-1.5 ${message.metadata?.processing?.preProcessed ? 'text-primary' : ''}`}>Pre-Processing</td>
                        <td className="py-1.5">
                          {message.metadata?.processing?.preProcessed ? 
                            <span className="bg-muted/30 text-[10px] px-1 py-0.5 rounded">{processingModels.preProcessing}</span> : 
                            <span className="text-[10px] text-muted-foreground/50">Disabled</span>
                          }
                        </td>
                        <td className="py-1.5">
                          {message.metadata?.processing?.preProcessed ? (
                            <button 
                              onClick={() => handleShowInputContent(preProcessingInstructions || "No pre-processing instructions available")}
                              className="text-[10px] text-primary-foreground bg-primary/20 px-1 py-0.5 rounded hover:bg-primary/30"
                            >
                              View Input
                            </button>
                          ) : (
                            <span className="text-[10px] text-muted-foreground/50">—</span>
                          )}
                        </td>
                      </tr>
                      <tr className="border-b border-muted/20">
                        <td className={`py-1.5 ${hasToolResults || toolsUsed.length > 0 ? 'text-primary' : ''}`}>Tool Calling</td>
                        <td className="py-1.5">
                          {hasToolResults || toolsUsed.length > 0 ? 
                            <span className="bg-muted/30 text-[10px] px-1 py-0.5 rounded">{processingModels.toolCalling}</span> : 
                            <span className="text-[10px] text-muted-foreground/50">Disabled</span>
                          }
                        </td>
                        <td className="py-1.5">
                          {hasToolResults || toolsUsed.length > 0 ? (
                            <button 
                              onClick={() => handleShowInputContent(JSON.stringify(toolResults, null, 2) || "No tool input data available")}
                              className="text-[10px] text-primary-foreground bg-primary/20 px-1 py-0.5 rounded hover:bg-primary/30"
                            >
                              View Input
                            </button>
                          ) : (
                            <span className="text-[10px] text-muted-foreground/50">—</span>
                          )}
                        </td>
                      </tr>
                      <tr className="border-b border-muted/20">
                        <td className={`py-1.5 ${message.metadata?.processing?.postProcessed ? 'text-primary' : ''}`}>Post-Processing</td>
                        <td className="py-1.5">
                          {message.metadata?.processing?.postProcessed ? 
                            <span className="bg-muted/30 text-[10px] px-1 py-0.5 rounded">{processingModels.postProcessing}</span> : 
                            <span className="text-[10px] text-muted-foreground/50">Disabled</span>
                          }
                        </td>
                        <td className="py-1.5">
                          {message.metadata?.processing?.postProcessed ? (
                            <button 
                              onClick={() => handleShowInputContent(postProcessingInstructions || "No post-processing instructions available")}
                              className="text-[10px] text-primary-foreground bg-primary/20 px-1 py-0.5 rounded hover:bg-primary/30"
                            >
                              View Input
                            </button>
                          ) : (
                            <span className="text-[10px] text-muted-foreground/50">—</span>
                          )}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-1.5">Bot Response</td>
                        <td className="py-1.5">
                          <span className="bg-muted/30 text-[10px] px-1 py-0.5 rounded">{processingModels.botResponse}</span>
                        </td>
                        <td className="py-1.5">
                          <button 
                            onClick={() => handleShowInputContent(message.content || "No response data available")}
                            className="text-[10px] text-primary-foreground bg-primary/20 px-1 py-0.5 rounded hover:bg-primary/30"
                          >
                            View Output
                          </button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                
                {/* Original input */}
                <div className="bg-muted/10 rounded p-2 text-xs text-muted-foreground">
                  <div className="font-medium mb-1">Original Input:</div>
                  <div className="whitespace-pre-wrap">
                    {message.metadata?.processing?.originalContent || "No input data available"}
                  </div>
                </div>
                
                {/* Pre-processing section */}
                <div className="bg-muted/10 rounded p-2 text-xs">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium">Pre-Processing:</div>
                    <div className="text-[10px]">
                      {message.metadata?.processing?.preProcessed ? "Enabled" : "Disabled"}
                    </div>
                  </div>
                  
                  {message.metadata?.processing?.preProcessed && (
                    <>
                      <div className="text-[10px] text-muted-foreground mb-1">
                        <span className="bg-muted/30 px-1 py-0.5 rounded">GPT-4o</span> processed the input with instructions
                      </div>
                      
                      <div className="w-full p-1 text-xs border rounded-md bg-muted/20 mb-2 min-h-[60px]">
                        {preProcessingInstructions || "No pre-processing instructions available"}
                      </div>
                      
                      {message.metadata?.processing?.preProcessed && message.metadata?.processing?.modifiedContent && (
                        <div className="mt-2">
                          <div className="text-[11px] font-medium mb-1">Pre-Processed Result:</div>
                          <div className="whitespace-pre-wrap bg-muted/20 p-1 rounded">
                            {message.metadata.processing.modifiedContent}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
                
                {/* Tool Results (view only, not configuration) */}
                {hasToolResults && (
                  <div className="bg-muted/10 rounded p-2 text-xs">
                    <div className="font-medium mb-2">Tool Execution Results:</div>
                    {toolResults.map((tool, index) => (
                      <div key={index} className="space-y-2">
                        {/* Tool results content as before... */}
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Post-processing section */}
                <div className="bg-muted/10 rounded p-2 text-xs">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium">Post-Processing:</div>
                    <div className="text-[10px]">
                      {message.metadata?.processing?.postProcessed ? "Enabled" : "Disabled"}
                    </div>
                  </div>
                  
                  {message.metadata?.processing?.postProcessed && (
                    <>
                      <div className="text-[10px] text-muted-foreground mb-1">
                        <span className="bg-muted/30 px-1 py-0.5 rounded">GPT-4o</span> processed the output with instructions
                      </div>
                      
                      <div className="w-full p-1 text-xs border rounded-md bg-muted/20 mb-2 min-h-[60px]">
                        {postProcessingInstructions || "No post-processing instructions available"}
                      </div>
                      
                      <div className="mt-2">
                        <div className="text-[11px] font-medium mb-1">Post-Processed Result:</div>
                        <div className="whitespace-pre-wrap bg-muted/20 p-1 rounded">
                          {displayedMessage}
                        </div>
                      </div>
                    </>
                  )}
                </div>
                
                {/* Final response */}
                <div className="bg-muted/10 rounded p-2 text-xs">
                  <div className="font-medium mb-1">Final Bot Response:</div>
                  <div className="whitespace-pre-wrap">
                    {displayedMessage}
                  </div>
                </div>
                
                {/* Debug metadata if enabled */}
                {showDebugInfo && message.metadata && (
                  <div className="mt-2">
                    <DebugInfo metadata={message.metadata} />
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Input Content Modal */}
      {showInputModal && selectedInputContent && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="relative bg-background rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="absolute top-2 right-2">
              <button
                onClick={handleCloseInputModal}
                className="p-1 rounded-full hover:bg-muted text-muted-foreground"
                aria-label="Close modal"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            
            <div className="p-4">
              <h3 className="text-lg font-medium mb-2">Input Content</h3>
              <div className="bg-muted/10 p-3 rounded-md max-h-[70vh] overflow-y-auto">
                <pre className="text-xs whitespace-pre-wrap font-mono">{selectedInputContent}</pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 