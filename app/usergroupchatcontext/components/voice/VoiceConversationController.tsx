import React, { useEffect } from 'react';
import multimodalAgentService from '../../services/livekit/multimodal-agent-service';

interface VoiceConversationControllerProps {
  voiceEnabled?: boolean;
  onVoiceToggle?: (enabled: boolean) => void;
}

const VoiceConversationController: React.FC<VoiceConversationControllerProps> = ({
  voiceEnabled = true,
  onVoiceToggle
}) => {
  useEffect(() => {
    // Subscribe to synthesis events only if voice is enabled
    if (voiceEnabled) {
      const handleSynthesisStart = (text: string) => {
        console.log(`Started speaking: ${text.substring(0, 30)}...`);
      };
      
      const handleSynthesisComplete = () => {
        console.log('Finished speaking');
      };
      
      multimodalAgentService.onSynthesisEvent('synthesis:start', handleSynthesisStart);
      multimodalAgentService.onSynthesisEvent('synthesis:complete', handleSynthesisComplete);
      
      return () => {
        // Clean up event listeners
        multimodalAgentService.offSynthesisEvent('synthesis:start', handleSynthesisStart);
        multimodalAgentService.offSynthesisEvent('synthesis:complete', handleSynthesisComplete);
      };
    }
    
    return undefined;
  }, [voiceEnabled]);

  return null;
};

export default VoiceConversationController;
