# OWASP ASVS 4.0 Level 2 Verification Checklist

This document maps the security controls implemented in **Unified Enterprise Workspace** against the OWASP Application Security Verification Standard (ASVS) Level 2.

| ASVS Section | Requirement | Status | Implementation Details |
| :--- | :--- | :---: | :--- |
| **V2: Authentication** | 2.1.1 Verify user-set passwords against breach list. | **VERIFIED** | NIST SP 800-63B validator checks passwords against common breach lists and enforces 12+ characters with unicode acceptance. |
| | 2.1.2 Verify password storage uses approved key derivation. | **VERIFIED** | Password hashing implemented with Argon2id / PBKDF2 (SHA-512, 100k+ iterations) with unique per-user salt. |
| | 2.2.1 Verify single-use, time-limited reset and verification tokens. | **VERIFIED** | Tokens are 256-bit entropy, stored as SHA-256 hashes, valid for max 30 mins (reset) / 24h (verify), invalidated immediately after first use. |
| | 2.8.1 Multi-factor authentication support. | **VERIFIED** | Time-based One-Time Password (TOTP, RFC 6238) with QR code setup, step window verification, and 10 single-use hashed recovery codes. |
| | 2.10.1 Prevent account enumeration. | **VERIFIED** | Authentication endpoints return uniform responses and comparable execution timing whether user exists or not. |
| **V3: Session Management** | 3.1.1 Opaque session identifiers. | **VERIFIED** | 256-bit cryptographically secure random session tokens stored server-side. |
| | 3.2.1 Session rotation on login and privilege changes. | **VERIFIED** | Session IDs are rotated upon login and MFA completion to prevent session fixation. |
| | 3.3.1 Cookie security attributes. | **VERIFIED** | Delivered with `__Host-` prefix, `HttpOnly`, `Secure`, `SameSite=Lax`. |
| | 3.4.1 Session termination and revocation. | **VERIFIED** | Users can inspect all active sessions with IP, browser, and OS, and revoke individual sessions; admin can revoke all user sessions. |
| **V4: Access Control** | 4.1.1 Enforce access control on server. | **VERIFIED** | Global `CanGuard` checks permission strings (`issue:create`, `sprint:manage`, etc.) on every endpoint. |
| | 4.1.2 Multi-tenant isolation. | **VERIFIED** | Enforced at the data layer using PostgreSQL Row-Level Security (`tenant_id = current_setting('app.tenant_id')`) and verified by cross-tenant penetration test suite. |
| | 4.1.3 Deny by default. | **VERIFIED** | Unmapped actions or unassigned roles default to `403 Forbidden`. |
| **V5: Validation & Sanitization** | 5.1.1 Validate all inputs against schema. | **VERIFIED** | Strict validation on every mutating API endpoint using Zod DTO schemas. |
| **V8: Data Protection** | 8.1.1 Sensitive data not logged. | **VERIFIED** | Sensitive attributes (passwords, tokens, MFA secrets, recovery codes) are excluded from logs and audit trails. |
| **V10: Malicious Code** | 10.3.1 Tamper-evident logging. | **VERIFIED** | Append-only audit log entries chained with cryptographic SHA-256 hashes (`prev_hash`). |
