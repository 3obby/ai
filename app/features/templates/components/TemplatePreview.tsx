'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/app/shared/components/ui/card';
import { ServerAvatar } from '@/app/shared/components/ui/server-avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/shared/components/ui/tabs';
import { Skeleton } from '@/app/shared/components/ui/skeleton';

export interface TemplatePreviewProps {
  template: {
    id: string;
    name: string;
    description: string;
    type: 'chat' | 'companion' | 'group';
    previewImage?: string;
    content: Record<string, any>;
  };
  mode?: 'desktop' | 'mobile' | 'both';
  isRealtime?: boolean;
}

export default function TemplatePreview({
  template,
  mode = 'both',
  isRealtime = true,
}: TemplatePreviewProps) {
  const [activeTab, setActiveTab] = useState<string>(mode === 'mobile' ? 'mobile' : 'desktop');
  const [previewContent, setPreviewContent] = useState<Record<string, any>>(template.content);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Update preview when template changes if realtime is enabled
  useEffect(() => {
    if (isRealtime) {
      setPreviewContent(template.content);
    }
  }, [template.content, isRealtime]);

  // Force update the preview - for non-realtime mode
  const updatePreview = () => {
    setIsLoading(true);
    // Simulate loading delay
    setTimeout(() => {
      setPreviewContent(template.content);
      setIsLoading(false);
    }, 500);
  };

  // Render the appropriate preview based on template type
  const renderPreview = () => {
    const isMobile = activeTab === 'mobile';

    switch (template.type) {
      case 'chat':
        return <ChatTemplatePreview content={previewContent} isMobile={isMobile} isLoading={isLoading} />;
      case 'companion':
        return <CompanionTemplatePreview content={previewContent} isMobile={isMobile} isLoading={isLoading} />;
      case 'group':
        return <GroupTemplatePreview content={previewContent} isMobile={isMobile} isLoading={isLoading} />;
      default:
        return <div className="text-center p-4">Unsupported template type</div>;
    }
  };

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">Preview</h3>
        {!isRealtime && (
          <button
            onClick={updatePreview}
            className="px-3 py-1 bg-primary text-primary-foreground text-sm rounded-md"
          >
            Update Preview
          </button>
        )}
      </div>

      {mode === 'both' && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-2 mb-4">
            <TabsTrigger value="desktop">Desktop</TabsTrigger>
            <TabsTrigger value="mobile">Mobile</TabsTrigger>
          </TabsList>
          <TabsContent value="desktop" className="mt-0">
            <div className="w-full rounded-md overflow-hidden border border-border">
              {renderPreview()}
            </div>
          </TabsContent>
          <TabsContent value="mobile" className="mt-0">
            <div className="max-w-[375px] mx-auto rounded-md overflow-hidden border border-border">
              {renderPreview()}
            </div>
          </TabsContent>
        </Tabs>
      )}

      {mode !== 'both' && (
        <div className={`${mode === 'mobile' ? 'max-w-[375px] mx-auto' : 'w-full'} rounded-md overflow-hidden border border-border`}>
          {renderPreview()}
        </div>
      )}
    </div>
  );
}

// Individual preview components
interface PreviewProps {
  content: Record<string, any>;
  isMobile: boolean;
  isLoading: boolean;
}

function ChatTemplatePreview({ content, isMobile, isLoading }: PreviewProps) {
  const { theme, messages = [], inputPlaceholder = 'Type your message...' } = content;
  const containerClass = isMobile ? 'h-[420px]' : 'h-[500px]';
  
  return (
    <div className={`flex flex-col ${containerClass} bg-background`}>
      {/* Chat header */}
      <div className="p-3 border-b border-border flex items-center gap-3">
        {isLoading ? (
          <Skeleton className="h-10 w-10 rounded-full" />
        ) : (
          <ServerAvatar
            src={content.avatar || '/images/chat-default.png'}
            alt="Chat"
            className="h-10 w-10"
          />
        )}
        <div>
          {isLoading ? (
            <Skeleton className="h-5 w-32" />
          ) : (
            <h4 className="font-semibold">{content.name || 'Chat Template'}</h4>
          )}
          {isLoading ? (
            <Skeleton className="h-4 w-24 mt-1" />
          ) : (
            <p className="text-xs text-muted-foreground">{content.description || 'Template preview'}</p>
          )}
        </div>
      </div>
      
      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {isLoading ? (
          // Loading messages skeletons
          Array(3).fill(0).map((_, i) => (
            <div key={i} className={`flex items-start gap-2 ${i % 2 === 1 ? 'flex-row-reverse' : ''}`}>
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className={`space-y-1 ${i % 2 === 1 ? 'items-end' : ''}`}>
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-16 w-[200px]" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          ))
        ) : messages.length > 0 ? (
          // Render example messages
          messages.map((msg: any, i: number) => (
            <div 
              key={i} 
              className={`flex items-start gap-2 ${msg.isUser ? 'flex-row-reverse' : ''}`}
            >
              <ServerAvatar
                src={msg.isUser ? '/images/user-avatar.png' : content.avatar || '/images/assistant-avatar.png'}
                alt={msg.isUser ? 'You' : 'Assistant'}
                className="h-8 w-8"
              />
              <div 
                className={`p-3 rounded-lg max-w-[80%] ${
                  msg.isUser 
                    ? 'bg-primary/10 text-primary-foreground' 
                    : 'bg-muted/50 text-foreground'
                }`}
              >
                <p className="text-sm">{msg.content}</p>
                <p className="text-xs text-muted-foreground mt-1">Just now</p>
              </div>
            </div>
          ))
        ) : (
          // Empty state
          <div className="h-full flex items-center justify-center">
            <p className="text-muted-foreground text-sm">No messages in this template</p>
          </div>
        )}
      </div>
      
      {/* Chat input */}
      <div className="p-3 border-t border-border">
        <div className="flex gap-2">
          <input
            type="text"
            className="flex-1 py-2 px-3 bg-background rounded-md border border-input text-sm"
            placeholder={inputPlaceholder}
            disabled
          />
          <button
            disabled
            className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

function CompanionTemplatePreview({ content, isMobile, isLoading }: PreviewProps) {
  const containerClass = isMobile ? 'h-[420px]' : 'h-[500px]';
  const { name, description, category, traits = {} } = content;
  
  return (
    <div className={`${containerClass} bg-background flex flex-col`}>
      {/* Companion header */}
      <div className="aspect-[2/1] bg-gradient-to-r from-primary/20 to-primary/10 relative">
        {isLoading ? (
          <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2">
            <Skeleton className="h-24 w-24 rounded-full" />
          </div>
        ) : (
          <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2">
            <ServerAvatar
              src={content.imageUrl || '/images/companion-default.png'}
              alt={name || 'Companion'}
              className="h-24 w-24 border-4 border-background rounded-full shadow-md"
            />
          </div>
        )}
      </div>
      
      {/* Companion details */}
      <div className="pt-16 p-4 flex-1">
        <div className="text-center mb-6">
          {isLoading ? (
            <>
              <Skeleton className="h-6 w-40 mx-auto" />
              <Skeleton className="h-4 w-24 mx-auto mt-2" />
            </>
          ) : (
            <>
              <h2 className="text-xl font-bold">{name || 'Companion Template'}</h2>
              <p className="text-sm text-muted-foreground mt-1">{category || 'Category'}</p>
            </>
          )}
        </div>
        
        {isLoading ? (
          <Skeleton className="h-20 w-full mt-4" />
        ) : (
          <p className="text-sm text-muted-foreground">
            {description || 'A template for a companion.'}
          </p>
        )}
        
        {/* Traits visualization */}
        {!isLoading && Object.keys(traits).length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-medium mb-3">Personality Traits</h3>
            <div className="space-y-3">
              {Object.entries(traits).map(([key, value]) => (
                <div key={key} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                    <span>{value}/10</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary"
                      style={{ width: `${(Number(value) / 10) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* Action footer */}
      <div className="p-4 border-t border-border flex justify-center">
        <button
          disabled
          className="bg-primary text-primary-foreground rounded-md px-6 py-2 text-sm"
        >
          Chat Now
        </button>
      </div>
    </div>
  );
}

function GroupTemplatePreview({ content, isMobile, isLoading }: PreviewProps) {
  const containerClass = isMobile ? 'h-[420px]' : 'h-[500px]';
  const { name, description, participants = [] } = content;
  
  return (
    <div className={`${containerClass} bg-background flex flex-col`}>
      {/* Group header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-3">
          {isLoading ? (
            <Skeleton className="h-12 w-12 rounded-full" />
          ) : (
            <div className="relative h-12 w-12">
              <ServerAvatar
                src="/images/group-chat.png"
                alt={name || 'Group Chat'}
                className="h-12 w-12"
              />
              <div className="absolute bottom-0 right-0 w-5 h-5 bg-primary rounded-full flex items-center justify-center text-[10px] text-primary-foreground">
                {participants.length}
              </div>
            </div>
          )}
          
          <div>
            {isLoading ? (
              <>
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-24 mt-1" />
              </>
            ) : (
              <>
                <h2 className="font-semibold">{name || 'Group Template'}</h2>
                <p className="text-xs text-muted-foreground">
                  {participants.length} {participants.length === 1 ? 'participant' : 'participants'}
                </p>
              </>
            )}
          </div>
        </div>
        
        {!isLoading && description && (
          <p className="text-sm text-muted-foreground mt-3">{description}</p>
        )}
      </div>
      
      {/* Participants list */}
      <div className="flex-1 overflow-y-auto p-4">
        <h3 className="text-sm font-medium mb-3">Participants</h3>
        
        {isLoading ? (
          <div className="space-y-3">
            {Array(4).fill(0).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div>
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24 mt-1" />
                </div>
              </div>
            ))}
          </div>
        ) : participants.length > 0 ? (
          <div className="space-y-3">
            {participants.map((participant: any, i: number) => (
              <div key={i} className="flex items-center gap-3">
                <ServerAvatar
                  src={participant.isUser ? '/images/user-avatar.png' : participant.avatar || '/images/companion-default.png'}
                  alt={participant.name}
                  className="h-10 w-10"
                />
                <div>
                  <p className="font-medium text-sm">{participant.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {participant.isUser ? 'You' : 'AI Companion'}
                    {participant.role && ` · ${participant.role}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">No participants added</p>
        )}
      </div>
      
      {/* Action footer */}
      <div className="p-4 border-t border-border flex justify-center">
        <button
          disabled
          className="bg-primary text-primary-foreground rounded-md px-6 py-2 text-sm"
        >
          Start Group Chat
        </button>
      </div>
    </div>
  );
} 