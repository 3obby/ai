import { useState, useCallback } from 'react';
import axios from 'axios';
import { toast } from '@/components/ui/use-toast';
import { Prompt } from '../types';

export function usePrompts(initialPrompts: Prompt[] = []) {
  const [prompts, setPrompts] = useState<Prompt[]>(initialPrompts);
  const [loading, setLoading] = useState(false);

  const fetchPrompts = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/user-prompts');
      setPrompts(response.data);
    } catch (error) {
      console.error('Failed to fetch prompts:', error);
      toast({
        title: 'Error',
        description: 'Failed to load prompts.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const addPrompt = useCallback(async (text: string) => {
    if (!text.trim()) return;
    
    try {
      const response = await axios.post('/api/user-prompts', {
        text: text.trim(),
      });
      
      setPrompts((current) => [...current, response.data]);
      
      toast({
        title: 'Prompt added',
        description: 'Your prompt has been saved.',
      });
      
      return response.data;
    } catch (error) {
      console.error('Failed to add prompt:', error);
      toast({
        title: 'Error',
        description: 'Failed to add prompt. Please try again.',
        variant: 'destructive',
      });
      return null;
    }
  }, []);

  const togglePrompt = useCallback(async (id: string) => {
    try {
      const prompt = prompts.find((p) => p.id === id);
      if (!prompt) return false;

      // Optimistically update the UI
      const newIsActive = !prompt.isActive;

      setPrompts((current) =>
        current.map((p) => (p.id === id ? { ...p, isActive: newIsActive } : p))
      );

      // Update in the database
      await axios.put('/api/user-prompts', {
        id,
        isActive: newIsActive,
      });
      
      return true;
    } catch (error) {
      console.error('Failed to toggle prompt:', error);
      
      // Revert the optimistic update on error
      const currentPrompt = prompts.find((p) => p.id === id);
      if (currentPrompt) {
        setPrompts((current) =>
          current.map((p) =>
            p.id === id ? { ...p, isActive: !currentPrompt.isActive } : p
          )
        );
      }
      
      toast({
        title: 'Error',
        description: 'Failed to update prompt status. Please try again.',
        variant: 'destructive',
      });
      
      return false;
    }
  }, [prompts]);

  const updatePromptText = useCallback(async (id: string, text: string) => {
    try {
      // Optimistically update the UI
      setPrompts((current) =>
        current.map((p) => (p.id === id ? { ...p, text } : p))
      );

      // Update in the database
      await axios.put('/api/user-prompts', { id, text });
      
      toast({
        title: 'Prompt updated',
        description: 'Your changes have been saved.',
      });
      
      return true;
    } catch (error) {
      console.error('Failed to update prompt:', error);
      
      // Revert the optimistic update on error
      const originalPrompt = prompts.find((p) => p.id === id);
      if (originalPrompt) {
        setPrompts((current) =>
          current.map((p) => (p.id === id ? originalPrompt : p))
        );
      }
      
      toast({
        title: 'Error',
        description: 'Failed to update prompt. Please try again.',
        variant: 'destructive',
      });
      
      return false;
    }
  }, [prompts]);

  const removePrompt = useCallback(async (id: string) => {
    try {
      await axios.delete(`/api/user-prompts?id=${id}`);
      setPrompts((current) => current.filter((prompt) => prompt.id !== id));
      
      toast({
        title: 'Prompt removed',
        description: 'Your prompt has been deleted.',
      });
      
      return true;
    } catch (error) {
      console.error('Failed to remove prompt:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove prompt. Please try again.',
        variant: 'destructive',
      });
      
      return false;
    }
  }, []);

  return {
    prompts,
    loading,
    fetchPrompts,
    addPrompt,
    togglePrompt,
    updatePromptText,
    removePrompt,
  };
} 