import { NextRequest, NextResponse } from 'next/server';

// Define runtime configuration
export const runtime = 'nodejs'; // Force Node.js runtime instead of Edge

export async function GET(request: NextRequest) {
  try {
    // Get the OpenAI API key from environment variables
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      console.error("OPENAI_API_KEY environment variable is not set");
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
    }
    
    // Get voice from query parameters, defaulting to "sage" if not specified
    // Allow all valid voices from OpenAI Realtime API
    const voiceParam = request.nextUrl.searchParams.get('voice') || 'sage';
    const validVoices = ['alloy', 'ash', 'ballad', 'coral', 'echo', 'sage', 'shimmer', 'verse'];
    const voice = validVoices.includes(voiceParam.toLowerCase()) ? voiceParam.toLowerCase() : 'sage';
    
    // Get VAD settings from query parameters (if provided)
    const vadMode = request.nextUrl.searchParams.get('vad') || 'auto'; // 'auto', 'manual', or 'sensitive'
    
    // Get modality settings from query parameters
    const modalityParam = request.nextUrl.searchParams.get('modality') || 'both'; // 'text', 'audio', or 'both'
    let modalities: string[] = ['text', 'audio']; // Default to both
    
    if (modalityParam === 'text') {
      modalities = ['text'];
    } else if (modalityParam === 'audio') {
      modalities = ['audio'];
    }
    
    // Get temperature setting
    const temperatureParam = request.nextUrl.searchParams.get('temperature');
    const temperature = temperatureParam ? Math.min(Math.max(parseFloat(temperatureParam), 0.6), 1.2) : 0.8;
    
    // Get max tokens setting
    const maxTokensParam = request.nextUrl.searchParams.get('max_tokens');
    const maxResponseOutputTokens = maxTokensParam === 'inf' ? 'inf' : 
      maxTokensParam ? Math.min(Math.max(parseInt(maxTokensParam), 1), 4096) : 'inf';
    
    // Get audio format setting
    const audioFormatParam = request.nextUrl.searchParams.get('audio_format');
    const validFormats = ['pcm16', 'g711_ulaw', 'g711_alaw'];
    const audioFormat = audioFormatParam && validFormats.includes(audioFormatParam) ? 
      audioFormatParam : 'pcm16';
    
    // Configure turn detection based on VAD mode
    let turnDetection: { 
      type: string; 
      threshold?: number; 
      prefix_padding_ms?: number;
      silence_duration_ms?: number;
      create_response?: boolean;
    } | null = {
      type: 'server_vad', // Must be 'server_vad'
      threshold: 0.5,
      prefix_padding_ms: 300,
      silence_duration_ms: 500,
      create_response: true
    };
    
    // Custom threshold from query param
    const thresholdParam = request.nextUrl.searchParams.get('threshold');
    if (thresholdParam) {
      turnDetection.threshold = parseFloat(thresholdParam);
    }
    
    // Custom prefix padding from query param
    const prefixPaddingParam = request.nextUrl.searchParams.get('prefix_padding_ms');
    if (prefixPaddingParam) {
      turnDetection.prefix_padding_ms = parseInt(prefixPaddingParam);
    }
    
    // Custom silence duration from query param
    const silenceDurationParam = request.nextUrl.searchParams.get('silence_duration_ms');
    if (silenceDurationParam) {
      turnDetection.silence_duration_ms = parseInt(silenceDurationParam);
    }
    
    // Custom create response setting
    const createResponseParam = request.nextUrl.searchParams.get('create_response');
    if (createResponseParam) {
      turnDetection.create_response = createResponseParam === 'true';
    }
    
    // Adjust VAD settings based on mode
    if (vadMode === 'sensitive') {
      turnDetection = {
        type: 'server_vad',
        threshold: 0.3, // Lower threshold for more sensitivity
        prefix_padding_ms: 300,
        silence_duration_ms: 400, // Shorter silence duration for faster responses
        create_response: true
      };
    } else if (vadMode === 'manual') {
      // Set to null for manual mode (requires client to send commit events)
      turnDetection = null;
    }
    
    console.log(`Requesting ephemeral token from OpenAI using voice: ${voice}, VAD mode: ${vadMode}, modalities: ${modalities.join('+')}...`);
    
    // Request an ephemeral token from OpenAI
    const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-realtime-preview",
        voice,
        instructions: "You are a helpful, friendly AI assistant. Provide concise, thoughtful responses. If you're unsure about something, acknowledge it honestly. Keep responses brief but informative, and maintain a warm, professional tone.",
        turn_detection: turnDetection,
        modalities,
        temperature,
        max_response_output_tokens: maxResponseOutputTokens,
        input_audio_format: audioFormat,
        output_audio_format: audioFormat
      }),
    });
    
    if (!response.ok) {
      let errorText = await response.text();
      try {
        // Try to parse the error as JSON for more detailed information
        const errorJson = JSON.parse(errorText);
        console.error("Error getting ephemeral token:", JSON.stringify(errorJson, null, 2));
        
        // Check for specific error types
        if (errorJson.error?.type === 'invalid_api_key') {
          return NextResponse.json({ 
            error: 'Invalid API key or insufficient permissions',
            details: 'Your API key may be invalid, expired, or may not have access to the Realtime API'
          }, { status: 401 });
        }
        
        if (errorJson.error?.type === 'model_not_found') {
          return NextResponse.json({ 
            error: 'Model not available',
            details: 'The gpt-4o-realtime-preview model is not available for your API key'
          }, { status: 404 });
        }
        
        return NextResponse.json({ 
          error: 'Failed to obtain ephemeral token from OpenAI',
          details: errorJson.error?.message || JSON.stringify(errorJson)
        }, { status: response.status });
      } catch (parseError) {
        // If it's not JSON, just return the raw text
        console.error("Error getting ephemeral token (not JSON):", errorText);
        return NextResponse.json({ 
          error: 'Failed to obtain ephemeral token from OpenAI',
          details: errorText
        }, { status: response.status });
      }
    }
    
    const data = await response.json();
    console.log("Successfully obtained ephemeral token");
    
    // Return the ephemeral token to the client
    return NextResponse.json(data);
    
  } catch (error) {
    console.error("Error in ephemeral token endpoint:", error);
    return NextResponse.json({ 
      error: 'Failed to generate ephemeral token',
      details: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
} 