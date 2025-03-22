'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Settings, Sun, Moon, ZoomIn, ZoomOut, Volume2, VolumeX, Info, X, HelpCircle, Keyboard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useVoiceSettings } from '../../hooks/useVoiceSettings';
import { VoiceModeState } from '../../services/voice/VoiceModeManager';
import eventBus from '../../services/events/EventBus';

interface AccessibilityControlsProps {
  className?: string;
}

/**
 * AccessibilityControls
 * 
 * Component for accessibility settings placed at the top of the page,
 * including theme toggle, text size, audio controls, and keyboard shortcuts.
 */
export function AccessibilityControls({ className }: AccessibilityControlsProps) {
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  const [fontSize, setFontSize] = useState(1); // 1 = normal, range: 0.8 to 1.4
  const { voiceSettings, updateVoiceSettings } = useVoiceSettings();
  const [showHelp, setShowHelp] = useState(false);
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
  
  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only process if Alt key is pressed
      if (!e.altKey) return;
      
      // Alt+T to toggle theme
      if (e.key.toLowerCase() === 't') {
        e.preventDefault();
        toggleTheme();
      }
      
      // Alt+S to toggle text-to-speech
      if (e.key.toLowerCase() === 's') {
        e.preventDefault();
        toggleTextToSpeech();
      }
      
      // Alt++ to increase font size
      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        adjustFontSize(true);
      }
      
      // Alt+- to decrease font size
      if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        adjustFontSize(false);
      }
      
      // Alt+K to show keyboard shortcuts
      if (e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowKeyboardShortcuts(!showKeyboardShortcuts);
        announce(`Keyboard shortcuts ${showKeyboardShortcuts ? 'hidden' : 'shown'}`, true);
      }
      
      // Alt+H to show help
      if (e.key.toLowerCase() === 'h') {
        e.preventDefault();
        setShowHelp(!showHelp);
        announce(`Help ${showHelp ? 'hidden' : 'shown'}`, true);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showHelp, showKeyboardShortcuts, theme, voiceSettings.textToSpeechEnabled, fontSize]);
  
  return (
    <div className={cn("p-2 flex items-center justify-between border-b bg-background", className)}>
      {/* Screen reader announcements (visually hidden) */}
      <div 
        ref={announceRef}
        className="sr-only"
        aria-live="assertive"
        role="status"
      ></div>
      
      {/* Left side controls */}
      <div className="flex items-center space-x-2">
        <button 
          onClick={() => setShowHelp(!showHelp)}
          className="p-1.5 rounded-full hover:bg-muted"
          aria-label="Help information"
          title="Help (Alt+H)"
        >
          <Info className="h-4 w-4" />
        </button>
        
        <button
          onClick={() => setShowKeyboardShortcuts(!showKeyboardShortcuts)}
          className="p-1.5 rounded-full hover:bg-muted"
          aria-label="Keyboard shortcuts"
          title="Keyboard shortcuts (Alt+K)"
        >
          <Keyboard className="h-4 w-4" />
        </button>
      </div>
      
      {/* Right side controls */}
      <div className="flex items-center space-x-2">
        <button
          onClick={() => adjustFontSize(false)}
          className="p-1.5 rounded-full hover:bg-muted"
          aria-label="Decrease font size"
          title="Decrease font size (Alt+-)"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        
        <button
          onClick={() => adjustFontSize(true)}
          className="p-1.5 rounded-full hover:bg-muted"
          aria-label="Increase font size"
          title="Increase font size (Alt++)"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
        
        <button
          onClick={toggleTheme}
          className="p-1.5 rounded-full hover:bg-muted"
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme (Alt+T)`}
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
        
        <button
          onClick={toggleTextToSpeech}
          className={cn(
            "p-1.5 rounded-full",
            voiceSettings.textToSpeechEnabled 
              ? "bg-primary text-primary-foreground hover:bg-primary/90" 
              : "hover:bg-muted"
          )}
          aria-label={`${voiceSettings.textToSpeechEnabled ? 'Disable' : 'Enable'} text to speech`}
          title={`${voiceSettings.textToSpeechEnabled ? 'Disable' : 'Enable'} text to speech (Alt+S)`}
        >
          {voiceSettings.textToSpeechEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
        </button>
      </div>
      
      {/* Help information overlay */}
      {showHelp && (
        <div className="absolute top-10 right-0 left-0 p-4 bg-background border rounded-md shadow-md z-50 m-2">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-medium">Help Information</h3>
            <button 
              onClick={() => setShowHelp(false)}
              className="p-1 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="text-sm space-y-2">
            <p>This interface lets you chat with AI assistants using text or voice input.</p>
            <p>Use the button at the bottom to toggle between text and voice modes.</p>
            <p>In voice mode, simply speak and the AI will respond.</p>
            <p>All accessibility settings can be controlled using keyboard shortcuts (Alt+key).</p>
          </div>
        </div>
      )}
      
      {/* Keyboard shortcuts overlay */}
      {showKeyboardShortcuts && (
        <div className="absolute top-10 right-0 left-0 p-4 bg-background border rounded-md shadow-md z-50 m-2">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-medium">Keyboard Shortcuts</h3>
            <button 
              onClick={() => setShowKeyboardShortcuts(false)}
              className="p-1 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="text-sm">
            <table className="w-full text-left">
              <tbody>
                <tr>
                  <td className="py-1 pr-4 font-mono">Alt+M</td>
                  <td>Toggle voice mode on/off</td>
                </tr>
                <tr>
                  <td className="py-1 pr-4 font-mono">Alt+T</td>
                  <td>Switch between light/dark theme</td>
                </tr>
                <tr>
                  <td className="py-1 pr-4 font-mono">Alt+S</td>
                  <td>Toggle text-to-speech</td>
                </tr>
                <tr>
                  <td className="py-1 pr-4 font-mono">Alt++</td>
                  <td>Increase font size</td>
                </tr>
                <tr>
                  <td className="py-1 pr-4 font-mono">Alt+-</td>
                  <td>Decrease font size</td>
                </tr>
                <tr>
                  <td className="py-1 pr-4 font-mono">Alt+K</td>
                  <td>Show/hide keyboard shortcuts</td>
                </tr>
                <tr>
                  <td className="py-1 pr-4 font-mono">Alt+H</td>
                  <td>Show/hide help</td>
                </tr>
                <tr>
                  <td className="py-1 pr-4 font-mono">ESC</td>
                  <td>Exit voice mode (when active)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
} 