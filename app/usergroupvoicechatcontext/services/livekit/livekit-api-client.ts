/**
 * Client for interacting with the LiveKit API routes
 */
export class LiveKitApiClient {
  /**
   * Creates a new LiveKit room
   */
  public static async createRoom(roomName: string, options?: {
    emptyTimeout?: number;
    maxParticipants?: number;
  }): Promise<{ room: any }> {
    const response = await fetch('/usergroupchatcontext/api/livekit/room', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: roomName,
        emptyTimeout: options?.emptyTimeout,
        maxParticipants: options?.maxParticipants,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Failed to create room: ${errorData.error}`);
    }

    return await response.json();
  }

  /**
   * Gets a list of all LiveKit rooms
   */
  public static async listRooms(): Promise<{ rooms: any[] }> {
    const response = await fetch('/usergroupchatcontext/api/livekit/room');

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Failed to list rooms: ${errorData.error}`);
    }

    return await response.json();
  }

  /**
   * Deletes a LiveKit room
   */
  public static async deleteRoom(roomName: string): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`/usergroupchatcontext/api/livekit/room?name=${encodeURIComponent(roomName)}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Failed to delete room: ${errorData.error}`);
    }

    return await response.json();
  }

  /**
   * Gets a token for a user or assistant
   */
  public static async getToken(options: {
    type: 'user' | 'assistant';
    roomName: string;
    id: string;
    name?: string;
  }): Promise<{ token: string }> {
    const { type, roomName, id, name } = options;
    
    const response = await fetch('/usergroupchatcontext/api/livekit/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ type, roomName, id, name }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Failed to get token: ${errorData.error}`);
    }

    return await response.json();
  }

  /**
   * Gets a token for a user
   */
  public static async getUserToken(roomName: string, userId: string, userName?: string): Promise<string> {
    const result = await this.getToken({
      type: 'user',
      roomName,
      id: userId,
      name: userName,
    });
    
    return result.token;
  }

  /**
   * Gets a token for an assistant
   */
  public static async getAssistantToken(roomName: string, assistantId: string): Promise<string> {
    const result = await this.getToken({
      type: 'assistant',
      roomName,
      id: assistantId,
    });
    
    return result.token;
  }

  /**
   * Ensures a room exists (creates if it doesn't)
   */
  public static async ensureRoomExists(roomName: string): Promise<void> {
    try {
      // Try to create the room
      await this.createRoom(roomName);
    } catch (error) {
      // Ignore error if room already exists
      console.log('Room may already exist:', error);
    }
  }

  /**
   * Sets up a LiveKit session for a user
   * Creates room if needed, generates token, and returns connection info
   */
  public static async setupUserSession(
    roomName: string,
    userId: string,
    userName?: string
  ): Promise<{
    roomName: string;
    token: string;
    url: string;
  }> {
    // Ensure the room exists
    await this.ensureRoomExists(roomName);
    
    // Get a token for the user
    const token = await this.getUserToken(roomName, userId, userName);
    
    // Get URL from environment
    const url = process.env.NEXT_PUBLIC_LIVEKIT_URL || 'wss://example.livekit.cloud';
    
    return { roomName, token, url };
  }
}

export default LiveKitApiClient; 