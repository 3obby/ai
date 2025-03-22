#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const README_PATH = path.join(ROOT_DIR, 'llm_copilot_overview_and_todo.md');
const PART1_PATH = path.join(__dirname, 'llm_copilot_part1.md');

/**
 * Generates the directory structure as a markdown-formatted string
 */
function generateDirectoryStructure(
  dir = ROOT_DIR,
  relativePath = '',
  depth = 0,
  maxDepth = 3
) {
  if (depth > maxDepth) return '';
  
  const dirents = fs.readdirSync(dir, { withFileTypes: true });
  let output = '';
  
  // Skip node_modules, .git, etc.
  const ignoreDirs = ['.git', 'node_modules', '.next', 'dist', 'build'];
  
  for (const dirent of dirents) {
    if (ignoreDirs.includes(dirent.name)) continue;
    
    // Ignore files starting with a dot
    if (dirent.name.startsWith('.')) continue;
    
    const displayPath = path.join(relativePath, dirent.name);
    const fullPath = path.join(dir, dirent.name);
    const indent = '  '.repeat(depth);
    
    if (dirent.isDirectory()) {
      output += `${indent}├── ${dirent.name}/\n`;
      output += generateDirectoryStructure(fullPath, displayPath, depth + 1, maxDepth);
    } else {
      // For files, add a brief comment if we can detect the purpose
      let comment = '';
      
      // Simple heuristic for comments based on file name
      if (dirent.name.includes('Context')) {
        comment = '# Context definition';
      } else if (dirent.name.includes('Provider')) {
        comment = '# State/service provider';
      } else if (dirent.name.includes('Service')) {
        comment = '# Service implementation';
      } else if (dirent.name.includes('types.ts')) {
        comment = '# Type definitions';
      } else if (dirent.name.includes('utils')) {
        comment = '# Utility functions';
      }
      
      // Add file size as additional info
      const stats = fs.statSync(fullPath);
      const sizeKb = Math.round(stats.size / 1024 * 10) / 10;
      
      if (comment) {
        output += `${indent}├── ${dirent.name} (${sizeKb}KB) ${comment}\n`;
      } else {
        output += `${indent}├── ${dirent.name} (${sizeKb}KB)\n`;
      }
    }
  }
  
  return output;
}

/**
 * Extracts type definitions by reading the types.ts file
 */
function extractTypeDefinitions() {
  try {
    const typesPath = path.join(ROOT_DIR, 'types.ts');
    if (fs.existsSync(typesPath)) {
      return '```typescript\n' + fs.readFileSync(typesPath, 'utf8') + '\n```';
    }
    
    return '```typescript\n// Types file not found\n```';
  } catch (error) {
    console.error('Error reading type definitions:', error);
    return '```typescript\n// Error reading type definitions\n```';
  }
}

/**
 * Extracts the current implementation status from the README
 */
function getImplementationStatus() {
  try {
    const content = fs.readFileSync(README_PATH, 'utf8');
    
    // Extract the implementation status sections
    const completedMatch = content.match(/### Completed\n([\s\S]*?)###/);
    const inProgressMatch = content.match(/### In Progress\n([\s\S]*?)##/);
    
    return {
      completed: completedMatch ? completedMatch[1].trim() : '',
      inProgress: inProgressMatch ? inProgressMatch[1].trim() : ''
    };
  } catch (error) {
    console.error('Error reading README:', error);
    return { 
      completed: '- [x] No previous completion data found', 
      inProgress: '- [ ] No previous in-progress data found' 
    };
  }
}

/**
 * Generates the complete README content
 */
function generateReadmeContent() {
  // 1. Load Part1 content
  let part1Content = '';
  try {
    part1Content = fs.readFileSync(PART1_PATH, 'utf8');
    console.log('Successfully loaded Part1 content');
  } catch (error) {
    console.error('Error reading part1 file:', error);
    part1Content = '# Error: Could not read llm_copilot_part1.md\n\n';
  }

  // 2. Build the dynamic section with architecture details and directory
  const dynamicContent = `
## Type System

${extractTypeDefinitions()}

## Directory Structure

\`\`\`
/app/usergroupchatcontext/
${generateDirectoryStructure().trimEnd()}
\`\`\`

`;

  // 3. Combine everything in the requested order
  return part1Content + dynamicContent;
}

/**
 * Updates the README file with the generated content
 */
function updateReadme() {
  const content = generateReadmeContent();
  fs.writeFileSync(README_PATH, content);
  console.log(`README updated at ${README_PATH}`);
}

// Run when executed directly
if (require.main === module) {
  updateReadme();
}

module.exports = {
  generateDirectoryStructure,
  extractTypeDefinitions,
  generateReadmeContent,
  updateReadme
}; 