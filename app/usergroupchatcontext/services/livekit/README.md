# LiveKit Services Architecture

This directory contains services related to LiveKit integration, WebRTC, audio processing, and multimodal interactions.

## Architecture Overview

The services follow a modular architecture with clear separation of concerns. Each service is responsible for a specific aspect of the functionality:

```
MultimodalAgentService
├── AudioPublishingService
├── TranscriptionManager
├── SpeechSynthesisService
└── ToolDetectionService
```

- **MultimodalAgentService**: Orchestrates all other services, providing a unified API for multimodal interactions
- **AudioPublishingService**: Handles audio track publishing and management with LiveKit integration
- **TranscriptionManager**: Handles speech recognition and transcription using Web Speech API
- **SpeechSynthesisService**: Handles text-to-speech functionality with OpenAI's speech synthesis API
- **ToolDetectionService**: Handles detection and processing of tool calls from voice input

## Using the Services

All services are exposed as singleton instances and can be imported directly:

```typescript
import { 
  multimodalAgentService, 
  audioPublishingService, 
  transcriptionManager,
  speechSynthesisService,
  toolDetectionService 
} from './services/livekit';
```

### Basic Usage

```typescript
// Initialize multimodal agent (this initializes all other services)
multimodalAgentService.initialize({
  model: 'gpt-4o-realtime-preview',
  voice: 'alloy',
  voiceQuality: 'high-quality'
});

// Start listening for voice input
await multimodalAgentService.startListening();

// Synthesize speech
await multimodalAgentService.synthesizeSpeech("Hello, how can I help you today?");

// Register for transcription events
multimodalAgentService.onTranscription((text, isFinal) => {
  console.log('Transcription:', text, 'Final:', isFinal);
});

// Stop listening
multimodalAgentService.stopListening();
```

## Advanced Usage

Each specialized service can be used directly for more fine-grained control:

```typescript
// Initialize audio publishing with custom options
audioPublishingService.initialize({
  enhancedAudioProcessing: true,
  audioSampleRate: 48000
});

// Start audio publishing
const audioTrack = await audioPublishingService.startPublishing();

// Initialize speech synthesis
speechSynthesisService.initialize({
  voice: 'nova',
  quality: 'high-quality',
  preferredVoices: ['nova', 'shimmer']
});

// Synthesize speech
await speechSynthesisService.synthesizeSpeech("This is an example.");

// Listen for tool detection events
toolDetectionService.on('tool:detected', (data) => {
  console.log('Tool detected:', data);
});
```

## Event System

All services use an EventEmitter-based event system, allowing components to subscribe to specific events:

```typescript
// Subscribe to synthesis events
speechSynthesisService.onSynthesisEvent('synthesis:start', (event) => {
  console.log('Started synthesizing:', event.text);
});

// Subscribe to tool events
toolDetectionService.on('tool:executed', (result) => {
  console.log('Tool executed:', result);
});
```

## Future Improvements

- Add more robust error handling and recovery strategies
- Implement state machines for complex flows like connection/reconnection
- Add support for more voice and model options
- Improve performance by optimizing initialization and connection times 