# Reprocessing System Redesign

## Architecture Improvements

We've implemented significant architectural improvements to the reprocessing system following solid design principles:

### 1. Centralized Orchestration with ReprocessingOrchestratorService

- Created a dedicated `ReprocessingOrchestratorService` as the central coordinator
- Moved all reprocessing logic from individual processors to the orchestrator
- Implemented a singleton pattern for consistent access across the application
- Created a clean public API for triggering reprocessing from any pipeline stage
- Added comprehensive error handling and reporting

### 2. Applied Strategy Pattern for Evaluation Logic

- Created a `ReprocessingStrategy` interface for reprocessing decisions
- Implemented specialized strategies for different evaluation approaches:
  - `LLMEvaluationStrategy`: Uses LLM to evaluate against criteria
  - `TestCaseStrategy`: Special handling for test phrases like "yes", "true"
  - `AnimalSoundStrategy`: Specialized detection for specific instructions
- Each strategy has a single responsibility and can be replaced or extended
- Strategies are tried in order, with the first positive result triggering reprocessing

### 3. Implemented Chain of Responsibility Pattern

- Created a `StageHandler` class to implement the Chain of Responsibility
- Each handler processes its stage and decides whether to continue the chain
- Implemented proper state tracking between stages
- Enabled stages to explicitly decide to continue or halt processing
- Created clear boundaries between processing stages
- Developed a `ChainedPipelineFactory` for creating stage chains declaratively

### 4. Observer Pattern for Processing Status

- Integrated with EventBus for event-based status reporting
- Defined standard events for reprocessing lifecycle:
  - `REPROCESSING_STARTED`: When reprocessing begins
  - `REPROCESSING_COMPLETED`: When reprocessing finishes successfully
  - `REPROCESSING_ERROR`: When errors occur during reprocessing
- UI components can subscribe to these events for real-time updates
- Added detailed metadata for tracking processing state

## Key Components

### ReprocessingOrchestratorService

Central service responsible for coordinating all reprocessing activities:

```typescript
class ReprocessingOrchestratorService {
  // Evaluates if a response needs reprocessing
  async shouldReprocessResponse(content, bot, context, metadata): Promise<boolean>
  
  // Starts reprocessing tracking
  startReprocessing(botId, content, metadata)
  
  // Ends reprocessing tracking
  endReprocessing(botId, content, originalContent, processingTime)
  
  // Performs reprocessing
  async reprocessContent(content, bot, context, metadata)
}
```

### Reprocessing Strategies

Strategy pattern implementations for different evaluation approaches:

```typescript
interface ReprocessingStrategy {
  evaluate(content: string, bot: Bot, context: any): Promise<boolean>;
}

class LLMEvaluationStrategy implements ReprocessingStrategy { ... }
class TestCaseStrategy implements ReprocessingStrategy { ... }
class AnimalSoundStrategy implements ReprocessingStrategy { ... }
```

### Chain of Responsibility Implementation

StageHandler and support for building processing chains:

```typescript
class StageHandler {
  constructor(name: string, processor: StageProcessor) { ... }
  setNext(handler: StageHandler): StageHandler { ... }
  async handle(content, bot, context, metadata): Promise<ProcessingResult> { ... }
}

function createStageChain(stageDefinitions): StageHandler { ... }
```

### ChainedPipelineFactory

Factory for creating processing chains:

```typescript
class ChainedPipelineFactory {
  static createDefaultChain(options): StageHandler { ... }
  static createVoiceChain(): StageHandler { ... }
  static processContent(chain, content, bot, context, metadata) { ... }
}
```

## Integration with Event System

Extended the EventMap to include reprocessing events:

```typescript
declare module './EventBus' {
  interface EventMap {
    'reprocessing:started': { 
      botId: string; 
      content: string; 
      reprocessCount: number;
      reprocessingDepth: number;
      timestamp: number;
    };
    'reprocessing:completed': { ... };
    'reprocessing:error': { ... };
  }
}
```

## Benefits of the New Architecture

1. **Improved Maintainability**: Each component has a clear, focused responsibility
2. **Better Testability**: Components can be tested in isolation
3. **Enhanced Flexibility**: Easy to add new evaluation strategies
4. **Clearer Code Organization**: Clear separation between orchestration, evaluation and processing
5. **Consistent Error Handling**: Centralized approach to error handling
6. **Robust Event System**: Components can communicate without tight coupling
7. **Declarative Pipeline Configuration**: Stage chains are configured declaratively

This architectural improvement makes the reprocessing system more reliable, maintainable, and extensible. 