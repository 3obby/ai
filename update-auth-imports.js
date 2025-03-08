const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const readdir = promisify(fs.readdir);
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const stat = promisify(fs.stat);

// RegExp pattern to match server-auth imports
const importPattern = /import\s+?(?:{[\s\w,]+?})?\s+?from\s+?['"]@\/lib\/server-auth['"];?/g;
const replacementImport = 'import { auth } from "@/lib/auth-helpers";';

async function traverseDirectory(directory) {
  const files = await readdir(directory);
  
  for (const file of files) {
    const filePath = path.join(directory, file);
    const stats = await stat(filePath);

    if (stats.isDirectory()) {
      // Skip node_modules and .next directories
      if (file !== 'node_modules' && file !== '.next' && file !== '.git') {
        await traverseDirectory(filePath);
      }
    } else if (stats.isFile() && (file.endsWith('.ts') || file.endsWith('.tsx'))) {
      await processFile(filePath);
    }
  }
}

async function processFile(filePath) {
  try {
    const content = await readFile(filePath, 'utf8');
    
    if (content.includes('@/lib/server-auth')) {
      console.log(`Processing: ${filePath}`);
      
      // Replace import
      const newContent = content.replace(importPattern, replacementImport);
      
      if (newContent !== content) {
        await writeFile(filePath, newContent, 'utf8');
        console.log(`Updated import in: ${filePath}`);
      }
    }
  } catch (error) {
    console.error(`Error processing file ${filePath}:`, error);
  }
}

async function main() {
  try {
    console.log('Starting auth imports update...');
    await traverseDirectory('./app');
    console.log('Completed auth imports update!');
  } catch (error) {
    console.error('Error:', error);
  }
}

main(); 