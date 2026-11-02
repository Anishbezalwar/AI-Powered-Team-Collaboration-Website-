# ADR-004: Real-Time WebSocket Architecture and Resilient Event Handling

## Status
Accepted

## Context
A real-time workspace operating system requires instantaneous message delivery, typing indicators, presence, and live Kanban card updates across clients. However, mixing ephemeral events (such as typing indicators) with durable business events (such as card movements and chat messages) can cause database bloat, race conditions, and message loss on network reconnections.

## Decision
We decouple real-time communication into two distinct pathways:
1. **Durable Events (Messages, Issues, Documents):**
   - The authoritative state change is written and committed to the database first.
   - Upon successful database commit, the event is assigned a monotonically increasing sequence ID / timestamp and broadcasted to subscribed clients over the WebSocket channel.
   - Reconnecting clients supply a `lastEventId` or cursor; missed durable events are replayed from the database or event buffer.
2. **Transient Ephemeral Events (Presence, Typing):**
   - Handled directly in-memory / Redis pub-sub without touching disk.
   - Self-expiring (e.g. typing status expires after 4 seconds; presence heartbeats every 30 seconds).
3. **Session-Bound Connection & Re-Validation:**
   - WebSockets require an authenticated session cookie or valid session token on the HTTP upgrade handshake.
   - When a session is revoked or an account suspended, a pub-sub termination signal immediately closes the corresponding WebSocket connection.

## Consequences
- **Positive:** Maximum UI responsiveness, zero message loss across temporary network disconnects, and no unnecessary database writes for ephemeral user typing.
- **Negative:** Dual event pipelines require separate client-side handling logic.
