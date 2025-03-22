'use client';

import { Bot } from '../../types';
import { LLMService } from '../LLMService';
import { 
  EvaluationStrategy, 
  AlwaysTrueStrategy, 
  SoundEffectStrategy, 
  LLMEvaluationStrategy 
} from './EvaluationStrategy';
import { ModeratorBotStrategy } from './ModeratorBotStrategy';

/**
 * Registry for evaluation strategies following the Strategy Pattern
 * 
 * This class manages all available evaluation strategies and selects
 * the most appropriate one for each evaluation request.
 */
export class EvaluationStrategyRegistry {
  private static instance: EvaluationStrategyRegistry;
  private strategies: EvaluationStrategy[] = [];
  
  private constructor() {
    // Register default strategies
    this.registerStrategy(new AlwaysTrueStrategy());
    this.registerStrategy(new SoundEffectStrategy());
    this.registerStrategy(new ModeratorBotStrategy());
    this.registerStrategy(new LLMEvaluationStrategy(LLMService));
  }
  
  /**
   * Get the singleton instance
   */
  public static getInstance(): EvaluationStrategyRegistry {
    if (!EvaluationStrategyRegistry.instance) {
      EvaluationStrategyRegistry.instance = new EvaluationStrategyRegistry();
    }
    return EvaluationStrategyRegistry.instance;
  }
  
  /**
   * Register a new strategy
   */
  public registerStrategy(strategy: EvaluationStrategy): void {
    // Log registration
    console.log(`Registering evaluation strategy: ${strategy.getName()}`);
    this.strategies.push(strategy);
  }
  
  /**
   * Find the appropriate strategy for given criteria and content
   */
  public findStrategy(criteria: string, content: string): EvaluationStrategy {
    // Try to find a specialized strategy
    for (const strategy of this.strategies) {
      if (strategy.canEvaluate(criteria, content)) {
        console.log(`Selected evaluation strategy: ${strategy.getName()} for criteria: ${criteria.substring(0, 20)}...`);
        return strategy;
      }
    }
    
    // Fallback to the last registered strategy (should be LLM strategy)
    console.log('No specialized strategy found, falling back to default');
    return this.strategies[this.strategies.length - 1];
  }
  
  /**
   * Evaluate content against criteria using the appropriate strategy
   */
  public async evaluate(content: string, criteria: string, bot: Bot): Promise<boolean> {
    // Find the appropriate strategy
    const strategy = this.findStrategy(criteria, content);
    
    // Log evaluation attempt
    console.log(`Evaluating with strategy: ${strategy.getName()}`);
    
    // Evaluate using the selected strategy
    try {
      const result = await strategy.evaluate(content, criteria, bot);
      console.log(`Evaluation result: ${result}`);
      return result;
    } catch (error) {
      console.error(`Error in evaluation with strategy ${strategy.getName()}:`, error);
      return false; // Default to false on error
    }
  }
}

// Export the singleton for direct use in services
export const evaluationRegistry = EvaluationStrategyRegistry.getInstance(); 