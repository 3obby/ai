const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

async function findAllRouteFiles(dir, fileList = []) {
  const files = await readdir(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stats = await stat(filePath);
    
    if (stats.isDirectory()) {
      fileList = await findAllRouteFiles(filePath, fileList);
    } else if (file === 'route.ts' && dir.includes('/api/')) {
      fileList.push(filePath);
    }
  }
  
  return fileList;
}

async function addDynamicExport(filePath) {
  try {
    const content = await readFile(filePath, 'utf8');
    
    // Skip if already has dynamic export
    if (content.includes('export const dynamic')) {
      console.log(`Skipping ${filePath} - already has dynamic export`);
      return;
    }
    
    // Find the position after imports to insert the export
    const lines = content.split('\n');
    let insertPosition = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('import') || line === '') {
        insertPosition = i + 1;
      } else {
        break;
      }
    }
    
    // Insert the dynamic export after the imports
    lines.splice(insertPosition, 0, '');
    lines.splice(insertPosition + 1, 0, '// Force dynamic rendering for API routes');
    lines.splice(insertPosition + 2, 0, 'export const dynamic = "force-dynamic";');
    lines.splice(insertPosition + 3, 0, '');
    
    // Write the modified content back to the file
    await writeFile(filePath, lines.join('\n'));
    console.log(`Updated ${filePath}`);
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error);
  }
}

async function main() {
  const apiDir = path.join(__dirname, 'app', 'api');
  const routeFiles = await findAllRouteFiles(apiDir);
  
  console.log(`Found ${routeFiles.length} route files`);
  
  for (const file of routeFiles) {
    await addDynamicExport(file);
  }
  
  console.log('Done!');
}

main().catch(console.error); 