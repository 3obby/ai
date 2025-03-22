'use client';

import React, { useState, useEffect, useRef } from 'react';

interface PromptEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  helpText?: string;
  variables?: string[];
  height?: string;
}

export function PromptEditor({
  value,
  onChange,
  placeholder = 'Enter a prompt...',
  label,
  helpText,
  variables = [],
  height = '200px'
}: PromptEditorProps) {
  const [prompt, setPrompt] = useState(value);
  const [selectedVariable, setSelectedVariable] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Update internal state when external value changes
  useEffect(() => {
    setPrompt(value);
  }, [value]);
  
  // Handle text changes
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setPrompt(newValue);
    onChange(newValue);
  };
  
  // Insert a variable at the current cursor position
  const insertVariable = (variable: string) => {
    if (!textareaRef.current) return;
    
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    
    // Create the variable placeholder
    const variablePlaceholder = `{{${variable}}}`;
    
    // Insert the variable at cursor position
    const newValue = 
      prompt.substring(0, start) + 
      variablePlaceholder + 
      prompt.substring(end);
    
    setPrompt(newValue);
    onChange(newValue);
    
    // Reset selected variable
    setSelectedVariable(null);
    
    // Focus back on textarea and place cursor after the inserted variable
    setTimeout(() => {
      textarea.focus();
      const newCursorPosition = start + variablePlaceholder.length;
      textarea.setSelectionRange(newCursorPosition, newCursorPosition);
    }, 0);
  };
  
  // Highlight syntax in the prompt
  const getHighlightedPrompt = () => {
    if (!prompt) return '';
    
    // Replace variable placeholders with highlighted spans
    let highlightedText = prompt;
    
    // Regex to match {{variable}} pattern
    const variableRegex = /\{\{([^{}]+)\}\}/g;
    
    // Replace variables with marked spans
    return highlightedText.replace(variableRegex, '<mark class="bg-primary/20 text-primary px-1 rounded">{{$1}}</mark>');
  };
  
  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium">
          {label}
        </label>
      )}
      
      <div className="border rounded-md overflow-hidden">
        {/* Toolbar */}
        {variables.length > 0 && (
          <div className="bg-muted p-2 border-b flex items-center flex-wrap gap-2">
            <span className="text-xs text-muted-foreground">Insert variable:</span>
            {variables.map(variable => (
              <button
                key={variable}
                type="button"
                onClick={() => insertVariable(variable)}
                className="text-xs px-2 py-1 bg-primary/10 hover:bg-primary/20 rounded"
              >
                {variable}
              </button>
            ))}
          </div>
        )}
        
        {/* Editor */}
        <div className="relative" style={{ height }}>
          {/* Actual textarea for editing (invisible, just for cursor and input) */}
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={handleChange}
            placeholder={placeholder}
            className="absolute inset-0 w-full h-full p-3 resize-none font-mono text-transparent caret-foreground bg-transparent z-10"
            style={{ caretColor: 'currentColor' }}
          />
          
          {/* Highlighted display layer */}
          <div 
            className="absolute inset-0 w-full h-full p-3 font-mono whitespace-pre-wrap overflow-auto pointer-events-none"
            dangerouslySetInnerHTML={{ __html: getHighlightedPrompt() || placeholder }}
          />
          
          {/* Show a placeholder if the textarea is empty */}
          {!prompt && (
            <div className="absolute inset-0 w-full h-full p-3 font-mono text-muted-foreground pointer-events-none">
              {placeholder}
            </div>
          )}
        </div>
      </div>
      
      {helpText && (
        <p className="text-xs text-muted-foreground">
          {helpText}
        </p>
      )}
      
      {/* Preview (optional) */}
      {prompt && (
        <div className="mt-4">
          <h4 className="text-sm font-medium mb-1">Preview</h4>
          <div className="p-3 bg-muted rounded-md text-sm">
            {/* Process the prompt to replace variables with example values for preview */}
            {prompt.replace(
              /\{\{([^{}]+)\}\}/g, 
              (_, variable) => `<value for ${variable}>`
            )}
          </div>
        </div>
      )}
    </div>
  );
} 