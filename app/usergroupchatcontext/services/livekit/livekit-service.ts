import { Room, RoomEvent, RemoteParticipant, ConnectionState, ConnectionQuality } from 'livekit-client';

interface LiveKitConnectionOptions {
  url: string;
  token: string;
  roomName: string;
  connectOptions?: {
    autoSubscribe?: boolean;
    adaptiveStream?: boolean;
    dynacast?: boolean;
  };
}

export class LiveKitService {
  private room: Room | null = null;
  private options: LiveKitConnectionOptions | null = null;

  constructor() {
    this.room = new Room({
      adaptiveStream: true,
      dynacast: true,
      publishDefaults: {
        simulcast: true,
        audioPreset: 'music',
      },
    });
  }

  /**
   * Initializes the LiveKit connection with the provided options
   */
  public initialize(options: LiveKitConnectionOptions): void {
    this.options = options;
    
    // Set up event listeners
    this.setupEventListeners();
  }

  /**
   * Connect to a LiveKit room
   */
  public async connect(): Promise<Room> {
    if (!this.options) {
      throw new Error('LiveKit service not initialized. Call initialize() first.');
    }

    if (!this.room) {
      this.room = new Room();
      this.setupEventListeners();
    }

    if (this.room.state === ConnectionState.Connected) {
      console.log('Already connected to LiveKit room');
      return this.room;
    }

    try {
      await this.room.connect(this.options.url, this.options.token, {
        autoSubscribe: this.options.connectOptions?.autoSubscribe ?? true,
        adaptiveStream: this.options.connectOptions?.adaptiveStream ?? true,
        dynacast: this.options.connectOptions?.dynacast ?? true,
      });
      
      console.log(`Connected to LiveKit room: ${this.options.roomName}`);
      return this.room;
    } catch (error) {
      console.error('Failed to connect to LiveKit room:', error);
      throw error;
    }
  }

  /**
   * Disconnect from the LiveKit room
   */
  public async disconnect(): Promise<void> {
    if (this.room && this.room.state === ConnectionState.Connected) {
      await this.room.disconnect();
      console.log('Disconnected from LiveKit room');
    }
  }

  /**
   * Get the current room instance
   */
  public getRoom(): Room | null {
    return this.room;
  }

  /**
   * Setup event listeners for the room
   */
  private setupEventListeners(): void {
    if (!this.room) return;

    this.room
      .on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
        console.log(`Participant connected: ${participant.identity}`);
      })
      .on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
        console.log(`Participant disconnected: ${participant.identity}`);
      })
      .on(RoomEvent.ConnectionStateChanged, (state: ConnectionState) => {
        console.log(`Connection state changed: ${state}`);
      })
      .on(RoomEvent.ConnectionQualityChanged, (quality: ConnectionQuality) => {
        console.log(`Connection quality changed: ${quality}`);
      })
      .on(RoomEvent.Disconnected, () => {
        console.log('Disconnected from room');
      })
      .on(RoomEvent.Reconnecting, () => {
        console.log('Reconnecting to room...');
      })
      .on(RoomEvent.Reconnected, () => {
        console.log('Reconnected to room');
      });
  }
}

// Create a singleton instance
const livekitService = new LiveKitService();
export default livekitService; 