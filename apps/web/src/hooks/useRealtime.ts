import { useEffect, useRef, useCallback } from 'react';

type EventCallback = (data: any) => void;

class RealtimeBus {
  private socket: WebSocket | null = null;
  private listeners = new Map<string, Set<EventCallback>>();
  private reconnectTimer: any = null;
  private pingInterval: any = null;
  private isConnected = false;

  connect() {
    const token = localStorage.getItem('auth_token');
    if (!token || this.socket?.readyState === WebSocket.OPEN) return;

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.hostname;
      // Backend is on port 3001
      const wsUrl = `${protocol}//${host}:3001/ws?token=${encodeURIComponent(token)}`;

      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        this.isConnected = true;
        this.emit('connection:status', { connected: true });

        // Heartbeat
        this.pingInterval = setInterval(() => {
          if (this.socket?.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({ type: 'ping' }));
          }
        }, 20000);
      };

      this.socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'pong') return;

          // Dispatch event to listeners
          this.emit(payload.type, payload.data || payload);
        } catch (err) {
          console.error('Failed to parse realtime payload:', err);
        }
      };

      this.socket.onclose = () => {
        this.cleanup();
        this.emit('connection:status', { connected: false });
        // Reconnect after 3s
        this.reconnectTimer = setTimeout(() => this.connect(), 3000);
      };

      this.socket.onerror = () => {
        this.socket?.close();
      };
    } catch (err) {
      console.error('WebSocket connection error:', err);
    }
  }

  send(type: string, data: any = {}) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type, ...data }));
    }
  }

  on(event: string, callback: EventCallback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  emit(event: string, data: any) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((cb) => {
        try {
          cb(data);
        } catch (err) {
          console.error(`Error in event listener for ${event}:`, err);
        }
      });
    }
  }

  cleanup() {
    this.isConnected = false;
    clearInterval(this.pingInterval);
    clearTimeout(this.reconnectTimer);
  }

  disconnect() {
    this.cleanup();
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }
}

export const realtimeBus = new RealtimeBus();

export function useRealtime() {
  useEffect(() => {
    realtimeBus.connect();
    return () => {};
  }, []);

  const subscribe = useCallback((event: string, callback: EventCallback) => {
    return realtimeBus.on(event, callback);
  }, []);

  const joinChannel = useCallback((channelId: string) => {
    realtimeBus.send('channel:join', { channelId });
  }, []);

  const leaveChannel = useCallback((channelId: string) => {
    realtimeBus.send('channel:leave', { channelId });
  }, []);

  const startTyping = useCallback((channelId: string, userName: string) => {
    realtimeBus.send('typing:start', { channelId, userName });
  }, []);

  const stopTyping = useCallback((channelId: string, userName: string) => {
    realtimeBus.send('typing:stop', { channelId, userName });
  }, []);

  const joinMeetingRoom = useCallback((meetingId: string) => {
    realtimeBus.send('meeting:join', { meetingId });
  }, []);

  const leaveMeetingRoom = useCallback((meetingId: string) => {
    realtimeBus.send('meeting:leave', { meetingId });
  }, []);

  const sendMeetingChat = useCallback((meetingId: string, message: any) => {
    realtimeBus.send('meeting:chat', { meetingId, data: message });
  }, []);

  const sendMeetingReaction = useCallback((meetingId: string, emoji: string) => {
    realtimeBus.send('meeting:reaction', { meetingId, emoji });
  }, []);

  const sendWhiteboardStroke = useCallback((meetingId: string, stroke: any) => {
    realtimeBus.send('meeting:whiteboard', { meetingId, data: stroke });
  }, []);

  return {
    subscribe,
    joinChannel,
    leaveChannel,
    startTyping,
    stopTyping,
    joinMeetingRoom,
    leaveMeetingRoom,
    sendMeetingChat,
    sendMeetingReaction,
    sendWhiteboardStroke,
  };
}
