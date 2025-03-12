const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Find all files that import from auth-helpers
exec('grep -r "import.*auth.*from.*auth-helpers" --include="*.ts" --include="*.tsx" .', (error, stdout, stderr) => {
  if (error) {
    console.error(`exec error: ${error}`);
    return;
  }

  const files = stdout.split('\n').filter(line => line).map(line => {
    const [filePath] = line.split(':');
    return filePath;
  });

  // Unique files
  const uniqueFiles = [...new Set(files)];
  console.log(`Found ${uniqueFiles.length} files with auth-helpers imports`);

  // Update each file
  uniqueFiles.forEach(filePath => {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const updatedContent = content.replace(
        /import\s+\{\s*auth\s*\}\s+from\s+['"]@\/lib\/auth-helpers['"]/g,
        'import { auth } from "@/lib/auth"'
      );
      
      if (content !== updatedContent) {
        fs.writeFileSync(filePath, updatedContent);
        console.log(`Updated ${filePath}`);
      }
    } catch (err) {
      console.error(`Error updating ${filePath}: ${err}`);
    }
  });
}); 