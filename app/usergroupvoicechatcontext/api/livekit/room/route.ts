import { NextRequest, NextResponse } from 'next/server';

/**
 * API route for creating LiveKit rooms
 */
export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const body = await request.json();
    
    // Extract room name from request
    const { name, emptyTimeout, maxParticipants } = body;
    
    // Validate room name
    if (!name) {
      return NextResponse.json({ error: 'Room name is required' }, { status: 400 });
    }
    
    // Get LiveKit API key, secret and URL from environment variables
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const livekitUrl = process.env.LIVEKIT_URL;
    
    // Validate required environment variables
    if (!apiKey || !apiSecret || !livekitUrl) {
      console.error('LiveKit API credentials or URL are not configured');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }
    
    // Create a room using LiveKit API
    const url = `${livekitUrl}/twirp/livekit.RoomService/CreateRoom`;
    
    // Prepare headers with API key and secret
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}:${apiSecret}`
    };
    
    // Prepare request body
    const requestBody = {
      name,
      emptyTimeout: emptyTimeout || 300, // Default 5 minutes
      maxParticipants: maxParticipants || 10, // Default 10 participants
    };
    
    // Make the request to LiveKit API
    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(requestBody),
    });
    
    // Check response status
    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json({ error: 'Failed to create room', details: errorData }, { status: response.status });
    }
    
    // Return the created room data
    const roomData = await response.json();
    return NextResponse.json({ room: roomData });
  } catch (error) {
    console.error('Error creating LiveKit room:', error);
    return NextResponse.json({ error: 'Failed to create room' }, { status: 500 });
  }
}

/**
 * API route for listing LiveKit rooms
 */
export async function GET(request: NextRequest) {
  try {
    // Get LiveKit API key, secret and URL from environment variables
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const livekitUrl = process.env.LIVEKIT_URL;
    
    // Validate required environment variables
    if (!apiKey || !apiSecret || !livekitUrl) {
      console.error('LiveKit API credentials or URL are not configured');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }
    
    // List rooms using LiveKit API
    const url = `${livekitUrl}/twirp/livekit.RoomService/ListRooms`;
    
    // Prepare headers with API key and secret
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}:${apiSecret}`
    };
    
    // Make the request to LiveKit API
    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({}),
    });
    
    // Check response status
    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json({ error: 'Failed to list rooms', details: errorData }, { status: response.status });
    }
    
    // Return the rooms data
    const roomsData = await response.json();
    return NextResponse.json({ rooms: roomsData.rooms || [] });
  } catch (error) {
    console.error('Error listing LiveKit rooms:', error);
    return NextResponse.json({ error: 'Failed to list rooms' }, { status: 500 });
  }
}

/**
 * API route for deleting a LiveKit room
 */
export async function DELETE(request: NextRequest) {
  try {
    // Get room name from query parameters
    const { searchParams } = new URL(request.url);
    const roomName = searchParams.get('name');
    
    // Validate room name
    if (!roomName) {
      return NextResponse.json({ error: 'Room name is required' }, { status: 400 });
    }
    
    // Get LiveKit API key, secret and URL from environment variables
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const livekitUrl = process.env.LIVEKIT_URL;
    
    // Validate required environment variables
    if (!apiKey || !apiSecret || !livekitUrl) {
      console.error('LiveKit API credentials or URL are not configured');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }
    
    // Delete room using LiveKit API
    const url = `${livekitUrl}/twirp/livekit.RoomService/DeleteRoom`;
    
    // Prepare headers with API key and secret
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}:${apiSecret}`
    };
    
    // Prepare request body
    const requestBody = {
      name: roomName,
    };
    
    // Make the request to LiveKit API
    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(requestBody),
    });
    
    // Check response status
    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json({ error: 'Failed to delete room', details: errorData }, { status: response.status });
    }
    
    // Return success response
    return NextResponse.json({ success: true, message: `Room ${roomName} deleted successfully` });
  } catch (error) {
    console.error('Error deleting LiveKit room:', error);
    return NextResponse.json({ error: 'Failed to delete room' }, { status: 500 });
  }
} 