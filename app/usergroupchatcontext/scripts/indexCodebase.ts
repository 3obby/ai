/**
 * Script to index the codebase using Pinecone
 * This can be run as a one-time setup or periodically to update the index
 */
import path from 'path';
import PineconeUtils from '../utils/pineconeUtils';

async function indexCodebase() {
  try {
    console.log('Starting to index userGroupChatContext codebase...');
    
    // Path to the userGroupChatContext directory
    const dirPath = path.resolve(process.cwd(), 'app/usergroupchatcontext');
    
    // Index the directory
    await PineconeUtils.indexDirectory(dirPath);
    
    console.log('Successfully indexed userGroupChatContext codebase!');
    process.exit(0);
  } catch (error) {
    console.error('Error indexing codebase:', error);
    process.exit(1);
  }
}

// Run the indexing
indexCodebase(); 