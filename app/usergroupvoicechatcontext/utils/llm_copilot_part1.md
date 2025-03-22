# UserGroupChatContext: Mobile-First AI Group Chat Architecture

## Overview

GroupChatContext provides a minimalist, mobile-first group chat interface where users can communicate with one or more AI bots through both text and voice. The system features a unified text chat that serves as the central communication hub, capturing all interactions regardless of input method.

We're using livekit to connect to openai, here's documentation: https://docs.livekit.io/agents/integrations/openai/realtime/

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

2. [X] **Implement Event-Driven Architecture** (Priority: High)
   - [X] Create a proper EventBus with typed events
   - [X] Define standard events (TranscriptionReceivedEvent, ResponseGeneratedEvent, etc.)
   - [X] Implement pub/sub system for component communication
   - [X] Replace direct method calls with event dispatch
   - [X] Add event debugging and monitoring

3. [X] **Formalize Message Processing Pipeline** (Priority: High)
   - [X] Define clear processing stages (deduplication → pre-processing → LLM call → post-processing)
   - [X] Create pure function processors for each stage
   - [X] Add middleware system for cross-cutting concerns
   - [X] Implement proper error boundaries between stages
   - [X] Create visualization for message transformation flow

4. [X] **Fix Voice Mode Activation** (Priority: Critical)
   - [X] Fix voiceModeManager.activateVoiceMode() to accept proper parameters
   - [X] Fix import issues with VoiceModeBlackbar component by creating a duplicate in the chat directory
   - [X] Fix AudioVisualizer import by embedding it directly in the VoiceModeBlackbar component
   - [X] Fix AudioContext initialization issues to ensure proper resuming on user interaction
   - [X] Make voice mode UI show even when backend connections fail
   - [X] Add comprehensive error handling for voice mode activation failures
   - [X] Fix audio-publishing-service.ts missing default export bug
   - [_] Test voice mode button activation flow end-to-end

5. [X] **Fix Voice Ghost Routing System** (Priority: High)
   - [X] Implement exclusive routing to voice ghosts when in voice mode
   - [X] Prevent original bots from receiving messages during voice mode
   - [X] Add proper state flag to identify active voice ghosts vs original bots
   - [X] Fix unified text chat to only show transcripts from user and active voice ghost
   - [X] Implement proper bot status tracking with temporary pause for original bots
   - [X] Fix the multiple-voice response issue by ensuring only voice ghosts respond in voice mode

6. [X] **Fix Voice Mode Erroneous Additional Responses** (Priority: Critical)
   - [X] Implement centralized message processing lock to prevent concurrent processing
   - [X] Enhance message correlation with unique IDs to track user message to bot response relationships
   - [X] Create unified transcription processing service to eliminate redundant handlers
   - [X] Implement strict mode-based message routing that respects voice/text mode boundaries
   - [X] Add response coordination with proper cooldown periods between voice outputs

7. [_] **Complete Voice-to-Text Transition** (Priority: High)
   - [X] Create system to re-enable processing hooks when returning to text mode
   - [X] Ensure conversation history is maintained across transitions
   - [X] Handle interrupted voice sessions gracefully
   - [X] Develop error recovery mechanisms for failed transitions
   - [X] Implement smooth transition animations/feedback

8. [_] **Separate Services from UI Components** (Priority: High)
   - [_] Move voice processing logic from UI components to services
   - [_] Extract LiveKitIntegrationProvider business logic to dedicated services
   - [_] Create facade services for component access
   - [_] Make UI components purely presentational
   - [_] Implement proper dependency injection for services

9. [_] **Finalize Voice Ghost Lifecycle Management** (Priority: High)
   - [X] Design data structure for tracking ghost and standard bots
   - [X] Add tracking of both standard bots and their voice ghost counterparts
   - [X] Add robust cleanup methods for voice ghosts
   - [X] Implement staged approach to ghost deactivation
   - [X] Add event listeners for voice mode state changes
   - [_] Ensure seamless transition between voice and text modes

10. [_] **Apply Unidirectional Data Flow** (Priority: Medium)
    - [X] Clearly define input → process → output pipelines
    - [X] Implement state reducers with pure functions
    - [_] Eliminate side effect chains across components
    - [X] Create action creators for all state changes
    - [X] Add immutable state updates throughout the app

11. [_] **Complete Voice Mode Settings UI** (Priority: Medium)
    - [X] Implement comprehensive UI controls in GroupSettingsPanel
    - [X] Create persistent storage for voice preferences
    - [X] Add visual feedback during transitions between voice and text modes
    - [X] Integrate VoiceTransitionSettings component into settings workflow
    - [X] Add user preferences for voice model selection
    - [X] Create settings storage for voice ghost behavior options

12. [_] **Bot Manager Voice Ghost Controls** (Priority: Medium)
    - [X] Implement creation/destruction methods for voice ghosts
    - [X] Add state tracking for active voice mode sessions
    - [X] Create event hooks for voice mode transitions
    - [_] Add logging for voice ghost lifecycle events

13. [_] **Optimize Performance for Mobile** (Priority: Medium)
    - [_] Improve responsiveness of voice mode on mobile devices
    - [_] Optimize audio processing to reduce battery consumption
    - [_] Enhance touch interactions for voice controls
    - [_] Test and fix any mobile-specific issues with microphone access

14. [_] **Complete VoiceModeBlackbar Implementation** (Priority: Medium)
    - [X] Create VoiceModeBlackbar component to replace overlay
    - [X] Integrate audio visualization directly in blackbar
    - [X] Add smooth transitions between text and voice mode
    - [_] Fix any styling or positioning issues on mobile
    - [_] Ensure proper cleanup when closing voice mode

15. [_] **Voice Mode Settings Configuration** (Priority: Medium)
    - [_] Add UI controls for voice mode settings in GroupSettingsPanel
    - [_] Create settings storage for voice ghost behavior options
    - [X] Implement settings inheritance/override mechanism
    - [_] Add user preferences for voice model selection

16. [_] **Enhance Error Handling and Resilience** (Priority: Medium)
    - [_] Implement more robust error recovery for broken connections
    - [_] Add automatic reconnection logic for interrupted voice sessions
    - [X] Improve error messaging for users when voice mode fails
    - [X] Fix OpenAI API routes to properly validate models and handle errors
    - [_] Add telemetry for tracking voice mode stability

17. [_] **Implement Command Pattern for Actions** (Priority: Medium)
    - [_] Define discrete commands (ProcessTranscriptionCommand, etc.)
    - [_] Create command bus for dispatching
    - [_] Add middleware for cross-cutting concerns
    - [_] Implement command history and undo capability
    - [_] Add detailed command logging for debugging

18. [_] **Unified Text Chat Enhancements** (Priority: Medium)
    - [X] Improve transcription display in chat interface
    - [X] Add visual indicators for voice vs. text messages
    - [X] Implement collapsible details for voice processing information
    - [_] Enhance accessibility for voice interactions
    - [_] Add visual indicators for active speaker

19. [_] **Reduce State Duplication** (Priority: Low)
    - [X] Continue reducing redundant state tracking across components
    - [X] Consolidate voice-related state management
    - [X] Improve type safety across component boundaries

20. [_] **Cross-Browser Compatibility** (Priority: Low)
    - [_] Test and fix WebRTC compatibility issues across browsers
    - [_] Ensure consistent audio processing across platforms
    - [_] Implement fallback mechanisms for unsupported browsers

21. [_] **Voice Experience Refinements** (Priority: Low)
    - [_] Add voice tone/emotion detection
    - [_] Implement natural turn-taking mechanisms
    - [_] Enhance voice activity detection accuracy in noisy environments
    - [_] Add support for multiple languages
