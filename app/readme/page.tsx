import fs from 'fs';
import path from 'path';
import { Metadata } from 'next';
import ReactMarkdown from 'react-markdown';

export const metadata: Metadata = {
  title: 'Platform Documentation | GroupChatBotBuilder',
  description: 'Technical, business, and operational documentation for the GroupChatBotBuilder (GCBB) platform',
};

// Custom components for ReactMarkdown with proper typing
const MarkdownComponents: React.ComponentPropsWithoutRef<typeof ReactMarkdown>['components'] = {
  h1: ({ node, ...props }) => (
    <h1 className="text-4xl font-bold mb-6 text-center mt-8 bg-gradient-to-r from-blue-600 to-indigo-600 inline-block text-transparent bg-clip-text" {...props} />
  ),
  h2: ({ node, ...props }) => (
    <h2 className="text-3xl font-bold mt-8 mb-4 border-b pb-2 text-primary" {...props} />
  ),
  h3: ({ node, ...props }) => (
    <h3 className="text-2xl font-semibold mb-4 mt-6 text-primary/90" {...props} />
  ),
  ul: ({ node, ...props }) => (
    <ul className="list-disc ml-6 mb-6 space-y-2" {...props} />
  ),
  ol: ({ node, ...props }) => (
    <ol className="list-decimal ml-6 mb-6 space-y-2" {...props} />
  ),
  li: ({ node, ...props }) => <li className="mb-1" {...props} />,
  p: ({ node, ...props }) => <p className="mb-4" {...props} />,
  code: ({ node, ...props }) => (
    <code className="bg-muted px-1 py-0.5 rounded text-sm font-mono" {...props} />
  ),
  pre: ({ node, ...props }) => (
    <pre className="bg-muted p-4 rounded-lg overflow-x-auto mb-6 text-sm font-mono" {...props} />
  ),
  a: ({ node, href, ...props }) => (
    <a href={href} className="text-blue-500 hover:underline" target="_blank" rel="noopener noreferrer" {...props} />
  ),
};

export default function ReadmePage() {
  // Read the README.md file synchronously at build time
  const readmePath = path.join(process.cwd(), 'README.md');
  const readmeContent = fs.readFileSync(readmePath, 'utf8');

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex justify-center mb-8">
        <div className="bg-primary/10 py-2 px-6 rounded-full">
          <span className="text-sm font-medium">Documentation Version: 0.3.23</span>
        </div>
      </div>
      
      <div className="bg-card shadow-lg rounded-xl p-6 md:p-10">
        <ReactMarkdown components={MarkdownComponents}>
          {readmeContent}
        </ReactMarkdown>
      </div>
      
      <div className="mt-10 text-center text-sm text-muted-foreground">
        <p>
          Last updated: {new Date().toLocaleDateString()} • 
          <a href="https://github.com/3obby/ai" target="_blank" rel="noopener noreferrer" className="ml-1 text-blue-500 hover:underline">
            View on GitHub
          </a>
        </p>
      </div>
    </div>
  );
} 