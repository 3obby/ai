# Moderator Bot Implementation

## Overview

We've implemented a generalized reprocessing system that uses a dedicated "moderator bot" to evaluate if a bot's responses meet user-defined criteria. The moderator bot extends the existing evaluation strategy pattern to provide more flexible and powerful response quality control.

## Key Components

1. **ModeratorBotService**
   - Standalone service for evaluating bot responses against criteria
   - Maintains its own settings separate from individual bots
   - Provides a clean API for response evaluation
   - Handles special test cases for quick testing
   - Uses a configurable LLM model for evaluations

2. **ModeratorBotStrategy**
   - New evaluation strategy that uses the ModeratorBotService
   - Integrates with the existing EvaluationStrategyRegistry
   - Prioritized between special case strategies and the default LLM strategy
   - Can use either centralized moderator criteria or bot-specific criteria
   - Returns structured true/false responses to trigger reprocessing when needed

3. **SoundEffectStrategy** (Enhanced from AnimalSoundStrategy)
   - Updated to handle more sound effects beyond just animal sounds
   - Added support for vehicle sounds including trains ("chugga chugga")
   - Includes other sound categories like bells, explosions, and laughs
   - Improved detection of "sound like" or "make a sound" phrases
   - Maintains backward compatibility with existing animal sound tests

4. **UI Components**
   - ModeratorBotButton in the ChatHeader that shows moderator status
   - Visual indicator of moderator bot active status (green dot)
   - ModeratorBotSettingsModal for configuring moderator settings
   - Clean, intuitive interface for setting evaluation criteria

## How It Works

1. When a bot generates a response, the ReprocessingEvaluator checks if it needs reprocessing
2. The EvaluationStrategyRegistry selects the appropriate strategy based on criteria
3. If the ModeratorBotStrategy is selected (and enabled), it:
   - Gets the effective criteria (from moderator or bot settings)
   - Sends the bot response and criteria to a fresh GPT instance
   - Receives a structured true/false response
   - If true, triggers reprocessing with the original reprocessing instructions

This system allows for:
- Global moderation criteria that apply to all bots
- Centralized control over response quality standards
- Detailed configuration of the evaluation model and parameters
- Immediate visual feedback about moderator status
- Special test cases for quick development and testing

## Future Enhancements

- Add support for bot-specific moderator overrides
- Create a library of preset criteria templates
- Implement A/B testing of different moderation criteria
- Add analytics for tracking moderation effectiveness
- Support multi-step evaluation for complex criteria 