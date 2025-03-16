const handleMicrophoneClick = async () => {
  try {
    setIsRecordingSpinnerVisible(true);
    const transcriptionService = WebRTCTranscriptionService.getInstance();
    
    if (isRecording) {
      // If already recording, stop the transcription
      transcriptionService.stopTranscription();
      setIsRecording(false);
      setIsStreamingActive(false);
      setIsRecordingSpinnerVisible(false);
      toast({
        title: "Transcription stopped",
        description: "Voice recording has been stopped",
      });
    } else {
      // Start a new transcription
      setIsRecording(true);
      setIsStreamingActive(true);
      toast({
        title: "Starting transcription",
        description: "Connecting to transcription service...",
      });
      
      // Connect to transcription service
      await transcriptionService.startTranscription();
      
      // Register for status updates and transcription results
      transcriptionService.subscribeToConnectionStatus(handleConnectionStatusChange);
      transcriptionService.subscribeToTranscriptionUpdates(handleTranscriptionUpdate);
      
      setIsRecordingSpinnerVisible(false);
      toast({
        title: "Transcription active",
        description: "Start speaking to see the transcription",
      });
    }
  } catch (error) {
    console.error("Error handling microphone click:", error);
    setIsRecording(false);
    setIsStreamingActive(false);
    setIsRecordingSpinnerVisible(false);
    toast({
      title: "Transcription error",
      description: error instanceof Error ? error.message : "Failed to start transcription",
      variant: "destructive",
    });
  }
};

const handleConnectionStatusChange = (
  status: 'connecting' | 'connected' | 'disconnected' | 'error',
  error?: Error
) => {
  console.log(`Transcription status: ${status}`, error);
  switch (status) {
    case 'connecting':
      setIsRecordingSpinnerVisible(true);
      toast({
        title: "Connecting",
        description: "Connecting to transcription service...",
      });
      break;
    case 'connected':
      setIsRecordingSpinnerVisible(false);
      setIsRecording(true);
      setIsStreamingActive(true);
      toast({
        title: "Connected",
        description: "Start speaking to see transcription",
      });
      break;
    case 'disconnected':
      setIsRecordingSpinnerVisible(false);
      setIsRecording(false);
      setIsStreamingActive(false);
      toast({
        title: "Disconnected",
        description: "Transcription service disconnected",
      });
      break;
    case 'error':
      setIsRecordingSpinnerVisible(false);
      setIsRecording(false);
      setIsStreamingActive(false);
      toast({
        title: "Error",
        description: error?.message || "An error occurred with the transcription service",
        variant: "destructive",
      });
      break;
  }
};

const handleTranscriptionUpdate = (text: string, result?: WhisperTranscriptionResult) => {
  if (!text || text.trim() === "") return;
  
  console.log("Transcription update:", text);
  
  // Update the interim transcript
  setInterimTranscript(text);
  
  // If we have a completed sentence or significant pause, add it as a message
  if (text.endsWith('.') || text.endsWith('!') || text.endsWith('?')) {
    addMessage({ role: "user", content: text });
    setInterimTranscript("");
  }
}; 