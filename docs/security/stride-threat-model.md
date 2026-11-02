# STRIDE Threat Model

**System:** Unified Enterprise Workspace  
**Target:** OWASP ASVS 4.0 Level 2 Compliance  
**Date:** October 2026

## 1. Threat Analysis by Category

| Threat Category | Potential Vector | Impact | Mitigation in Unified Enterprise Workspace |
| :--- | :--- | :--- | :--- |
| **Spoofing** | Stolen credentials, session hijacking, fake JWT tokens, email spoofing. | Unauthorized actor impersonating an enterprise user. | • Argon2id password hashing with unique per-user salt and pepper.<br>• TOTP Multi-Factor Authentication (RFC 6238) with single-use hashed recovery codes.<br>• Opaque 256-bit server-side session IDs delivered via `__Host-` HttpOnly/Secure cookies.<br>• Session rotation upon privilege escalation and MFA completion. |
| **Tampering** | Parameter tampering on API endpoints, IDOR/BOLA attacks, database record alteration. | Attacker modifying cards, permissions, or accessing cross-tenant rows. | • Database-level Row-Level Security (RLS) bound to session tenant context.<br>• Central `can(actor, action, resource)` permission authorization engine.<br>• Cryptographic SHA-256 hash chaining on all audit logs to detect tampering.<br>• Strict DTO input validation with Zod schemas. |
| **Repudiation** | An admin or user denies performing a destructive action (deleting project, granting role). | Disputed accountability, failed compliance audits. | • Immutable append-only audit trail recording actor ID, IP, user-agent, timestamp, before/after diff.<br>• Tamper-evident hash chain linking each audit entry to the prior record.<br>• Mandatory authorization for all state mutations. |
| **Information Disclosure** | Cross-tenant data leakage in search results, error traces leaking DB schemas, account enumeration via login/reset forms. | Enterprise data breach, credential harvesting. | • Anti-enumeration defenses: uniform error messages ("Invalid credentials") and equalized timing.<br>• Permission and tenant filters applied directly inside database search queries.<br>• Automated cross-tenant adversarial test suite verifying 404/403 with zero leakage.<br>• Sanitized production error responses without stack traces. |
| **Denial of Service** | Credential brute-force attacks, unbounded search queries, WebSocket connection flooding. | System slowdown or downtime. | • In-memory / Redis sliding-window rate limiting on auth endpoints (max 5 failed attempts per 15 mins).<br>• Exponential backoff delay on failed authentication attempts.<br>• Bounded database pagination on all listing endpoints.<br>• Ephemeral event throttling on typing and presence updates. |
| **Elevation of Privilege** | Normal user calling admin endpoints, guest accessing private documents, cross-tenant role reuse. | Unauthorized administrative access. | • Deny-by-default permission checks on every single API endpoint.<br>• Explicit role-permission matrix: Guest role explicitly denied private channel and document access.<br>• Session role verification re-evaluated on sensitive endpoints. |

## 2. Trust Boundaries
- **Untrusted:** Public Internet, Web Browser client application.
- **Demarcation 1:** Reverse proxy / API Gateway with TLS termination, Rate Limiter, and CSRF guard.
- **Trusted Zone:** Modular API Monolith, Outbox Event Publisher.
- **Data Protection Core:** PostgreSQL with Row-Level Security, Redis Cache, S3-compatible Object Storage.
