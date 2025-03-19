// This script helps clean up any references to Google Cloud Storage after migration to Vercel Blob
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Directories to exclude from search
const excludeDirs = [
  'node_modules',
  '.next',
  '.git',
  'dist',
  'build',
];

// Files to look for
const targetFiles = [
  'app/api/files/[fileId]/content/route.ts',
  'lib/google-cloud-storage.ts',
];

console.log('🔍 Checking for Google Cloud Storage references...');

// Check if file exists
targetFiles.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  if (fs.existsSync(filePath)) {
    console.log(`❌ Found file that should be removed: ${file}`);
    
    try {
      // If the file is already migrated to Vercel Blob, we can safely delete it
      if (file === 'lib/google-cloud-storage.ts') {
        fs.unlinkSync(filePath);
        console.log(`✅ Deleted: ${file}`);
      } else {
        console.log(`⚠️ Please manually check and update: ${file}`);
      }
    } catch (error) {
      console.error(`Error deleting ${file}:`, error);
    }
  } else {
    console.log(`✅ File not found (good): ${file}`);
  }
});

// Look for any imports of @google-cloud/storage
console.log('\n🔍 Checking for imports of @google-cloud/storage...');

try {
  const grepResult = execSync('grep -r "from \'@google-cloud/storage\'" --include="*.ts" --include="*.js" .', { encoding: 'utf8' });
  console.log('❌ Found imports:');
  console.log(grepResult);
} catch (error) {
  // grep returns exit code 1 when no matches are found
  if (error.status === 1) {
    console.log('✅ No imports found (good)');
  } else {
    console.error('Error running grep:', error);
  }
}

console.log('\n🧹 Cleaning build cache...');
try {
  // Remove .next directory to clean the build cache
  if (fs.existsSync(path.join(process.cwd(), '.next'))) {
    execSync('rm -rf .next');
    console.log('✅ Removed .next directory');
  } else {
    console.log('✅ .next directory not found (already clean)');
  }
} catch (error) {
  console.error('Error cleaning build cache:', error);
}

console.log('\n✨ Clean-up completed!');
console.log('👉 Next steps:');
console.log('1. Run "npm install" to ensure dependencies are correctly installed');
console.log('2. Run "npm run clean-build" to build with a fresh cache'); 