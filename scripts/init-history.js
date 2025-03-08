const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const COMMIT_HISTORY_FILE = path.join(__dirname, '../public/commit-history.json');

// Initialize empty history
const history = { commits: [] };

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

// Get all commits
try {
  const gitLog = execSync(
    'git log -n 50 --pretty=format:\'{"hash":"%h","fullHash":"%H","date":"%ad","author":"%an","message":"%s"}\' --date=iso',
    { encoding: 'utf-8' }
  );
  
  // Parse each line as a JSON object
  const commits = gitLog
    .split('\n')
    .map(line => {
      try {
        const commit = JSON.parse(line);
        commit.category = categorizeCommit(commit.message);
        return commit;
      } catch (e) {
        console.error('Failed to parse git log line:', line);
        return null;
      }
    })
    .filter(Boolean);
  
  history.commits = commits;
  
  // Save to JSON file
  fs.writeFileSync(COMMIT_HISTORY_FILE, JSON.stringify(history, null, 2));
  console.log(`Initialized commit history with ${commits.length} commits.`);
} catch (error) {
  console.error('Error initializing commit history:', error);
} 