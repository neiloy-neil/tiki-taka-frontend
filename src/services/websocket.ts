import { io, Socket } from 'socket.io-client';

// Prefer explicit WS URL, otherwise derive host/port from API URL, finally default to local backend port
const resolveWebSocketUrl = (): string => {
  if (import.meta.env.VITE_WS_URL) {
    return import.meta.env.VITE_WS_URL;
  }

  if (import.meta.env.VITE_API_URL) {
    try {
      const apiUrl = new URL(import.meta.env.VITE_API_URL);
      const port = apiUrl.port ? `:${apiUrl.port}` : '';
      return `${apiUrl.protocol}//${apiUrl.hostname}${port}`;
    } catch (err) {
      console.warn('Invalid VITE_API_URL; falling back to default WS URL', err);
    }
  }

  return 'http://localhost:6868';
};

const WS_URL = resolveWebSocketUrl();

let socket: Socket | null = null;

// Generate or retrieve session ID for tracking holds
const getSessionId = (): string => {
  let sessionId = localStorage.getItem('tiki-taka-session-id');
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    localStorage.setItem('tiki-taka-session-id', sessionId);
  }
  return sessionId;
};

/**
 * Initialize WebSocket connection
 */
export const initializeWebSocket = (): Socket => {
  if (socket?.connected) {
    return socket;
  }

  const token = localStorage.getItem('accessToken');
  const sessionId = getSessionId();

  socket = io(WS_URL, {
    auth: {
      token,
      sessionId,
    },
    transports: ['websocket', 'polling'], // Try WebSocket first, fallback to polling
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5,
  });

  // Connection event handlers
  socket.on('connect', () => {
    console.log('✅ WebSocket connected:', socket?.id);
  });

socket.on('disconnect', (reason: string) => {
  console.log('🔌 WebSocket disconnected:', reason);
});

socket.on('connect_error', (error: Error) => {
  console.error('❌ WebSocket connection error:', error.message);
});

socket.on('error', (error: Error) => {
  console.error('❌ WebSocket error:', error);
});

  // Ping/pong for connection health
  setInterval(() => {
    if (socket?.connected) {
      socket.emit('ping');
    }
  }, 30000); // Every 30 seconds

socket.on('pong', (data: unknown) => {
  console.log('🏓 Pong received:', data);
});

  return socket;
};

/**
 * Get existing socket instance or create new one
 */
export const getSocket = (): Socket => {
  if (!socket || !socket.connected) {
    return initializeWebSocket();
  }
  return socket;
};

/**
 * Disconnect WebSocket
 */
export const disconnectWebSocket = (): void => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

/**
 * Join an event room to receive real-time updates
 */
export const joinEventRoom = (eventId: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const sock = getSocket();

    const onJoined = () => {
      console.log(`📍 Joined event room: ${eventId}`);
      sock.off('joined_event', onJoined);
      sock.off('error', onError);
      resolve();
    };

    const onError = (error: { message: string }) => {
      console.error(`❌ Failed to join event room: ${eventId}`, error);
      sock.off('joined_event', onJoined);
      sock.off('error', onError);
      reject(new Error(error.message));
    };

    sock.once('joined_event', onJoined);
    sock.once('error', onError);
    sock.emit('join_event', { eventId });

    // Timeout after 5 seconds
    setTimeout(() => {
      sock.off('joined_event', onJoined);
      sock.off('error', onError);
      reject(new Error('Join event timeout'));
    }, 5000);
  });
};

/**
 * Leave an event room
 */
export const leaveEventRoom = (eventId: string): void => {
  const sock = getSocket();
  sock.emit('leave_event', { eventId });
  console.log(`📍 Left event room: ${eventId}`);
};

/**
 * Request current seat status for an event
 */
export const requestSeatStatus = (eventId: string, seatIds?: string[]): Promise<SeatStatus[]> => {
  return new Promise((resolve, reject) => {
    const sock = getSocket();

    const onResponse = (data: { eventId: string; seats: SeatStatus[] }) => {
      sock.off('seat_status_response', onResponse);
      sock.off('error', onError);
      resolve(data.seats);
    };

    const onError = (error: { message: string }) => {
      sock.off('seat_status_response', onResponse);
      sock.off('error', onError);
      reject(new Error(error.message));
    };

    sock.once('seat_status_response', onResponse);
    sock.once('error', onError);
    sock.emit('request_seat_status', { eventId, seatIds });

    // Timeout after 10 seconds
    setTimeout(() => {
      sock.off('seat_status_response', onResponse);
      sock.off('error', onError);
      reject(new Error('Seat status request timeout'));
    }, 10000);
  });
};

// Type definitions
export interface SeatStatus {
  seatId: string;
  status: 'available' | 'held' | 'sold';
  lastUpdated: string;
}

export interface SeatUpdate {
  seatId: string;
  status: 'available' | 'held' | 'sold';
}

export interface SeatAvailabilityUpdate {
  eventId: string;
  updates: SeatUpdate[];
  timestamp: string;
}

export interface HoldExpired {
  eventId: string;
  seatIds: string[];
  timestamp: string;
}

export interface HoldExpiringSoon {
  eventId: string;
  expiresAt: string;
  message: string;
}

export interface ViewersUpdate {
  eventId: string;
  count: number;
}

export { getSessionId };
