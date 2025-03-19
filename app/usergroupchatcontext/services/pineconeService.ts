import { PineconeClient } from '@pinecone-database/pinecone';

/**
 * Pinecone service for vector database operations
 * Used for semantic search and memory features
 */
class PineconeService {
  private pinecone: PineconeClient;
  private indexName: string = 'agentconsult';
  private isInitialized: boolean = false;
  
  constructor() {
    this.pinecone = new PineconeClient();
  }
  
  /**
   * Initialize the Pinecone client
   */
  async initialize() {
    if (!this.isInitialized) {
      await this.pinecone.init({
        apiKey: process.env.PINECONE_API_KEY || 'pcsk_n1c4F_Nx9ekfBQEG67R493SmxB3ar3URk4bUzUHWx6ybBJda5yZ7fC9MQfWSXN1wz4McQ',
        environment: 'us-east-1-aws'
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
    return this.pinecone.Index(this.indexName);
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
    return await index.upsert({
      upsertRequest: {
        vectors,
        namespace: ''
      }
    });
  }
  
  /**
   * Query vectors from the Pinecone index
   */
  async queryVectors(queryVector: number[], topK: number = 5, filter?: object) {
    const index = await this.getIndex();
    return await index.query({
      queryRequest: {
        vector: queryVector,
        topK,
        includeMetadata: true,
        namespace: '',
        ...(filter && { filter })
      }
    });
  }
}

// Export as singleton
const instance = new PineconeService();
export const pineconeService = instance; 