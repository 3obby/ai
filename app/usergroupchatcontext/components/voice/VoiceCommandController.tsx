'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useGroupChatContext } from '../../context/GroupChatContext';
import { useBotRegistry } from '../../context/BotRegistryProvider';
import voiceActivityService from '../../services/livekit/voice-activity-service';
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

  // Initialize speech recognition
  useEffect(() => {
    // Check if browser supports speech recognition
    if (!('SpeechRecognition' in window) && !('webkitSpeechRecognition' in window)) {
      console.error('Speech recognition not supported in this browser');
      return;
    }

    // Initialize speech recognition
    const SpeechRecognitionConstructor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognitionConstructor) {
      speechRecognition.current = new SpeechRecognitionConstructor();
      if (speechRecognition.current) {
        speechRecognition.current.continuous = true;
        speechRecognition.current.interimResults = true;
        
        // Setup speech recognition event handlers
        speechRecognition.current.onresult = (event: any) => {
          const lastResultIndex = event.results.length - 1;
          const transcript = event.results[lastResultIndex][0].transcript.trim().toLowerCase();
          setTranscript(transcript);
          
          // Check if the transcript includes the command prefix
          if (transcript.includes(commandPrefix.toLowerCase())) {
            // If we find a command, process it
            const commandEvent = parseCommand(transcript);
            if (commandEvent && commandEvent.confidence >= confidenceThreshold) {
              setRecognizedCommand(commandEvent);
              executeCommand(commandEvent.command);
            }
          }
        };
        
        speechRecognition.current.onend = () => {
          if (isListening && speechRecognition.current) {
            speechRecognition.current.start();
          }
        };
        
        speechRecognition.current.onerror = (event: any) => {
          console.error('Speech recognition error', event.error);
          setIsListening(false);
        };
      }
    } else {
      console.error('Speech recognition constructor not available');
    }
    
    return () => {
      if (speechRecognition.current) {
        speechRecognition.current.stop();
      }
    };
  }, [commandPrefix, confidenceThreshold, isListening]);

  // Toggle listening state
  useEffect(() => {
    if (enabled && isListening && speechRecognition.current) {
      speechRecognition.current.start();
    } else if (speechRecognition.current) {
      speechRecognition.current.stop();
    }
  }, [enabled, isListening]);
  
  // Start listening when voice activity is detected
  useEffect(() => {
    const handleVoiceActivity = (state: { isSpeaking: boolean, level: number }) => {
      if (enabled && state.isSpeaking && !isListening) {
        setIsListening(true);
      }
    };
    
    // Register for voice activity
    voiceActivityService.onVoiceActivity(handleVoiceActivity);
    
    return () => {
      voiceActivityService.offVoiceActivity(handleVoiceActivity);
    };
  }, [enabled, isListening]);
  
  /**
   * Parse a transcript to identify commands
   */
  const parseCommand = (transcript: string): VoiceCommandEvent | null => {
    // Extract the command part after the prefix
    const prefixIndex = transcript.indexOf(commandPrefix.toLowerCase());
    if (prefixIndex === -1) return null;
    
    const commandText = transcript.slice(prefixIndex + commandPrefix.length).trim();
    if (!commandText) return null;
    
    // Check for matching commands
    let bestMatch: { command: VoiceCommand, confidence: number } | null = null;
    
    for (const command of commands()) {
      for (const keyword of command.keywords) {
        // Calculate similarity score
        const similarity = calculateSimilarity(commandText, keyword);
        
        if (similarity > 0.6 && (!bestMatch || similarity > bestMatch.confidence)) {
          bestMatch = {
            command,
            confidence: similarity
          };
        }
      }
    }
    
    if (bestMatch) {
      return {
        command: bestMatch.command.name,
        confidence: bestMatch.confidence,
        transcript: commandText
      };
    }
    
    return null;
  };
  
  /**
   * Calculate similarity between two strings (simple implementation)
   */
  const calculateSimilarity = (str1: string, str2: string): number => {
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();
    
    // Check if the command string contains the entire keyword
    if (s1.includes(s2)) {
      return 0.9;  // High confidence if exact keyword is found
    }
    
    // Check if the command string contains partial keyword
    const words1 = s1.split(' ');
    const words2 = s2.split(' ');
    
    // Count matching words
    let matchCount = 0;
    for (const word2 of words2) {
      if (words1.some(w => w === word2 || w.includes(word2) || word2.includes(w))) {
        matchCount++;
      }
    }
    
    // Calculate similarity based on ratio of matching words
    return matchCount / words2.length;
  };
  
  /**
   * Execute a voice command
   */
  const executeCommand = (commandName: string) => {
    const command = commands().find(c => c.name === commandName);
    if (command) {
      setActiveCommand(commandName);
      command.action();
      
      // Reset after a short delay
      setTimeout(() => {
        setActiveCommand(null);
        setRecognizedCommand(null);
      }, 2000);
    }
  };
  
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