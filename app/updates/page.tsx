import { Metadata } from "next";
import { format } from "date-fns";
import fs from "fs";
import path from "path";

export const metadata: Metadata = {
  title: "Updates | GroupChatBotBuilder",
  description: "Release notes and update history for GroupChatBotBuilder"
};

// Function to read commit history from JSON file
async function getCommitHistory() {
  try {
    // Read from JSON file in both dev and production
    const filePath = path.join(process.cwd(), 'public', 'commit-history.json');
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.log('Commit history file not found. This is normal for first deployment.');
      return [];
    }
    
    const data = fs.readFileSync(filePath, 'utf8');
    const { commits } = JSON.parse(data);
    return commits || [];
  } catch (error) {
    console.error('Error reading commit history:', error);
    return [];
  }
}

// Function to read current version
async function getCurrentVersion() {
  try {
    const filePath = path.join(process.cwd(), 'version.json');
    if (!fs.existsSync(filePath)) {
      return 'v0.1.0'; // Default fallback version
    }
    
    const versionData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return `v${versionData.major}.${versionData.minor}.${versionData.patch}`;
  } catch (error) {
    console.error('Error reading version:', error);
    return 'v0.1.0'; // Default fallback version
  }
}

// Function to group commits by date
function groupCommitsByDate(commits: any[]) {
  const grouped: Record<string, any[]> = {};
  
  commits.forEach(commit => {
    const date = commit.date.split('T')[0]; // Get just the date part
    if (!grouped[date]) {
      grouped[date] = [];
    }
    grouped[date].push(commit);
  });
  
  return grouped;
}

// Function to determine if a commit should be categorized as a feature, bugfix, etc.
function categorizeCommit(message: string) {
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

export default async function UpdatesPage() {
  const commits = await getCommitHistory();
  const groupedCommits = groupCommitsByDate(commits);
  const currentVersion = await getCurrentVersion();
  
  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <h1 className="text-3xl font-bold mb-2">Updates</h1>
      <p className="text-lg text-muted-foreground mb-8">
        Current version: <span className="font-mono">{currentVersion}</span>
      </p>
      
      {Object.entries(groupedCommits).map(([date, dayCommits]) => (
        <div key={date} className="mb-10">
          <h2 className="text-xl font-semibold mb-4 border-b border-border pb-2">
            {format(new Date(date), 'MMMM d, yyyy')}
          </h2>
          
          <div className="space-y-4">
            {dayCommits.map((commit) => {
              const category = commit.category || 'other';
              
              return (
                <div key={commit.hash} className="flex gap-4">
                  <div className="w-24 flex-shrink-0">
                    <span className={`
                      inline-block px-2 py-1 text-xs rounded-full
                      ${category === 'feature' ? 'bg-green-500/20 text-green-400' : ''}
                      ${category === 'bugfix' ? 'bg-red-500/20 text-red-400' : ''}
                      ${category === 'enhancement' ? 'bg-blue-500/20 text-blue-400' : ''}
                      ${category === 'refactor' ? 'bg-yellow-500/20 text-yellow-400' : ''}
                      ${category === 'documentation' ? 'bg-purple-500/20 text-purple-400' : ''}
                      ${category === 'other' ? 'bg-gray-500/20 text-gray-400' : ''}
                    `}>
                      {category}
                    </span>
                  </div>
                  
                  <div className="flex-1">
                    <p className="font-medium">{commit.message}</p>
                    <p className="text-sm text-muted-foreground">
                      <span className="font-mono">{commit.hash}</span> by {commit.author} at {format(new Date(commit.date), 'h:mm a')}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
      
      {commits.length === 0 && (
        <div className="p-8 text-center border border-dashed rounded-lg">
          <p className="text-muted-foreground">No commit history available yet. History will appear after new commits are made.</p>
        </div>
      )}
    </div>
  );
} 