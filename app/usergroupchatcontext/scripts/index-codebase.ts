import { pineconeService } from '../services/pineconeService';
import { OpenAI } from 'openai';
import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Configure OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || process.env.BRAVE_BASE_AI
});

// Maximum text chunk size for embedding
const MAX_CHUNK_SIZE = 4000;

/**
 * Generate a unique ID for a file or content
 */
function generateId(content: string, prefix: string = ''): string {
  const hash = createHash('md5').update(content).digest('hex');
  return prefix ? `${prefix}_${hash}` : hash;
}

/**
 * Split text into chunks of appropriate size for embedding
 */
function chunkText(text: string, maxSize: number = MAX_CHUNK_SIZE): string[] {
  const chunks: string[] = [];
  let currentChunk = '';
  
  // Split by paragraphs first
  const paragraphs = text.split(/\n\s*\n/);
  
  for (const paragraph of paragraphs) {
    // If paragraph is too long, split by sentences
    if (paragraph.length > maxSize) {
      const sentences = paragraph.split(/(?<=[.!?])\s+/);
      
      for (const sentence of sentences) {
        if (currentChunk.length + sentence.length <= maxSize) {
          currentChunk += (currentChunk ? ' ' : '') + sentence;
        } else {
          if (currentChunk) {
            chunks.push(currentChunk);
            currentChunk = sentence;
          } else {
            // If a single sentence is too long, split it arbitrarily
            chunks.push(sentence.substring(0, maxSize));
            const remainder = sentence.substring(maxSize);
            if (remainder) {
              currentChunk = remainder;
            }
          }
        }
      }
    } else {
      if (currentChunk.length + paragraph.length <= maxSize) {
        currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
      } else {
        chunks.push(currentChunk);
        currentChunk = paragraph;
      }
    }
  }
  
  if (currentChunk) {
    chunks.push(currentChunk);
  }
  
  return chunks;
}

/**
 * Generate embeddings for a text using OpenAI
 */
async function generateEmbeddings(text: string): Promise<number[]> {
  try {
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: text
    });
    
    return embeddingResponse.data[0].embedding;
  } catch (error) {
    console.error('Error generating embeddings:', error);
    throw error;
  }
}

/**
 * Index a single file
 */
async function indexFile(filePath: string, namespace: string = 'codebase'): Promise<void> {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const relativePath = path.relative(process.cwd(), filePath);
    const fileStats = fs.statSync(filePath);
    
    console.log(`Indexing file: ${relativePath}`);
    
    // Skip empty files
    if (!content.trim()) {
      console.log(`  Skipping empty file`);
      return;
    }
    
    // Split content into chunks if needed
    const chunks = chunkText(content);
    console.log(`  Split into ${chunks.length} chunks`);
    
    // Process each chunk
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const chunkId = `${namespace}_${relativePath}_${i}`;
      
      console.log(`  Processing chunk ${i+1}/${chunks.length}`);
      
      // Generate embeddings
      const embeddings = await generateEmbeddings(chunk);
      console.log(`  Generated embeddings of length: ${embeddings.length}`);
      
      // Store in Pinecone
      await pineconeService.upsertVectors([{
        id: chunkId,
        values: embeddings,
        metadata: {
          filepath: relativePath,
          type: path.extname(filePath),
          lastModified: fileStats.mtime.toISOString(),
          chunkIndex: i,
          totalChunks: chunks.length,
          snippet: chunk.substring(0, 100) + (chunk.length > 100 ? '...' : '')
        }
      }]);
      
      console.log(`  Stored in Pinecone with ID: ${chunkId}`);
    }
  } catch (error) {
    console.error(`Error indexing file ${filePath}:`, error);
  }
}

/**
 * Index a directory recursively
 */
async function indexDirectory(
  directoryPath: string, 
  extensions: string[] = ['.ts', '.tsx', '.js', '.jsx', '.md'],
  namespace: string = 'codebase'
): Promise<void> {
  console.log(`Indexing directory: ${directoryPath}`);
  
  // Initialize the Pinecone client
  await pineconeService.init();
  
  // Process all files recursively
  const processDirectory = async (dirPath: string): Promise<void> => {
    const files = fs.readdirSync(dirPath);
    
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        // Skip node_modules and other common directories to ignore
        if (['node_modules', '.next', '.git', '.vercel'].includes(file)) {
          console.log(`Skipping directory: ${filePath}`);
          continue;
        }
        await processDirectory(filePath);
      } else if (
        stat.isFile() && 
        extensions.includes(path.extname(filePath))
      ) {
        await indexFile(filePath, namespace);
      }
    }
  };
  
  await processDirectory(directoryPath);
  console.log('Indexing complete!');
}

// Main function
async function main() {
  try {
    const targetDir = path.resolve(process.cwd(), 'app/usergroupchatcontext');
    await indexDirectory(targetDir, ['.ts', '.tsx', '.md'], 'agentconsult');
    process.exit(0);
  } catch (error) {
    console.error('Error during indexing:', error);
    process.exit(1);
  }
}

// Run the indexing process
main(); 