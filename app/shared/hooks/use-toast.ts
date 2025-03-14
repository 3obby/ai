'use client';

import { useCallback, useState } from 'react';

interface Toast {
  id: string;
  title: string;
  description?: string;
  variant?: 'default' | 'destructive' | 'success';
  duration?: number;
}

interface ToastState {
  toasts: Toast[];
}

interface ToastOptions {
  title: string;
  description?: string;
  variant?: 'default' | 'destructive' | 'success';
  duration?: number;
}

const DEFAULT_TOAST_DURATION = 5000; // 5 seconds

// Simple toast hook to be used until we implement a more robust solution
export function useToast() {
  const [state, setState] = useState<ToastState>({ toasts: [] });

  const toast = useCallback((options: ToastOptions) => {
    const id = Date.now().toString();
    const newToast: Toast = {
      id,
      title: options.title,
      description: options.description,
      variant: options.variant || 'default',
      duration: options.duration || DEFAULT_TOAST_DURATION,
    };

    setState((prevState) => ({
      toasts: [...prevState.toasts, newToast],
    }));

    // In a real implementation, we would add the toast to the DOM
    // For simplicity in this demo, we'll just log to console
    console.log(`Toast [${newToast.variant}]: ${newToast.title}${newToast.description ? ` - ${newToast.description}` : ''}`);

    // Auto-dismiss toast after duration
    setTimeout(() => {
      setState((prevState) => ({
        toasts: prevState.toasts.filter((t) => t.id !== id),
      }));
    }, newToast.duration);

    return id;
  }, []);

  const dismissToast = useCallback((id: string) => {
    setState((prevState) => ({
      toasts: prevState.toasts.filter((t) => t.id !== id),
    }));
  }, []);

  return {
    toast,
    dismissToast,
    toasts: state.toasts,
  };
} 