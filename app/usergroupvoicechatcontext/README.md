# UserGroupChatContext - Voice Mode Documentation

## Overview

The voice mode in the UserGroupChatContext provides a continuous, real-time voice chat experience using LiveKit integration. When activated, it maintains an ongoing conversation without ending after a single transcription, allowing users to speak naturally with AI assistants. The system now uses premium high-quality voice models for superior, human-like speech synthesis.

## Voice Mode Features

- **Continuous Conversation**: Voice mode stays active until explicitly ended by the user
- **Real-time Transcription**: Speech is transcribed and added to the chat history in real-time
- **High-Quality Voice Synthesis**: Uses OpenAI's TTS-1-HD model with premium voices (Ash and Coral) for natural, human-like responses
- **Voice Alternation**: Automatically alternates between Ash and Coral voices for a more natural conversation flow
- **Context Preservation**: Full conversation context is maintained between text and voice modes
- **WebRTC Integration**: Uses LiveKit for high-quality, low-latency audio streaming
- **Advanced Echo Cancellation**: Prevents the AI from hearing its own voice, avoiding feedback loops
- **Voice Activity Detection**: Automatically detects when a user is speaking
- **High-Fidelity Audio**: Supports 48kHz sample rate for studio-quality audio
- **Auto-Adjusting Settings**: Automatically tunes noise thresholds for optimal performance

## How to Use Voice Mode

1. Click the "Voice Mode" button (microphone icon) in the chat interface
2. Grant microphone permissions when prompted
3. Begin speaking naturally - your speech will be transcribed in real-time
4. The AI will respond both in text and with high-quality voice synthesis
5. Continue the conversation as long as desired
6. To exit voice mode, click the "End Voice Mode" button

## Technical Implementation

The voice mode implementation uses several key components:

- **LiveKit Integration**: For WebRTC audio streaming and real-time transcription
- **MultimodalAgentService**: Handles the integration with OpenAI's latest real-time models
- **OpenAI TTS-1-HD**: Premium high-quality text-to-speech synthesis with Ash and Coral voices
- **Enhanced Audio Processing**: Configures optimal audio settings for echo cancellation and noise reduction
- **VoiceOverlay**: Provides user feedback and controls during voice mode
- **VoiceSettings**: Manages configuration for voice detection sensitivity and behavior

The system maintains a continuous WebRTC connection to OpenAI's latest real-time models through LiveKit, ensuring that the conversation flows naturally with high-quality voice without interruption after each transcription.

## Voice Quality Settings

The system now supports multiple quality levels for voice synthesis:

- **High-Quality** (default): Uses OpenAI's TTS-1-HD model for premium, human-like speech
- **Standard**: Uses the regular TTS-1 model when bandwidth or performance is a concern

Voice options include:
- **Ash** (Default Female): A natural-sounding female voice with clear articulation
- **Coral** (Alternate Female): A warm, engaging female voice that alternates with Ash
- **Alloy** (Neutral): A balanced, neutral voice suitable for most content
- **Echo** (Male): A resonant male voice option

Voice speed can also be adjusted in the settings panel during voice mode.

## Troubleshooting

If you experience issues with voice mode:

1. Ensure your microphone permissions are granted
2. Check if your microphone is working properly
3. Try adjusting the voice sensitivity in settings
4. If voice mode ends unexpectedly, click the Voice Mode button again to restart
5. For echo issues, ensure "Prevent Echo" is enabled in the voice settings
6. If you see a "No active LiveKit session" error, the system will automatically attempt to reconnect

## Environment Requirements

For voice mode to work properly, these environment variables must be configured:

- `NEXT_PUBLIC_LIVEKIT_URL`: The LiveKit server URL for WebRTC connections
- `LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET`: For LiveKit token generation
- `OPENAI_API_KEY`: Valid OpenAI API key with access to the latest GPT and voice models 