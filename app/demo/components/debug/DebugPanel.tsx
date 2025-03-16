'use client';

import { useState } from 'react';
import { Button } from '@/app/shared/components/ui/button';
import { Card } from '@/app/shared/components/ui/card';
import { Message, Companion } from '../../types/companions';
import { DemoSettings } from '../../types/settings';

interface DebugPanelProps {
  companions: Companion[];
  messages: Message[];
  settings: DemoSettings;
  isToolCallingEnabled: boolean;
}

export default function DebugPanel({
  companions,
  messages,
  settings,
  isToolCallingEnabled
}: DebugPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!isExpanded) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="mx-4 mb-2"
        onClick={() => setIsExpanded(true)}
      >
        Show Debug Info
      </Button>
    );
  }

  return (
    <Card className="mx-4 mb-4 p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Debug Information</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(false)}
        >
          Hide
        </Button>
      </div>

      <div className="space-y-2">
        <h4 className="font-medium">Active Companions ({companions.length})</h4>
        <ul className="text-sm space-y-1">
          {companions.map(companion => (
            <li key={companion.id}>
              {companion.name} - {companion.role}
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-2">
        <h4 className="font-medium">Settings</h4>
        <div className="text-sm space-y-1">
          <p>Tool Calling: {isToolCallingEnabled ? 'Enabled' : 'Disabled'}</p>
          <p>Response Speed: {settings.ai.responseSpeed}</p>
          <p>All Respond: {settings.ai.allRespond ? 'Yes' : 'No'}</p>
        </div>
      </div>

      <div className="space-y-2">
        <h4 className="font-medium">Message History ({messages.length})</h4>
        <ul className="text-sm space-y-1 max-h-40 overflow-y-auto">
          {messages.map(message => (
            <li key={message.id} className="flex gap-2">
              <span className="font-medium">{message.senderName}:</span>
              <span className="truncate">{message.content}</span>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
} 