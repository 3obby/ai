'use client';

import WebSpeechTest from '../components/voice/WebSpeechTest';

export default function SpeechTestPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6 text-center">Speech Recognition Test</h1>
      <p className="text-center mb-8 text-muted-foreground">
        This page tests the Web Speech API functionality in your browser.
      </p>
      
      <WebSpeechTest />
      
      <div className="mt-8 border-t pt-4 text-sm text-muted-foreground">
        <p className="mb-2">Notes:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>If you see errors, your browser may not support the Web Speech API</li>
          <li>Chrome has the best support for speech recognition</li>
          <li>You'll need to grant microphone permissions</li>
          <li>This is just a test page - the main app uses this API in production mode</li>
        </ul>
      </div>
    </div>
  );
} 