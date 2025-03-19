'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useGroupChatContext } from '../../context/GroupChatContext';
import { useBotRegistry } from '../../context/BotRegistryProvider';
import voiceActivityService from '../../services/livekit/voice-activity-service';
import toolDetectionService from '../../services/livekit/tool-detection-service';
import { ToolDetectionResult } from '../../services/livekit';
import { Mic, Volume2, Settings, ZoomIn, ZoomOut, Sun, Moon, XCircle } from 'lucide-react';

// Add WebKit prefixed interface
interface WebkitSpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: (event: any) => void;
  onend: () => void;
  onerror: (event: any) => void;
}

// Commands that the system recognizes
interface VoiceCommand {
  name: string;
  keywords: string[];
  description: string;
  action: () => void;
  indicator: React.ReactNode;
}

// Voice command events
export type VoiceCommandEvent = {
  command: string;
  confidence: number;
  transcript: string;
};

// Voice command controller props
interface VoiceCommandControllerProps {
  enabled?: boolean;
  commandPrefix?: string;
  confidenceThreshold?: number;
  className?: string;
}

// Component for handling voice commands
export default function VoiceCommandController({
  enabled = true,
  commandPrefix = 'system',
  confidenceThreshold = 0.7,
  className = '',
}: VoiceCommandControllerProps) {
  const { state, dispatch } = useGroupChatContext();
  const botRegistry = useBotRegistry();
  const [isListening, setIsListening] = useState<boolean>(false);
  const [activeCommand, setActiveCommand] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string>('');
  const [showHelpPanel, setShowHelpPanel] = useState<boolean>(false);
  const [recognizedCommand, setRecognizedCommand] = useState<VoiceCommandEvent | null>(null);
  const speechRecognition = useRef<WebkitSpeechRecognition | null>(null);
  
  // Define voice commands
  const commands = useCallback((): VoiceCommand[] => {
    return [
      {
        name: 'toggle_voice',
        keywords: ['toggle voice', 'enable voice', 'disable voice', 'turn on voice', 'turn off voice'],
        description: 'Toggle voice input on/off',
        action: () => {
          const newSettings = {
            ...state.settings,
            ui: {
              ...state.settings.ui,
              enableVoice: !state.settings.ui.enableVoice,
            },
          };
          dispatch({ type: 'SET_SETTINGS', payload: newSettings });
        },
        indicator: <Mic className="h-4 w-4" />,
      },
      {
        name: 'start_voice_mode',
        keywords: ['start voice mode', 'voice mode', 'voice chat', 'talk to', 'voice conversation'],
        description: 'Start voice conversation with selected bot using realtime model',
        action: async () => {
          // Extract bot name from transcript if present
          let targetBotId = state.selectedBotId;
          const botMentioned = transcript.match(/(?:with|to)\s+(\w+)/i);
          
          if (botMentioned && botMentioned[1]) {
            const botName = botMentioned[1].toLowerCase();
            const matchedBot = botRegistry.state.availableBots.find(
              bot => bot.name.toLowerCase().includes(botName)
            );
            
            if (matchedBot) {
              targetBotId = matchedBot.id;
            }
          }
          
          // If no bot is selected or found in transcript, use the first active bot
          if (!targetBotId && state.settings.activeBotIds.length > 0) {
            targetBotId = state.settings.activeBotIds[0];
          }
          
          if (targetBotId) {
            try {
              // Show loading indicator
              dispatch({ type: 'SET_LOADING', isLoading: true });
              
              // Clone the bot for voice mode with realtime model
              const voiceBot = await botRegistry.cloneBotInstanceForVoice(targetBotId);
              
              if (voiceBot) {
                // Add a system message indicating voice mode is starting
                dispatch({
                  type: 'ADD_MESSAGE',
                  payload: {
                    id: `voice-mode-start-${Date.now()}`,
                    content: `Starting voice conversation with ${voiceBot.name}. You can speak now.`,
                    role: 'system',
                    sender: 'system',
                    timestamp: Date.now(),
                    type: 'text'
                  }
                });
                
                // Set the voice bot as the selected and active bot
                dispatch({ type: 'SET_SELECTED_BOT', payload: voiceBot.id });
                
                // Add to active bots if not already there
                if (!state.settings.activeBotIds.includes(voiceBot.id)) {
                  const newActiveBotIds = [...state.settings.activeBotIds, voiceBot.id];
                  dispatch({
                    type: 'SET_SETTINGS',
                    payload: { activeBotIds: newActiveBotIds }
                  });
                }
                
                // Enable voice mode in settings if not already enabled
                if (!state.settings.ui.enableVoice) {
                  dispatch({
                    type: 'SET_SETTINGS',
                    payload: {
                      ui: {
                        ...state.settings.ui,
                        enableVoice: true
                      }
                    }
                  });
                }
                
                // Start recording
                dispatch({ type: 'TOGGLE_RECORDING' });
              }
            } catch (error) {
              console.error('Error starting voice mode:', error);
              dispatch({
                type: 'ADD_MESSAGE',
                payload: {
                  id: `voice-mode-error-${Date.now()}`,
                  content: `Error starting voice mode: ${error instanceof Error ? error.message : 'Unknown error'}`,
                  role: 'system',
                  sender: 'system',
                  timestamp: Date.now(),
                  type: 'text'
                }
              });
            } finally {
              dispatch({ type: 'SET_LOADING', isLoading: false });
            }
          } else {
            // No bot available
            dispatch({
              type: 'ADD_MESSAGE',
              payload: {
                id: `voice-mode-error-${Date.now()}`,
                content: 'No bot available for voice mode. Please add a bot first.',
                role: 'system',
                sender: 'system',
                timestamp: Date.now(),
                type: 'text'
              }
            });
          }
        },
        indicator: <Volume2 className="h-4 w-4" />,
      },
      {
        name: 'toggle_dark_mode',
        keywords: ['toggle dark mode', 'toggle light mode', 'switch theme', 'dark mode', 'light mode'],
        description: 'Toggle between dark and light modes',
        action: () => {
          const newTheme = state.settings.ui.theme === 'dark' ? 'light' : 'dark';
          const newSettings = {
            ...state.settings,
            ui: {
              ...state.settings.ui,
              theme: newTheme as 'light' | 'dark' | 'system',
            },
          };
          dispatch({ type: 'SET_SETTINGS', payload: newSettings });
        },
        indicator: state.settings.ui.theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />,
      },
      {
        name: 'toggle_settings',
        keywords: ['open settings', 'close settings', 'toggle settings', 'show settings', 'hide settings'],
        description: 'Toggle settings panel',
        action: () => {
          dispatch({ type: 'TOGGLE_SETTINGS' });
        },
        indicator: <Settings className="h-4 w-4" />,
      },
      {
        name: 'clear_chat',
        keywords: ['clear chat', 'clear messages', 'delete messages', 'reset chat'],
        description: 'Clear all chat messages',
        action: () => {
          if (window.confirm('Are you sure you want to clear all messages?')) {
            dispatch({ type: 'RESET_CHAT' });
          }
        },
        indicator: <XCircle className="h-4 w-4" />,
      },
      {
        name: 'bot_select',
        keywords: ['select bot', 'choose bot', 'activate bot', 'switch to bot'],
        description: 'Select a specific bot by name',
        action: () => {
          // This is handled specially in the command parser
          // based on detected bot name in the transcript
          const botNames = botRegistry.state.availableBots.map(b => b.name.toLowerCase());
          const words = transcript.toLowerCase().split(' ');
          
          for (const name of botNames) {
            if (words.includes(name.toLowerCase())) {
              const bot = botRegistry.state.availableBots.find(
                b => b.name.toLowerCase() === name.toLowerCase()
              );
              if (bot) {
                dispatch({ type: 'SET_SELECTED_BOT', payload: bot.id });
                
                // If the bot isn't already active, activate it
                if (!state.settings.activeBotIds.includes(bot.id)) {
                  const newActiveBotIds = [...state.settings.activeBotIds, bot.id];
                  dispatch({ 
                    type: 'SET_SETTINGS', 
                    payload: { activeBotIds: newActiveBotIds }
                  });
                }
                break;
              }
            }
          }
        },
        indicator: <Mic className="h-4 w-4" />,
      },
      {
        name: 'zoom_in',
        keywords: ['zoom in', 'increase size', 'make bigger', 'larger text'],
        description: 'Increase UI zoom level',
        action: () => {
          // Implement zoom functionality
          const html = document.querySelector('html');
          if (html) {
            const currentFontSize = parseFloat(getComputedStyle(html).fontSize);
            html.style.fontSize = `${currentFontSize * 1.1}px`;
          }
        },
        indicator: <ZoomIn className="h-4 w-4" />,
      },
      {
        name: 'zoom_out',
        keywords: ['zoom out', 'decrease size', 'make smaller', 'smaller text'],
        description: 'Decrease UI zoom level',
        action: () => {
          // Implement zoom functionality
          const html = document.querySelector('html');
          if (html) {
            const currentFontSize = parseFloat(getComputedStyle(html).fontSize);
            html.style.fontSize = `${currentFontSize * 0.9}px`;
          }
        },
        indicator: <ZoomOut className="h-4 w-4" />,
      },
      {
        name: 'show_command_help',
        keywords: ['show commands', 'list commands', 'command help', 'what can I say', 'help'],
        description: 'Show available voice commands',
        action: () => {
          setShowHelpPanel(true);
        },
        indicator: <Volume2 className="h-4 w-4" />,
      },
    ];
  }, [state, dispatch, botRegistry, transcript]);

  // Calculate string similarity for fuzzy command matching
  const calculateSimilarity = useCallback((str1: string, str2: string): number => {
    if (!str1 || !str2) return 0;
    
    // Simple Levenshtein distance implementation
    const track = Array(str2.length + 1).fill(null).map(() => 
      Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i += 1) {
      track[0][i] = i;
    }
    
    for (let j = 0; j <= str2.length; j += 1) {
      track[j][0] = j;
    }
    
    for (let j = 1; j <= str2.length; j += 1) {
      for (let i = 1; i <= str1.length; i += 1) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        track[j][i] = Math.min(
          track[j][i - 1] + 1, // deletion
          track[j - 1][i] + 1, // insertion
          track[j - 1][i - 1] + indicator, // substitution
        );
      }
    }
    
    // Convert distance to similarity score (0-1)
    const maxLen = Math.max(str1.length, str2.length);
    const distance = track[str2.length][str1.length];
    return maxLen > 0 ? (maxLen - distance) / maxLen : 1;
  }, []);

  // Parse voice command from transcript
  const parseCommand = useCallback((transcript: string): VoiceCommandEvent | null => {
    if (!transcript) return null;
    
    const normalizedTranscript = transcript.toLowerCase().trim();
    
    // Extract command part after prefix
    const prefixIndex = normalizedTranscript.indexOf(commandPrefix.toLowerCase());
    if (prefixIndex === -1) return null;
    
    // Get the part after the prefix
    const commandText = normalizedTranscript.substring(prefixIndex + commandPrefix.length).trim();
    if (!commandText) return null;
    
    // Find best matching command
    let bestMatch = '';
    let bestConfidence = 0;
    
    commands().forEach(command => {
      command.keywords.forEach(keyword => {
        const similarity = calculateSimilarity(commandText, keyword.toLowerCase());
        if (similarity > bestConfidence && similarity > confidenceThreshold) {
          bestConfidence = similarity;
          bestMatch = command.name;
        }
      });
    });
    
    if (bestMatch) {
      return {
        command: bestMatch,
        confidence: bestConfidence,
        transcript: normalizedTranscript
      };
    }
    
    return null;
  }, [commands, commandPrefix, confidenceThreshold, calculateSimilarity]);

  // Execute recognized command
  const executeCommand = useCallback((commandName: string) => {
    const command = commands().find(cmd => cmd.name === commandName);
    if (command) {
      setActiveCommand(commandName);
      
      // Execute the command
      command.action();
      
      // Clear the active command after a delay
      setTimeout(() => {
        setActiveCommand(null);
      }, 2000);
    }
  }, [commands]);

  // Check if speech recognition is available
  useEffect(() => {
    if (typeof window !== 'undefined' && enabled) {
      // First check if we have tool detection service
      try {
        // Check if toolDetectionService is available with expected methods using safe type checks
        if (toolDetectionService && 
            typeof toolDetectionService === 'object' &&
            'detectToolsFromTranscript' in toolDetectionService) {
          console.log('Tool detection service available for voice commands');
          return;
        }
      } catch (error) {
        console.warn('Error checking tool detection service:', error);
      }

      // Fallback to WebkitSpeechRecognition
      const SpeechRecognition = (window as any).SpeechRecognition 
        || (window as any).webkitSpeechRecognition;
      
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        speechRecognition.current = recognition;
        
        if (speechRecognition.current) {
          speechRecognition.current.continuous = true;
          speechRecognition.current.interimResults = true;
          
          speechRecognition.current.onresult = (event: any) => {
            const lastResultIdx = event.results.length - 1;
            const transcriptText = event.results[lastResultIdx][0].transcript;
            const confidence = event.results[lastResultIdx][0].confidence;
            
            // Only process completed phrases with decent confidence
            if (confidence > 0.5) {
              setTranscript(transcriptText);
              
              // Check if this is a system command
              if (transcriptText.toLowerCase().includes(commandPrefix.toLowerCase())) {
                const command = parseCommand(transcriptText);
                if (command) {
                  setRecognizedCommand(command);
                  executeCommand(command.command);
                }
              }
            }
          };
          
          speechRecognition.current.onend = () => {
            setIsListening(false);
          };
          
          speechRecognition.current.onerror = (event: any) => {
            console.error('Voice command recognition error:', event.error);
            setIsListening(false);
          };
        }
      }
    }
  }, [enabled, commandPrefix, parseCommand, executeCommand]);

  // Monitor voice activity
  useEffect(() => {
    if (!enabled) return;
    
    const handleVoiceActivity = (state: { isSpeaking: boolean, level: number }) => {
      // If we detect activity and voice is active, check if there's a command in what was spoken
      if (state.isSpeaking) {
        // Try to identify voice commands directly from transcript
        // Instead of relying on toolDetectionService which has type issues
        if (transcript && transcript.toLowerCase().includes(commandPrefix.toLowerCase())) {
          const command = parseCommand(transcript);
          if (command && command.confidence > confidenceThreshold) {
            setRecognizedCommand(command);
            executeCommand(command.command);
          }
        }
      }
    };
    
    voiceActivityService.onVoiceActivity(handleVoiceActivity);
    
    return () => {
      voiceActivityService.offVoiceActivity(handleVoiceActivity);
    };
  }, [enabled, executeCommand, confidenceThreshold, transcript, parseCommand, commandPrefix]);
  
  // If not enabled, don't render anything
  if (!enabled) {
    return null;
  }
  
  return (
    <>
      {/* Command Indicator */}
      {activeCommand && (
        <div className="fixed top-4 right-4 bg-primary text-primary-foreground px-3 py-2 rounded-md shadow-md animate-fadeIn z-50">
          <div className="flex items-center space-x-2">
            {commands().find(c => c.name === activeCommand)?.indicator}
            <span className="text-sm font-medium">
              {commands().find(c => c.name === activeCommand)?.description}
            </span>
          </div>
        </div>
      )}
      
      {/* Transcript Display - only show when we have a transcript but no recognized command yet */}
      {transcript && !recognizedCommand && transcript.includes(commandPrefix.toLowerCase()) && (
        <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 bg-background/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-md z-50 animate-fadeIn">
          <div className="flex items-center space-x-2">
            <Mic className="h-4 w-4 text-primary animate-pulse" />
            <span className="text-sm">{transcript}</span>
          </div>
        </div>
      )}
      
      {/* Help Panel */}
      {showHelpPanel && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" 
          onClick={() => setShowHelpPanel(false)}>
          <div className="bg-background rounded-lg shadow-lg p-4 max-w-md w-full max-h-[80vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Voice Commands</h3>
              <button onClick={() => setShowHelpPanel(false)}>
                <XCircle className="h-5 w-5 text-muted-foreground hover:text-foreground" />
              </button>
            </div>
            
            <p className="text-sm text-muted-foreground mb-4">
              Say "{commandPrefix} [command]" to control the interface with your voice. 
              For example: "{commandPrefix} toggle dark mode"
            </p>
            
            <div className="space-y-2">
              {commands().map((command) => (
                <div key={command.name} className="p-2 bg-background-lighter rounded-md">
                  <div className="flex items-center space-x-2">
                    {command.indicator}
                    <span className="font-medium">{command.description}</span>
                  </div>
                  <div className="mt-1 pl-6">
                    <span className="text-xs text-muted-foreground">
                      {command.keywords.join(', ')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
} 