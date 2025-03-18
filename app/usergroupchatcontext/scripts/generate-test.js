#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const TEST_MD_PATH = path.join(ROOT_DIR, 'test.md');

// Generate a basic directory structure listing
function generateDirectoryStructure() {
  try {
    const output = execSync('find . -type f -not -path "*/node_modules/*" -not -path "*/\\..*" | sort', { 
      cwd: ROOT_DIR,
      encoding: 'utf8'
    });
    
    return output.split('\n')
      .filter(line => line.trim().length > 0)
      .map(line => `- ${line}`)
      .join('\n');
  } catch (error) {
    console.error('Error generating directory structure:', error.message);
    return 'Error generating directory structure';
  }
}

// Read a type definition file
function readTypeDefinitions() {
  try {
    const typesPath = path.join(ROOT_DIR, 'types.ts');
    if (fs.existsSync(typesPath)) {
      return fs.readFileSync(typesPath, 'utf8');
    }
    return 'Types file not found';
  } catch (error) {
    console.error('Error reading type definitions:', error.message);
    return 'Error reading type definitions';
  }
}

// Generate the test README content
function generateTestReadme() {
  const content = `# UserGroupChatContext: Auto-Generated Test README

## Directory Structure
\`\`\`
${generateDirectoryStructure()}
\`\`\`

## Type Definitions
\`\`\`typescript
${readTypeDefinitions()}
\`\`\`

## Implementation Status

This is a test README generated automatically to demonstrate the auto-generation capability.
The real README generator would include:

1. Complete directory structure with comments
2. Extracted type definitions directly from the codebase
3. Current implementation status
4. Architecture diagrams
5. Next implementation steps

## Generated on
${new Date().toISOString()}
`;

  fs.writeFileSync(TEST_MD_PATH, content);
  console.log(`Test README generated at ${TEST_MD_PATH}`);
}

// Run the generator
generateTestReadme(); 