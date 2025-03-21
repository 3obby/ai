# UserGroupChatContext: Mobile-First AI Group Chat Architecture

## Overview

GroupChatContext provides a minimalist, mobile-first group chat interface where users can communicate with one or more AI bots through both text and voice. The system features a unified text chat that serves as the central communication hub, capturing all interactions regardless of input method.

## Key Terminology

- **Blackbar**: The bottom navigation bar that contains the text input field, voice mode button, and send button. Acts as the primary control center for all user interactions in text mode.

- **Redbar**: When voice mode is activated, the blackbar transforms into the "redbar" with a red recording indicator. Features a prominent Cancel button that allows users to discard the current transcription or interrupt the bot when it's speaking. The recording indicator pulses white when the bot is speaking to signal that the user can interrupt.

- **Voice Mode**: The interactive state activated by the "voice mode" button in the blackbar. In this mode, users converse with bots through speech rather than typing, with voice input captured and processed in real-time.

- **Text Mode**: The default interaction mode where users communicate with bots by typing messages in the blackbar's text input field and sending them with the send button.

- **Voice Ghost**: A temporary clone of a text-based bot created when transitioning to voice mode. Voice ghosts maintain conversation context but have specialized voice-optimized settings.

- **Unified Text Chat**: The central conversation thread that captures all interactions, whether they originated as text input or transcribed voice.

## Text-Voice Transition System

The system is designed to provide a seamless transition between text and voice interactions:

1. **Text-to-Voice Transition**
   - When a user activates voice mode through the blackbar, a "voice ghost" is created for each active bot
   - Voice ghosts inherit the full conversation context from their text-based counterparts
   - Pre-processing, post-processing, and rework hooks are disabled for voice ghosts
   - The latest OpenAI realtime voice model is automatically selected and initialized with context
   - User speech is captured through WebRTC and streamed to the voice model

2. **Voice-to-Text Transition**
   - When a user deactivates voice mode in the blackbar, the system returns to the text-based model
   - All voice interactions (both user and bot responses) remain in the unified text chat
   - Text-based model regains access to the complete conversation history, including voice exchanges
   - Pre-processing, post-processing, and rework hooks are re-enabled for the text model

All interactions, whether text or voice, are transcribed and stored in the unified text chat, ensuring a consistent conversation thread that maintains full context regardless of the input method.

## Voice Mode UI Enhancement

The voice mode UI has been significantly improved to provide a more integrated experience:

1. **VoiceModeBlackbar Integration**
   - Voice mode now uses the same blackbar area instead of overlaying it with a separate component
   - The blackbar transforms into "voice mode blackbar" when voice mode is activated
   - Voice detection meter/audio visualizer is directly integrated into the blackbar
   - Important controls from the previous overlay are preserved in the new compact design

2. **Improved Visual Feedback**
   - Real-time audio level visualization shows when the user is speaking
   - Visual indicators highlight when the bot is speaking or processing
   - Transcription display is integrated directly in the blackbar
   - Ripple animation provides immediate feedback when toggling voice mode

3. **Unified Control Center**
   - The blackbar serves as a consistent control center in both modes
   - Familiar location reduces cognitive load when switching modes
   - Same controls are available in a context-appropriate format
   - Transition between modes is visually smooth with the blackbar adapting its appearance

This implementation maintains all the functionality of the previous approach while providing a more streamlined and intuitive user experience by keeping all controls in the same familiar location.

## Development Direction

We have shifted our efforts to create a robust production-ready system. By default:

1. **Latest OpenAI Models by Default**  
   - Text interactions use the latest GPT model (e.g., gpt-4o)  
   - Voice interactions automatically switch to the newest realtime OpenAI model for an optimal experience  

2. **LiveKit Integration with OpenAI**  
   - For realtime models: Use the MultimodalAgent class with RealtimeModel (e.g., gpt-4o-realtime-preview-yyyy-mm-dd)  
   - For text models: Use the LLM class (e.g., gpt-4o)  
   - Model versions are dynamically queried at build time to ensure currency  

3. **Single-Bot Default Experience**  
   - A single default bot leverages the latest OpenAI models for voice interactions  
   - The system maintains unified context across text and voice so that switching modes is instant and retains conversational history  
   - All message flows (text and transcribed voice) route through the same bot, ensuring a consistent, high-quality exchange  

## Core Architecture

### Component Hierarchy and Relationships

**Top Level: GroupChatContext**  
- Orchestrates and contains all other components

**Main Components and Their Relationships**:
1. **User I/O (Text & Voice)**
   - Bidirectional connection with Bot Manager  
   - Bidirectional connection with LiveKit Integration  

2. **Bot Manager**
   - Connected to User I/O  
   - Connected to Settings System (bidirectional)  
   - Controls Bot Instance Registry  
   - Manages voice ghost creation and destruction

3. **Settings System**
   - Connected to Bot Manager (bidirectional)  
   - Connected to Prompt Processor (bidirectional)  
   - Stores voice mode configurations

4. **LiveKit Integration**
   - Connected to User I/O  
   - Connected to Bot Instance Registry (bidirectional)  
   - Handles real-time audio streaming and transcription

5. **Bot Instance Registry**
   - Controlled by Bot Manager  
   - Connected to LiveKit Integration (bidirectional)  
   - Connected to Prompt Processor (bidirectional)  
   - Manages the Bot Response Pipeline  
   - Tracks both standard bots and their voice ghosts

6. **Prompt Processor (Pre/Post Hooks)**
   - Connected to Bot Instance Registry (bidirectional)  
   - Connected to Settings System (bidirectional)  
   - Connected to Reprocessing Control System (bidirectional)  
   - Disabled for voice ghosts during voice mode

7. **Tool Calling System**
   - Connected to Bot Response Pipeline (bidirectional)  

8. **Bot Response Pipeline**
   - Controlled by Bot Instance Registry  
   - Connected to Tool Calling System (bidirectional)  
   - Connected to Reprocessing Control System (bidirectional)  
   - Routes responses to unified text chat

9. **Reprocessing Control System**
   - Connected to Bot Response Pipeline (bidirectional)  
   - Connected to Prompt Processor (bidirectional)  
   - Disabled for voice ghosts during voice mode

## Key Components

### Core Components
1. **GroupChatProvider**  
   - Top-level context provider managing global state, including user and bot data
2. **BotRegistry**  
   - Manages the set of available bots and their configurations  
   - Handles voice ghost registration and lifecycle
3. **MessageProcessor**  
   - Central message-handling pipeline for routing and sequencing  
   - Ensures all messages (text and voice) are recorded in unified text chat

### Input/Output Components
1. **ChatInterface**  
   - Minimal, mobile-first UI supporting text input and a "voice mode" toggle  
   - Displays unified text chat with all interactions
2. **LiveKitService**  
   - Wraps LiveKit's WebRTC functionalities for high-quality voice streaming and automatic transcription  
   - Handles voice activity detection and audio segmentation
3. **BotResponseRenderer**  
   - Displays bot responses with a collapsible view for advanced debugging and signal chain exploration  
   - Shows transcribed voice interactions in the unified text format

### Configuration Components
1. **GroupSettingsPanel**  
   - Global chat settings panel controlling bot selections, response configurations, and advanced processing  
   - Includes voice mode settings and voice ghost behavior options
2. **BotConfigPanel**  
   - Per-bot configuration, including prompts, tools, and pre/post-processing rules  
   - Configures which hooks are disabled during voice mode
3. **PromptEditor**  
   - Advanced configuration interface for refining prompts and hooking into reprocessing logic  
  
## Signal Chain Logging System

### Data Flow and Processing Stages

**Main Container: Unified Text Output System**

**Processing Flow**:  
1. User Input (Text & Voice) → Pre-Process Logging → Tool Resolution Logging  
2. Tool Resolution Logging → Tool Execution Logging → Post-Process Logging → Final Output  
3. Final Output → Message Display Component  

**Message Display Component**:  
- Default View: Displays only the final output from each bot  
- Expanded View: Shows all intermediate steps, configuration details, and debug logs  

### Flow Direction:
- User Input travels through pre-processing and tool resolution stages  
- Tool results flow back through post-processing to produce the final output  
- The final output is then presented in the Message Display Component with optional expanded logs  

## Architectural Advantages

- **WebRTC Benefits**  
  Provides low latency, optimized global edge networking, and straightforward implementation  
- **Voice Activity Detection**  
  Enables natural conversation flow, with real-time detection of speaking intervals  
- **Multi-modal Integration**  
  Merges text and voice in a single conversation thread with shared context  
- **Mobile-First Design**  
  Offers an efficient, touch-friendly interface that adapts gracefully to smaller screens  
- **Voice Tool Optimization**  
  Transforms user voice commands into natural language tool calls  
- **Unified Signal Chain**  
  Centralizes logs, making it easy to trace data from pre-processing to final bot output  
- **Pre/Post Processing**  
  Allows flexible, high-quality control over messages, both globally and per bot  
- **Reprocessing System**  
  Provides iterative refinement, automatically or on user demand, within clearly defined limits  
- **Unified Bot Settings**  
  Maintains consistent global defaults across all bots, with flexible overrides per individual bot

## Unified TODO - Prioritized Implementation Plan

1. [X] **Implement Centralized State Management** (Priority: Critical)
   - [X] Create a dedicated VoiceStateStore using reducer pattern
   - [X] Implement single source of truth for voice mode state
   - [X] Replace ref-based state tracking with proper state management
   - [X] Create selector hooks for state access to eliminate prop drilling
   - [X] Ensure state consistency across all components

2. [_] **Fix Voice Mode Activation** (Priority: Critical)
   - [X] Fix voiceModeManager.activateVoiceMode() to accept proper parameters
   - [X] Fix import issues with VoiceModeBlackbar component by creating a duplicate in the chat directory
   - [X] Fix AudioVisualizer import by embedding it directly in the VoiceModeBlackbar component
   - [X] Fix AudioContext initialization issues to ensure proper resuming on user interaction
   - [X] Make voice mode UI show even when backend connections fail
   - [X] Add comprehensive error handling for voice mode activation failures
   - [X] Fix audio-publishing-service.ts missing default export bug
   - [_] Test voice mode button activation flow end-to-end

3. [X] **Implement Event-Driven Architecture** (Priority: High)
   - [X] Create a proper EventBus with typed events
   - [X] Define standard events (TranscriptionReceivedEvent, ResponseGeneratedEvent, etc.)
   - [X] Implement pub/sub system for component communication
   - [X] Replace direct method calls with event dispatch
   - [X] Add event debugging and monitoring

4. [X] **Formalize Message Processing Pipeline** (Priority: High)
   - [X] Define clear processing stages (deduplication → pre-processing → LLM call → post-processing)
   - [X] Create pure function processors for each stage
   - [X] Add middleware system for cross-cutting concerns
   - [X] Implement proper error boundaries between stages
   - [X] Create visualization for message transformation flow

5. [_] **Finalize Voice Ghost Lifecycle Management** (Priority: High)
   - [X] Design data structure for tracking ghost and standard bots
   - [X] Add tracking of both standard bots and their voice ghost counterparts
   - [X] Add robust cleanup methods for voice ghosts
   - [X] Implement staged approach to ghost deactivation
   - [X] Add event listeners for voice mode state changes
   - [_] Ensure seamless transition between voice and text modes

6. [_] **Separate Services from UI Components** (Priority: High)
   - [_] Move voice processing logic from UI components to services
   - [_] Extract LiveKitIntegrationProvider business logic to dedicated services
   - [_] Create facade services for component access
   - [_] Make UI components purely presentational
   - [_] Implement proper dependency injection for services

7. [_] **Optimize Performance for Mobile** (Priority: High)
   - [_] Improve responsiveness of voice mode on mobile devices
   - [_] Optimize audio processing to reduce battery consumption
   - [_] Enhance touch interactions for voice controls
   - [_] Test and fix any mobile-specific issues with microphone access

8. [X] **Complete Voice Mode Settings UI** (Priority: High)
   - [X] Implement comprehensive UI controls in GroupSettingsPanel
   - [X] Create persistent storage for voice preferences
   - [X] Add visual feedback during transitions between voice and text modes
   - [X] Integrate VoiceTransitionSettings component into settings workflow
   - [X] Add user preferences for voice model selection
   - [X] Create settings storage for voice ghost behavior options

9. [X] **Complete Voice-to-Text Transition** (Priority: High)
   - [X] Create system to re-enable processing hooks when returning to text mode
   - [X] Ensure conversation history is maintained across transitions
   - [X] Handle interrupted voice sessions gracefully
   - [X] Develop error recovery mechanisms for failed transitions
   - [X] Implement smooth transition animations/feedback

10. [_] **Apply Unidirectional Data Flow** (Priority: Medium)
    - [X] Clearly define input → process → output pipelines
    - [X] Implement state reducers with pure functions
    - [_] Eliminate side effect chains across components
    - [X] Create action creators for all state changes
    - [X] Add immutable state updates throughout the app

11. [_] **Implement Command Pattern for Actions** (Priority: Medium)
    - [_] Define discrete commands (ProcessTranscriptionCommand, etc.)
    - [_] Create command bus for dispatching
    - [_] Add middleware for cross-cutting concerns
    - [_] Implement command history and undo capability
    - [_] Add detailed command logging for debugging

12. [_] **Voice Mode Settings Configuration** (Priority: Medium)
    - [_] Add UI controls for voice mode settings in GroupSettingsPanel
    - [_] Create settings storage for voice ghost behavior options
    - [X] Implement settings inheritance/override mechanism
    - [_] Add user preferences for voice model selection

13. [_] **Enhance Error Handling and Resilience** (Priority: Medium)
    - [_] Implement more robust error recovery for broken connections
    - [_] Add automatic reconnection logic for interrupted voice sessions
    - [X] Improve error messaging for users when voice mode fails
    - [X] Fix OpenAI API routes to properly validate models and handle errors
    - [_] Add telemetry for tracking voice mode stability

14. [X] **Reduce State Duplication** (Priority: Medium)
    - [X] Continue reducing redundant state tracking across components
    - [X] Consolidate voice-related state management
    - [X] Improve type safety across component boundaries

15. [X] **Bot Manager Voice Ghost Controls** (Priority: Medium)
    - [X] Implement creation/destruction methods for voice ghosts
    - [X] Add state tracking for active voice mode sessions
    - [X] Create event hooks for voice mode transitions
    - [_] Add logging for voice ghost lifecycle events

16. [_] **Unified Text Chat Enhancements** (Priority: Medium)
    - [X] Improve transcription display in chat interface
    - [X] Add visual indicators for voice vs. text messages
    - [X] Implement collapsible details for voice processing information
    - [_] Enhance accessibility for voice interactions
    - [_] Add visual indicators for active speaker

17. [_] **Complete VoiceModeBlackbar Implementation** (Priority: Medium)
    - [X] Create VoiceModeBlackbar component to replace overlay
    - [X] Integrate audio visualization directly in blackbar
    - [X] Add smooth transitions between text and voice mode
    - [_] Fix any styling or positioning issues on mobile
    - [_] Ensure proper cleanup when closing voice mode

18. [_] **Cross-Browser Compatibility** (Priority: Low)
    - [_] Test and fix WebRTC compatibility issues across browsers
    - [_] Ensure consistent audio processing across platforms
    - [_] Implement fallback mechanisms for unsupported browsers

19. [_] **Voice Experience Refinements** (Priority: Low)
    - [_] Add voice tone/emotion detection
    - [_] Implement natural turn-taking mechanisms
    - [_] Enhance voice activity detection accuracy in noisy environments
    - [_] Add support for multiple languages

## Current Progress (Updated)

The project has made significant progress in implementing the core voice mode architecture:

1. **VoiceModeManager**: Successfully implemented as a state machine that handles voice mode transitions, ghost creation, and context inheritance.

2. **Voice Context Inheritance**: Implemented and working through the VoiceContextInheritance component, which creates voice bot clones with full conversation history.

3. **BotRegistryProvider**: Enhanced with robust voice ghost creation capabilities through the cloneBotInstanceForVoice method.

4. **Voice Mode Activation Fixes**: Resolved critical issues that were preventing voice mode activation:
   - Fixed the voiceModeManager.activateVoiceMode() call to include required parameters (active bot IDs, bots list, and messages)
   - Created a properly imported VoiceModeBlackbar component in the chat directory to fix path resolution issues
   - Implemented the VoiceModeBlackbar in the main ChatInput component, replacing the overlay approach with an integrated UI
   - Resolved AudioContext initialization issues by ensuring proper resuming in direct response to user interaction
   - Added error handling to provide clear feedback when voice mode activation fails
   - Fixed import path issues between components to ensure proper module resolution
   - Implemented robust API for fetching the latest OpenAI models using official /models endpoint
   - Added graceful fallbacks for UI to continue working even when backend connections fail

5. **Centralized State Management**: Implemented a robust state management solution for voice mode using the reducer pattern:
   - Created VoiceStateContext to define the shape of voice state with comprehensive interfaces
   - Implemented VoiceStateProvider with a pure reducer function for predictable state updates
   - Developed useVoiceStateStore hook for convenient component access to voice state
   - Established synchronization with existing VoiceModeManager and VoiceStateManager services
   - Eliminated state duplication across components with a single source of truth
   - Enhanced type safety with strongly-typed actions and state

## Next Priorities

1. **Test Voice Mode Button Activation Flow** (High Priority):
   - Implement end-to-end testing for voice mode button activation
   - Verify proper initialization and cleanup of voice resources
   - Test edge cases with interrupted connections and errors
   - Ensure consistent behavior across different interaction patterns

2. **Separate Services from UI Components** (High Priority):
   - Move voice processing logic from UI components to services
   - Extract LiveKitIntegrationProvider business logic to dedicated services
   - Create facade services for component access
   - Make UI components purely presentational
   - Implement proper dependency injection for services

3. **Finalize Voice Ghost Lifecycle Management** (High Priority):
   - Ensure seamless transition between voice and text modes 

4. **Optimize Performance for Mobile** (High Priority):
   - Improve responsiveness of voice mode on mobile devices
   - Optimize audio processing to reduce battery consumption
   - Enhance touch interactions for voice controls
   - Test and fix any mobile-specific issues with microphone access

## Modular Voice Architecture Implementation

The modular architecture has been implemented with the following components:

### Voice Mode Manager
- **VoiceModeManager**: Central state machine for controlling voice mode transitions
  - Implements state transitions (idle, initializing, active, processing, error, etc.)
  - Manages voice ghost creation and lifecycle
  - Handles configuration for voice mode settings (hooks, voice preferences)
  - Provides events for state changes and ghost creation/deletion

### Audio System Services
- **AudioContextManager**: Manages the Web Audio API context
  - Handles browser audio context initialization and resume logic
  - Provides audio context state management
  - Abstracts browser compatibility concerns

- **AudioAnalyzerService**: Analyzes audio stream data
  - Processes audio input using frequency and time domain analysis
  - Optimized for human voice frequency range
  - Emits audio level data for visualization and voice detection

- **VoiceActivityDetector**: Detects voice activity from audio streams
  - Implements configurable thresholds with hysteresis for accurate detection
  - Buffers audio to include the beginning of speech
  - Handles silence detection and minimum speech duration
  - Works in automatic, sensitive, and manual modes

### Connection with Existing Components
- **VoiceInputButton**: Updated to use the new modular services
  - Uses AudioContextManager for browser audio system access
  - Receives audio levels from AudioAnalyzerService for visualization
  - Responds to voice mode state changes

### Current Architecture Benefits
- Clean separation of concerns with single-responsibility components
- State management isolated in dedicated manager
- Improved error handling and recovery
- Better configurability for voice detection settings
- Voice ghosts with specialized voice-optimized settings

## Centralized Communication Architecture

The new architecture integrates event management and connection handling through centralized services:

### EventBus System
- **EventBus**: Type-safe centralized event management
  - Provides strongly-typed publish/subscribe pattern for all application events
  - Eliminates point-to-point coupling between components
  - Categorized events (audio, voice, transcription, bot, etc.)
  - Supports one-time events, event filtering, and debugging
  - Prevents event handling collisions between components

### Unified Connection Management
- **ConnectionManager**: Manages all WebRTC/media connections
  - Centralizes media stream acquisition
  - Handles permission requests and errors
  - Implements automatic reconnection logic
  - Provides consistent connection state management
  - Emits standardized events through EventBus

### Integration Benefits
- Components no longer need direct references to each other
- Event handling is consistent across the application
- Clear event naming conventions and categorization
- Connection state is managed in one place with consistent error handling
- Improved developer experience with TypeScript type safety

## Voice Context Inheritance Implementation

The system implements a robust mechanism to inherit conversation context between text and voice modes, ensuring seamless transitions for users when switching between typing and speaking to AI assistants.

### Key Components

1. **VoiceModeManager** (`services/voice/VoiceModeManager.ts`)
   - The core service responsible for managing voice ghosts
   - Implements the filtering and inheritance of conversation contexts
   - Controls voice mode state transitions

2. **VoiceContextInheritance Component** (`components/voice/VoiceContextInheritance.tsx`)
   - React component that monitors voice mode state changes
   - Automatically triggers context inheritance when entering voice mode
   - Reports success or errors in the inheritance process

3. **Enhanced BotRegistryProvider** (`context/BotRegistryProvider.tsx`)
   - Provides the `cloneBotInstanceForVoice` method for creating voice-optimized bot clones
   - Integrates with VoiceModeManager for context inheritance
   - Preserves conversation context when creating voice bot instances

### Implementation Details

The context inheritance process follows these steps:

1. When voice mode is activated, the VoiceModeManager creates "voice ghosts" for each active bot
2. The system filters messages to include only relevant context for each bot:
   - User messages (all of them)
   - System messages (global context)
   - Bot-specific messages (only from the original bot being cloned)
3. This filtered context is stored in the voice ghost and used to initialize the voice model
4. When voice mode is deactivated, all voice interactions remain in the unified text chat

### Benefits

- **Seamless Continuity**: Users experience no loss of context when switching between modes
- **Optimized Voice Experience**: Voice ghosts use voice-optimized settings for better interactions
- **Memory Efficiency**: Context filtering ensures only relevant messages are included
- **Specialized Configurations**: Voice bots can have different processing settings (e.g., disabled hooks)

## Voice-to-Text Transition System Implementation

The voice-to-text transition system has been implemented with a focus on robustness, context preservation, and configurability. Key components include:

### Core Components

1. **VoiceModeManager Enhancements**
   - Added comprehensive event system for transition state management
   - Implemented methods for handling voice-to-text transitions
   - Added configuration system for voice ghost behavior
   - Added hooks for tracking and preserving conversation history

2. **VoiceTextTransitionHandler Component**
   - Monitors transition events from VoiceModeManager
   - Handles re-enabling of processing hooks when returning to text mode
   - Manages error recovery for interrupted voice sessions
   - Ensures voice ghost instances are properly cleaned up

3. **VoiceTransitionSettings Component**
   - Provides UI controls for voice transition behavior
   - Allows configuration of processing hook behavior in voice mode
   - Enables customization of context preservation settings
   - Integrated with GroupSettingsPanel for easy access

### Key Features

1. **Seamless Context Inheritance**
   - Voice ghosts inherit filtered conversation context from text bots
   - All voice interactions are preserved in unified text chat
   - Processing hooks can be selectively enabled/disabled for voice mode

2. **State Machine Approach**
   - Clear state transitions (idle → initializing → active → processing → transitioning)
   - Event-driven architecture for handling state changes
   - Comprehensive error handling for interrupted sessions

3. **Configurability**
   - User-facing controls for voice-to-text transition behavior
   - Settings for pre/post processing hook behavior in voice mode
   - Options for context preservation and cleanup

### Benefits

- **Improved Reliability**: Robust error handling and recovery for interrupted voice sessions
- **Better User Experience**: Seamless transitions with no loss of context
- **Enhanced Performance**: Optimized voice interactions with selective hook disabling
- **Greater Flexibility**: User-configurable behavior for different use cases

The implementation ensures that users can freely switch between voice and text modes without losing conversation context, while maintaining optimal performance characteristics appropriate for each modality.

## Recent Voice-to-Text Transition System Enhancements

Based on the implementation plan, we've made several important enhancements to the voice-to-text transition system:

### 1. Improved Voice Ghost Lifecycle Management

- **Enhanced BotRegistry Cleanup**: Added robust cleanup methods for voice ghosts in the BotRegistryProvider.
- **Proper Deactivation**: Implemented a staged approach to ghost deactivation (first disable, then remove) to prevent UI glitches.
- **Event-Driven Cleanup**: Voice ghost cleanup is now triggered by voice-to-text transition events from the VoiceModeManager.
- **Error Recovery**: Added specific error handling for interrupted voice sessions with automatic cleanup.

### 2. Enhanced Message Display for Voice Messages

- **Visual Voice Indicators**: Messages generated from voice interactions now show a microphone icon and "Voice" label.
- **Voice-Specific Metadata**: Added VoiceProcessingMetadata to track transcription confidence, speech duration, and other voice-specific information.
- **Improved Debug View**: Enhanced the ProcessingInfo component to display detailed voice processing data in the debug panel.
- **Collapsible Details**: Voice processing information is now available in a collapsible section for easy inspection.

### 3. Automatic Voice Model Selection

- **Dynamic Model Fetching**: Added a fetchLatestVoiceModel method to automatically select the best available voice model.
- **Fallback Mechanisms**: Implemented graceful fallbacks when model fetching fails to maintain functionality.
- **Configuration Persistence**: Voice model selections are now properly persisted in the settings.

### 4. Type System Improvements

- **Renamed Bot Voice Settings**: Renamed the Bot-specific VoiceSettings to BotVoiceSettings to avoid conflicts with the global VoiceSettings interface.
- **Enhanced Voice Processing Types**: Added specific types for voice processing metadata to ensure type safety.
- **Clearer Type Definitions**: Improved the separation of concerns in the type system by properly differentiating voice types.

These enhancements significantly improve the robustness and user experience of the voice-to-text transition system, ensuring seamless switching between modalities while maintaining proper cleanup and context preservation.

## Recent Voice Mode Connection Improvements

We've resolved a critical issue with voice mode activation that was causing connection failures. The problem occurred when users attempted to enter voice mode - the UI would show voice mode was active, but the LiveKit connection was not properly established, resulting in errors about "LiveKit connection not ready" and "Cannot start listening - LiveKit connection not established".

### Key Improvements:

1. **Enhanced Connection Verification**: The `MultimodalAgentService.ensureConnection()` method has been improved to use a more robust connection check that:
   - First checks if `roomSessionManager` exists
   - Attempts to get the active session and verifies its connection state
   - Falls back to direct room access via `livekitService` if no active session is found
   - Provides more specific error messages to help debug connection issues

2. **Improved Connection Retry Logic**: The `VoiceInputButton` component now includes:
   - A retry mechanism with exponential backoff when attempting to establish a LiveKit connection
   - Proper sequencing to ensure UI feedback happens immediately regardless of connection state
   - Better error handling to show voice mode UI even when connections fail
   - Clear separation of UI state from connection state

3. **Voice Mode State Management**: Fixed issues with voice mode state tracking:
   - Explicitly setting voice mode as active in the session connection manager before attempting connection
   - Preserving UI state during connection retries
   - Properly handling failed connection attempts without disrupting the user experience

These improvements ensure that voice mode provides immediate visual feedback to users while working to establish the necessary connections in the background, with multiple retry attempts before giving up.

## Recent Implementation Progress

### Blackbar Implementation and UI Reorganization

We've implemented a new UI structure that better encapsulates our voice and text mode interactions:

1. **Blackbar Component Structure**
   - Created a dedicated bottom navigation bar (\"blackbar\") that serves as the primary control center for user interactions
   - Implemented mode-specific styling with visual indicators for text and voice modes
   - Added CSS transitions for smooth visual feedback during mode changes
   - Created a dedicated blackbar.css file for centralized styling

2. **Text Mode and Voice Mode**
   - Formalized distinct operational modes in both terminology and implementation
   - Text Mode: Default interaction mode with text input controls
   - Voice Mode: Enhanced with visual indicators, audio level feedback, and transition animations
   - Implemented clear mode switching with appropriate accessibility announcements

3. **Control Consolidation**
   - Removed redundant floating voice controls that were previously positioned with `fixed bottom-20 right-4 z-10`
   - Consolidated all mode-switching controls into the blackbar for a cleaner, more intuitive interface
   - Enhanced the VoiceInputButton with ripple effects and audio level visualization
   - Moved accessibility features to the top-positioned AccessibilityControls component

4. **Enhanced Accessibility**
   - Added keyboard shortcuts with Alt+key combinations for all major functions
   - Implemented screen reader announcements for mode changes and actions
   - Added help panel and keyboard shortcuts information
   - Enhanced text-to-speech toggle with proper ARIA attributes and visual indicators

This consolidation creates a cleaner interface with clear entry points for both voice and text interactions, all while maintaining accessibility and enhancing the user experience with appropriate visual feedback during mode transitions.

## Voice Settings Standardization

We've standardized the voice settings across the application to use OpenAI's "coral" voice as the default:

1. **Default Voice Configuration**:
   - Updated all default voice settings to use 'coral' instead of 'alloy'
   - Set TTS-1 as the default model for text-to-speech synthesis
   - Configured 'coral' as the first preferred voice in rotation lists

2. **Voice Ghost Inheritance**:
   - Modified the bot cloning process to properly inherit voice settings when creating voice ghosts
   - Ensured voice preferences propagate from text bots to their voice counterparts
   - Maintained 'coral' as the fallback voice if no specific voice is set

3. **API Route Updates**:
   - Updated the synthesize-speech API route to use 'coral' as its default voice
   - Enhanced error handling to provide better fallback behavior
   - Fixed compatibility with OpenAI SDK v4.87.3

4. **Service Configuration**:
   - Updated VoiceSynthesisService and SpeechSynthesisService to use 'coral' by default
   - Added coral voice setting to all sample bots in the sampleBots.ts configuration
   - Set 'coral' voice in global GroupChatSettings

These changes ensure a consistent, high-quality voice experience across the application when using text-to-speech functionality, with proper inheritance when transitioning between text and voice modes.

## Recent API Improvements

We've implemented several improvements to the API routes to make them more robust and handle errors gracefully:

1. **OpenAI Chat Completion API Route**:
   - Added model validation to ensure only chat-compatible models are used (gpt-4o, gpt-3.5-turbo, etc.)
   - Implemented automatic model mapping for realtime models in chat contexts
   - Enhanced error messaging with specific guidance for incorrect model usage
   - Added a list of supported models that's returned with error responses
   - Improved logging for debugging request/response flows

2. **Speech Synthesis API Route**:
   - Fixed compatibility issues with the OpenAI SDK audio endpoints
   - Added validation for TTS model names to ensure only proper TTS models are used (tts-1, tts-1-hd)
   - Implemented automatic model fallback when non-TTS models are specified
   - Enhanced error handling with graceful degradation to browser TTS
   - Added nested try-catch blocks to better isolate and report API-specific errors

3. **Default Export Fix**:
   - Fixed missing default export in audio-publishing-service.ts
   - Added proper singleton pattern implementation to ensure consistent service instances

4. **Voice Mode Model Compatibility**:
   - Added model conversion in prompt-processor-service.ts to handle realtime models in voice mode
   - Implemented detection and replacement of realtime models with standard models for API compatibility
   - Added logging to show when model conversions happen for better debugging
   - Ensures voice mode works seamlessly with both standard and realtime models

5. **Enhanced Voice Mode Error Handling**:
   - Added fallback responses for voice mode when API calls fail
   - Improved error details in API routes to provide clearer debugging information
   - Added validation for message content to prevent undefined/null content issues
   - Enhanced error display with detailed API error information in client logs
   - Updated ProcessingMetadata type to include error field for tracking issues

## Voice Mode Interaction Improvements

We've enhanced the voice mode interface to improve user control and feedback during voice interactions:

1. **Redbar Interface**
   - Renamed "blackbar" to "redbar" in voice mode for a distinctive visual indication
   - Applied red theme with contrasting colors to clearly differentiate from text mode
   - Improved visual hierarchy with dedicated recording control section

2. **Recording Control Button**
   - Added a prominent recording button with state-specific styles:
     - Red when user is speaking (active recording)
     - White pulsing animation when bot is speaking (interruption mode)
     - Light red in idle state (waiting for speech)
   - Labeled as "Cancel" to clearly indicate its function to discard current transcription

3. **Transcription Management**
   - If user presses Cancel during their speech, the current transcription is discarded
   - System automatically restarts transcription after cancellation
   - Bot speech can be immediately interrupted by pressing the button
   - User's mic does not produce transcriptions while bot is speaking
   - Transcription automatically resumes when bot finishes speaking

4. **Visual Feedback System**
   - Mic activity visualizer shows real-time audio levels
   - Recording button provides clear state indication for the current interaction mode
   - Status text shows "Speaking" or "Silent" to reinforce current state
   - Smooth transitions between different interaction states with color changes

These improvements create a more intuitive voice interaction experience, particularly for mobile users who need clear visual feedback and simple controls for managing voice conversations.

## Voice Mode Processing Hook Issue

We identified an issue with voice mode where preprocessing, postprocessing, and retry processing hooks are being incorrectly applied to voice ghosts. The problem occurs because:

1. The `VoiceModeManager.createVoiceGhosts()` method correctly creates voice ghosts with processing hooks disabled if configured to do so.
2. However, the message processing pipeline in `prompt-processor-service.ts` still checks for and applies these hooks based on global settings without properly respecting the ghost-specific settings.
3. When a user enters voice mode, the ghost bots should inherit their processing hooks settings from the original bot, and additionally have them disabled if voice mode is configured to not use these hooks.

The solution requires:

1. Enhancing the `processMessage` function to check if we're dealing with a voice ghost bot (by checking ID prefix or a new flag).
2. Respecting the bot's ghost-specific settings for processing hooks, even when global hooks are enabled.
3. Ensuring that even if the hook functions exist on a bot, they're not used during voice mode unless explicitly configured.

This fix will ensure voice interactions remain streamlined with minimal processing overhead unless specifically requested by the user.

## Voice Mode Model Selection Fix

We identified and fixed an issue where voice mode was incorrectly attempting to use text-to-speech (TTS) models for chat completions. The problem manifested as errors stating:

```
Error: Model "tts-1" is not supported for chat completions. Use a GPT model like gpt-4o, gpt-4, or gpt-3.5-turbo.
```

The issue was in the `prompt-processor-service.ts` file where model selection logic incorrectly prioritized `bot.voiceSettings?.model` when processing voice messages. This was problematic because:

1. `bot.voiceSettings.model` is meant to specify the TTS model (e.g., "tts-1") for speech synthesis
2. Chat completions require GPT models like gpt-4o, not TTS models
3. The voice ghost creation correctly set both:
   - `model` (for chat completions)
   - `voiceSettings.model` (for TTS)
   
The fix removed the conditional logic that was prioritizing voiceSettings.model for voice messages and now consistently uses the bot's primary model field for all completions.

This ensures that voice ghosts use appropriate models for both understanding (chat completions) and speaking (TTS), preventing API errors and the "multitude of voices" issue that occurred when multiple fallback responses were triggered due to failed API calls.

## Voice Mode Duplicate Playback Fix

We resolved an issue where users were hearing multiple overlapping voice responses during voice mode (the "multitude of voices" problem). The issue was caused by several components independently detecting new bot messages and calling the speech synthesis service for the same message, resulting in duplicate audio playback.

The problem occurred because:

1. Multiple components were monitoring new bot messages and calling `playBotResponse`:
   - `VoiceIntegration.tsx` was calling it whenever a new bot message appeared
   - `LiveKitIntegrationProvider.tsx` was also calling it after adding responses to the chat
   - Other components might have been triggering playback for the same message

2. There was no mechanism to prevent duplicate playback of the same message content.

The solution implemented:

1. Added message ID tracking in the `playBotResponse` function:
   - Created a Set to track recently played message IDs
   - Check if a message was already played before starting playback
   - Automatically clean up the tracking after a reasonable timeout

2. Updated components to pass the message ID parameter when calling `playBotResponse`

This fix ensures that each bot response is only spoken once, preventing the annoying overlapping voices effect while maintaining the responsiveness of the voice interaction system.

## Voice Mode Consistency Improvements

We've implemented several improvements to the voice mode experience to enhance stability and user experience:

1. **Standardized Voice Settings**
   - Changed default voice from 'alloy' to 'coral' for all voice interactions
   - Standardized voice speed to 1.0 for consistent pacing
   - Set quality to 'standard' for predictable performance
   - Updated VoiceOption type to include 'coral' as an option

2. **Improved Transcription Preview**
   - Replaced the in-blackbar transcription preview with a "ghost" message approach
   - Interim transcriptions now appear as regular chat messages with a temporary state
   - Final transcriptions replace the ghost message seamlessly
   - Improved visual continuity by keeping all interactions in the main chat area

3. **Fixed Voice Mode Close Button**
   - Fixed error when clicking the close button in VoiceModeBlackbar
   - Now directly calls voiceModeManager.deactivateVoiceMode() instead of trying to find and click the voice input button
   - Ensures proper cleanup and voice-to-text transition

These changes create a more predictable and reliable voice experience with consistent emotional tone and loudness, while maintaining all the advantages of our unified text chat architecture.

## Echo Prevention in Voice Mode

We've implemented several features to address the common issue of acoustic feedback (echo) in voice mode, where the bot's voice is picked up by the user's microphone, creating a feedback loop:

1. **Echo Prevention Settings**
   - Added a comprehensive set of echo prevention options in the Advanced Voice Settings panel
   - Implemented three main strategies: enhanced audio processing, VAD tuning, and microphone muting
   - Made all settings user-configurable with sensible defaults

2. **Enhanced Audio Processing**
   - Added WebRTC constraints for echo cancellation, noise suppression, and auto gain control
   - Implemented in the VoiceActivityService with configureAudioProcessing method
   - Applied automatically when enhanced audio processing is enabled

3. **State-Based Microphone Management**
   - Added automatic microphone muting during bot speech playback
   - Integrated with MultimodalAgentService speaking state changes
   - Automatically restores microphone after bot finishes speaking with a delay to prevent echo

4. **Turn Detection Tuning**
   - Increased default VAD threshold from 0.3 to 0.6 to reduce sensitivity to bot's voice
   - Extended silence duration from 1000ms to 1500ms to prevent premature interruptions
   - Added user-friendly sliders for fine-tuning these parameters based on environment

These improvements significantly reduce the likelihood of echo feedback, creating a more natural conversational experience when using voice mode with speakers instead of headphones.

## Custom Prompts System UI Improvements

The prompts system UI has been redesigned to provide a more integrated and intuitive experience:

1. **TopBar Integration**
   - Moved the PromptsButton from a floating center position to the top navigation bar
   - Created a compact icon-only design that fits naturally with other controls
   - Added subtle hover and active states for better touch feedback
   - Maintains the same drawer toggle functionality with improved positioning

2. **Concatenated Ghost Prompts**
   - Replaced individual "ghost" prompt cards with a single concatenated display
   - All enabled prompts are now joined together with spacing and shown as a single ready-to-send message
   - Added a gentle blue pulsing glow effect to indicate readiness
   - Included a visual connection (line) to the send button to show relationship

3. **Send Button Integration**
   - Enhanced the send button to respond to enabled prompts even when text input is empty
   - Added visual connection through matching pulsing effects
   - Send button becomes active whenever prompts are enabled
   - Single click sends the entire concatenated prompt text

4. **Consistent Visual Language**
   - Applied consistent styling with subtle animations for feedback
   - Used primary color accents for active elements
   - Maintained the same color scheme across all prompt-related components
   - Ensured visual harmony between ghost prompts, drawer, and buttons

These improvements create a more streamlined workflow where users can quickly activate custom prompts and send them with minimal interaction, while maintaining a cleaner interface with controls positioned in more standard locations.

## Voice Mode Behavior Improvements

We've made important improvements to the voice mode behavior to enhance user experience:

1. **Separation of Text and Voice Modes**
   - Ensured bots only respond with audio in active voice mode
   - Bots now only display typed responses in text mode even if voice is enabled in settings
   - Added explicit isInVoiceMode checks rather than relying only on the enableVoice setting
   - Fixed inconsistencies in the voice response system across components

2. **Fixed Typing Indicator Issues**
   - Resolved an issue where typing indicators would sometimes remain active after responses
   - Added an explicit clearing of all typing indicators at the end of message processing
   - Implemented additional safeguards to ensure typing indicators are properly cleaned up
   - Fixed race conditions that could cause typing indicators to get stuck

3. **Improved Mode-Specific Behaviors**
   - Speech synthesis now strictly checks for active voice mode before playing responses
   - Text mode remains silent even if voice capabilities are enabled
   - Voice ghosts properly inherit appropriate behavior for their mode
   - Clearer distinction between enabling voice capabilities and being in active voice mode

4. **Enhanced Error Recovery**
   - Added additional cleanup of typing indicators in error scenarios
   - Ensured consistent state after failed voice operations
   - More predictable behavior during mode transitions
   - Better error handling for interrupted voice sessions

These changes create a more intuitive experience where the system behaves according to the visible mode (text or voice) rather than just the underlying capabilities settings.

## Voice Mode Duplicate Response Fix

We identified and fixed a complex issue where voice transcriptions would sometimes trigger multiple overlapping bot responses, creating a "chorus of replies" effect in voice mode:

1. **Enhanced Transcription Deduplication**
   - Implemented a multi-layered approach to prevent duplicate transcription processing
   - Added in-progress transcription tracking to block similar transcriptions during processing
   - Normalized text for more accurate similarity matching to catch minor transcription variations
   - Added a response-in-progress lock to ensure only one response is generated at a time

2. **Message Processing Correlation**
   - Created explicit tracking between user messages and corresponding bot responses
   - Added a user-message-to-response map to track which responses belong to which user messages
   - Implemented message ID verification to prevent processing the same message multiple times
   - Added cleanup logic to prevent memory leaks from tracking data structures

3. **Speech Synthesis Coordination**
   - Enhanced the VoiceIntegration component with more selective playback rules
   - Added reference-based tracking of recently processed messages to avoid duplicate synthesis
   - Implemented a cool-down period between voice responses to prevent back-to-back playback
   - Added explicit modality checking to ensure only voice mode messages trigger speech synthesis

4. **Response Processing Guards**
   - Improved the messages collection management to detect and skip already added responses
   - Added validation to ensure bots exist before attempting to generate responses
   - Implemented explicit typing indicator cleanup in finally blocks to prevent stuck indicators
   - Added sequential response delay to prevent overlapping responses in sequential mode

These improvements create a more stable and predictable voice experience by ensuring each user message triggers exactly one response from each bot, with proper spacing and coordination between speech synthesis operations.

## Centralized Voice State Management Implementation

We've implemented a robust centralized state management solution for voice mode using the reducer pattern. This implementation addresses the critical priority item in our TODO list, providing a single source of truth for voice-related state across the application.

### Key Components

1. **VoiceStateContext** (`context/VoiceStateContext.tsx`)  
   - Defines the shape of voice state with a comprehensive interface
   - Implements a strongly-typed action system for state updates
   - Provides initial state with sensible defaults
   - Creates a React context for state distribution

2. **VoiceStateProvider** (`context/VoiceStateProvider.tsx`)  
   - Implements a pure reducer function for predictable state updates
   - Establishes synchronization with VoiceModeManager and VoiceStateManager
   - Integrates with the event system for state changes
   - Maintains bidirectional settings updates with the voice managers

3. **useVoiceStateStore** (`hooks/useVoiceStateStore.ts`)  
   - Custom hook providing simplified access to voice state
   - Includes action dispatchers for common voice operations
   - Offers computed properties for derived state values
   - Eliminates prop drilling with direct context access

### Benefits

- **Single Source of Truth**: All voice-related state is now managed in one location
- **Type Safety**: Comprehensive TypeScript types ensure consistent data handling
- **Unidirectional Data Flow**: Clear action → reducer → state update pattern
- **Improved Component Cohesion**: Components only need to import the hook
- **Eliminates Duplication**: Removes duplicated state tracking across components
- **Centralized Error Handling**: Errors are tracked consistently at the state level

The implementation completes the first priority item in our unified TODO list and provides the foundation for further voice mode refinements.

## Event-Driven Architecture Implementation

We've implemented a comprehensive event-driven architecture to improve component communication and state management throughout the application:

### Core Components

1. **EventBus**
   - Type-safe centralized event management system
   - Supports rich event metadata and filtering
   - Includes debugging capabilities with colored console logging
   - Maintains event history for troubleshooting
   - Supports categorized events for better organization

2. **useEventBus Hook**
   - React hook that provides declarative access to the EventBus
   - Automatic subscription and cleanup management
   - Supports conditional event subscription
   - Preserves component render performance
   - Returns real-time event data as state

3. **EventMonitor Component**
   - Real-time visualization of all events in the system
   - Filtering by event category and text search
   - Interactive event inspection
   - Pause/resume and history functionality
   - Automatic event categorization

### Key Benefits

- **Reduced Component Coupling**: Components now communicate through events rather than direct references
- **Improved Debugging**: Centralized event monitoring makes it easier to track system activity
- **Enhanced Performance**: Targeted updates only when relevant events occur
- **Better Error Handling**: Errors in event handlers don't crash the entire application
- **Type Safety**: TypeScript interfaces ensure correct event data structure

### Event Categories

The event system is organized into logical categories:

- **system**: Core system initialization and configuration events
- **audio**: Audio input/output and device management
- **voice**: User voice activity detection and processing
- **transcription**: Speech-to-text and text analysis
- **voicemode**: Voice mode state transitions and configuration
- **bot**: Bot creation, updates, and response management
- **message**: Chat message lifecycle and processing
- **tool**: Tool invocation and result handling
- **state**: Application state changes
- **connection**: Network connection events

### Usage Examples

Components can use the EventBus directly or through the useEventBus hook:

```tsx
// Using the useEventBus hook
const { data: voiceActivity, count } = useEventBus('voice:activity');

// Subscribe to events conditionally
useEventBus(
  isRecording ? 'audio:level' : undefined,
  (data) => updateAudioVisualizer(data.level)
);

// Emit events easily
const { emit } = useEventBus();
emit('tool:called', { 
  name: 'calculator', 
  parameters: { expression: '2+2' }, 
  timestamp: Date.now() 
});
```

This event-driven architecture provides a solid foundation for future enhancements and makes the codebase more maintainable by reducing dependencies between components.

## Event Monitoring Implementation

Building on the EventBus architecture, we've implemented a comprehensive real-time event monitoring system that visualizes and tracks all events flowing through the application:

### Key Components

1. **EventLoggerButton**
   - Floating action button that toggles an event monitoring panel
   - Displays real-time event statistics and recent events
   - Filters events by category with color-coded visualization
   - Shows event details in expandable JSON format
   - Controlled through application settings

2. **Settings Integration**
   - Added event monitoring toggle in the Debug & Development section
   - Persists user preference in localStorage
   - Communicates with the EventLoggerButton through custom events
   - Available in development mode for debugging

3. **Visualization Improvements**
   - Color-coded event categories for easier scanning
   - Timestamp-based filtering to focus on recent events
   - Expandable event details with proper JSON formatting
   - Event statistics with category-specific counts

### Implementation Benefits

- **Improved Debugging**: Real-time visualization of all system events makes troubleshooting easier
- **Developer Experience**: Interactive monitoring without console.log statements
- **Performance Profiling**: Timing information helps identify bottlenecks
- **Event Flow Visualization**: Seeing the sequence of events helps understand system behavior
- **Selective Activation**: Toggle-based activation ensures it only appears when needed

This monitoring system significantly improves development and debugging capabilities while leveraging the event-driven architecture we've established. It can be easily extended with additional filtering options, event capture, and visualization features as needed.

## Message Processing Pipeline Implementation

We've implemented a robust, event-driven message processing pipeline with clear stages, pure function processors, middleware support, and proper error boundaries. The new architecture follows a unidirectional data flow and employs the middleware pattern for cross-cutting concerns.

### Key Components

1. **PipelineManager**: Orchestrates the entire message flow through configurable stages with proper error handling and timing metrics for each stage.

2. **Stage Processors**: Pure functional processors that handle specific aspects of message processing:
   - **DeduplicationProcessor**: Prevents duplicate messages from being processed multiple times
   - **PreprocessingProcessor**: Applies preprocessing to user messages before LLM calls
   - **LLMCallProcessor**: Handles the core interaction with the language model
   - **ToolResolutionProcessor**: Extracts tool calls from LLM responses
   - **ToolExecutionProcessor**: Executes the resolved tool calls and gets follow-up responses
   - **PostprocessingProcessor**: Applies postprocessing to LLM responses

3. **Middleware System**: 
   - Enables cross-cutting concerns like logging to be applied across stages
   - Allows for straightforward addition of timing, validation, or transformation logic
   - Follows the familiar Express/Connect middleware pattern

4. **Error Boundaries**:
   - Each stage has proper error handling with typed error classes
   - Errors are captured in metadata for debugging
   - Pipeline continues to function even when individual stages fail

5. **Visualization**:
   - Each stage reports detailed timing and processing metrics
   - Results from each stage are preserved in the message metadata
   - Provides a clear view of message transformation across the pipeline

The implementation achieves the goals from our TODO list item #4, formalizing the message processing pipeline with clearly defined stages, pure function processors, middleware support, and proper error handling.

### Benefits of the New Architecture

1. **Modularity**: Each processor handles a specific concern, making the code more maintainable
2. **Flexibility**: Pipeline stages can be enabled/disabled or customized per bot
3. **Observability**: Detailed metrics for each processing stage
4. **Resilience**: Proper error handling with graceful degradation
5. **Extensibility**: Easy to add new stages or middleware

This implementation provides a solid foundation for future enhancements to the message processing workflow.
## Type System

```typescript
// Bot types
export type BotId = string;

export interface BotVoiceSettings {
  voice?: string;
  speed?: number;
  quality?: 'standard' | 'high-quality';
  model?: string;
}

export interface Bot {
  id: string;
  name: string;
  description: string;
  avatar: string;
  model: string;
  systemPrompt: string;
  preProcessingPrompt?: string;
  postProcessingPrompt?: string;
  temperature: number;
  maxTokens: number;
  enabled: boolean;
  useTools: boolean;
  enableReprocessing?: boolean;
  voiceSettings?: BotVoiceSettings;
}

// Message types
export type MessageId = string;
export type MessageRole = 'user' | 'assistant' | 'system';

export interface MessageMetadata {
  processingInfo?: {
    preprocessedContent?: string;
    postprocessedContent?: string;
    processingTime?: number;
    reprocessingDepth?: number;
  };
  toolResults?: {
    toolName: string;
    result: any;
    timestamp: number;
  }[];
}

export interface Message {
  id: string;
  content: string;
  role: 'user' | 'system' | 'assistant';
  sender: string; // Bot ID or 'user'
  senderName?: string; // Display name of the sender
  timestamp: number;
  type: 'text' | 'voice' | 'tool_result';
  metadata?: {
    toolResults?: ToolResult[];
    processing?: ProcessingMetadata;
  };
}

export interface ToolResult {
  toolName: string;
  input: Record<string, any>;
  output: any;
  error?: string;
  executionTime?: number;
}

export interface VoiceProcessingMetadata {
  transcriptionConfidence?: number;
  speechDuration?: number;
  speechModel?: string;
  interimTranscripts?: string[];
}

export interface ProcessingMetadata {
  preProcessed?: boolean;
  postProcessed?: boolean;
  reprocessingDepth?: number;
  processingTime?: number;
  originalContent?: string;
  modifiedContent?: string;
  preprocessedContent?: string;
  postprocessedContent?: string;
  usedFallbackService?: boolean;
  error?: string;
  voiceProcessing?: VoiceProcessingMetadata;
}

// Voice-related settings
export interface VoiceSettings {
  vadMode: 'auto' | 'sensitive' | 'manual';
  vadThreshold?: number; // 0.1-0.9
  prefixPaddingMs?: number;
  silenceDurationMs?: number;
  audioFormat?: 'pcm16' | 'g711_ulaw' | 'g711_alaw';
  sampleRate?: number;
  turnDetection?: {
    threshold?: number;
    prefixPaddingMs?: number;
    silenceDurationMs?: number;
    createResponse?: boolean;
  };
  defaultVoice?: string;
  defaultVoiceModel?: string;
  speed?: number;
  showTransitionFeedback?: boolean;
  keepPreprocessingHooks?: boolean;
  keepPostprocessingHooks?: boolean;
  preserveVoiceHistory?: boolean;
  automaticVoiceSelection?: boolean;
  modality?: 'both' | 'text' | 'audio';
}

// Settings types
export type ResponseMode = 'sequential' | 'roundRobin' | 'all';

export interface GroupChatSettings {
  name: string;
  activeBotIds: string[];
  responseMode: 'sequential' | 'parallel';
  maxReprocessingDepth: number;
  systemPrompt: string;
  voiceSettings?: VoiceSettings;
  processing: {
    enablePreProcessing: boolean;
    enablePostProcessing: boolean;
    preProcessingPrompt: string;
    postProcessingPrompt: string;
  };
  ui: {
    theme: 'light' | 'dark' | 'system';
    messageBubbleStyle: 'modern' | 'classic';
    enableVoice: boolean;
    enableTyping: boolean;
    showTimestamps: boolean;
    showAvatars: boolean;
    showDebugInfo: boolean;
  };
}

// Context types
export interface GroupChatState {
  settings: GroupChatSettings;
  messages: Message[];
  bots: Bot[];
  isRecording: boolean;
  isProcessing: boolean;
  settingsOpen: boolean;
  activeSettingsTab: string;
  selectedBotId: string | null;
  typingBotIds: string[];
  isLoading: boolean;
  error?: string;
}

export type GroupChatAction =
  | { type: 'SET_SETTINGS'; payload: Partial<GroupChatSettings> }
  | { type: 'ADD_MESSAGE'; payload: Message }
  | { type: 'ADD_MESSAGES'; messages: Message[] }
  | { type: 'SET_MESSAGES'; messages: Message[] }
  | { type: 'SET_BOTS'; bots: Bot[] }
  | { type: 'ADD_BOT'; bot: Bot }
  | { type: 'REMOVE_BOT'; botId: BotId }
  | { type: 'UPDATE_BOT'; botId: BotId; updates: Partial<Bot> }
  | { type: 'UPDATE_VOICE_SETTINGS'; payload: Partial<VoiceSettings> }
  | { type: 'SET_LOADING'; isLoading: boolean }
  | { type: 'SET_TYPING_BOTS'; botIds: BotId[] }
  | { type: 'ADD_TYPING_BOT'; botId: BotId }
  | { type: 'REMOVE_TYPING_BOT'; botId: BotId }
  | { type: 'SET_ERROR'; error: string }
  | { type: 'CLEAR_ERROR' }
  | { type: 'TOGGLE_RECORDING' }
  | { type: 'SET_PROCESSING'; payload: boolean }
  | { type: 'TOGGLE_SETTINGS' }
  | { type: 'SET_ACTIVE_SETTINGS_TAB'; payload: string }
  | { type: 'SET_SELECTED_BOT'; payload: string | null }
  | { type: 'SET_TYPING_BOT_IDS'; payload: string[] }
  | { type: 'RESET_CHAT' }; 
```

## Directory Structure

```
/app/usergroupchatcontext/
├── README.md (4.1KB)
├── api/
  ├── latest-openai-models/
    ├── route.ts (3KB)
  ├── livekit/
    ├── room/
      ├── route.ts (5.6KB)
    ├── token/
      ├── route.ts (5.4KB)
  ├── livekit-token/
    ├── index.ts (0.3KB)
    ├── route.ts (3.8KB)
  ├── livekit-token-redirect/
    ├── route.ts (1.1KB)
  ├── openai/
    ├── chat/
      ├── route.ts (4.7KB)
  ├── synthesize-speech/
    ├── route.ts (2.9KB)
├── components/
  ├── accessibility/
    ├── AccessibilityControls.tsx (9.7KB)
  ├── bots/
    ├── BotCard.tsx (3.5KB)
  ├── chat/
    ├── ChatContainer.tsx (0.4KB)
    ├── ChatHeader.tsx (1.1KB)
    ├── ChatInput.tsx (8.4KB)
    ├── ChatInterface.tsx (7.1KB)
    ├── GhostPromptsList.tsx (2.5KB)
    ├── MessageBubble.tsx (3.5KB)
    ├── MessageInput.tsx (2.7KB)
    ├── MessageItem.tsx (22.6KB)
    ├── MessageList.tsx (1.9KB)
    ├── MessageSpeaker.tsx (2.2KB)
    ├── OpenAIVoiceButton.tsx (3.6KB)
    ├── TypingIndicator.tsx (1.5KB)
    ├── VoiceInputButton.tsx (13.4KB)
    ├── VoiceModeRedbar.tsx (12.8KB)
  ├── debug/
    ├── DebugInfo.tsx (6.8KB)
    ├── EventLoggerButton.tsx (6.5KB)
    ├── EventMonitor.tsx (8.4KB)
    ├── ProcessingInfo.tsx (6KB)
    ├── VoiceGhostDebugger.tsx (13.3KB)
  ├── prompts/
    ├── DrawerTopBar.tsx (1.1KB)
    ├── PromptsButton.tsx (0.6KB)
    ├── PromptsDrawer.tsx (1.3KB)
    ├── ToggleContainer.tsx (4.5KB)
    ├── TogglePrompt.tsx (3.5KB)
    ├── index.ts (0.2KB)
    ├── prompts.css (5.7KB)
  ├── settings/
    ├── AccessibilitySettingsPanel.tsx (9.5KB)
    ├── BotConfigPanel.tsx (21.8KB)
    ├── BotSettingsModal.tsx (1KB)
    ├── GroupSettingsPanel.tsx (37.2KB)
    ├── PromptEditor.tsx (4.8KB)
    ├── SettingsModal.tsx (3.5KB)
    ├── SettingsPanel.tsx (10.4KB)
    ├── VoiceSettingsPanel.tsx (21.5KB)
    ├── VoiceTransitionSettings.tsx (8.5KB)
  ├── tools/
    ├── ToolCallWrapper.tsx (3.4KB)
    ├── ToolIntegrationProvider.tsx (0.5KB) # State/service provider
    ├── ToolPanel.tsx (5KB)
    ├── VoiceToolConfirmation.tsx (4.7KB)
  ├── voice/
    ├── AccessibleVoiceControls.tsx (12.6KB)
    ├── AudioVisualizer.tsx (1.7KB)
    ├── MobileFriendlyVoiceControl.tsx (5.6KB)
    ├── VoiceActivityIndicator.tsx (0.7KB)
    ├── VoiceAnalytics.tsx (7.2KB)
    ├── VoiceBotSelector.tsx (4.7KB)
    ├── VoiceCommandController.tsx (19.8KB)
    ├── VoiceContextInheritance.tsx (4.2KB) # Context definition
    ├── VoiceConversationController.tsx (13.9KB)
    ├── VoiceInputButton.tsx (3.9KB)
    ├── VoiceIntegration.tsx (4.3KB)
    ├── VoiceModeBlackbar.tsx (6.5KB)
    ├── VoiceOverlay.tsx (15KB)
    ├── VoicePlaybackControls.tsx (3.4KB)
    ├── VoiceResponseManager.tsx (6KB)
    ├── VoiceTextTransitionHandler.tsx (3.7KB)
    ├── VoiceTransitionEventManager.tsx (6.8KB)
    ├── VoiceTransitionFeedback.tsx (4.4KB)
    ├── WebSpeechTest.tsx (8.9KB)
├── context/
  ├── BotRegistryContext.tsx (1.7KB) # Context definition
  ├── BotRegistryProvider.tsx (10.7KB) # State/service provider
  ├── GroupChatContext.tsx (3.4KB) # Context definition
  ├── GroupChatProvider.tsx (6.7KB) # State/service provider
  ├── LiveKitIntegrationProvider.tsx (40.4KB) # State/service provider
  ├── LiveKitProvider.tsx (10.7KB) # State/service provider
  ├── PromptsContext.tsx (8.6KB) # Context definition
  ├── ToolCallProvider.tsx (5.4KB) # State/service provider
  ├── VoiceStateContext.tsx (3.6KB) # Context definition
  ├── VoiceStateProvider.tsx (7.5KB) # State/service provider
├── data/
  ├── defaultSettings.ts (1.5KB)
  ├── sampleBots.ts (4.4KB)
├── docs/
  ├── pinecone-integration.md (2.8KB)
  ├── voice-context-inheritance.md (4.1KB)
├── hooks/
  ├── useEventBus.ts (2.4KB)
  ├── useGroupChat.ts (3.2KB)
  ├── useLiveKit.ts (4KB)
  ├── usePromptProcessor.ts (3.3KB)
  ├── useRealGroupChat.ts (6.3KB)
  ├── useToolIntegration.ts (6.9KB)
  ├── useTurnTaking.ts (4.2KB)
  ├── useVoiceActivity.ts (2.5KB)
  ├── useVoiceSettings.ts (5.5KB)
  ├── useVoiceState.ts (3.8KB)
  ├── useVoiceStateStore.ts (5.9KB)
  ├── useVoiceToolConfirmation.ts (2.1KB)
├── layout.tsx (0.4KB)
├── llm_copilot_overview_and_todo.md (72.6KB)
├── mobile.css (5.1KB)
├── page.tsx (10.4KB)
├── scripts/
├── services/
  ├── connection/
    ├── ConnectionManager.ts (20.5KB)
  ├── events/
    ├── EventBus.ts (14.6KB)
  ├── fallbackBotService.ts (8.1KB) # Service implementation
  ├── livekit/
    ├── README.md (3.3KB)
    ├── REFACTORING.md (2.5KB)
    ├── audio-publishing-service.ts (8.3KB)
    ├── audio-track-manager.ts (9.3KB)
    ├── index.ts (1.5KB)
    ├── livekit-api-client.ts (3.9KB)
    ├── livekit-service.ts (8.6KB)
    ├── multimodal-agent-service.ts (23.6KB)
    ├── participant-manager.ts (5.5KB)
    ├── room-session-manager.ts (4.4KB)
    ├── session-connection-manager.ts (8.6KB)
    ├── speech-synthesis-service.ts (6.2KB)
    ├── tool-detection-service.ts (6.2KB)
    ├── transcription-manager.ts (11.1KB)
    ├── turn-taking-service.ts (20.3KB)
    ├── voice-activity-service.ts (17.4KB)
  ├── mockBotService.ts (8KB) # Service implementation
  ├── openaiChatService.ts (2.7KB) # Service implementation
  ├── openaiRealtimeService.ts (12.8KB) # Service implementation
  ├── pineconeService.ts (1.6KB) # Service implementation
  ├── pipeline/
    ├── PipelineFactory.ts (3.5KB)
    ├── PipelineManager.ts (10.1KB)
    ├── index.ts (0.3KB)
    ├── middlewares/
      ├── LoggingMiddleware.ts (1.5KB)
    ├── processors/
      ├── DeduplicationProcessor.ts (3.8KB)
      ├── LLMCallProcessor.ts (4.8KB)
      ├── PostprocessingProcessor.ts (4.4KB)
      ├── PreprocessingProcessor.ts (3.3KB)
      ├── ToolExecutionProcessor.ts (4.6KB)
      ├── ToolResolutionProcessor.ts (2.5KB)
      ├── index.ts (0.4KB)
    ├── types.ts (2.4KB) # Type definitions
  ├── prompt-processor-service.ts (15.8KB)
  ├── toolCallService.ts (5.8KB) # Service implementation
  ├── toolProcessorService.ts (4.7KB) # Service implementation
  ├── tools/
    ├── voiceTimerTool.ts (8.8KB)
    ├── voiceWeatherTool.ts (6.9KB)
  ├── voice/
    ├── AudioAnalyzerService.ts (6.4KB) # Service implementation
    ├── AudioContextManager.ts (5.3KB) # Context definition
    ├── VoiceActivityDetector.ts (11.6KB)
    ├── VoiceModeManager.ts (23KB)
    ├── VoiceStateManager.ts (5KB)
    ├── voice-analytics-service.ts (13KB)
    ├── voice-auth-service.ts (12.1KB)
  ├── voiceSynthesisService.ts (12.7KB) # Service implementation
  ├── voiceToolCallingService.ts (11.8KB) # Service implementation
  ├── voiceToolRegistry.ts (2.9KB)
  ├── voiceTranscriptionService.ts (7.3KB) # Service implementation
├── speech-test/
  ├── page.tsx (0.9KB)
├── styles/
  ├── blackbar.css (5.5KB)
├── tempfix.ts (0.1KB)
├── types/
  ├── bots.ts (1.5KB)
  ├── index.ts (0.1KB)
  ├── livekit.ts (2.4KB)
  ├── messages.ts (2.7KB)
  ├── prompts.ts (1.2KB)
  ├── settings.ts (3.1KB)
  ├── voice.ts (5.2KB)
├── types.ts (4.6KB) # Type definitions
├── utils/
  ├── generateReadme.js (4.6KB)
  ├── livekit-auth.ts (2.9KB)
  ├── llm_copilot_part1.md (59.6KB)
  ├── llm_copilot_todo.txt (1.5KB)
  ├── toolResponseFormatter.ts (3.7KB)
```

