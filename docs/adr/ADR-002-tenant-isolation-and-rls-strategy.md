# ADR-002: Multi-Tenant Data Isolation and Row-Level Security (RLS)

## Status
Accepted

## Context
Multi-tenancy requires strict cryptographic and operational boundaries. A critical vulnerability in SaaS applications is "broken object-level authorization" (BOLA/IDOR), where an attacker modifies an ID parameter to read or update another tenant's private issues, documents, or chat messages. Relying solely on application-level developers writing `WHERE tenant_id = ?` in every ORM query is error-prone.

## Decision
We enforce multi-tenant isolation via **Defense-in-Depth**:
1. **Explicit Foreign Key:** Every tenant-owned database table contains a non-nullable `tenant_id` column indexed alongside entity IDs and query filters.
2. **Context Resolution:** The backend extracts `tenant_id` strictly from the authenticated and cryptographically verified server-side session, never from client-supplied request bodies or query parameters.
3. **Database-Level Row-Level Security (RLS):**
   - For PostgreSQL production deployments, Row-Level Security policies are active on all tenant tables:
     `CREATE POLICY tenant_isolation_policy ON <table> USING (tenant_id = current_setting('app.tenant_id', true)::uuid);`
   - Every database transaction begins by setting the connection context:
     `SET LOCAL app.tenant_id = :tenant_id;`
   - The database role used by the application explicitly does NOT possess `BYPASSRLS` privileges.
4. **Data Access Layer Boundary:** Even in embedded and test environments, the Data Access Layer (DAL) enforces tenant filtering automatically by injecting the session's `tenant_id` into all queries.
5. **Adversarial Test Suite:** An automated cross-tenant test harness explicitly tests cross-tenant ID guessing across all API endpoints, verifying that requests seeking another tenant's resources return `404 Not Found` or `403 Forbidden` with zero data leakage.

## Consequences
- **Positive:** Guarantees zero cross-tenant leakage even if an individual application query omits a filter. Protects sensitive enterprise data from horizontal privilege escalation.
- **Negative:** Requires disciplined transaction management and scoped session context setup for every incoming request.
