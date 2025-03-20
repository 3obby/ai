# UserGroupChatContext: Mobile-First AI Group Chat Architecture

## Overview

GroupChatContext provides a minimalist, mobile-first group chat interface where users can communicate with one or more AI bots through both text and voice. The system features a unified text chat that serves as the central communication hub, capturing all interactions regardless of input method.

## Key Terminology

- **Voice Ghost**: A temporary clone of a text-based bot created when transitioning to voice mode. Voice ghosts maintain conversation context but have specialized voice-optimized settings.
- **Voice Mode**: The interactive state activated by the "voice mode" button at the bottom of the chat interface. In this mode, users converse with bots through speech rather than typing.
- **Unified Text Chat**: The central conversation thread that captures all interactions, whether they originated as text input or transcribed voice.

## Text-Voice Transition System

The system is designed to provide a seamless transition between text and voice interactions:

1. **Text-to-Voice Transition**
   - When a user activates voice mode, a "voice ghost" is created for each active bot
   - Voice ghosts inherit the full conversation context from their text-based counterparts
   - Pre-processing, post-processing, and rework hooks are disabled for voice ghosts
   - The latest OpenAI realtime voice model is automatically selected and initialized with context
   - User speech is captured through WebRTC and streamed to the voice model

2. **Voice-to-Text Transition**
   - When a user deactivates voice mode, the system returns to the text-based model
   - All voice interactions (both user and bot responses) remain in the unified text chat
   - Text-based model regains access to the complete conversation history, including voice exchanges
   - Pre-processing, post-processing, and rework hooks are re-enabled for the text model

All interactions, whether text or voice, are transcribed and stored in the unified text chat, ensuring a consistent conversation thread that maintains full context regardless of the input method.

## Development Direction

We have shifted our efforts to create a robust production-ready system. By default:

1. **Latest OpenAI Models by Default**  
   - Text interactions use the latest GPT model (e.g., gpt-4o)  
   - Voice interactions automatically switch to the newest realtime OpenAI model for an optimal experience  

2. **LiveKit Integration with OpenAI**  
   - For realtime models: Use the MultimodalAgent class with RealtimeModel (e.g., gpt-4o-realtime-preview-yyyy-mm-dd)  
   - For text models: Use the LLM class (e.g., gpt-4o)  
   - Model versions are dynamically queried at build time to ensure currency  

3. **Single-Bot Experience**  
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


## TODO - Prioritized Roadmap

1. [_] Complete Voice Mode Settings UI (Priority: Highest)
   - [_] Implement comprehensive UI controls in GroupSettingsPanel
   - [_] Create persistent storage for voice preferences
   - [_] Add visual feedback during transitions between voice and text modes
   - [_] Integrate VoiceTransitionSettings component into settings workflow
   - [_] Add user preferences for voice model selection
   - [_] Create settings storage for voice ghost behavior options

2. [_] Finalize Voice Ghost Lifecycle Management (Priority: High)
   - [X] Design data structure for tracking ghost and standard bots
   - [X] Add tracking of both standard bots and their voice ghost counterparts
   - [X] Add robust cleanup methods for voice ghosts
   - [X] Implement staged approach to ghost deactivation
   - [_] Add event listeners for voice mode state changes
   - [_] Ensure seamless transition between voice and text modes

3. [_] Complete Voice-to-Text Transition (Priority: High)
   - [X] Create system to re-enable processing hooks when returning to text mode
   - [X] Ensure conversation history is maintained across transitions
   - [X] Handle interrupted voice sessions gracefully
   - [X] Develop error recovery mechanisms for failed transitions
   - [_] Implement smooth transition animations/feedback

4. [_] Optimize Performance for Mobile (Priority: High)
   - [_] Improve responsiveness of voice mode on mobile devices
   - [_] Optimize audio processing to reduce battery consumption
   - [_] Enhance touch interactions for voice controls
   - [_] Test and fix any mobile-specific issues with microphone access

5. [_] Enhance Error Handling and Resilience (Priority: Medium)
   - [_] Implement more robust error recovery for broken connections
   - [_] Add automatic reconnection logic for interrupted voice sessions
   - [_] Improve error messaging for users when voice mode fails
   - [_] Add telemetry for tracking voice mode stability

6. [_] Reduce State Duplication (Priority: Medium)
   - [_] Continue reducing redundant state tracking across components
   - [_] Consolidate voice-related state management
   - [_] Improve type safety across component boundaries

7. [_] Bot Manager Voice Ghost Controls (Priority: Medium)
   - [X] Implement creation/destruction methods for voice ghosts
   - [_] Add state tracking for active voice mode sessions
   - [X] Create event hooks for voice mode transitions
   - [_] Add logging for voice ghost lifecycle events

8. [_] Unified Text Chat Enhancements (Priority: Medium)
   - [X] Improve transcription display in chat interface
   - [X] Add visual indicators for voice vs. text messages
   - [X] Implement collapsible details for voice processing information
   - [_] Enhance accessibility for voice interactions
   - [_] Add visual indicators for active speaker

9. [_] Cross-Browser Compatibility (Priority: Low)
   - [_] Test and fix WebRTC compatibility issues across browsers
   - [_] Ensure consistent audio processing across platforms
   - [_] Implement fallback mechanisms for unsupported browsers

10. [_] Voice Experience Refinements (Priority: Low)
    - [_] Add voice tone/emotion detection
    - [_] Implement natural turn-taking mechanisms
    - [_] Enhance voice activity detection accuracy in noisy environments
    - [_] Add support for multiple languages

## Implementation Plan

1. [X] Voice Detection and Processing
   - [X] Implement robust voice activity detection
   - [X] Fix transcription handling via Web Speech API
   - [X] Connect voice transcriptions to unified text chat
   - [X] Add voice mode state management
   - [X] Add visual feedback for microphone levels

2. [X] Code Modularization (Priority: High)
   - [X] Split multimodal-agent-service.ts into smaller, focused modules
   - [X] Refactor voice-activity-service.ts into specialized components
   - [X] Extract audio initialization logic from VoiceInputButton.tsx
   - [X] Create a centralized VoiceModeManager with state machine
   - [X] Implement AudioContextManager for managing browser audio context
   - [X] Create AudioAnalyzerService for audio processing and level detection
   - [X] Build dedicated VoiceActivityDetector with improved accuracy

3. [X] Architecture Simplification (Priority: High)
   - [X] Implement unified connection management
   - [X] Create cleaner service interfaces with single responsibilities
   - [X] Streamline event handling with centralized event bus
   - [_] Reduce redundant state tracking across components
   - [X] Create strongly typed event systems

4. [_] BotRegistry Voice Ghost Management (Priority: High)
   - [X] Design data structure for tracking ghost and standard bots
   - [X] Add tracking of both standard bots and their voice ghost counterparts
   - [_] Implement voice ghost lifecycle management
   - [_] Add proper cleanup of voice ghosts when returning to text mode

5. [_] Voice Mode Settings Configuration (Priority: High)
   - [_] Add UI controls for voice mode settings in GroupSettingsPanel
   - [_] Create settings storage for voice ghost behavior options
   - [X] Implement settings inheritance/override mechanism
   - [_] Add user preferences for voice model selection

6. [X] Voice Ghost Implementation (Priority: Medium)
   - [X] Create logic to clone text bots when entering voice mode
   - [X] Implement specialized settings for voice-optimized interactions
   - [X] Add state management for voice ghost bots

7. [X] Text-to-Voice Transition (Priority: Medium)
   - [X] Build mechanism to disable pre/post/rework hooks on voice ghosts
   - [X] Develop context inheritance from text bot to voice ghost
   - [_] Implement smooth transition animations/feedback

8. [_] Voice-to-Text Transition (Priority: High)
   - [_] Create system to re-enable processing hooks when returning to text mode
   - [_] Ensure conversation history is maintained across transitions
   - [_] Handle interrupted voice sessions gracefully
   - [_] Develop error recovery mechanisms for failed transitions

9. [_] Bot Manager Voice Ghost Controls (Priority: Medium)
   - [_] Implement creation/destruction methods for voice ghosts
   - [_] Add state tracking for active voice mode sessions
   - [_] Create event hooks for voice mode transitions
   - [_] Add logging for voice ghost lifecycle events

10. [_] Unified Text Chat Enhancements (Priority: Medium)
    - [_] Improve transcription display in chat interface
    - [_] Ensure proper formatting of voice interactions in text format
    - [_] Add visual indicators for voice vs. text messages
    - [_] Implement collapsible details for voice processing information

## Current Progress (Updated)

The project has made significant progress in implementing the core voice mode architecture:

1. **VoiceModeManager**: Successfully implemented as a state machine that handles voice mode transitions, ghost creation, and context inheritance.

2. **Voice Context Inheritance**: Implemented and working through the VoiceContextInheritance component, which creates voice bot clones with full conversation history.

3. **BotRegistryProvider**: Enhanced with robust voice ghost creation capabilities through the cloneBotInstanceForVoice method.

## Next Priorities

1. **Complete Voice-to-Text Transition** (High Priority):
   - Implement system to properly restore text mode with all processing hooks
   - Ensure all voice interactions are preserved in conversation history
   - Add error handling for interrupted voice sessions

2. **Enhance Voice Mode Settings UI** (High Priority):
   - Add dedicated UI controls in GroupSettingsPanel for configuring voice mode
   - Create persistent storage for voice ghost behavior preferences
   - Add voice model selection options with dynamic model fetching

3. **Finalize Voice Ghost Lifecycle Management** (High Priority):
   - Implement proper cleanup and garbage collection for voice ghosts
   - Add event listeners for voice mode state changes
   - Ensure seamless transition between voice and text modes

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

## Recent Implementation Progress

### Voice Mode Settings UI Enhancement

We've completed significant improvements to the Voice Mode Settings UI:

1. **Comprehensive Voice Settings Panel**
   - Added voice model selection functionality with automatic fetching of the latest OpenAI models
   - Integrated VoiceTransitionSettings component into the main settings panel
   - Added visual feedback during transitions between voice and text modes
   - Created settings storage for voice ghost behavior options

2. **VoiceTransitionFeedback Component**
   - Implemented real-time visual feedback during mode transitions
   - Added different animated indicators based on the current transition state
   - Made transition feedback configurable through user settings

3. **Voice Model Selection System**
   - Added fetchLatestVoiceModel method to dynamically query the newest available models
   - Implemented automatic model selection based on user preferences
   - Created fallback mechanisms to ensure the system remains functional even if API calls fail

### Voice Ghost Lifecycle Management

We've significantly improved the Voice Ghost Lifecycle Management:

1. **Enhanced VoiceModeManager**
   - Implemented robust cleanupVoiceGhosts method for proper resource cleanup
   - Added enhanced state tracking with transition timing metrics
   - Improved error handling and recovery for interrupted sessions
   - Added comprehensive event system for tracking lifecycle events

2. **VoiceTextTransitionHandler Component**
   - Created dedicated component to manage voice-to-text transitions
   - Implemented proper re-enabling of processing hooks when returning to text mode
   - Added error recovery mechanisms for failed transitions
   - Created event handling for interrupted voice sessions

3. **BotRegistry Enhancements**
   - Improved cloneBotInstanceForVoice method for creating voice-optimized bot clones
   - Enhanced voice ghost cleanup process with staged approach to prevent UI glitches
   - Added tracking of transition times for performance optimization

These enhancements significantly improve the user experience when transitioning between voice and text modes, ensuring seamless conversation continuity while maintaining optimal performance characteristics for each modality.

## Recent Progress on Reducing State Duplication

We've made significant improvements to reduce state duplication in the voice-related components:

1. **Centralized Voice Settings Management**
   - Enhanced `useVoiceSettings` hook to serve as the single source of truth for all voice settings
   - Implemented automatic synchronization between the settings state and VoiceModeManager
   - Eliminated redundant storage of settings across components and services
   - Added type-safe accessors for commonly used settings to reduce props drilling

2. **Voice State Management Consolidation**
   - Created `VoiceStateManager` service to centralize all voice mode state tracking
   - Implemented event-based architecture to propagate state changes consistently
   - Reduced duplicated state between UI components and manager classes
   - Provided read-only access to state through getters to prevent inconsistent updates

3. **React Integration with useVoiceState**
   - Developed `useVoiceState` hook for React components to access the centralized state
   - Added automatic synchronization with component state for proper rendering
   - Implemented integration with other hooks (useGroupChat, useBotRegistry)
   - Consolidated redundant voice control methods across components

4. **Enhanced Type System for Voice Components**
   - Created specialized type definitions for all voice-related data structures
   - Added strong typing with explicit named types (VoiceOption, VadMode, AudioQuality)
   - Improved consistency between component types and service interfaces
   - Separated bot-specific voice settings from global voice settings
   - Added detailed metadata interfaces for voice sessions and transitions

5. **Component Updates to Use Centralized Hooks**
   - Updated `VoiceInputButton` to use useVoiceState, replacing direct service calls
   - Refactored `VoiceTransitionFeedback` to leverage centralized state for UI feedback
   - Enhanced `VoiceSettingsPanel` to use the new hooks for synchronized settings
   - Updated `VoiceContextInheritance` to use useVoiceState for consistent recording state
   - Converted `VoiceTextTransitionHandler` to rely on useVoiceState for transitions
   - Improved `MobileFriendlyVoiceControl` with centralized state management
   - Updated `VoiceTransitionSettings` to use direct settings access through hooks
   - Retrofitted debugging tools like `VoiceGhostDebugger` to use the centralized state

These improvements address the "Reduce State Duplication" priority from the roadmap, resulting in:
- More reliable state tracking with fewer inconsistencies
- Easier debugging of voice-related issues
- Better separation of concerns with clear responsibilities
- Reduced cognitive load when implementing new voice-related features
- Improved type safety through consistent interfaces