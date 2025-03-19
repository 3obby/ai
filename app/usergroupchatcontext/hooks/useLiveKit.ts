import { useContext, useEffect, useState, useCallback } from 'react';
import { LiveKitContext } from '../context/LiveKitProvider';
import { VoiceActivityState } from '../services/livekit/voice-activity-service';
import voiceActivityService from '../services/livekit/voice-activity-service';
import multimodalAgentService, { TranscriptionHandler } from '../services/livekit/multimodal-agent-service';

// Custom hook for using LiveKit in components
export const useLiveKit = () => {
  const context = useContext(LiveKitContext);
  
  if (!context) {
    throw new Error('useLiveKit must be used within a LiveKitProvider');
  }
  
  return context;
};

// Voice activity hook for monitoring speaking state
export const useVoiceActivity = () => {
  const [voiceActivity, setVoiceActivity] = useState<VoiceActivityState>({
    isSpeaking: false,
    level: 0,
    timestamp: Date.now(),
  });
  
  useEffect(() => {
    // Handler for voice activity updates
    const handleVoiceActivity = (state: VoiceActivityState) => {
      setVoiceActivity(state);
    };
    
    // Register for voice activity events
    voiceActivityService.onVoiceActivity(handleVoiceActivity);
    
    // Cleanup on unmount
    return () => {
      voiceActivityService.offVoiceActivity(handleVoiceActivity);
    };
  }, []);
  
  return voiceActivity;
};

// Transcription hook for speech-to-text results
export const useTranscription = () => {
  const [transcript, setTranscript] = useState<{
    text: string;
    isFinal: boolean;
  }>({
    text: '',
    isFinal: false,
  });
  
  useEffect(() => {
    // Handler for transcription updates
    const handleTranscription: TranscriptionHandler = (text, isFinal) => {
      setTranscript({ text, isFinal });
    };
    
    // Register for transcription events
    multimodalAgentService.onTranscription(handleTranscription);
    
    // Cleanup on unmount
    return () => {
      multimodalAgentService.offTranscription(handleTranscription);
    };
  }, []);
  
  return transcript;
};

// Audio output hook for text-to-speech results
export const useAudioOutput = () => {
  const [isGeneratingSpeech, setIsGeneratingSpeech] = useState(false);
  
  // Function to synthesize speech
  const synthesizeSpeech = useCallback(
    async (text: string, options?: { voice?: string; speed?: number }) => {
      setIsGeneratingSpeech(true);
      
      try {
        await multimodalAgentService.synthesizeSpeech(text, options);
      } catch (error) {
        console.error('Error synthesizing speech:', error);
      } finally {
        setIsGeneratingSpeech(false);
      }
    },
    []
  );
  
  return {
    isGeneratingSpeech,
    synthesizeSpeech,
  };
};

// Multimodal agent hook for combined functionality
export const useMultimodalAgent = () => {
  const livekit = useLiveKit();
  const voiceActivity = useVoiceActivity();
  const transcript = useTranscription();
  const audioOutput = useAudioOutput();
  
  // Start a conversation session (connects and starts listening)
  const startConversation = useCallback(
    async (roomName: string, token: string, url: string) => {
      // Connect to LiveKit
      await livekit.connect(roomName, token, url);
      
      // Start listening
      return await livekit.startListening();
    },
    [livekit]
  );
  
  // End a conversation session
  const endConversation = useCallback(() => {
    livekit.stopListening();
    livekit.disconnect();
  }, [livekit]);
  
  return {
    // Connection state
    isConnected: livekit.isConnected,
    isConnecting: livekit.isConnecting,
    
    // Voice state
    isSpeaking: voiceActivity.isSpeaking,
    voiceLevel: voiceActivity.level,
    
    // Transcription
    transcript: transcript.text,
    isFinalTranscript: transcript.isFinal,
    
    // Audio output
    isGeneratingSpeech: audioOutput.isGeneratingSpeech,
    synthesizeSpeech: audioOutput.synthesizeSpeech,
    
    // Session management
    startConversation,
    endConversation,
    
    // Raw LiveKit access
    room: livekit.room,
    error: livekit.error,
  };
};

export default useLiveKit; 