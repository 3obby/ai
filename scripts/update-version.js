#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const VERSION_FILE = path.join(__dirname, '../version.json');
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

// Get the most recent commit hash
function getLatestCommitHash() {
  return execSync('git rev-parse HEAD').toString().trim();
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