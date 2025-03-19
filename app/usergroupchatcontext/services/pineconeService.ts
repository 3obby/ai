import { Pinecone } from '@pinecone-database/pinecone';

/**
 * Pinecone service for vector database operations
 * Used for semantic search and memory features
 */
class PineconeService {
  private pinecone: Pinecone;
  private indexName: string = 'agentconsult';
  private isInitialized: boolean = false;
  
  constructor() {
    // Initialize with API key from environment variable
    if (!process.env.PINECONE_API_KEY) {
      console.error('PINECONE_API_KEY is not set in environment variables');
      this.pinecone = null as any; // Allow initialization to continue but it will fail later
    } else {
      this.pinecone = new Pinecone({
        apiKey: process.env.PINECONE_API_KEY
      });
      this.isInitialized = true;
    }
  }
  
  /**
   * Get the Pinecone index instance
   */
  getIndex() {
    if (!this.isInitialized) {
      throw new Error('Pinecone client not initialized. PINECONE_API_KEY is required.');
    }
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
    const index = this.getIndex();
    return await index.upsert(vectors);
  }
  
  /**
   * Query vectors from the Pinecone index
   */
  async queryVectors(queryVector: number[], topK: number = 5, filter?: Record<string, any>) {
    const index = this.getIndex();
    return await index.query({
      vector: queryVector,
      topK,
      includeMetadata: true,
      ...(filter && { filter })
    });
  }
}

// Export as singleton
const instance = new PineconeService();
export const pineconeService = instance; 