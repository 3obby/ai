// Re-export all LiveKit services for easier imports

export { default as audioPublishingService } from './audio-publishing-service';
export { default as transcriptionManager } from './transcription-manager';
export { default as speechSynthesisService } from './speech-synthesis-service';
export { default as toolDetectionService } from './tool-detection-service';
export { default as multimodalAgentService } from './multimodal-agent-service';
export { default as livekitService } from './livekit-service';
export { default as roomSessionManager } from './room-session-manager';
export { default as voiceActivityService } from './voice-activity-service';
export { default as turnTakingService } from './turn-taking-service';

// Export types
export type { MultimodalAgentConfig, TranscriptionHandler, AudioOutputHandler } from './multimodal-agent-service';
export type { VoiceActivityState } from './voice-activity-service';
export type { SpeechSynthesisOptions } from './speech-synthesis-service';
export type { AudioPublishingOptions } from './audio-publishing-service';
export type { ToolDetectionResult } from './tool-detection-service';

// Export individual services
export { default as sessionConnectionManager } from './session-connection-manager';
export { default as audioTrackManager } from './audio-track-manager';
export { default as participantManager } from './participant-manager';

// Export types
export type { SessionConnection, SessionConnectionOptions } from './session-connection-manager';
export type { RoomSession } from './room-session-manager'; 