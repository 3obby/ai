'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from "@/app/shared/components/ui/button";
import { ScrollArea } from "@/app/shared/components/ui/scroll-area";

interface DebugInfoProps {
  debugInfo: any;
  isExpanded: boolean;
}

export default function DebugInfo({ debugInfo, isExpanded }: DebugInfoProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const renderValue = (value: any, depth: number = 0): JSX.Element => {
    if (value === null) return <span className="text-muted-foreground">null</span>;
    if (value === undefined) return <span className="text-muted-foreground">undefined</span>;
    if (typeof value === 'string') return <span className="text-green-500">{`"${value}"`}</span>;
    if (typeof value === 'number') return <span className="text-blue-500">{value}</span>;
    if (typeof value === 'boolean') return <span className="text-purple-500">{value.toString()}</span>;
    if (Array.isArray(value)) {
      return (
        <div className="ml-4">
          [
          {value.map((item, index) => (
            <div key={index} className="ml-4">
              {renderValue(item, depth + 1)}
              {index < value.length - 1 && ','}
            </div>
          ))}
          ]
        </div>
      );
    }
    if (typeof value === 'object') {
      return (
        <div className="ml-4">
          {'{'}
          {Object.entries(value).map(([key, val], index, arr) => (
            <div key={key} className="ml-4">
              <span className="text-yellow-500">{key}</span>: {renderValue(val, depth + 1)}
              {index < arr.length - 1 && ','}
            </div>
          ))}
          {'}'}
        </div>
      );
    }
    return <span>{String(value)}</span>;
  };

  if (!debugInfo || !isExpanded) return null;

  return (
    <div className="mt-2 p-2 bg-muted/30 rounded-md text-xs font-mono">
      <ScrollArea className="max-h-[300px]">
        {Object.entries(debugInfo).map(([section, data]) => (
          <div key={section} className="mb-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 font-mono"
              onClick={() => toggleSection(section)}
            >
              {expandedSections[section] ? <ChevronDown className="h-4 w-4 mr-1" /> : <ChevronRight className="h-4 w-4 mr-1" />}
              {section}
            </Button>
            {expandedSections[section] && (
              <div className="pl-4 pt-1">
                {renderValue(data)}
              </div>
            )}
          </div>
        ))}
      </ScrollArea>
    </div>
  );
} 