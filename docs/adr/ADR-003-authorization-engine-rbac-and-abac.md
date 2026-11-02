# ADR-003: Centralized Permission-Based Authorization Engine

## Status
Accepted

## Context
Hard-coding role checks such as `if (user.role === 'admin')` directly inside controllers leads to rigid systems where permissions cannot be refined or audited. It also prevents the introduction of custom roles or attribute-based access controls (ABAC), such as document ownership or private channel membership.

## Decision
We implement a **Centralized Authorization Service** adhering to the `can(actor, action, resource, context)` policy pattern:
1. **Action-Oriented Permissions:** Permissions are granular action verbs bound to domain resources:
   - `issue:read`, `issue:create`, `issue:update`, `issue:delete`
   - `sprint:manage`, `workflow:configure`
   - `channel:create`, `channel:read_private`, `message:send`, `message:delete`
   - `document:read`, `document:create`, `document:update`, `document:restore`, `document:delete`
   - `audit:read`, `user:invite`, `role:assign`, `security:manage`
2. **Roles as Bundles:** Roles (`Owner`, `Admin`, `Member`, `Guest`) are predefined bundles of permissions mapped in the database and cached in memory. Controllers inspect permission strings, never role names.
3. **Contextual & Attribute-Based Overrides:**
   - Private channel access requires explicit channel membership (`channel_members`).
   - Private document access requires explicit document permission overrides.
   - Resource authors retain edit rights over their own comments and messages within configured edit windows.
4. **Deny-by-Default:** Any action lacking an explicit permission grant evaluates to `false` and results in an immediate `403 Forbidden` response.

## Consequences
- **Positive:** Clean decoupling of access policies from business logic, simple auditing of permission grants, and effortless addition of new roles without controller changes.
- **Negative:** Slightly higher initial setup complexity compared to basic role checks.
