#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const VERSION_FILE = path.join(__dirname, '../version.json');
const COMMIT_HISTORY_FILE = path.join(__dirname, '../public/commit-history.json');
const LOGIN_PAGE_PATH = path.join(__dirname, '../app/(auth)/(routes)/login/page.tsx');

// Initialize version if it doesn't exist
function initVersionFile() {
  if (!fs.existsSync(VERSION_FILE)) {
    fs.writeFileSync(VERSION_FILE, JSON.stringify({
      major: 0,
      minor: 2,
      patch: 14, // Starting from the current version
      lastCommit: '',
    }, null, 2));
    console.log('Version file initialized.');
  }
}

// Initialize commit history if it doesn't exist
function initCommitHistoryFile() {
  if (!fs.existsSync(COMMIT_HISTORY_FILE)) {
    fs.writeFileSync(COMMIT_HISTORY_FILE, JSON.stringify({
      commits: []
    }, null, 2));
    console.log('Commit history file initialized.');
  }
}

// Get the most recent commit hash
function getLatestCommitHash() {
  return execSync('git rev-parse HEAD').toString().trim();
}

// Categorize commit based on message
function categorizeCommit(message) {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('fix') || lowerMessage.includes('bug') || lowerMessage.includes('issue')) {
    return 'bugfix';
  } else if (lowerMessage.includes('add') || lowerMessage.includes('feature') || lowerMessage.includes('new')) {
    return 'feature';
  } else if (lowerMessage.includes('update') || lowerMessage.includes('improve') || lowerMessage.includes('enhance')) {
    return 'enhancement';
  } else if (lowerMessage.includes('refactor') || lowerMessage.includes('clean')) {
    return 'refactor';
  } else if (lowerMessage.includes('doc') || lowerMessage.includes('readme')) {
    return 'documentation';
  } else {
    return 'other';
  }
}

// Update the commit history file with the latest commit
function updateCommitHistory(latestCommit) {
  initCommitHistoryFile();
  
  // Get commit details
  const commitDetails = execSync(`git show --no-patch --format='{"hash":"%h","fullHash":"%H","date":"%ad","author":"%an","message":"%s"}' --date=iso ${latestCommit}`).toString().trim();
  
  try {
    // Parse commit details
    const commit = JSON.parse(commitDetails);
    commit.category = categorizeCommit(commit.message);
    
    // Read current history
    const history = JSON.parse(fs.readFileSync(COMMIT_HISTORY_FILE, 'utf8'));
    
    // Check if commit already exists
    const commitExists = history.commits.some(c => c.fullHash === commit.fullHash);
    if (!commitExists) {
      // Add new commit at the beginning of the array
      history.commits.unshift(commit);
      
      // Limit to the latest 100 commits to keep file size reasonable
      if (history.commits.length > 100) {
        history.commits = history.commits.slice(0, 100);
      }
      
      // Save updated history
      fs.writeFileSync(COMMIT_HISTORY_FILE, JSON.stringify(history, null, 2));
      console.log(`Added commit ${commit.hash} to history.`);
    }
  } catch (error) {
    console.error('Error updating commit history:', error);
  }
}

// Update the version file based on commit message
function updateVersion() {
  initVersionFile();
  
  // Read current version
  const version = JSON.parse(fs.readFileSync(VERSION_FILE, 'utf8'));
  
  // Get the latest commit
  const latestCommit = getLatestCommitHash();
  
  // If already processed this commit, exit
  if (version.lastCommit === latestCommit) {
    console.log('Version is up to date.');
    return;
  }
  
  // Get the commit message
  const commitMessage = execSync('git log -1 --pretty=%B').toString().trim().toLowerCase();
  
  // Determine what kind of version bump to do
  if (commitMessage.includes('major') || commitMessage.includes('breaking')) {
    version.major++;
    version.minor = 0;
    version.patch = 0;
  } else if (commitMessage.includes('minor') || commitMessage.includes('feature')) {
    version.minor++;
    version.patch = 0;
  } else {
    version.patch++;
  }
  
  // Update the last processed commit
  version.lastCommit = latestCommit;
  
  // Save updated version
  fs.writeFileSync(VERSION_FILE, JSON.stringify(version, null, 2));
  console.log(`Version updated to ${version.major}.${version.minor}.${version.patch}`);
  
  // Update the commit history
  updateCommitHistory(latestCommit);
  
  // Update the login page
  updateLoginPage(version);
}

// Update the version in the login page
function updateLoginPage(version) {
  if (!fs.existsSync(LOGIN_PAGE_PATH)) {
    console.error('Login page not found:', LOGIN_PAGE_PATH);
    return;
  }
  
  let content = fs.readFileSync(LOGIN_PAGE_PATH, 'utf8');
  
  // Replace the version number
  const versionString = `v${version.major}.${version.minor}.${version.patch}`;
  content = content.replace(/v\d+\.\d+\.\d+/g, versionString);
  
  fs.writeFileSync(LOGIN_PAGE_PATH, content);
  console.log(`Updated version in login page to ${versionString}`);
}

// Only run this script if executed directly
if (require.main === module) {
  updateVersion();
}

module.exports = { updateVersion }; 