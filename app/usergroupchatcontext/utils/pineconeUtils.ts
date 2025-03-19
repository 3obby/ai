import { pineconeService } from '../services/pineconeService';
import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';

/**
 * Utilities for working with Pinecone for code indexing
 */
export const PineconeUtils = {
  /**
   * Generate a unique ID for a file or content
   */
  generateId(content: string, prefix: string = ''): string {
    const hash = createHash('md5').update(content).digest('hex');
    return prefix ? `${prefix}_${hash}` : hash;
  },

  /**
   * Index a directory of files recursively
   * Note: Actual embedding generation would normally use an embedding model
   * This is a placeholder that would be replaced with actual embedding generation
   */
  async indexDirectory(
    directoryPath: string, 
    extensions: string[] = ['.ts', '.tsx', '.js', '.jsx', '.md'],
    namespace: string = 'codebase'
  ): Promise<void> {
    console.log(`Indexing directory: ${directoryPath}`);
    
    // Recursively read all files
    const processDirectory = async (dirPath: string): Promise<void> => {
      const files = fs.readdirSync(dirPath);
      
      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
          await processDirectory(filePath);
        } else if (
          stat.isFile() && 
          extensions.includes(path.extname(filePath))
        ) {
          try {
            const content = fs.readFileSync(filePath, 'utf8');
            const relativePath = path.relative(process.cwd(), filePath);
            
            // Log file being processed
            console.log(`Processing file: ${relativePath}`);
            
            // In a real implementation, you would:
            // 1. Generate embeddings from the file content using an embedding model
            // 2. Chunk the content if it's too large
            // 3. Create metadata with file info
            
            // This is a placeholder - in a real implementation you'd use actual embeddings
            // const embeddings = await getEmbeddings(content);
            
            // For demonstration purposes only - not actually functional
            /*
            await pineconeService.upsertVectors([{
              id: this.generateId(relativePath, namespace),
              values: embeddings, // Would be the actual vector from an embedding model
              metadata: {
                filepath: relativePath,
                type: path.extname(filePath),
                lastModified: stat.mtime.toISOString(),
              }
            }]);
            */
          } catch (error) {
            console.error(`Error processing file ${filePath}:`, error);
          }
        }
      }
    };
    
    // Initialize the Pinecone client before processing
    await pineconeService.init();
    
    await processDirectory(directoryPath);
    console.log('Indexing complete!');
  }
};

export default PineconeUtils; 