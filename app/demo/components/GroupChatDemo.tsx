'use client';

import { useEffect, useState, useRef } from "react";
import { Button } from "@/app/shared/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/app/shared/components/ui/card";
import { Settings, MessageCircle, Bot, ChevronLeft, AlertCircle } from "lucide-react";
import { useToast } from "@/app/shared/hooks/use-toast";
import { Badge } from "@/app/shared/components/ui/badge";
import { nanoid } from "nanoid";

// Import our types and services
import { Message, Companion } from "../types/companions";
import { PRE_CONFIGURED_COMPANIONS } from "../services/companions-service";
import WebRTCTranscriptionService, { WhisperTranscriptionResult } from "../services/webrtc-transcription-service";
import * as whisperService from "../services/whisper-service";
import { DEFAULT_SETTINGS, DemoSettings } from "../types/settings";

// Import our modular components
import ChatContainer from "./chat/ChatContainer";
import SettingsModal from "./settings/SettingsModal";
import ChatMessage from "./ChatMessage";
import CompanionSettingsModal from "./CompanionSettingsModal";

export default function GroupChatDemo() {
  // State for chat interface
  const [groupChatId, setGroupChatId] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [typingCompanions, setTypingCompanions] = useState<string[]>([]);
  
  // State for settings
  const [companions, setCompanions] = useState<Companion[]>(PRE_CONFIGURED_COMPANIONS);
  const [responseSpeed, setResponseSpeed] = useState(5);
  const [allRespond, setAllRespond] = useState(false);
  
  // New state variables for tool calling and voice
  const [isToolCallingEnabled, setIsToolCallingEnabled] = useState<boolean>(true);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [recorder, setRecorder] = useState<MediaRecorder | null>(null);
  
  // Audio streaming state
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [isConnectingWebRTC, setIsConnectingWebRTC] = useState<boolean>(false);
  const [streamingAudioChunks, setStreamingAudioChunks] = useState<Blob[]>([]);
  const [streamingSessionId, setStreamingSessionId] = useState<string | null>(null);
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  
  // Reference to track real-time transcription service
  const [transcriptionService, setTranscriptionService] = useState<ReturnType<typeof WebRTCTranscriptionService.getInstance> | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const chunkIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const { toast } = useToast();
  
  // Add state for tracking the active companion
  const [activeCompanionId, setActiveCompanionId] = useState<string | null>(null);
  
  // Add state for local audio stream
  const [localAudioStream, setLocalAudioStream] = useState<MediaStream | null>(null);
  
  // Settings modal state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // Companion settings modal state
  const [selectedCompanionId, setSelectedCompanionId] = useState<string | null>(null);
  const [isCompanionSettingsOpen, setIsCompanionSettingsOpen] = useState(false);
  
  // Add state for tracking transcription details
  const [currentTranscription, setCurrentTranscription] = useState<WhisperTranscriptionResult | null>(null);
  const [transcriptionSegments, setTranscriptionSegments] = useState<string[]>([]);
  
  // Add state for the Brave Search API key
  const [braveSearchApiKey, setBraveSearchApiKey] = useState<string>(process.env.NEXT_PUBLIC_BRAVE_BASE_AI || '');
  
  // Update the settings state to include the braveSearchApiKey
  const [settings, setSettings] = useState<DemoSettings>({
    ...DEFAULT_SETTINGS,
    ai: {
      ...DEFAULT_SETTINGS.ai,
      responseSpeed,
      allRespond
    },
    toolCalling: {
      ...DEFAULT_SETTINGS.toolCalling,
      enabled: true,
      braveSearchApiKey: process.env.NEXT_PUBLIC_BRAVE_BASE_AI || '' // Initialize with env var if available
    },
    voiceChat: {
      ...DEFAULT_SETTINGS.voiceChat
    }
  });
  
  // Check for URL parameter with Brave Search API key on component mount
  useEffect(() => {
    // Check for URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const urlApiKey = urlParams.get('BRAVE_BASE_AI');
    
    if (urlApiKey) {
      console.log('Using Brave Search API key from URL parameter');
      setBraveSearchApiKey(urlApiKey);
      updateToolCallingSettings({ braveSearchApiKey: urlApiKey });
    } else {
      // Check localStorage for previously saved key
      const savedApiKey = localStorage.getItem('BRAVE_BASE_AI');
      if (savedApiKey) {
        console.log('Using Brave Search API key from localStorage');
        setBraveSearchApiKey(savedApiKey);
        updateToolCallingSettings({ braveSearchApiKey: savedApiKey });
      }
    }
  }, []);
  
  // Initialize the chat
  useEffect(() => {
    const initializeChat = async () => {
      try {
        setIsLoading(true);

        // In a real implementation, we would call the API to create a new group chat
        // For demo purposes, we'll use a timeout to simulate the API call
        setTimeout(() => {
          setGroupChatId("demo-group-chat-id");
          setIsLoading(false);
          
          // Add welcome message
          setMessages([
            {
              id: `system-welcome-${Date.now()}`,
              content: "Welcome to the AI group chat demo! Ask a question and the AIs will respond based on their unique personalities and expertise.",
              senderId: "system",
              senderName: "System",
              senderAvatar: "/images/system-icon.png",
              timestamp: new Date(),
              isUser: false
            }
          ]);
          
          // Initialize default voice config for each companion
          const companionsWithVoice = companions.map(companion => ({
            ...companion,
            voiceConfig: companion.voiceConfig || {
              voice: 'sage', 
              vadMode: 'auto',
              modality: 'both'
            }
          }));
          
          setCompanions(companionsWithVoice);
        }, 1500);
      } catch (error) {
        console.error("Failed to initialize chat:", error);
        toast({
          title: "Failed to initialize chat",
          description: "Could not create the demo chat. Please try again.",
          variant: "destructive"
        });
        setIsLoading(false);
      }
    };

    initializeChat();
  }, []);

  // Initialize the transcription service
  useEffect(() => {
    // Get the singleton instance of the transcription service
    const service = WebRTCTranscriptionService.getInstance();
    setTranscriptionService(service);
    
    // Set up listeners for transcription updates
    const unsubscribeUpdates = service.subscribeToUpdates((text, result) => {
      console.log(`[DEBUG-UI] 🎯 Transcription update received: "${text}"`);
      
      // Skip empty updates
      if (!text) {
        console.log('[DEBUG-UI] Empty transcript received, skipping update');
        return;
      }
      
      // Update the interim transcript
      setInterimTranscript(prev => {
        if (prev !== text) {
          console.log(`[DEBUG-UI] ✅ Updated interimTranscript from "${prev}" to "${text}"`);
        }
        return text;
      });
      
      // Store the full transcription result if available
      if (result) {
        console.log('[DEBUG-UI] Received WhisperTranscriptionResult:', result);
        setCurrentTranscription(result);
        
        // Track segments for potential highlighting/visualization
        if (result.segments && result.segments.length > 0) {
          setTranscriptionSegments(result.segments.map(segment => segment.text));
          console.log('[DEBUG-UI] Set transcription segments:', result.segments.map(segment => segment.text));
        }
      }
      
      // If text is non-empty, update or create a streaming message
      if (text.trim()) {
        console.log('[DEBUG-UI] Creating/updating streaming message with text:', text);
        
        // Create a unique ID for the streaming message
        const streamingMessageId = 'streaming-transcript';
        
        // Check if a streaming message already exists
        setMessages(prev => {
          console.log('[DEBUG-UI] Current messages count before update:', prev.length);
          const existingStreamingMessageIndex = prev.findIndex(msg => msg.id === streamingMessageId);
          
          const updatedMessages = [...prev];
          if (existingStreamingMessageIndex >= 0) {
            // Update the existing streaming message
            console.log('[DEBUG-UI] Updating existing streaming message at index:', existingStreamingMessageIndex);
            updatedMessages[existingStreamingMessageIndex] = {
              ...updatedMessages[existingStreamingMessageIndex],
              content: text,
              // Add additional metadata if available
              metadata: result ? {
                duration: result.duration,
                language: result.language,
                segmentCount: result.segments?.length || 0,
                wordCount: result.words?.length || 0,
                transcriptionSource: result.segments?.length ? 'whisper-api' as const : 'realtime-api' as const,
                transcriptionType: 'user-audio' as const // Identify this as user audio transcription
              } : undefined
            };
            console.log('[DEBUG-UI] Updated message content:', updatedMessages[existingStreamingMessageIndex].content);
          } else {
            // Create a new streaming message
            console.log('[DEBUG-UI] 🔶 Creating new streaming message with text:', text);
            const newMessage = {
              id: streamingMessageId,
              content: text,
              senderId: "user",
              senderName: "You",
              senderAvatar: "/images/user-icon.png",
              timestamp: new Date(),
              isUser: true,
              isInterim: true,
              // Add additional metadata if available
              metadata: result ? {
                duration: result.duration,
                language: result.language,
                segmentCount: result.segments?.length || 0,
                wordCount: result.words?.length || 0,
                transcriptionSource: result.segments?.length ? 'whisper-api' as const : 'realtime-api' as const,
                transcriptionType: 'user-audio' as const // Identify this as user audio transcription
              } : undefined
            };
            console.log('[DEBUG-UI] New streaming message created with ID:', newMessage.id);
            updatedMessages.push(newMessage);
          }
          
          console.log('[DEBUG-UI] Returning updated messages array with length:', updatedMessages.length);
          return updatedMessages;
        });
      }
    });
    
    // Set up listeners for connection status changes
    const unsubscribeStatus = service.subscribeToConnectionStatus((status, error) => {
      if (status === 'error') {
        toast({
          title: "Transcription Error",
          description: error || "An error occurred with the transcription service",
          variant: "destructive"
        });
        setIsStreaming(false);
        setIsConnectingWebRTC(false);
      } else if (status === 'connected') {
        setIsStreaming(true);
        setIsConnectingWebRTC(false);
      } else if (status === 'disconnected') {
        setIsStreaming(false);
        setIsConnectingWebRTC(false);
      } else if (status === 'connecting') {
        setIsConnectingWebRTC(true);
      }
    });
    
    // Set up listeners for AI responses
    const unsubscribeAIResponses = service.subscribeToAIResponses((text, isFinal) => {
      if (text && activeCompanionId) {
        const activeCompanion = companions.find(c => c.id === activeCompanionId);
        
        if (activeCompanion) {
          // Create a unique ID for the AI response message
          const aiResponseId = isFinal 
            ? `${activeCompanion.id}-ai-voice-${Date.now()}` 
            : `${activeCompanion.id}-ai-voice-interim`;
          
          // Create the AI message
          const aiMessage: Message = {
            id: aiResponseId,
            content: text,
            senderId: activeCompanion.id,
            senderName: activeCompanion.name,
            senderAvatar: activeCompanion.imageUrl,
            timestamp: new Date(),
            isUser: false,
            isInterim: !isFinal
          };
          
          // Update or add the message
          setMessages(prev => {
            // If this is an interim message, check if it already exists
            if (!isFinal) {
              const existingMessageIndex = prev.findIndex(msg => msg.id === aiResponseId);
              
              if (existingMessageIndex >= 0) {
                // Update the existing message
                const updatedMessages = [...prev];
                updatedMessages[existingMessageIndex] = aiMessage;
                return updatedMessages;
              }
            } else {
              // If this is a final message, remove any interim message from this companion
              prev = prev.filter(msg => msg.id !== `${activeCompanion.id}-ai-voice-interim`);
            }
            
            // Add the new message
            return [...prev, aiMessage];
          });
        }
      }
    });
    
    // Clean up function to run when component unmounts
    return () => {
      // Unsubscribe from all listeners
      unsubscribeUpdates();
      unsubscribeStatus();
      unsubscribeAIResponses();
      
      // Stop any active transcription
      if (service.isCurrentlyConnected()) {
        service.stopTranscription();
      }
    };
  }, [companions, activeCompanionId]);

  // Function to toggle tool calling mode
  const toggleToolCalling = () => {
    const newValue = !isToolCallingEnabled;
    setIsToolCallingEnabled(newValue);
    
    // Also update the settings object to keep them in sync
    updateToolCallingSettings({ enabled: newValue });
    
    // Notify the user about the mode change
    toast({
      title: newValue ? "Tool calling capability enabled" : "Tool calling capability disabled",
      description: newValue 
        ? "You can now enable tool calling for individual companions in their settings." 
        : "Tool calling has been disabled globally for all companions.",
    });
  };
  
  // Function to update tool calling settings
  const updateToolCallingSettings = (toolSettings: Partial<typeof settings.toolCalling>) => {
    setSettings(prev => ({
      ...prev,
      toolCalling: {
        ...prev.toolCalling,
        ...toolSettings
      }
    }));
    
    // Update the Brave API key state if it's provided
    if (toolSettings.braveSearchApiKey !== undefined) {
      setBraveSearchApiKey(toolSettings.braveSearchApiKey);
      
      // Store in localStorage for persistence
      if (toolSettings.braveSearchApiKey) {
        localStorage.setItem('BRAVE_BASE_AI', toolSettings.braveSearchApiKey);
      }
    }
  };
  
  // Function to handle starting voice recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setAudioBlob(blob);
        
        // Process the recording
        processAudioRecording(blob);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };
      
      // Start recording
      mediaRecorder.start();
      setRecorder(mediaRecorder);
      setIsRecording(true);
      
      toast({
        title: "Recording started",
        description: "Speak clearly. Recording will automatically stop after 10 seconds.",
      });
      
      // Automatically stop recording after 10 seconds
      setTimeout(() => {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
          setIsRecording(false);
          setRecorder(null);
        }
      }, 10000);
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: "Recording failed",
        description: "Could not access microphone. Please check permissions.",
        variant: "destructive"
      });
    }
  };
  
  // Function to handle stopping voice recording
  const stopRecording = () => {
    if (recorder && recorder.state === 'recording') {
      recorder.stop();
      setIsRecording(false);
      setRecorder(null);
    }
  };
  
  // Function to process audio recording with Whisper API
  const processAudioRecording = async (blob: Blob) => {
    try {
      setIsSending(true);
      const { transcription, error, details } = await whisperService.transcribeAudio(blob);
      
      if (error || !transcription) {
        throw new Error(error || 'Failed to transcribe audio');
      }
      
      // Save the detailed transcription result if available
      if (details) {
        setCurrentTranscription({
          text: details.text,
          duration: details.duration,
          language: details.language,
          segments: details.segments,
          words: details.words,
          task: details.task
        });
        
        // Track segments for potential highlighting/visualization
        if (details.segments && details.segments.length > 0) {
          setTranscriptionSegments(details.segments.map(segment => segment.text));
        }
      }
      
      // Create a user message from the transcription
      const userMessage: Message = {
        id: nanoid(),
        content: transcription,
        senderId: 'user',
        senderName: 'You',
        senderAvatar: '/images/user-icon.png',
        timestamp: new Date(),
        isUser: true,
        // Include detailed transcription metadata if available
        metadata: details ? {
          duration: details.duration,
          language: details.language,
          segments: details.segments,
          words: details.words,
          transcriptionSource: 'whisper-api'
        } : undefined
      };
      
      // Remove any streaming transcript message
      setMessages(prev => prev.filter(msg => msg.id !== 'streaming-transcript'));
      
      // Add the final user message
      setMessages(prev => [...prev, userMessage]);
      
      // Trigger companion responses
      await handleCompanionResponses(userMessage);
      
      setIsSending(false);
    } catch (error) {
      console.error('Error processing audio recording:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : String(error),
        variant: 'destructive'
      });
      setIsSending(false);
    }
  };

  // Send a message
  const sendMessage = async () => {
    if (!inputValue.trim() || isSending) return;
    
    setIsSending(true);
    
    try {
      // Create the user message
      const userMessage: Message = {
        id: `user-${Date.now()}`,
        content: inputValue,
        senderId: "user",
        senderName: "You",
        senderAvatar: "/images/user-icon.png",
        timestamp: new Date(),
        isUser: true
      };
      
      // Add to messages
      setMessages(prev => [...prev, userMessage]);
      
      // If voice mode is active, send the message through the WebRTC service
      if (isStreaming && transcriptionService) {
        await transcriptionService.sendTextMessage(inputValue);
      }
      
      setInputValue('');
      
      // Generate responses from companions
      await handleCompanionResponses(userMessage);
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };

  // Handle companion responses
  const handleCompanionResponses = async (userMessage: Message) => {
    // Determine which companions should respond
    const respondingCompanions = allRespond 
      ? companions 
      : [getRandomCompanion()];
    
    // Create a list of companions that are typing
    setTypingCompanions(respondingCompanions.map(c => c.id));
    
    // Prepare chat history for API
    const chatHistory = messages.slice(-10).map(msg => ({
      role: msg.isUser ? 'user' as const : 'assistant' as const,
      content: msg.content,
      name: !msg.isUser ? msg.senderName : undefined
    }));
    
    // Add the new user message to history
    chatHistory.push({
      role: 'user' as const,
      content: userMessage.content,
      name: undefined
    });
    
    // Generate responses sequentially with delays based on effort and response speed
    for (const companion of respondingCompanions) {
      try {
        // Calculate response time based on companion's effort and global response speed
        // Higher effort + lower speed = longer response time
        const baseDelay = 1000; // 1 second base
        const effortFactor = companion.effort * 300; // 300ms per effort point
        const speedFactor = (11 - responseSpeed) * 200; // 200ms per inverse speed point
        
        const responseDelay = baseDelay + effortFactor - speedFactor;
        
        // Wait for the calculated delay to simulate thinking
        await new Promise(resolve => setTimeout(resolve, responseDelay));
        
        // Call the appropriate API based on whether tool calling is enabled
        let response;
        
        // Check if tool calling is enabled for this companion and in settings
        const toolCallingActive = settings.toolCalling.enabled && (companion.toolCallingEnabled ?? false);
        
        if (toolCallingActive) {
          console.log(`Tool calling is enabled for companion ${companion.name}, using companion-tool-response endpoint`);
          console.log('Brave Search API key available:', !!settings.toolCalling.braveSearchApiKey);
          
          // Get the API key from settings
          const apiKeyToUse = settings.toolCalling.braveSearchApiKey || braveSearchApiKey;
          
          // Make sure brave_search is in the allowed tools list
          const currentAllowedTools = settings.toolCalling.allowedTools || [];
          if (!currentAllowedTools.includes('brave_search')) {
            updateToolCallingSettings({ 
              allowedTools: [...currentAllowedTools, 'brave_search'] 
            });
          }
          
          // Use the tool-enabled endpoint
          response = await fetch('/api/demo/companion-tool-response', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              companion,
              userMessage: userMessage.messageType === 'audio' 
                ? { type: 'audio', transcription: userMessage.content }
                : userMessage.content,
              chatHistory,
              braveApiKey: apiKeyToUse, // Pass the Brave Search API key
              alwaysUseTool: true // Always use the tool in responses
            }),
          });
        } else {
          // Use the regular endpoint
          response = await fetch('/api/demo/companion-response', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              companion,
              userMessage: userMessage.content,
              chatHistory
            }),
          });
        }
        
        if (!response.ok) {
          throw new Error('Failed to generate response');
        }
        
        const responseData = await response.json();
        
        // Add the companion's response to messages
        const companionMessage: Message = {
          id: `${companion.id}-${Date.now()}`,
          content: responseData.response,
          senderId: companion.id,
          senderName: companion.name,
          senderAvatar: companion.imageUrl,
          timestamp: new Date(),
          isUser: false,
          debugInfo: responseData.debugInfo,
          messageType: companion.toolCallingEnabled && responseData.debugInfo?.toolsCalled ? 'tool_call' : 'text',
          toolCalls: responseData.debugInfo?.toolsCalled
        };
        
        setMessages(prev => [...prev, companionMessage]);
        
        // Remove companion from typing list
        setTypingCompanions(prev => prev.filter(id => id !== companion.id));
      } catch (error) {
        console.error(`Error getting response from ${companion.name}:`, error);
        
        // Remove companion from typing list
        setTypingCompanions(prev => prev.filter(id => id !== companion.id));
        
        // Add error message
        const errorMessage: Message = {
          id: `error-${companion.id}-${Date.now()}`,
          content: `Sorry, I'm having trouble responding right now.`,
          senderId: companion.id,
          senderName: companion.name,
          senderAvatar: companion.imageUrl,
          timestamp: new Date(),
          isUser: false
        };
        
        setMessages(prev => [...prev, errorMessage]);
      }
    }
  };

  // Update a companion's configuration
  const updateCompanionConfig = (companionId: string, config: Partial<Companion>) => {
    setCompanions(prev => prev.map(companion => {
      if (companion.id === companionId) {
        return { ...companion, ...config };
      }
      return companion;
    }));
  };

  // Reset companions configuration to default
  const resetConfiguration = () => {
    setCompanions(PRE_CONFIGURED_COMPANIONS);
    setResponseSpeed(5);
    setAllRespond(false);
    
    toast({
      title: "Settings reset",
      description: "All companions have been reset to their default configurations.",
    });
  };

  // Get a random companion
  const getRandomCompanion = () => {
    return companions[Math.floor(Math.random() * companions.length)];
  };

  // Restart the chat
  const restartChat = () => {
    setMessages([
      {
        id: `system-restart-${Date.now()}`,
        content: "Chat has been restarted. Previous messages are cleared.",
        senderId: "system",
        senderName: "System",
        senderAvatar: "/images/system-icon.png",
        timestamp: new Date(),
        isUser: false
      }
    ]);
    
    toast({
      title: "Chat restarted",
      description: "The conversation has been reset.",
    });
  };

  // Handle Enter key in input
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Start audio streaming using the realtime transcription service
  const startAudioStreaming = async () => {
    try {
      if (isStreaming) {
        console.log("Already streaming, ignoring request");
        return;
      }
      
      console.log("Initializing audio streaming...");
      setIsConnectingWebRTC(true);
      setInterimTranscript('');
      
      // Get or initialize the transcription service
      const service = WebRTCTranscriptionService.getInstance();
      setTranscriptionService(service);
      
      // Subscribe to status updates
      const unsubscribeStatus = service.subscribeToConnectionStatus((status, message) => {
        console.log(`Transcription service status: ${status}${message ? ` - ${message}` : ''}`);
        
        if (status === 'error') {
          toast({
            title: "Transcription Error",
            description: message || "An error occurred with transcription",
            variant: "destructive"
          });
          stopAudioStreaming();
        }
      });
      
      // Subscribe to text updates
      const unsubscribeUpdates = service.subscribeToUpdates((text) => {
        if (text && text !== interimTranscript) {
          setInterimTranscript(text);
        }
      });

      // Get voice settings from the active companion (if any)
      const activeCompanion = companions.find(c => c.id === activeCompanionId) || companions[0];
      
      if (activeCompanion?.voiceConfig) {
        // Create a complete voice configuration with all supported settings
        const voiceConfig = {
          // Basic settings
          voice: activeCompanion.voiceConfig.voice || 'sage',
          vadMode: activeCompanion.voiceConfig.vadMode || 'auto',
          modality: activeCompanion.voiceConfig.modality || 'both',
          
          // Advanced settings
          temperature: activeCompanion.voiceConfig.temperature,
          maxResponseTokens: activeCompanion.voiceConfig.maxResponseTokens,
          audioFormat: activeCompanion.voiceConfig.audioFormat,
          
          // Turn detection settings
          turnDetection: activeCompanion.voiceConfig.turnDetection
            ? {
                threshold: activeCompanion.voiceConfig.turnDetection.threshold,
                prefixPaddingMs: activeCompanion.voiceConfig.turnDetection.prefixPaddingMs,
                silenceDurationMs: activeCompanion.voiceConfig.turnDetection.silenceDurationMs,
                createResponse: activeCompanion.voiceConfig.turnDetection.createResponse
              }
            : undefined
        };
        
        // Set the voice configuration in the transcription service
        service.setVoiceConfig(voiceConfig);
        console.log(`Using voice config from companion ${activeCompanion.name}:`, voiceConfig);
        
        // Set the active companion ID to indicate which bot we're talking to
        setActiveCompanionId(activeCompanion.id);
      }
      
      // Start the transcription service
      const success = await service.startTranscription();
      
      if (!success) {
        console.error("Failed to start transcription service");
        setIsConnectingWebRTC(false);
        stopAudioStreaming();
        return;
      }
      
      // Set up the audio media stream for recording
      const audioStream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      setLocalAudioStream(audioStream);
      
      console.log("Audio streaming started successfully");
    } catch (error) {
      console.error("Error starting audio stream:", error);
      toast({
        title: "Microphone Error",
        description: error instanceof Error ? error.message : "Could not access your microphone",
        variant: "destructive"
      });
      setIsConnectingWebRTC(false);
      stopAudioStreaming();
    }
  };
  
  // Stop audio streaming using the realtime transcription service
  const stopAudioStreaming = async () => {
    if (!transcriptionService) return;
    
    try {
      // Stop the transcription service
      await transcriptionService.stopTranscription();
      
      // Commit any streaming transcription as a finalized message
      commitStreamingTranscription();
      
      // If we have a final transcript, trigger companion responses
      if (interimTranscript.trim()) {
        const userMessage: Message = {
          id: nanoid(),
          content: interimTranscript,
          senderId: 'user',
          senderName: 'You',
          senderAvatar: '/images/user-icon.png',
          timestamp: new Date(),
          isUser: true
        };
        
        // Trigger companion responses
        await handleCompanionResponses(userMessage);
      }
      
      // Reset state
      mediaStreamRef.current = null;
      setInterimTranscript('');
      setIsStreaming(false);
      setIsConnectingWebRTC(false);
    } catch (error) {
      console.error('Error stopping audio streaming:', error);
      setIsStreaming(false);
      setIsConnectingWebRTC(false);
    }
  };
  
  // Modified function for mic button click
  const handleMicButtonClick = () => {
    if (isRecording) {
      // Stop regular recording
      stopRecording();
    } else if (isStreaming) {
      // Stop real-time streaming
      stopAudioStreaming();
    } else {
      // Start real-time streaming
      startAudioStreaming();
    }
  };

  // Modified function to commit the streaming transcription
  const commitStreamingTranscription = () => {
    if (!interimTranscript.trim()) return;
    
    // Remove the streaming transcript
    setMessages(prev => {
      const messages = prev.filter(msg => msg.id !== 'streaming-transcript');
      
      // Create finalized message with the full transcription data
      const finalizedMessage: Message = {
        id: nanoid(),
        content: interimTranscript,
        senderId: 'user',
        senderName: 'You',
        senderAvatar: '/images/user-icon.png',
        timestamp: new Date(),
        isUser: true,
        // Include detailed transcription metadata if available
        metadata: currentTranscription ? {
          duration: currentTranscription.duration,
          language: currentTranscription.language,
          segments: currentTranscription.segments,
          words: currentTranscription.words,
          transcriptionSource: currentTranscription.segments ? 'whisper-api' as const : 'realtime-api' as const,
          transcriptionType: 'user-audio' as const // Identify this as user audio transcription
        } : undefined
      };
      
      return [...messages, finalizedMessage];
    });
    
    // Reset interim state
    setInterimTranscript('');
    setCurrentTranscription(null);
    setTranscriptionSegments([]);
  };

  // Function to handle companion avatar click
  const handleCompanionClick = (companionId: string) => {
    setSelectedCompanionId(companionId);
    setIsCompanionSettingsOpen(true);
  };

  return (
    <div className="flex flex-col h-full w-full bg-background">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.history.back()}
            className="p-2 hover:bg-muted rounded-full"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-semibold">AI Group Chat</h1>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => setIsSettingsOpen(true)}
            variant="outline"
            className="flex items-center gap-1"
          >
            {isStreaming ? (
              <div className="flex items-center justify-center w-full">
                <AlertCircle className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Settings</span>
              </div>
            ) : (
              <div className="flex items-center justify-center w-full">
                <Settings className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Settings</span>
              </div>
            )}
          </Button>
          
          {/* Show active voice chat indicator */}
          {(isStreaming || isConnectingWebRTC) && (
            <div className="flex items-center gap-1 px-2 py-1 bg-destructive/10 text-destructive rounded-md text-xs animate-pulse">
              <span className="h-2 w-2 rounded-full bg-destructive"></span>
              <span>Live Voice</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 p-4 pt-0 overflow-hidden flex flex-col">
        <ChatContainer 
          messages={messages}
          inputValue={inputValue}
          setInputValue={setInputValue}
          isLoading={isLoading}
          isSending={isSending}
          isRecording={isRecording}
          isStreaming={isStreaming}
          isConnectingWebRTC={isConnectingWebRTC}
          interimTranscript={interimTranscript}
          typingCompanions={typingCompanions}
          companions={companions}
          mediaStreamRef={mediaStreamRef}
          handleKeyDown={handleKeyDown}
          sendMessage={sendMessage}
          handleMicButtonClick={handleMicButtonClick}
          onCompanionClick={handleCompanionClick}
        />
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
        resetConfiguration={resetConfiguration}
        restartChat={restartChat}
        responseSpeed={responseSpeed}
        setResponseSpeed={setResponseSpeed}
        allRespond={allRespond}
        setAllRespond={setAllRespond}
        isToolCallingEnabled={isToolCallingEnabled}
        toggleToolCalling={toggleToolCalling}
        activeCompanionId={activeCompanionId}
        setActiveCompanionId={setActiveCompanionId}
        isStreaming={isStreaming}
        handleStopStream={stopAudioStreaming}
        toolCallingSettings={settings.toolCalling}
        updateToolCallingSettings={updateToolCallingSettings}
      />

      {/* Companion Settings Modal */}
      {selectedCompanionId && (
        <CompanionSettingsModal
          isOpen={isCompanionSettingsOpen}
          onOpenChange={setIsCompanionSettingsOpen}
          companion={companions.find(c => c.id === selectedCompanionId)!}
          updateCompanionConfig={updateCompanionConfig}
          globalVoiceSettings={DEFAULT_SETTINGS.voiceChat}
          globalAISettings={DEFAULT_SETTINGS.ai}
        />
      )}
    </div>
  );
} 