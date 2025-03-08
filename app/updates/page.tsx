import { Metadata } from "next";
import { execSync } from "child_process";
import { format } from "date-fns";

export const metadata: Metadata = {
  title: "Updates | GroupChatBotBuilder",
  description: "Release notes and update history for GroupChatBotBuilder"
};

// This function uses server-side execution to get git commits
// Will only work in a development environment or server with git access
async function getCommitHistory() {
  try {
    // Get the last 50 commits, formatted with hash, date, author, and message
    const gitLog = execSync(
      'git log -n 50 --pretty=format:\'{"hash":"%h","date":"%ad","author":"%an","message":"%s"}\' --date=iso',
      { encoding: 'utf-8' }
    );
    
    // Parse each line as a JSON object
    const commits = gitLog
      .split('\n')
      .map(line => {
        try {
          return JSON.parse(line);
        } catch (e) {
          console.error('Failed to parse git log line:', line);
          return null;
        }
      })
      .filter(Boolean); // Remove any null entries
      
    return commits;
  } catch (error) {
    console.error('Error getting git history:', error);
    return [];
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

// Function to determine the version based on commits
// This is a simple implementation - in reality you might want to use semantic versioning
function determineVersion(commits: any[]) {
  // For now we'll assume the most recent version is on the login page
  // In a real app, you'd want to derive this from tags or a version file
  return 'v0.2.14'; // Incremented from current v0.2.13
}

export default async function UpdatesPage() {
  const commits = await getCommitHistory();
  const groupedCommits = groupCommitsByDate(commits);
  const currentVersion = determineVersion(commits);
  
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
              const category = categorizeCommit(commit.message);
              
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
          <p className="text-muted-foreground">No commit history available.</p>
        </div>
      )}
    </div>
  );
} 