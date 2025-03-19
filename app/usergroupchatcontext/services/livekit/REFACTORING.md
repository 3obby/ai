# Refactoring Tasks for LiveKit Services

## Completed Tasks

- [x] Created `TranscriptionManager` for speech recognition functionality
- [x] Created `AudioPublishingService` for audio track publishing and management
- [x] Created `SpeechSynthesisService` for text-to-speech functionality
- [x] Created `ToolDetectionService` for voice tool detection
- [x] Set up index.ts for easier imports of services
- [x] Added documentation explaining the new architecture
- [x] Refactored `MultimodalAgentService` to use the specialized services
- [x] Removed duplicate code that now exists in specialized services
- [x] Implemented proper initialization flow for all services
- [x] Set up event proxying between services
- [x] Split `RoomSessionManager` into smaller services:
  - [x] Created `SessionConnectionManager` for LiveKit room connection handling
  - [x] Created `AudioTrackManager` for audio track lifecycles
  - [x] Created `ParticipantManager` for participant tracking
- [x] Refactored `RoomSessionManager` to use the specialized services
- [x] Set up proper dependency relationships between services
- [x] Updated components to use the new service architecture:
  - [x] Updated `VoiceInputButton` to use specialized services
  - [x] Updated `VoiceOverlay` component to use specialized services
  - [x] Updated `VoiceCommandController` to use the new service architecture

## Next Steps

### Hook Refactoring

- [ ] Create specialized hooks for better separation of concerns:
  - [ ] Create `useAudioTrackPublishing` hook
  - [ ] Create `useTokenFetching` hook
  - [ ] Create `useConnectionManager` hook
  - [ ] Create `useSpeechRecognition` hook
  - [ ] Create `useSpeechSynthesis` hook

### State Management Improvements

- [ ] Create unified state types for better type safety:
  - [ ] Define `VoiceConnectionState` type
  - [ ] Define `TranscriptionState` type
  - [ ] Define `ToolDetectionState` type

### Error Handling

- [ ] Implement centralized error handling system:
  - [ ] Create typed errors for different failure scenarios
  - [ ] Add recovery strategies for common failures
  - [ ] Create user-friendly error messages with actionable steps

## Testing Plan

- [ ] Add unit tests for each specialized service
- [ ] Create integration tests for service interactions
- [ ] Set up mock services for testing components without real WebRTC connections

## Documentation

- [ ] Create detailed API documentation for each service
- [ ] Add examples for common use cases
- [ ] Document error recovery procedures 