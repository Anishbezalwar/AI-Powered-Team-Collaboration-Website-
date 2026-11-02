import { rawDb } from '../db/index.js';
import { can } from '@workspace/shared';
const failedAttemptsMap = new Map();
export function checkRateLimit(key, maxAttempts = 5, lockWindowMs = 15 * 60 * 1000) {
    const now = Date.now();
    const record = failedAttemptsMap.get(key);
    if (record?.lockedUntil && record.lockedUntil > now) {
        return {
            allowed: false,
            waitSeconds: Math.ceil((record.lockedUntil - now) / 1000),
        };
    }
    return { allowed: true };
}
export function recordFailedAttempt(key, maxAttempts = 5, lockWindowMs = 15 * 60 * 1000) {
    const now = Date.now();
    const record = failedAttemptsMap.get(key) || { count: 0 };
    record.count += 1;
    if (record.count >= maxAttempts) {
        record.lockedUntil = now + lockWindowMs;
    }
    failedAttemptsMap.set(key, record);
}
export function resetRateLimit(key) {
    failedAttemptsMap.delete(key);
}
/**
 * Global authentication & tenant context middleware.
 * Inspects session cookie (__Host-session, session) or Authorization header.
 */
export function authMiddleware(req, res, next) {
    const sessionToken = req.cookies?.['__Host-session'] ||
        req.cookies?.['session'] ||
        req.headers.authorization?.replace(/^Bearer\s+/i, '');
    if (!sessionToken) {
        return next();
    }
    try {
        const sessionStmt = rawDb.prepare(`
      SELECT s.id as session_id, s.token, s.tenant_id, s.user_id, s.expires_at,
             u.id as u_id, u.email, u.full_name, u.avatar_url, u.is_email_verified, u.mfa_enabled,
             m.id as m_id, m.role
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      JOIN memberships m ON m.tenant_id = s.tenant_id AND m.user_id = u.id
      WHERE s.token = ?
    `);
        const result = sessionStmt.get(sessionToken);
        if (!result) {
            return next();
        }
        const now = new Date();
        const expiresAt = new Date(result.expires_at);
        if (now > expiresAt) {
            // Session expired, remove it
            rawDb.prepare('DELETE FROM sessions WHERE id = ?').run(result.session_id);
            return next();
        }
        // Update last seen
        rawDb.prepare('UPDATE sessions SET last_seen_at = ? WHERE id = ?').run(now.toISOString(), result.session_id);
        req.session = {
            id: result.session_id,
            token: result.token,
            tenantId: result.tenant_id,
            userId: result.user_id,
        };
        req.user = {
            id: result.u_id,
            email: result.email,
            fullName: result.full_name,
            avatarUrl: result.avatar_url,
            isEmailVerified: Boolean(result.is_email_verified),
            mfaEnabled: Boolean(result.mfa_enabled),
        };
        req.tenantId = result.tenant_id;
        req.role = result.role;
        req.membership = {
            id: result.m_id,
            role: result.role,
        };
    }
    catch (err) {
        console.error('Auth middleware error:', err);
    }
    next();
}
/**
 * Guard ensuring that the request is authenticated with an active session.
 */
export function requireAuth(req, res, next) {
    if (!req.session || !req.user || !req.tenantId) {
        return res.status(401).json({
            error: 'Unauthorized',
            code: 'AUTH_REQUIRED',
            message: 'Authentication session required for this resource.',
        });
    }
    next();
}
/**
 * Central Authorization Guard evaluating can(role, permission).
 */
export function requirePermission(permission) {
    return (req, res, next) => {
        if (!req.role || !can(req.role, permission)) {
            return res.status(403).json({
                error: 'Forbidden',
                code: 'INSUFFICIENT_PERMISSIONS',
                message: `Action requires permission: ${permission}. Current role '${req.role || 'None'}' lacks authorization.`,
            });
        }
        next();
    };
}
