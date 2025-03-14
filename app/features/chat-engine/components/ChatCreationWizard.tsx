'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { Companion } from '@/app/shared/types/companion';
import { ChatType } from '@/app/shared/types/chat';
import { Button } from '@/app/shared/components/ui/button';
import { Input } from '@/app/shared/components/ui/input';
import { useToast } from '@/app/shared/components/ui/toast';

interface ChatCreationWizardProps {
  companion?: Companion;
  userId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

enum CreationStep {
  SELECT_TYPE = 0,
  SELECT_COMPANION = 1,
  CONFIGURE_CHAT = 2,
  CREATING = 3,
}

export function ChatCreationWizard({
  companion,
  userId,
  onSuccess,
  onCancel,
}: ChatCreationWizardProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState<CreationStep>(
    companion ? CreationStep.CONFIGURE_CHAT : CreationStep.SELECT_TYPE
  );
  const [chatType, setChatType] = useState<ChatType>(ChatType.INDIVIDUAL);
  const [selectedCompanionId, setSelectedCompanionId] = useState<string | null>(
    companion?.id || null
  );
  const [chatName, setChatName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [availableCompanions, setAvailableCompanions] = useState<Companion[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Fetch available companions when selecting companions
  React.useEffect(() => {
    if (currentStep === CreationStep.SELECT_COMPANION) {
      const fetchCompanions = async () => {
        try {
          setIsLoading(true);
          const response = await axios.get('/api/companions', {
            params: { userId }
          });
          setAvailableCompanions(response.data.companions || []);
          setError(null);
        } catch (error) {
          console.error('Error fetching companions:', error);
          setError('Failed to load companions. Please try again.');
        } finally {
          setIsLoading(false);
        }
      };

      fetchCompanions();
    }
  }, [currentStep, userId]);

  // Handle chat type selection
  const handleSelectType = (type: ChatType) => {
    setChatType(type);
    setCurrentStep(CreationStep.SELECT_COMPANION);
  };

  // Handle companion selection
  const handleSelectCompanion = (companionId: string) => {
    setSelectedCompanionId(companionId);
    setCurrentStep(CreationStep.CONFIGURE_CHAT);
  };

  // Handle chat creation
  const handleCreateChat = async () => {
    if (!selectedCompanionId) {
      setError('Please select a companion first');
      return;
    }

    try {
      setIsLoading(true);
      setCurrentStep(CreationStep.CREATING);

      // Determine API endpoint based on chat type
      const endpoint = chatType === ChatType.INDIVIDUAL ? '/api/chats/individual' : '/api/chats/group';

      // Create the chat
      const response = await axios.post(endpoint, {
        companionId: selectedCompanionId,
        name: chatName || 'New Chat',
        userId,
      });

      // Handle successful creation
      toast({
        title: "Chat created",
        description: "Your new chat has been created successfully.",
      });

      // Navigate to the new chat
      if (response.data.id) {
        const chatPath = chatType === ChatType.INDIVIDUAL 
          ? `/chat/${response.data.id}${userId ? `?userId=${userId}` : ''}`
          : `/group-chat/${response.data.id}${userId ? `?userId=${userId}` : ''}`;
        
        router.push(chatPath);
      }

      // Call the success callback if provided
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error creating chat:', error);
      setError('Failed to create chat. Please try again.');
      setCurrentStep(CreationStep.CONFIGURE_CHAT);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col space-y-6 p-4 w-full max-w-md mx-auto bg-background rounded-lg shadow-lg">
      {/* Error message */}
      {error && (
        <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm">
          {error}
        </div>
      )}

      {/* Step 1: Select Chat Type */}
      {currentStep === CreationStep.SELECT_TYPE && (
        <>
          <h2 className="text-2xl font-bold text-foreground">Choose Chat Type</h2>
          <div className="grid grid-cols-2 gap-4">
            <Button
              onClick={() => handleSelectType(ChatType.INDIVIDUAL)}
              className="h-32 flex flex-col items-center justify-center"
              variant="outline"
            >
              <div className="text-3xl mb-2">👤</div>
              <span>Individual Chat</span>
            </Button>
            <Button
              onClick={() => handleSelectType(ChatType.GROUP)}
              className="h-32 flex flex-col items-center justify-center"
              variant="outline"
            >
              <div className="text-3xl mb-2">👥</div>
              <span>Group Chat</span>
            </Button>
          </div>
        </>
      )}

      {/* Step 2: Select Companion */}
      {currentStep === CreationStep.SELECT_COMPANION && (
        <>
          <h2 className="text-2xl font-bold text-foreground">Select Companion</h2>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 max-h-[400px] overflow-y-auto p-1">
              {availableCompanions.map((companion) => (
                <Button
                  key={companion.id}
                  onClick={() => handleSelectCompanion(companion.id)}
                  className="h-32 flex flex-col items-center justify-center p-2"
                  variant="outline"
                >
                  {companion.src ? (
                    <img 
                      src={companion.src} 
                      alt={companion.name} 
                      className="w-12 h-12 rounded-full object-cover mb-2" 
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-2">
                      {companion.name.charAt(0)}
                    </div>
                  )}
                  <span className="text-sm truncate w-full text-center">{companion.name}</span>
                </Button>
              ))}
            </div>
          )}
          <Button 
            onClick={() => setCurrentStep(CreationStep.SELECT_TYPE)}
            variant="ghost"
          >
            Back
          </Button>
        </>
      )}

      {/* Step 3: Configure Chat */}
      {currentStep === CreationStep.CONFIGURE_CHAT && (
        <>
          <h2 className="text-2xl font-bold text-foreground">Configure Chat</h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="chatName" className="text-sm font-medium text-foreground">
                Chat Name
              </label>
              <Input
                id="chatName"
                placeholder="Enter chat name"
                value={chatName}
                onChange={(e) => setChatName(e.target.value)}
              />
            </div>

            {/* Additional configuration options can be added here */}
          </div>
          <div className="flex justify-between pt-4">
            <Button 
              onClick={() => setCurrentStep(CreationStep.SELECT_COMPANION)}
              variant="ghost"
              disabled={isLoading}
            >
              Back
            </Button>
            <Button 
              onClick={handleCreateChat}
              disabled={isLoading}
            >
              Create Chat
            </Button>
          </div>
        </>
      )}

      {/* Step 4: Creating Chat */}
      {currentStep === CreationStep.CREATING && (
        <div className="flex flex-col items-center justify-center py-8 space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Creating your chat...</p>
        </div>
      )}

      {/* Cancel button */}
      {currentStep !== CreationStep.CREATING && (
        <Button 
          onClick={onCancel}
          variant="ghost"
          className="text-muted-foreground"
        >
          Cancel
        </Button>
      )}
    </div>
  );
} 