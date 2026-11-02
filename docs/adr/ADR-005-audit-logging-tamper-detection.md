# ADR-005: Tamper-Evident Append-Only Audit Logging Architecture

## Status
Accepted

## Context
Enterprise compliance (OWASP ASVS L2, SOC 2, HIPAA, GDPR) requires that all security-sensitive and governance actions are tracked in an unalterable audit log. If a database is compromised, an attacker must not be able to silently alter past audit events without cryptographic detection.

## Decision
We implement an **Append-Only Tamper-Evident Audit Trail**:
1. **Event Schema:**
   Each audit entry records:
   - `id`: Unique identifier (UUIDv4)
   - `tenant_id`: Scoped organization ID
   - `actor_id`: User or system service triggering the action
   - `actor_email`: Snapshot of actor identifier
   - `action`: Specific action (e.g. `auth:login_success`, `auth:mfa_enabled`, `session:revoked`, `role:assigned`, `issue:converted_from_message`, `doc:restored`)
   - `resource_type` and `resource_id`: The object affected
   - `details`: Metadata summary (before/after state diff, excluding credentials)
   - `ip_address` and `user_agent`: Origin network metadata
   - `created_at`: High-precision ISO timestamp
   - `prev_hash`: Cryptographic SHA-256 hash of the immediately preceding audit entry in this tenant
   - `event_hash`: `SHA-256(prev_hash + id + tenant_id + action + actor_id + timestamp + details)`
2. **Tamper Detection:**
   - Any modification or deletion of a past event breaks the SHA-256 hash chain for all subsequent entries.
   - An automated audit integrity verification tool allows administrators to recompute and verify the entire cryptographic chain at any time.
3. **Data Minimization:**
   - Strict redactor policy: Passwords, MFA secrets, recovery codes, auth tokens, and raw confidential message/document bodies are never written to the audit log.
4. **Access Restrictions:**
   - Read access to audit records is strictly guarded by the `audit:read` permission, reserved exclusively for Organization Owners and Admins.

## Consequences
- **Positive:** Cryptographically verifiable proof of non-repudiation, enterprise compliance readiness, and rapid forensic visibility into security incidents.
- **Negative:** Append-only growth requires scheduled archival policies for high-volume tenants.
