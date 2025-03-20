'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Sun, Moon, ZoomIn, ZoomOut, Volume2, VolumeX, Info, Keyboard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useVoiceSettings } from '../../hooks/useVoiceSettings';
import eventBus from '../../services/events/EventBus';

/**
 * AccessibilitySettingsPanel
 * 
 * Component for accessibility settings in the settings modal,
 * including theme toggle, text size, audio controls, and keyboard shortcuts.
 */
export function AccessibilitySettingsPanel() {
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  const [fontSize, setFontSize] = useState(1); // 1 = normal, range: 0.8 to 1.4
  const { voiceSettings, updateVoiceSettings } = useVoiceSettings();
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  
  // Create a ref for screen reader announcements
  const announceRef = useRef<HTMLDivElement>(null);
  
  // Function to make screen reader announcements
  const announce = (message: string, assertive = false) => {
    if (announceRef.current) {
      announceRef.current.textContent = message;
      announceRef.current.setAttribute('aria-live', assertive ? 'assertive' : 'polite');
      
      // Clear the announcement after it's been read
      setTimeout(() => {
        if (announceRef.current) {
          announceRef.current.textContent = '';
        }
      }, 1000);
    }
  };
  
  // Toggle text-to-speech
  const toggleTextToSpeech = () => {
    updateVoiceSettings({
      ...voiceSettings,
      textToSpeechEnabled: !voiceSettings.textToSpeechEnabled
    });
    
    announce(`Text to speech ${voiceSettings.textToSpeechEnabled ? 'disabled' : 'enabled'}`, true);
  };
  
  // Adjust font size
  const adjustFontSize = (increase: boolean) => {
    const newSize = increase ? 
      Math.min(fontSize + 0.1, 1.4) : 
      Math.max(fontSize - 0.1, 0.8);
    
    setFontSize(newSize);
    document.documentElement.style.setProperty('--font-scale', newSize.toString());
    
    announce(`Font size ${increase ? 'increased' : 'decreased'} to ${Math.round(newSize * 100)}%`, true);
  };
  
  // Toggle theme
  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
    
    announce(`Theme changed to ${newTheme} mode`, true);
  };
  
  // Initialize theme and font size from document
  useEffect(() => {
    // Check if dark mode is active
    const isDarkMode = document.documentElement.classList.contains('dark');
    setTheme(isDarkMode ? 'dark' : 'light');
    
    // Check current font scale
    const currentScale = document.documentElement.style.getPropertyValue('--font-scale');
    if (currentScale) {
      setFontSize(parseFloat(currentScale));
    }
  }, []);
  
  return (
    <div className="space-y-6 p-4">
      {/* Screen reader announcements (visually hidden) */}
      <div 
        ref={announceRef}
        className="sr-only"
        aria-live="assertive"
        role="status"
      ></div>

      <div className="space-y-2">
        <h3 className="text-lg font-medium">Accessibility Settings</h3>
        <p className="text-sm text-muted-foreground">Customize the appearance and behavior of the interface.</p>
      </div>
      
      <div className="space-y-4">
        {/* Theme */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Theme</h4>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className={cn(
                "p-2 rounded-md flex items-center gap-2",
                theme === 'dark' ? "bg-primary text-primary-foreground" : "bg-muted"
              )}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme (Alt+T)`}
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="h-4 w-4" />
                  <span>Light Mode</span>
                </>
              ) : (
                <>
                  <Moon className="h-4 w-4" />
                  <span>Dark Mode</span>
                </>
              )}
            </button>
            <div className="text-xs text-muted-foreground italic">Alt+T</div>
          </div>
        </div>
        
        {/* Font Size */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Font Size</h4>
          <div className="flex items-center gap-2">
            <button
              onClick={() => adjustFontSize(false)}
              className="p-2 rounded-md bg-muted flex items-center gap-2"
              aria-label="Decrease font size"
              title="Decrease font size (Alt+-)"
            >
              <ZoomOut className="h-4 w-4" />
              <span>Smaller</span>
            </button>
            <div className="text-center min-w-[3rem] font-mono">
              {Math.round(fontSize * 100)}%
            </div>
            <button
              onClick={() => adjustFontSize(true)}
              className="p-2 rounded-md bg-muted flex items-center gap-2"
              aria-label="Increase font size"
              title="Increase font size (Alt++)"
            >
              <ZoomIn className="h-4 w-4" />
              <span>Larger</span>
            </button>
            <div className="text-xs text-muted-foreground italic">Alt+- / Alt++</div>
          </div>
        </div>
        
        {/* Text-to-Speech */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Text-to-Speech</h4>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTextToSpeech}
              className={cn(
                "p-2 rounded-md flex items-center gap-2",
                voiceSettings.textToSpeechEnabled 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-muted"
              )}
              aria-label={`${voiceSettings.textToSpeechEnabled ? 'Disable' : 'Enable'} text to speech`}
              title={`${voiceSettings.textToSpeechEnabled ? 'Disable' : 'Enable'} text to speech (Alt+S)`}
            >
              {voiceSettings.textToSpeechEnabled ? (
                <>
                  <Volume2 className="h-4 w-4" />
                  <span>Text-to-Speech Enabled</span>
                </>
              ) : (
                <>
                  <VolumeX className="h-4 w-4" />
                  <span>Text-to-Speech Disabled</span>
                </>
              )}
            </button>
            <div className="text-xs text-muted-foreground italic">Alt+S</div>
          </div>
        </div>
        
        {/* Keyboard Shortcuts */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Keyboard Shortcuts</h4>
            <button
              onClick={() => setShowKeyboardShortcuts(!showKeyboardShortcuts)}
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              <Keyboard className="h-3 w-3" />
              {showKeyboardShortcuts ? 'Hide' : 'Show'} All Shortcuts
            </button>
          </div>
          
          {showKeyboardShortcuts && (
            <div className="border rounded-md p-3 bg-muted/50">
              <table className="w-full text-left text-sm">
                <tbody>
                  <tr className="border-b">
                    <td className="py-1 pr-4 font-mono">Alt+M</td>
                    <td>Toggle voice mode on/off</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-1 pr-4 font-mono">Alt+T</td>
                    <td>Switch between light/dark theme</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-1 pr-4 font-mono">Alt+S</td>
                    <td>Toggle text-to-speech</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-1 pr-4 font-mono">Alt++</td>
                    <td>Increase font size</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-1 pr-4 font-mono">Alt+-</td>
                    <td>Decrease font size</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-1 pr-4 font-mono">Alt+K</td>
                    <td>Show keyboard shortcuts</td>
                  </tr>
                  <tr>
                    <td className="py-1 pr-4 font-mono">Alt+H</td>
                    <td>Show help information</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
        
        {/* Help and Information */}
        <div className="space-y-2 mt-4">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-primary" />
            <h4 className="text-sm font-medium">Help</h4>
          </div>
          <div className="text-sm space-y-2 pl-6">
            <p>This interface lets you chat with AI assistants using text or voice input.</p>
            <p>Use the button at the bottom to toggle between text and voice modes.</p>
            <p>In voice mode, simply speak and the AI will respond.</p>
            <p>All accessibility settings can be controlled using keyboard shortcuts (Alt+key).</p>
          </div>
        </div>
      </div>
    </div>
  );
} 