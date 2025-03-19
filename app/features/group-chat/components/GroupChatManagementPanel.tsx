'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { Companion } from '@/app/shared/types/companion';
import { useGroupChat } from '../hooks/use-group-chat-store';
import { Button } from '@/app/shared/components/ui/button';
import { Input } from '@/app/shared/components/ui/input';
import { Dialog, DialogContent, DialogTitle, DialogHeader, DialogFooter } from '@/app/shared/components/ui/dialog';
import { Alert, AlertDescription } from '@/app/shared/components/ui/alert';
import { Badge } from '@/app/shared/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/app/shared/components/ui/tabs';

interface GroupChatManagementPanelProps {
  groupId: string;
  userId?: string;
  initialTab?: string;
}

export function GroupChatManagementPanel({
  groupId,
  userId,
  initialTab = 'members',
}: GroupChatManagementPanelProps) {
  const router = useRouter();
  const { 
    groupChat, 
    participants, 
    availableCompanions, 
    isLoading, 
    error, 
    addMember, 
    removeMember, 
    renameGroup, 
    refreshMembers 
  } = useGroupChat();
  
  const [newGroupName, setNewGroupName] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState(initialTab);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize new group name with the current name when available
  React.useEffect(() => {
    if (groupChat?.name && !newGroupName) {
      setNewGroupName(groupChat.name);
    }
  }, [groupChat?.name, newGroupName]);

  // Filter available companions based on search query
  const filteredAvailableCompanions = availableCompanions.filter(
    companion => companion.name.toLowerCase().includes(memberSearchQuery.toLowerCase())
  );

  // Handle group renaming
  const handleRenameGroup = async () => {
    if (!newGroupName.trim()) {
      setErrorMessage('Group name cannot be empty');
      return;
    }

    try {
      setIsRenaming(true);
      await renameGroup(newGroupName);
      setIsRenaming(false);
      setErrorMessage(null);
    } catch (error) {
      console.error('Error renaming group:', error);
      setErrorMessage('Failed to rename group. Please try again.');
      setIsRenaming(false);
    }
  };

  // Handle member addition
  const handleAddMember = async (companionId: string) => {
    try {
      setIsAddingMember(true);
      await addMember(companionId);
      setIsAddingMember(false);
      setErrorMessage(null);
    } catch (error) {
      console.error('Error adding member:', error);
      setErrorMessage('Failed to add member. Please try again.');
      setIsAddingMember(false);
    }
  };

  // Handle member removal
  const handleRemoveMember = async (companionId: string) => {
    try {
      await removeMember(companionId);
      setErrorMessage(null);
    } catch (error) {
      console.error('Error removing member:', error);
      setErrorMessage('Failed to remove member. Please try again.');
    }
  };

  // Handle group deletion
  const handleDeleteGroup = async () => {
    try {
      setIsDeleting(true);
      await axios.delete(`/api/chats/group/${groupId}`, {
        params: { userId }
      });
      router.push('/dashboard');
    } catch (error) {
      console.error('Error deleting group:', error);
      setErrorMessage('Failed to delete group. Please try again.');
      setIsDeleting(false);
    }
  };

  // Check if user is the creator of the group
  const isCreator = groupChat?.creatorId === userId;

  return (
    <div className="flex flex-col w-full">
      {/* Error message display */}
      {(errorMessage || error) && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>
            {errorMessage || 'An error occurred. Please try again.'}
          </AlertDescription>
        </Alert>
      )}

      {/* Group management tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-3 mb-4">
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="settings" disabled={!isCreator}>Settings</TabsTrigger>
          <TabsTrigger value="danger" disabled={!isCreator}>Danger Zone</TabsTrigger>
        </TabsList>

        {/* Members tab */}
        <TabsContent value="members" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Current Members</h3>
            <Badge variant="outline">{participants.length}</Badge>
          </div>

          {/* Current members list */}
          <div className="space-y-2 max-h-[300px] overflow-y-auto p-1">
            {participants.map((participant) => (
              <div 
                key={participant.id} 
                className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50"
              >
                <div className="flex items-center space-x-3">
                  {participant.avatarUrl ? (
                    <img 
                      src={participant.avatarUrl} 
                      alt={participant.displayName || 'Member'} 
                      className="w-8 h-8 rounded-full object-cover" 
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                      {participant.displayName?.charAt(0) || 'M'}
                    </div>
                  )}
                  <span>{participant.displayName}</span>
                </div>

                {isCreator && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleRemoveMember(participant.participantId)}
                    disabled={isLoading}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    Remove
                  </Button>
                )}
              </div>
            ))}
          </div>

          {/* Add members section */}
          {isCreator && (
            <>
              <div className="pt-4 border-t">
                <h3 className="text-lg font-medium mb-2">Add Members</h3>
                <Input
                  type="search"
                  placeholder="Search companions..."
                  value={memberSearchQuery}
                  onChange={(e) => setMemberSearchQuery(e.target.value)}
                  className="mb-3"
                />
              </div>

              {/* Available companions list */}
              <div className="space-y-2 max-h-[300px] overflow-y-auto p-1">
                {filteredAvailableCompanions.length === 0 ? (
                  <p className="text-center text-muted-foreground text-sm py-6">
                    {memberSearchQuery ? 'No matching companions found' : 'No more companions available'}
                  </p>
                ) : (
                  filteredAvailableCompanions.map((companion) => (
                    <div 
                      key={companion.id} 
                      className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50"
                    >
                      <div className="flex items-center space-x-3">
                        {companion.src ? (
                          <img 
                            src={companion.src} 
                            alt={companion.name} 
                            className="w-8 h-8 rounded-full object-cover" 
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                            {companion.name.charAt(0)}
                          </div>
                        )}
                        <span>{companion.name}</span>
                      </div>

                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleAddMember(companion.id)}
                        disabled={isLoading || isAddingMember}
                        className="text-primary hover:text-primary hover:bg-primary/10"
                      >
                        Add
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </TabsContent>

        {/* Settings tab */}
        <TabsContent value="settings" className="space-y-4">
          <div className="space-y-2">
            <h3 className="text-lg font-medium">Group Settings</h3>
            
            {/* Group name setting */}
            <div className="space-y-2">
              <label htmlFor="groupName" className="text-sm font-medium">
                Group Name
              </label>
              <div className="flex space-x-2">
                <Input
                  id="groupName"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="Enter group name"
                  disabled={isRenaming}
                />
                <Button 
                  onClick={handleRenameGroup}
                  disabled={isRenaming || newGroupName === groupChat?.name || !newGroupName.trim()}
                >
                  {isRenaming ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Danger Zone tab */}
        <TabsContent value="danger" className="space-y-4">
          <div className="space-y-4 border border-destructive/20 rounded-md p-4">
            <h3 className="text-lg font-medium text-destructive">Danger Zone</h3>
            
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">Delete Group Chat</p>
                <p className="text-sm text-muted-foreground">
                  This action cannot be undone. All data will be permanently deleted.
                </p>
              </div>
              <Button 
                variant="destructive"
                onClick={() => setIsDeleting(true)}
              >
                Delete Group
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Delete confirmation dialog */}
      <Dialog open={isDeleting} onOpenChange={setIsDeleting}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Group Chat</DialogTitle>
          </DialogHeader>
          <p className="py-4">
            Are you sure you want to delete this group chat? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button 
              variant="ghost" 
              onClick={() => setIsDeleting(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteGroup}
              disabled={isLoading}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 