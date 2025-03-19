'use client';

import React, { ReactNode } from 'react';
import { useToolIntegration } from '../../hooks/useToolIntegration';

interface ToolIntegrationProviderProps {
  children: ReactNode;
}

/**
 * This component wraps the application to provide tool integration functionality.
 * It automatically processes messages for tool calls.
 */
export function ToolIntegrationProvider({ children }: ToolIntegrationProviderProps) {
  // This hook will monitor messages and process tool calls
  useToolIntegration();
  
  return <>{children}</>;
} 