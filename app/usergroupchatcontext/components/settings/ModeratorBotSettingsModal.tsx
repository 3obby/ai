'use client';

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { moderatorBotService, ModeratorSettings } from '../../services/ModeratorBotService';

interface ModeratorBotSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ModeratorBotSettingsModal({ isOpen, onClose }: ModeratorBotSettingsModalProps) {
  const [settings, setSettings] = useState<ModeratorSettings>({
    enabled: true,
    criteria: '',
    instructions: '',
    model: 'gpt-4o'
  });

  // Load settings when modal opens
  useEffect(() => {
    if (isOpen) {
      const currentSettings = moderatorBotService.getSettings();
      setSettings(currentSettings);
    }
  }, [isOpen]);

  // Handle form change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' 
        ? (e.target as HTMLInputElement).checked 
        : value
    }));
  };

  // Save settings
  const handleSave = () => {
    moderatorBotService.updateSettings(settings);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-md p-6 shadow-lg max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Moderator Bot Settings</h2>
          <button 
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Enable/Disable Toggle */}
          <div className="flex items-center justify-between">
            <label htmlFor="enabled" className="text-sm font-medium">
              Enable Moderator Bot
            </label>
            <input
              type="checkbox"
              id="enabled"
              name="enabled"
              checked={settings.enabled}
              onChange={handleChange}
              className="toggle"
            />
          </div>

          {/* Model Selection */}
          <div className="space-y-1">
            <label htmlFor="model" className="text-sm font-medium">
              Model
            </label>
            <select
              id="model"
              name="model"
              value={settings.model}
              onChange={handleChange}
              className="w-full p-2 border rounded-md bg-transparent"
            >
              <option value="gpt-4o">GPT-4o</option>
              <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
            </select>
          </div>

          {/* Criteria */}
          <div className="space-y-1">
            <label htmlFor="criteria" className="text-sm font-medium">
              Evaluation Criteria
            </label>
            <textarea
              id="criteria"
              name="criteria"
              value={settings.criteria}
              onChange={handleChange}
              placeholder="e.g., The response should be concise and factual."
              className="w-full p-2 border rounded-md bg-transparent min-h-[100px]"
            />
            <p className="text-xs text-gray-500">
              Define when a bot's response should be reprocessed. The moderator will evaluate if the response meets these criteria.
            </p>
          </div>

          {/* Instructions */}
          <div className="space-y-1">
            <label htmlFor="instructions" className="text-sm font-medium">
              Reprocessing Instructions
            </label>
            <textarea
              id="instructions"
              name="instructions"
              value={settings.instructions}
              onChange={handleChange}
              placeholder="e.g., Make the response more direct and eliminate unnecessary details."
              className="w-full p-2 border rounded-md bg-transparent min-h-[100px]"
            />
            <p className="text-xs text-gray-500">
              Instructions for how the bot should improve its response when reprocessing.
            </p>
          </div>

          {/* Quick test examples */}
          <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-700 rounded-md">
            <p className="text-sm font-medium mb-2">Quick Test Options:</p>
            <ul className="text-xs space-y-1 text-gray-600 dark:text-gray-300">
              <li>Use "true" as criteria to always trigger reprocessing</li>
              <li>Use criteria like "make a sound like X" to test special responses</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2 pt-4">
            <button
              onClick={onClose}
              className="px-4 py-2 border rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 