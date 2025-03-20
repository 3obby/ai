// CommonJS script to index the codebase with Pinecone using 1024d embeddings
const { Pinecone } = require('@pinecone-database/pinecone');
const { OpenAI } = require('openai');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: '.env.local' });

// Configure clients
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Maximum text chunk size for embedding
const MAX_CHUNK_SIZE = 4000;

/**
 * Generate a unique ID for a file or content
 */
function generateId(content, prefix = '') {
  const hash = crypto.createHash('md5').update(content).digest('hex');
  return prefix ? `${prefix}_${hash}` : hash;
}

/**
 * Split text into chunks of appropriate size for embedding
 */
function chunkText(text, maxSize = MAX_CHUNK_SIZE) {
  const chunks = [];
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
async function generateEmbeddings(text) {
  try {
    console.log(`Generating embeddings for text of length: ${text.length}`);
    
    // Explicitly requesting 1024 dimensions from the model
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
      dimensions: 1024  // Explicitly request 1024 dimensions
    });
    
    const embedding = embeddingResponse.data[0].embedding;
    console.log(`Successfully generated embeddings with dimensions: ${embedding.length}`);
    
    return embedding;
  } catch (error) {
    console.error('Error generating embeddings:', error);
    throw error;
  }
}

/**
 * Index a single file
 */
async function indexFile(filePath, index, namespace = 'codebase') {
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
      await index.upsert([
        {
          id: chunkId,
          values: embeddings,
          metadata: {
            filepath: relativePath,
            type: path.extname(filePath),
            lastModified: fileStats.mtime.toISOString(),
            chunkIndex: i,
            totalChunks: chunks.length,
            snippet: chunk.substring(0, 100) + (chunk.length > 100 ? '...' : ''),
            text: chunk, // Store the full text for retrieval
            source: 'usergroupchatcontext'  // Add a source field for easier filtering
          }
        }
      ]);
      
      console.log(`  Stored in Pinecone with ID: ${chunkId}`);
    }
  } catch (error) {
    console.error(`Error indexing file ${filePath}:`, error);
  }
}

/**
 * Index a directory recursively
 */
async function indexDirectory(directoryPath, index, extensions = ['.ts', '.tsx', '.js', '.jsx', '.md'], namespace = 'codebase') {
  console.log(`Indexing directory: ${directoryPath}`);
  
  // Process all files recursively
  const processDirectory = async (dirPath) => {
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
        await indexFile(filePath, index, namespace);
      }
    }
  };
  
  await processDirectory(directoryPath);
  console.log('Indexing complete!');
}

// Main function
async function main() {
  try {
    console.log('Initializing Pinecone client...');
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY
    });
    
    console.log('Checking if index exists...');
    const indexList = await pinecone.listIndexes();
    const indexName = 'agentconsult';
    
    const indexExists = indexList.indexes && indexList.indexes.some(index => index.name === indexName);
    
    if (!indexExists) {
      console.error(`Index '${indexName}' does not exist. Please create it first.`);
      process.exit(1);
    }
    
    console.log(`Using existing index: ${indexName}`);
    const index = pinecone.index(indexName);
    
    // Check the index dimension
    const stats = await index.describeIndexStats();
    console.log(`Index stats: ${JSON.stringify(stats, null, 2)}`);
    const dimension = stats.dimension;
    
    if (dimension !== 1024) {
      console.error(`Warning: Index dimension is ${dimension}, but script is configured for 1024 dimensions. This may cause errors.`);
      const continueAnyway = process.env.FORCE_CONTINUE === 'true';
      if (!continueAnyway) {
        console.error('Exiting. Set FORCE_CONTINUE=true to bypass this check.');
        process.exit(1);
      }
    }
    
    const targetDir = path.resolve(process.cwd(), 'app/usergroupchatcontext');
    await indexDirectory(targetDir, index, ['.ts', '.tsx', '.md', '.js', '.jsx'], 'agentconsult');
    console.log('Successfully indexed the codebase!');
  } catch (error) {
    console.error('Error during indexing:', error);
    process.exit(1);
  }
}

// Run the indexing process
main(); 