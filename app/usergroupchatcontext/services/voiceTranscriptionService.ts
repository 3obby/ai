'use client';

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { Message } from '../types';
import { VoiceProcessingMetadata } from '../types/voice';

// Transcription tracking to prevent duplicate processing
interface TranscriptionRecord {
  id: string;           // Unique ID for this transcription
  text: string;         // The transcribed text
  timestamp: number;    // When this transcription was received
  processed: boolean;   // Whether this transcription has been processed
  messageId?: string;   // ID of the message created from this transcription
  isFinal: boolean;     // Whether this is a final transcription
}

/**
 * Centralized service for handling voice transcriptions
 * This service ensures that each transcription is only processed once
 * and coordinates message creation from transcriptions
 */
class UnifiedTranscriptionService extends EventEmitter {
  private activeTranscriptions: Map<string, TranscriptionRecord> = new Map();
  private processingLock: boolean = false;
  private readonly deduplicationTimeThreshold: number = 500; // reduced from 1000ms to 500ms
  private readonly deduplicationSimilarityThreshold: number = 0.8; // 80% similarity

  constructor() {
    super();
    console.log('UnifiedTranscriptionService initialized');
  }

  /**
   * Process a new transcription
   * @param text The transcribed text
   * @param isFinal Whether this is a final transcription
   * @returns The record ID if processed, null if duplicate
   */
  public processTranscription(text: string, isFinal: boolean): string | null {
    // Skip empty or very short transcriptions
    if (!text || text.trim().length < 2) {
      return null;
    }

    // Log the transcription for debugging
    console.log(`[Transcription] ${isFinal ? 'FINAL' : 'interim'}: "${text}"`);

    // Check for duplicates
    if (this.isDuplicate(text, isFinal)) {
      console.log(`Skipping duplicate transcription: "${text}"`);
      return null;
    }

    // Create a new record
    const record: TranscriptionRecord = {
      id: uuidv4(),
      text: text.trim(),
      timestamp: Date.now(),
      processed: false,
      isFinal
    };

    // Store the record
    this.activeTranscriptions.set(record.id, record);

    // Emit event for interim transcriptions
    if (!isFinal) {
      this.emit('interim-transcription', record);
      return record.id;
    }

    // For final transcriptions, trigger message creation with priority
    if (isFinal) {
      console.log(`Processing final transcription: "${text}"`);
      setTimeout(() => {
        this.createMessageFromTranscription(record);
      }, 0); // Use setTimeout to ensure async processing
    } else {
      this.createMessageFromTranscription(record);
    }
    
    return record.id;
  }

  /**
   * Create a message from a transcription
   * @param record The transcription record
   */
  private createMessageFromTranscription(record: TranscriptionRecord): void {
    // If already processed, skip
    if (record.processed) {
      return;
    }

    // Check if there's a processing lock active
    if (this.processingLock) {
      console.log('Transcription processing locked, queueing for later processing');
      // Queue for processing in 100ms
      setTimeout(() => this.createMessageFromTranscription(record), 100);
      return;
    }

    // Acquire processing lock
    this.processingLock = true;

    try {
      // Mark as processed
      record.processed = true;
      this.activeTranscriptions.set(record.id, record);

      // Create a message
      const message: Message = {
        id: uuidv4(),
        content: record.text,
        role: 'user',
        sender: 'user',
        senderName: 'You',
        timestamp: Date.now(),
        type: 'voice',
        metadata: {
          processing: {
            originalContent: record.text,
            fromVoiceMode: true,
            voiceProcessing: {
              speechDuration: 0,
              interimTranscripts: [],
              transcriptionConfidence: 1.0
            }
          }
        }
      };

      // Update record with message ID
      record.messageId = message.id;
      this.activeTranscriptions.set(record.id, record);

      // Emit the message
      this.emit('transcription-message', message);
      
      console.log(`Created message from transcription: "${record.text.substring(0, 30)}..."`);
    } finally {
      // Release processing lock
      setTimeout(() => {
        this.processingLock = false;
      }, 100); // Small cooldown to prevent rapid-fire processing
    }
  }

  /**
   * Check if a transcription is a duplicate of a recent one
   * @param text The transcription to check
   * @param isFinal Whether this is a final transcription
   * @returns True if duplicate, false otherwise
   */
  private isDuplicate(text: string, isFinal: boolean = false): boolean {
    const normalizedText = text.trim().toLowerCase();
    const now = Date.now();

    // Always accept very short texts if they're final transcriptions
    // This ensures short commands like "yes" or "no" always get through
    if (isFinal && normalizedText.length < 10) {
      return false;
    }

    // Use adaptive threshold based on text length
    // Shorter texts need a higher similarity to be considered duplicates
    let similarityThreshold = this.deduplicationSimilarityThreshold;
    if (normalizedText.length < 15) {
      // Require higher similarity for shorter texts
      similarityThreshold = 0.9;
    }

    // Compare with recent transcriptions
    const records = Array.from(this.activeTranscriptions.values());
    
    for (const record of records) {
      // Skip old transcriptions
      if (now - record.timestamp > this.deduplicationTimeThreshold) {
        continue;
      }

      // Never consider final transcriptions as duplicates of interim ones
      if (isFinal && !record.isFinal) {
        continue;
      }

      // Check for similarity
      const similarity = this.calculateSimilarity(
        normalizedText,
        record.text.trim().toLowerCase()
      );

      if (similarity > similarityThreshold) {
        return true;
      }
    }

    return false;
  }

  /**
   * Calculate similarity between two strings (simplified)
   * @param a First string
   * @param b Second string
   * @returns Similarity ratio (0-1)
   */
  private calculateSimilarity(a: string, b: string): number {
    if (a === b) return 1.0;
    if (a.includes(b) || b.includes(a)) return 0.9;
    
    // Very simple Levenshtein-based similarity
    const maxLength = Math.max(a.length, b.length);
    if (maxLength === 0) return 1.0;
    
    // Calculate Levenshtein distance (simplified)
    let distance = 0;
    const minLength = Math.min(a.length, b.length);
    
    for (let i = 0; i < minLength; i++) {
      if (a[i] !== b[i]) distance++;
    }
    
    // Add remaining length difference to distance
    distance += maxLength - minLength;
    
    // Convert to similarity ratio
    return 1.0 - (distance / maxLength);
  }

  /**
   * Clean up old transcriptions
   */
  public cleanup(): void {
    const now = Date.now();
    const expiryTime = 60000; // 1 minute
    
    // Fix iteration issue with Map entries
    const entries = Array.from(this.activeTranscriptions.entries());
    
    for (const [id, record] of entries) {
      if (now - record.timestamp > expiryTime) {
        this.activeTranscriptions.delete(id);
      }
    }
  }
}

// Create singleton instance
const unifiedTranscriptionService = new UnifiedTranscriptionService();

// Start cleanup interval
if (typeof window !== 'undefined') {
  setInterval(() => unifiedTranscriptionService.cleanup(), 60000);
}

export default unifiedTranscriptionService; 