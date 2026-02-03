import { useEffect, useState, useCallback, useRef } from 'react';
import {
  getSocket,
  joinEventRoom,
  leaveEventRoom,
  requestSeatStatus,
  type SeatAvailabilityUpdate,
  type HoldExpired,
  type HoldExpiringSoon,
  type ViewersUpdate,
  type SeatStatus,
} from '../services/websocket';

interface UseEventWebSocketOptions {
  eventId: string | null;
  autoJoin?: boolean;
  onSeatUpdate?: (update: SeatAvailabilityUpdate) => void;
  onHoldExpired?: (data: HoldExpired) => void;
  onHoldExpiringSoon?: (data: HoldExpiringSoon) => void;
  onViewersUpdate?: (data: ViewersUpdate) => void;
}

interface UseEventWebSocketReturn {
  connected: boolean;
  viewerCount: number;
  joinRoom: () => Promise<void>;
  leaveRoom: () => void;
  getSeatStatus: (seatIds?: string[]) => Promise<SeatStatus[]>;
}

/**
 * React hook for managing WebSocket connection to an event
 */
export const useEventWebSocket = ({
  eventId,
  autoJoin = true,
  onSeatUpdate,
  onHoldExpired,
  onHoldExpiringSoon,
  onViewersUpdate,
}: UseEventWebSocketOptions): UseEventWebSocketReturn => {
  const [connected, setConnected] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const hasJoined = useRef(false);

  // Join event room
  const joinRoom = useCallback(async () => {
    if (!eventId || hasJoined.current) return;

    try {
      await joinEventRoom(eventId);
      hasJoined.current = true;
    } catch (error) {
      console.error('Failed to join event room:', error);
    }
  }, [eventId]);

  // Leave event room
  const leaveRoom = useCallback(() => {
    if (!eventId || !hasJoined.current) return;

    leaveEventRoom(eventId);
    hasJoined.current = false;
  }, [eventId]);

  // Get seat status
  const getSeatStatus = useCallback(
    async (seatIds?: string[]): Promise<SeatStatus[]> => {
      if (!eventId) return [];

      try {
        return await requestSeatStatus(eventId, seatIds);
      } catch (error) {
        console.error('Failed to get seat status:', error);
        return [];
      }
    },
    [eventId]
  );

  useEffect(() => {
    const socket = getSocket();

    // Connection status handlers
    const handleConnect = () => {
      console.log('WebSocket connected in hook');
      setConnected(true);

      // Auto-join event room after connection
      if (autoJoin && eventId && !hasJoined.current) {
        joinRoom();
      }
    };

    const handleDisconnect = () => {
      console.log('WebSocket disconnected in hook');
      setConnected(false);
      hasJoined.current = false;
    };

    // Event-specific handlers
    const handleSeatUpdate = (update: SeatAvailabilityUpdate) => {
      if (update.eventId === eventId && onSeatUpdate) {
        onSeatUpdate(update);
      }
    };

    const handleHoldExpired = (data: HoldExpired) => {
      if (data.eventId === eventId && onHoldExpired) {
        onHoldExpired(data);
      }
    };

    const handleHoldExpiringSoon = (data: HoldExpiringSoon) => {
      if (data.eventId === eventId && onHoldExpiringSoon) {
        onHoldExpiringSoon(data);
      }
    };

    const handleViewersUpdate = (data: ViewersUpdate) => {
      if (data.eventId === eventId) {
        setViewerCount(data.count);
        if (onViewersUpdate) {
          onViewersUpdate(data);
        }
      }
    };

    // Register event listeners
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('seat_availability_update', handleSeatUpdate);
    socket.on('hold_expired', handleHoldExpired);
    socket.on('hold_expiring_soon', handleHoldExpiringSoon);
    socket.on('viewers_update', handleViewersUpdate);

    // Set initial connection status
    setConnected(socket.connected);

    // Auto-join if already connected
    if (socket.connected && autoJoin && eventId && !hasJoined.current) {
      joinRoom();
    }

    // Cleanup on unmount or eventId change
    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('seat_availability_update', handleSeatUpdate);
      socket.off('hold_expired', handleHoldExpired);
      socket.off('hold_expiring_soon', handleHoldExpiringSoon);
      socket.off('viewers_update', handleViewersUpdate);

      // Leave room when unmounting or switching events
      if (hasJoined.current && eventId) {
        leaveEventRoom(eventId);
        hasJoined.current = false;
      }
    };
  }, [eventId, autoJoin, onSeatUpdate, onHoldExpired, onHoldExpiringSoon, onViewersUpdate, joinRoom]);

  return {
    connected,
    viewerCount,
    joinRoom,
    leaveRoom,
    getSeatStatus,
  };
};
