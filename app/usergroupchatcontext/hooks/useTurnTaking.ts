import { useState, useEffect, useCallback } from 'react';
import turnTakingService, { TurnState, TurnTakingOptions } from '../services/livekit/turn-taking-service';
import { BotId } from '../types';

export interface UseTurnTakingOptions extends Partial<TurnTakingOptions> {
  onTurnStarted?: (speaker: BotId | 'user') => void;
  onTurnEnded?: (speaker: BotId | 'user') => void;
  onTurnInterrupted?: (speaker: BotId | 'user') => void;
  onUserSpeaking?: (user: 'user') => void;
  onBotSpeaking?: (botId: BotId) => void;
  onSilence?: () => void;
  onQueueUpdated?: (queue: Array<BotId | 'user'>) => void;
}

export function useTurnTaking(options?: UseTurnTakingOptions) {
  const [turnState, setTurnState] = useState<TurnState>(turnTakingService.getTurnState());
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize the service with provided options
  useEffect(() => {
    const turnOptions: Partial<TurnTakingOptions> = {
      minTurnDurationMs: options?.minTurnDurationMs,
      maxTurnDurationMs: options?.maxTurnDurationMs,
      transitionGapMs: options?.transitionGapMs,
      interruptionThreshold: options?.interruptionThreshold,
      enableInterruptions: options?.enableInterruptions,
      priorityBots: options?.priorityBots,
    };

    // Remove undefined values
    Object.keys(turnOptions).forEach(key => {
      if (turnOptions[key as keyof TurnTakingOptions] === undefined) {
        delete turnOptions[key as keyof TurnTakingOptions];
      }
    });

    turnTakingService.initialize(turnOptions);
    setIsInitialized(true);

    return () => {
      turnTakingService.destroy();
      setIsInitialized(false);
    };
  }, [
    options?.minTurnDurationMs,
    options?.maxTurnDurationMs,
    options?.transitionGapMs,
    options?.interruptionThreshold,
    options?.enableInterruptions,
    // We can't include priorityBots directly as it's an array and would trigger
    // the effect too often. Consider adding a deep equality check if needed.
  ]);

  // Set up event listeners
  useEffect(() => {
    if (!isInitialized) return;

    // Update turn state whenever it changes
    const updateTurnState = () => {
      setTurnState(turnTakingService.getTurnState());
    };

    // Set up event handlers
    turnTakingService.on('turn:started', (speaker: BotId | 'user') => {
      updateTurnState();
      options?.onTurnStarted?.(speaker);
    });

    turnTakingService.on('turn:ended', (speaker: BotId | 'user') => {
      updateTurnState();
      options?.onTurnEnded?.(speaker);
    });

    turnTakingService.on('turn:interrupted', (speaker: BotId | 'user') => {
      updateTurnState();
      options?.onTurnInterrupted?.(speaker);
    });

    turnTakingService.on('turn:userSpeaking', (user: 'user') => {
      updateTurnState();
      options?.onUserSpeaking?.(user);
    });

    turnTakingService.on('turn:botSpeaking', (botId: BotId) => {
      updateTurnState();
      options?.onBotSpeaking?.(botId);
    });

    turnTakingService.on('turn:silence', () => {
      updateTurnState();
      options?.onSilence?.();
    });

    turnTakingService.on('queue:updated', (queue: Array<BotId | 'user'>) => {
      updateTurnState();
      options?.onQueueUpdated?.(queue);
    });

    return () => {
      turnTakingService.removeAllListeners();
    };
  }, [
    isInitialized,
    options?.onTurnStarted,
    options?.onTurnEnded,
    options?.onTurnInterrupted,
    options?.onUserSpeaking,
    options?.onBotSpeaking,
    options?.onSilence,
    options?.onQueueUpdated
  ]);

  // Memoized utility functions
  const requestTurn = useCallback((botId: BotId, immediate?: boolean) => {
    return turnTakingService.requestTurn(botId, immediate);
  }, []);

  const userRequestsTurn = useCallback((immediate?: boolean) => {
    return turnTakingService.userRequestsTurn(immediate);
  }, []);

  const endCurrentTurn = useCallback(() => {
    turnTakingService.endCurrentTurn();
  }, []);

  const updateOptions = useCallback((newOptions: Partial<TurnTakingOptions>) => {
    turnTakingService.updateOptions(newOptions);
  }, []);

  return {
    turnState,
    isInitialized,
    requestTurn,
    userRequestsTurn,
    endCurrentTurn,
    updateOptions,
    currentSpeaker: turnState.currentSpeaker,
    queue: turnState.queue,
    isTransitioning: turnState.isTransitioning
  };
} 