#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Paths
const GIT_DIR = path.join(__dirname, '../.git');
const HOOKS_DIR = path.join(GIT_DIR, 'hooks');
const POST_COMMIT_HOOK = path.join(HOOKS_DIR, 'post-commit');

// Create the post-commit hook
function setupPostCommitHook() {
  const hookContent = `#!/bin/sh

# Prevent hook recursion by detecting if this is an amendment
if [ -f ".git/AMENDING" ]; then
  # We're in an amendment cycle, do nothing
  rm .git/AMENDING
  exit 0
fi

# Run the version update script after each commit
node "$(git rev-parse --show-toplevel)/scripts/update-version.js"

# Mark that we're going to amend
touch .git/AMENDING

# Automatically commit version changes
git add version.json public/commit-history.json app/\\(auth\\)/\\(routes\\)/login/page.tsx
git commit --amend --no-edit >/dev/null 2>&1 || true
`;

  // Ensure the hooks directory exists
  if (!fs.existsSync(HOOKS_DIR)) {
    fs.mkdirSync(HOOKS_DIR, { recursive: true });
  }
  
  // Write the hook script
  fs.writeFileSync(POST_COMMIT_HOOK, hookContent);
  
  // Make it executable
  try {
    execSync(`chmod +x "${POST_COMMIT_HOOK}"`);
    console.log('✅ Post-commit hook installed successfully!');
  } catch (error) {
    console.error('❌ Error making hook executable:', error);
    console.log('Please run: chmod +x ' + POST_COMMIT_HOOK);
  }
}

// Initialize version.json
function initializeVersion() {
  const versionFile = path.join(__dirname, '../version.json');
  
  if (!fs.existsSync(versionFile)) {
    fs.writeFileSync(versionFile, JSON.stringify({
      major: 0,
      minor: 3,
      patch: 3,
      lastCommit: '',
    }, null, 2));
    
    console.log('✅ Version file initialized');
  } else {
    console.log('ℹ️ Version file already exists');
  }
}

// Check if .git directory exists
if (!fs.existsSync(GIT_DIR)) {
  console.error('❌ Not a git repository or .git directory not found.');
  process.exit(1);
}

// Setup hooks and version
setupPostCommitHook();
initializeVersion();

console.log(`
Auto-documentation setup complete!

Every commit will now:
1. Automatically update the version number based on commit message keywords
2. Update the version displayed on the login page
3. Update the commit history file for the updates page
4. Auto-amend the commit to include these version changes (with recursion protection)

Important Notes:
- Include "major" or "breaking" in commit messages for major version bumps
- Include "minor" or "feature" for minor version bumps
- All other commits will increment the patch version
- The /updates page will automatically reflect the git history
`); 