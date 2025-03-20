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


## TODO
Voice Ghost Implementation (todo)
Create logic to clone text bots when entering voice mode
Implement specialized settings for voice-optimized interactions
Text-to-Voice Transition (todo)
Build mechanism to automatically disable pre/post/rework hooks on voice ghosts
Develop context inheritance from text bot to voice ghost
Voice-to-Text Transition (todo)
Create system to re-enable processing hooks when returning to text mode
Ensure conversation history is properly maintained across transitions
BotRegistry Voice Ghost Management (todo)
Add tracking of both standard bots and their voice ghost counterparts
Implement voice ghost lifecycle management
Voice Mode Settings Configuration (todo)
Add UI controls for voice mode settings in GroupSettingsPanel
Create settings storage for voice ghost behavior options
Bot Manager Voice Ghost Controls (todo)
Implement creation/destruction methods for voice ghosts
Add state tracking for active voice mode sessions
Unified Text Chat Enhancements (todo)
Improve transcription display in chat interface
Ensure proper formatting of voice interactions in text format

## Implementation Plan

1. [X] Voice Detection and Processing
   - [X] Implement robust voice activity detection
   - [X] Fix transcription handling via Web Speech API
   - [X] Connect voice transcriptions to unified text chat
   - [X] Add voice mode state management
   - [X] Add visual feedback for microphone levels

2. [_] Code Modularization (Priority: High)
   - [_] Split multimodal-agent-service.ts into smaller, focused modules
   - [_] Refactor voice-activity-service.ts into specialized components
   - [_] Extract audio initialization logic from VoiceInputButton.tsx
   - [_] Create a centralized VoiceModeManager with state machine

3. [_] Architecture Simplification (Priority: High)
   - [_] Implement unified connection management
   - [_] Create cleaner service interfaces with single responsibilities
   - [_] Streamline event handling with centralized event bus
   - [_] Reduce redundant state tracking across components

4. [_] BotRegistry Voice Ghost Management (Priority: Medium)
   - [_] Design data structure for tracking ghost and standard bots
   - [_] Add tracking of both standard bots and their voice ghost counterparts
   - [_] Implement voice ghost lifecycle management

5. [_] Voice Mode Settings Configuration (Priority: Medium)
   - [_] Add UI controls for voice mode settings in GroupSettingsPanel
   - [_] Create settings storage for voice ghost behavior options
   - [_] Implement settings inheritance/override mechanism

6. [_] Voice Ghost Implementation (Priority: Medium)
   - [_] Create logic to clone text bots when entering voice mode
   - [_] Implement specialized settings for voice-optimized interactions
   - [_] Add state management for voice ghost bots

7. [_] Text-to-Voice Transition (Priority: Medium)
   - [_] Build mechanism to disable pre/post/rework hooks on voice ghosts
   - [_] Develop context inheritance from text bot to voice ghost
   - [_] Implement smooth transition animations/feedback

8. [_] Voice-to-Text Transition (Priority: Medium)
   - [_] Create system to re-enable processing hooks when returning to text mode
   - [_] Ensure conversation history is maintained across transitions
   - [_] Handle interrupted voice sessions gracefully

9. [_] Bot Manager Voice Ghost Controls (Priority: Medium)
   - [_] Implement creation/destruction methods for voice ghosts
   - [_] Add state tracking for active voice mode sessions
   - [_] Create event hooks for voice mode transitions

10. [_] Unified Text Chat Enhancements (Priority: Low)
    - [_] Improve transcription display in chat interface
    - [_] Ensure proper formatting of voice interactions in text format
    - [_] Add visual indicators for voice vs. text messages