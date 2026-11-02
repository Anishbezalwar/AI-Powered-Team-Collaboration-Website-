import { WebSocketServer, WebSocket } from 'ws';
import { Server as HttpServer } from 'node:http';
import { parse as parseUrl } from 'node:url';
import { rawDb } from '../db/index.js';

interface AuthenticatedClient extends WebSocket {
  isAlive: boolean;
  sessionId: string;
  userId: string;
  tenantId: string;
  channels: Set<string>;
  meetings: Set<string>;
}

const clients = new Set<AuthenticatedClient>();

export function setupRealtimeGateway(server: HttpServer): WebSocketServer {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws: WebSocket, req) => {
    const authClient = ws as AuthenticatedClient;
    authClient.isAlive = true;
    authClient.channels = new Set();
    authClient.meetings = new Set();

    // Parse token from query parameter: /ws?token=<session_token>
    const parsed = parseUrl(req.url || '', true);
    const token = (parsed.query?.token as string) || '';

    if (!token) {
      ws.close(4001, 'Unauthorized: No session token');
      return;
    }

    // Verify session
    const session = rawDb.prepare(`
      SELECT s.id as session_id, s.tenant_id, s.user_id, s.expires_at, u.full_name
      FROM sessions s
      JOIN users u ON u.id = s.user_id
      WHERE s.token = ?
    `).get(token) as { session_id: string; tenant_id: string; user_id: string; expires_at: string; full_name: string } | undefined;

    if (!session || new Date() > new Date(session.expires_at)) {
      ws.close(4001, 'Unauthorized: Invalid or expired session');
      return;
    }

    authClient.sessionId = session.session_id;
    authClient.userId = session.user_id;
    authClient.tenantId = session.tenant_id;
    clients.add(authClient);

    // Send connection established confirmation
    authClient.send(
      JSON.stringify({
        type: 'connection:ready',
        userId: session.user_id,
        tenantId: session.tenant_id,
        serverTime: new Date().toISOString(),
      })
    );

    // Broadcast user presence online
    broadcastTenantEvent(session.tenant_id, 'presence:update', {
      userId: session.user_id,
      status: 'online',
    });

    authClient.on('message', (rawMessage: string) => {
      try {
        const payload = JSON.parse(rawMessage);

        switch (payload.type) {
          case 'channel:join':
            if (payload.channelId) {
              authClient.channels.add(payload.channelId);
            }
            break;

          case 'channel:leave':
            if (payload.channelId) {
              authClient.channels.delete(payload.channelId);
            }
            break;

          case 'typing:start':
            if (payload.channelId) {
              broadcastToChannel(
                payload.channelId,
                'typing:update',
                { channelId: payload.channelId, userId: authClient.userId, userName: payload.userName || 'Someone', isTyping: true },
                authClient
              );
            }
            break;

          case 'typing:stop':
            if (payload.channelId) {
              broadcastToChannel(
                payload.channelId,
                'typing:update',
                { channelId: payload.channelId, userId: authClient.userId, userName: payload.userName || 'Someone', isTyping: false },
                authClient
              );
            }
            break;

          // Interactive Video Meeting Session Signaling
          case 'meeting:join':
            if (payload.meetingId) {
              authClient.meetings.add(payload.meetingId);
            }
            break;

          case 'meeting:leave':
            if (payload.meetingId) {
              authClient.meetings.delete(payload.meetingId);
            }
            break;

          case 'meeting:chat':
            if (payload.meetingId) {
              broadcastToMeeting(payload.meetingId, 'meeting:chat_message', {
                ...payload.data,
                senderId: authClient.userId,
                timestamp: new Date().toISOString(),
              });
            }
            break;

          case 'meeting:reaction':
            if (payload.meetingId) {
              broadcastToMeeting(payload.meetingId, 'meeting:floating_reaction', {
                emoji: payload.emoji,
                senderId: authClient.userId,
              });
            }
            break;

          case 'meeting:whiteboard':
            if (payload.meetingId) {
              broadcastToMeeting(payload.meetingId, 'meeting:whiteboard_stroke', payload.data, authClient);
            }
            break;

          case 'meeting:signal':
            // P2P WebRTC signaling forwarding
            if (payload.meetingId && payload.targetUserId) {
              for (const client of clients) {
                if (client.userId === payload.targetUserId && client.meetings.has(payload.meetingId)) {
                  client.send(JSON.stringify({
                    type: 'meeting:signal',
                    fromUserId: authClient.userId,
                    signal: payload.signal,
                  }));
                }
              }
            }
            break;

          case 'ping':
            authClient.send(JSON.stringify({ type: 'pong' }));
            break;
        }
      } catch (err) {
        console.error('Error handling WebSocket message:', err);
      }
    });

    authClient.on('close', () => {
      clients.delete(authClient);
      broadcastTenantEvent(authClient.tenantId, 'presence:update', {
        userId: authClient.userId,
        status: 'offline',
      });
    });

    authClient.on('pong', () => {
      authClient.isAlive = true;
    });
  });

  // Heartbeat interval to clean up dead sockets
  const interval = setInterval(() => {
    for (const client of clients) {
      if (!client.isAlive) {
        clients.delete(client);
        client.terminate();
        continue;
      }
      client.isAlive = false;
      client.ping();
    }
  }, 30000);

  wss.on('close', () => {
    clearInterval(interval);
  });

  return wss;
}

/**
 * Broadcasts an event to all connected users in a channel.
 */
export function broadcastToChannel(channelId: string, event: string, data: any, excludeClient?: AuthenticatedClient): void {
  const message = JSON.stringify({ type: event, channelId, data });
  for (const client of clients) {
    if (client !== excludeClient && client.readyState === WebSocket.OPEN && client.channels.has(channelId)) {
      client.send(message);
    }
  }
}

/**
 * Broadcasts an event to all connected users in a video meeting session.
 */
export function broadcastToMeeting(meetingId: string, event: string, data: any, excludeClient?: AuthenticatedClient): void {
  const message = JSON.stringify({ type: event, meetingId, data });
  for (const client of clients) {
    if (client !== excludeClient && client.readyState === WebSocket.OPEN && client.meetings.has(meetingId)) {
      client.send(message);
    }
  }
}

/**
 * Broadcasts an event across all clients belonging to a tenant.
 */
export function broadcastTenantEvent(tenantId: string, event: string, data: any): void {
  const message = JSON.stringify({ type: event, tenantId, data });
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN && client.tenantId === tenantId) {
      client.send(message);
    }
  }
}

/**
 * Immediately terminates all active WebSockets for a revoked session.
 */
export function revokeSessionSockets(sessionId: string): void {
  for (const client of clients) {
    if (client.sessionId === sessionId) {
      client.close(4002, 'Session Revoked');
      clients.delete(client);
    }
  }
}

