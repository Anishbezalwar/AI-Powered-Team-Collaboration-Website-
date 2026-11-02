# ADR-001: Server-Side Session Management and Instant Revocation

## Status
Accepted

## Context
In a multi-tenant enterprise operating system combining project management, communication, and document collaboration, session security is paramount.
Traditional stateless JWTs stored in client storage (localStorage/sessionStorage) suffer from severe vulnerabilities:
1. They are accessible to cross-site scripting (XSS).
2. They cannot be immediately revoked when a user logs out, an admin terminates a compromised device, or an employee's role is changed/deprovisioned without maintaining a centralized token denylist.
3. Refresh token rotation without centralized server-side state is prone to race conditions and token desynchronization across tabs.

## Decision
We adopt **opaque, high-entropy (256-bit) server-side session identifiers** stored in the database and fast-access cache:
1. **Cookie Delivery:** Sessions are transmitted to browser clients via an `HttpOnly`, `Secure`, `SameSite=Lax` cookie using the `__Host-` prefix in production (`__Host-session`), with no `Domain` attribute (locking it to the exact host).
2. **Session Lifecycle:**
   - Session identifiers are rotated upon successful login, privilege change, and MFA completion to prevent session fixation.
   - Idle timeout is set to 7 days, and absolute timeout is set to 30 days by default (both configurable per tenant).
   - Each session record tracks `userId`, `tenantId`, `deviceLabel`, `ipAddress`, `userAgent`, `createdAt`, and `lastSeenAt`.
3. **Instant Revocation:**
   - Users can enumerate all their active sessions and revoke any individual device or all other devices.
   - Tenant administrators can revoke any user's sessions immediately.
   - When a session is revoked, subsequent API requests are rejected with `401 Unauthorized`, and active WebSocket connections associated with that session are immediately dropped.

## Consequences
- **Positive:** Immediate revocation capability, immune to JavaScript token theft via `HttpOnly`, resistant to CSRF via `SameSite=Lax` plus anti-CSRF token verification, and transparent device tracking for users.
- **Negative:** Requires a fast state lookup on each authenticated request (mitigated via in-memory/Redis caching with sub-millisecond lookup).
