import { Pinecone } from '@pinecone-database/pinecone';
import type { ScoredPineconeRecord } from '@pinecone-database/pinecone';

/**
 * Pinecone service for vector database operations
 * Used for semantic search and memory features
 */
class PineconeService {
  private pinecone: Pinecone | null;
  private indexName: string = 'agentconsult';
  private isInitialized: boolean = false;
  
  constructor() {
    this.pinecone = null;
  }
  
  /**
   * Initialize the Pinecone client
   */
  async initialize() {
    if (!this.isInitialized) {
      this.pinecone = new Pinecone({
        apiKey: process.env.PINECONE_API_KEY || 'pcsk_n1c4F_Nx9ekfBQEG67R493SmxB3ar3URk4bUzUHWx6ybBJda5yZ7fC9MQfWSXN1wz4McQ'
      });
      this.isInitialized = true;
    }
    return this;
  }
  
  /**
   * Get the Pinecone index instance
   */
  async getIndex() {
    await this.initialize();
    if (!this.pinecone) throw new Error('Pinecone client not initialized');
    return this.pinecone.index(this.indexName);
  }
  
  /**
   * Upsert vectors to the Pinecone index
   */
  async upsertVectors(vectors: Array<{
    id: string;
    values: number[];
    metadata?: Record<string, any>;
  }>) {
    const index = await this.getIndex();
    return await index.upsert(vectors);
  }
  
  /**
   * Query vectors from the Pinecone index
   */
  async queryVectors(queryVector: number[], topK: number = 5, filter?: object): Promise<{
    matches: ScoredPineconeRecord[];
    namespace: string;
  }> {
    const index = await this.getIndex();
    const results = await index.query({
      vector: queryVector,
      topK,
      includeMetadata: true,
      ...(filter && { filter })
    });
    
    return {
      matches: results.matches || [],
      namespace: results.namespace || ''
    };
  }
}

// Export as singleton
const instance = new PineconeService();
export const pineconeService = instance; 