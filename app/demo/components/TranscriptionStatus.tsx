'use client';

import { useState, useEffect } from 'react';
import { Alert, AlertDescription, AlertTitle } from "@/app/shared/components/ui/alert";
import { AlertCircle, CheckCircle2 } from "lucide-react";

interface TranscriptionStatusProps {
  status: 'connecting' | 'connected' | 'disconnected' | 'error' | 'warning';
  message?: string;
  onDismiss?: () => void;
}

export default function TranscriptionStatus({
  status,
  message,
  onDismiss
}: TranscriptionStatusProps) {
  const [visible, setVisible] = useState(true);
  
  // Auto-dismiss success and warning messages after 5 seconds
  useEffect(() => {
    if (status === 'connected' || status === 'warning') {
      const timer = setTimeout(() => {
        setVisible(false);
        if (onDismiss) onDismiss();
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [status, onDismiss]);
  
  if (!visible) return null;
  
  // Determine alert variant based on status
  const variant = 
    status === 'error' ? 'destructive' : 
    status === 'warning' ? 'warning' : 
    status === 'connected' ? 'success' : 
    'default';
  
  return (
    <Alert variant={variant as any} className="mt-4">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>
        {status === 'connecting' && 'Connecting to transcription service...'}
        {status === 'connected' && 'Connected successfully'}
        {status === 'disconnected' && 'Disconnected from service'}
        {status === 'error' && 'Connection Error'}
        {status === 'warning' && 'Warning'}
      </AlertTitle>
      <AlertDescription>
        {message || (
          status === 'error' 
            ? 'Could not connect to the transcription service. Please make sure the server is running on port 3001.'
            : 'No additional information available.'
        )}
      </AlertDescription>
    </Alert>
  );
} 