'use client';

import { useState, useEffect } from 'react';

export default function WebSpeechTest() {
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorCount, setErrorCount] = useState(0);
  const [diagnostics, setDiagnostics] = useState<Record<string, any>>({});
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Build diagnostics information
      const browserInfo = {
        userAgent: navigator.userAgent,
        vendor: navigator.vendor,
        platform: navigator.platform,
        language: navigator.language,
      };
      
      // Check for Speech Recognition API support
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const SpeechGrammarList = (window as any).SpeechGrammarList || (window as any).webkitSpeechGrammarList;
      const SpeechRecognitionEvent = (window as any).SpeechRecognitionEvent || (window as any).webkitSpeechRecognitionEvent;
      
      const apiSupport = {
        SpeechRecognition: !!SpeechRecognition,
        webkitSpeechRecognition: !!(window as any).webkitSpeechRecognition,
        SpeechGrammarList: !!SpeechGrammarList,
        SpeechRecognitionEvent: !!SpeechRecognitionEvent,
      };

      // Test audio device permissions
      let mediaPermissionStatus = 'unknown';
      if (navigator.permissions) {
        navigator.permissions.query({ name: 'microphone' as PermissionName })
          .then(permissionStatus => {
            mediaPermissionStatus = permissionStatus.state;
            setDiagnostics(prev => ({
              ...prev,
              permissions: {
                ...prev.permissions,
                microphone: mediaPermissionStatus
              }
            }));
          })
          .catch(err => {
            console.error('Permission query error:', err);
          });
      }
      
      setDiagnostics({
        browser: browserInfo,
        apiSupport,
        permissions: {
          microphone: mediaPermissionStatus
        },
        errors: []
      });
      
      // Initialize speech recognition if available
      if (SpeechRecognition) {
        const recognitionInstance = new SpeechRecognition();
        recognitionInstance.continuous = true;
        recognitionInstance.interimResults = true;
        recognitionInstance.lang = 'en-US';
        
        recognitionInstance.onresult = (event: any) => {
          const lastResult = event.results[event.results.length - 1];
          const text = lastResult[0].transcript;
          const confidence = lastResult[0].confidence;
          
          setTranscript(text);
          console.log('Speech recognition result:', text, 'Confidence:', confidence);
          
          // Add to diagnostics
          setDiagnostics(prev => ({
            ...prev,
            lastResult: {
              text,
              confidence,
              timestamp: new Date().toISOString()
            }
          }));
        };
        
        recognitionInstance.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          setError(`Error: ${event.error}`);
          setErrorCount(prev => prev + 1);
          
          // Add to diagnostics
          setDiagnostics(prev => ({
            ...prev,
            errors: [...(prev.errors || []), {
              type: event.error,
              timestamp: new Date().toISOString()
            }]
          }));
        };
        
        recognitionInstance.onend = () => {
          console.log('Speech recognition ended');
          
          // Add to diagnostics
          setDiagnostics(prev => ({
            ...prev,
            events: [...(prev.events || []), {
              type: 'end',
              timestamp: new Date().toISOString()
            }]
          }));
          
          if (isListening) {
            // Restart if we're supposed to be listening
            try {
              recognitionInstance.start();
              
              // Add to diagnostics
              setDiagnostics(prev => ({
                ...prev,
                events: [...(prev.events || []), {
                  type: 'restart',
                  timestamp: new Date().toISOString()
                }]
              }));
            } catch (err) {
              console.error('Failed to restart recognition:', err);
              setIsListening(false);
              setError(`Failed to restart: ${err}`);
            }
          }
        };
        
        setRecognition(recognitionInstance);
      } else {
        setError('Web Speech API not supported in this browser');
      }
    }
    
    return () => {
      if (recognition) {
        recognition.stop();
      }
    };
  }, []);
  
  const toggleListening = () => {
    if (!recognition) {
      setError('Speech recognition not available');
      return;
    }
    
    if (isListening) {
      recognition.stop();
      setIsListening(false);
      
      // Add to diagnostics
      setDiagnostics(prev => ({
        ...prev,
        events: [...(prev.events || []), {
          type: 'stop',
          timestamp: new Date().toISOString()
        }]
      }));
    } else {
      try {
        // Request microphone access explicitly first
        navigator.mediaDevices.getUserMedia({ audio: true })
          .then(stream => {
            // Stop the tracks immediately, we just needed permission
            stream.getTracks().forEach(track => track.stop());
            
            // Now start recognition
            recognition.start();
            setIsListening(true);
            setError(null);
            
            // Add to diagnostics
            setDiagnostics(prev => ({
              ...prev,
              events: [...(prev.events || []), {
                type: 'start',
                timestamp: new Date().toISOString()
              }]
            }));
          })
          .catch(err => {
            setError(`Microphone access denied: ${err.message}`);
            
            // Add to diagnostics
            setDiagnostics(prev => ({
              ...prev,
              errors: [...(prev.errors || []), {
                type: 'microphone_access_denied',
                message: err.message,
                timestamp: new Date().toISOString()
              }]
            }));
          });
      } catch (err) {
        setError(`Failed to start recognition: ${err}`);
        
        // Add to diagnostics
        setDiagnostics(prev => ({
          ...prev,
          errors: [...(prev.errors || []), {
            type: 'start_error',
            message: String(err),
            timestamp: new Date().toISOString()
          }]
        }));
      }
    }
  };
  
  return (
    <div className="p-4 border rounded-md max-w-md mx-auto my-8">
      <h2 className="text-lg font-bold mb-4">Web Speech API Test</h2>
      
      <div className="mb-4">
        <button
          onClick={toggleListening}
          className={`px-4 py-2 rounded-md ${isListening ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'} text-white`}
        >
          {isListening ? 'Stop Listening' : 'Start Listening'}
        </button>
      </div>
      
      {error && (
        <div className="mb-4 p-2 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 rounded-md">
          <p className="font-medium">Error occurred:</p>
          <p className="text-sm">{error}</p>
          {errorCount > 1 && <p className="text-xs mt-1">Error count: {errorCount}</p>}
        </div>
      )}
      
      <div className="mb-4">
        <div className="text-sm font-semibold mb-1">Status:</div>
        <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-md">
          {isListening ? 'Listening...' : 'Not listening'}
        </div>
      </div>
      
      <div className="mb-4">
        <div className="text-sm font-semibold mb-1">Transcript:</div>
        <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-md min-h-[100px]">
          {transcript || 'No transcription yet'}
        </div>
      </div>
      
      <div className="mb-2">
        <div className="text-sm font-semibold mb-1">API Support:</div>
        <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-md text-xs font-mono">
          {diagnostics.apiSupport && Object.entries(diagnostics.apiSupport).map(([api, supported]) => (
            <div key={api} className="flex justify-between">
              <span>{api}:</span>
              <span className={supported ? 'text-green-500' : 'text-red-500'}>
                {supported ? 'Supported' : 'Not Supported'}
              </span>
            </div>
          ))}
        </div>
      </div>
      
      <div>
        <button 
          onClick={() => setDiagnostics({...diagnostics})}
          className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded"
        >
          Refresh Diagnostics
        </button>
      </div>
    </div>
  );
} 