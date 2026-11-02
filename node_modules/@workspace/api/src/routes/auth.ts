import { Router, Response } from 'express';
import crypto from 'node:crypto';
import { rawDb, db } from '../db/index.js';
import {
  hashPassword,
  verifyPassword,
  fakeTimingEqualizer,
  generateSecureToken,
  generateTotpSecret,
  verifyTotpCode,
  generateRecoveryCodes,
  sha256,
} from '../crypto/auth.js';
import {
  evaluatePasswordNist,
  SignUpSchema,
  LoginSchema,
  RolePermissions,
} from '@workspace/shared';
import {
  AuthenticatedRequest,
  requireAuth,
  checkRateLimit,
  recordFailedAttempt,
  resetRateLimit,
} from '../middleware/auth.js';

export const authRouter = Router();

const SESSION_COOKIE_NAME = process.env.NODE_ENV === 'production' ? '__Host-session' : 'session';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days absolute timeout
};

/**
 * Helper to create and attach a server-side session.
 */
function createSession(res: Response, tenantId: string, userId: string, req: AuthenticatedRequest) {
  const token = generateSecureToken();
  const sessionId = crypto.randomUUID();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

  const userAgent = req.headers['user-agent'] || 'Unknown Browser';
  const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';

  let deviceLabel = 'Desktop Web';
  if (/mobile/i.test(userAgent)) deviceLabel = 'Mobile Web';
  else if (/macintosh|mac os x/i.test(userAgent)) deviceLabel = 'macOS Browser';
  else if (/windows/i.test(userAgent)) deviceLabel = 'Windows Browser';
  else if (/linux/i.test(userAgent)) deviceLabel = 'Linux Browser';

  rawDb.prepare(`
    INSERT INTO sessions (id, token, tenant_id, user_id, device_label, ip_address, user_agent, created_at, last_seen_at, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(sessionId, token, tenantId, userId, deviceLabel, ipAddress, userAgent, now.toISOString(), now.toISOString(), expiresAt.toISOString());

  res.cookie(SESSION_COOKIE_NAME, token, COOKIE_OPTIONS);
  return { sessionId, token };
}

/**
 * POST /api/v1/auth/signup
 */
authRouter.post('/signup', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parseResult = SignUpSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: 'Validation Error', details: parseResult.error.format() });
    }

    const { email, password, fullName, tenantName } = parseResult.data;

    // NIST SP 800-63B validation
    const nistEvaluation = evaluatePasswordNist(password);
    if (!nistEvaluation.isValid) {
      return res.status(400).json({
        error: 'Password Policy Violation',
        details: nistEvaluation.feedback,
        score: nistEvaluation.score,
      });
    }

    // Check if user already exists
    const existing = rawDb.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
    if (existing) {
      // Anti-enumeration: Return generic error
      return res.status(400).json({ error: 'Unable to process registration with provided details.' });
    }

    const userId = crypto.randomUUID();
    const tenantId = crypto.randomUUID();
    const now = new Date().toISOString();
    const pwdHash = hashPassword(password);

    const orgName = tenantName || `${fullName}'s Organization`;
    const orgSlug = orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Math.floor(1000 + Math.random() * 9000);

    // Create Tenant, User, and Membership
    rawDb.prepare('INSERT INTO tenants (id, slug, name, created_at) VALUES (?, ?, ?, ?)').run(
      tenantId, orgSlug, orgName, now
    );

    rawDb.prepare(`
      INSERT INTO users (id, email, password_hash, full_name, avatar_url, is_email_verified, mfa_enabled, created_at)
      VALUES (?, ?, ?, ?, ?, 1, 0, ?)
    `).run(userId, email.toLowerCase(), pwdHash, fullName, '👤', now);

    rawDb.prepare('INSERT INTO memberships (id, tenant_id, user_id, role, created_at) VALUES (?, ?, ?, ?, ?)').run(
      crypto.randomUUID(), tenantId, userId, 'Owner', now
    );

    // Create default project and channel
    const projId = crypto.randomUUID();
    rawDb.prepare(`
      INSERT INTO projects (id, tenant_id, key, name, description, lead_id, created_at)
      VALUES (?, ?, 'MAIN', 'General Project', 'Default agile project workspace', ?, ?)
    `).run(projId, tenantId, userId, now);

    rawDb.prepare(`
      INSERT INTO channels (id, tenant_id, project_id, name, topic, is_private, created_by_id, created_at)
      VALUES (?, ?, ?, 'general', 'Company-wide discussion', 0, ?, ?)
    `).run(crypto.randomUUID(), tenantId, projId, userId, now);

    // Log audit event
    db.logAuditEvent({
      tenantId,
      actorId: userId,
      actorEmail: email.toLowerCase(),
      action: 'auth:signup_success',
      resourceType: 'user',
      resourceId: userId,
      details: { tenantName: orgName },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    // Create session
    const { token } = createSession(res, tenantId, userId, req);

    return res.status(201).json({
      message: 'Account created successfully',
      token,
      user: { id: userId, email: email.toLowerCase(), fullName, role: 'Owner' },
      tenant: { id: tenantId, name: orgName, slug: orgSlug },
      permissions: RolePermissions['Owner'],
    });
  } catch (err) {
    console.error('Signup error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * POST /api/v1/auth/login
 */
authRouter.post('/login', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parseResult = LoginSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: 'Validation Error', details: parseResult.error.format() });
    }

    const { email, password, totpCode, recoveryCode } = parseResult.data;
    const ip = req.ip || '127.0.0.1';
    const rateLimitKey = `${ip}:${email.toLowerCase()}`;

    // Rate limiting
    const rateStatus = checkRateLimit(rateLimitKey);
    if (!rateStatus.allowed) {
      return res.status(429).json({
        error: 'Too Many Requests',
        message: `Account temporarily locked due to consecutive failed attempts. Please retry in ${rateStatus.waitSeconds} seconds.`,
      });
    }

    const user = rawDb.prepare(`
      SELECT id, email, password_hash, full_name, avatar_url, is_email_verified, mfa_enabled, mfa_secret
      FROM users
      WHERE email = ?
    `).get(email.toLowerCase()) as {
      id: string;
      email: string;
      password_hash: string;
      full_name: string;
      avatar_url?: string;
      is_email_verified: number;
      mfa_enabled: number;
      mfa_secret?: string;
    } | undefined;

    if (!user) {
      fakeTimingEqualizer();
      recordFailedAttempt(rateLimitKey);
      return res.status(401).json({ error: 'Invalid credentials', message: 'Invalid email or password.' });
    }

    const isMatch = verifyPassword(password, user.password_hash);
    if (!isMatch) {
      recordFailedAttempt(rateLimitKey);
      return res.status(401).json({ error: 'Invalid credentials', message: 'Invalid email or password.' });
    }

    // Check Multi-Factor Authentication if enabled
    if (Boolean(user.mfa_enabled)) {
      if (!totpCode && !recoveryCode) {
        return res.status(200).json({
          requireMfa: true,
          message: 'Multi-factor authentication (TOTP or recovery code) required.',
        });
      }

      if (totpCode) {
        if (!user.mfa_secret || !verifyTotpCode(totpCode, user.mfa_secret)) {
          recordFailedAttempt(rateLimitKey);
          return res.status(401).json({ error: 'Invalid MFA Code', message: 'The 6-digit TOTP code is incorrect or expired.' });
        }
      } else if (recoveryCode) {
        const hashedCode = sha256(recoveryCode.trim().toUpperCase());
        const validRecovery = rawDb.prepare(`
          SELECT id FROM recovery_codes WHERE user_id = ? AND code_hash = ? AND used_at IS NULL
        `).get(user.id, hashedCode) as { id: string } | undefined;

        if (!validRecovery) {
          recordFailedAttempt(rateLimitKey);
          return res.status(401).json({ error: 'Invalid Recovery Code', message: 'Recovery code is invalid or has already been used.' });
        }

        // Mark recovery code as consumed
        rawDb.prepare('UPDATE recovery_codes SET used_at = ? WHERE id = ?').run(new Date().toISOString(), validRecovery.id);
      }
    }

    // Reset rate limiter on successful login
    resetRateLimit(rateLimitKey);

    // Get primary tenant membership
    const membership = rawDb.prepare(`
      SELECT m.id, m.tenant_id, m.role, t.name as tenant_name, t.slug as tenant_slug
      FROM memberships m
      JOIN tenants t ON t.id = m.tenant_id
      WHERE m.user_id = ?
      LIMIT 1
    `).get(user.id) as { id: string; tenant_id: string; role: any; tenant_name: string; tenant_slug: string } | undefined;

    if (!membership) {
      return res.status(403).json({ error: 'Access Denied', message: 'User is not assigned to any active organization.' });
    }

    // Create session & rotate cookie
    const { token } = createSession(res, membership.tenant_id, user.id, req);

    // Log audit event
    db.logAuditEvent({
      tenantId: membership.tenant_id,
      actorId: user.id,
      actorEmail: user.email,
      action: 'auth:login_success',
      resourceType: 'session',
      resourceId: token.substring(0, 8),
      details: { mfaUsed: Boolean(user.mfa_enabled), method: recoveryCode ? 'recovery_code' : 'totp' },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        avatarUrl: user.avatar_url,
        mfaEnabled: Boolean(user.mfa_enabled),
        role: membership.role,
      },
      tenant: {
        id: membership.tenant_id,
        name: membership.tenant_name,
        slug: membership.tenant_slug,
      },
      permissions: RolePermissions[membership.role as keyof typeof RolePermissions] || [],
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * POST /api/v1/auth/logout
 */
authRouter.post('/logout', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  if (req.session) {
    rawDb.prepare('DELETE FROM sessions WHERE id = ?').run(req.session.id);

    db.logAuditEvent({
      tenantId: req.tenantId!,
      actorId: req.user!.id,
      actorEmail: req.user!.email,
      action: 'auth:logout',
      resourceType: 'session',
      resourceId: req.session.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
  return res.json({ message: 'Logged out successfully' });
});

/**
 * GET /api/v1/auth/me
 */
authRouter.get('/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const memberships = rawDb.prepare(`
    SELECT m.tenant_id, m.role, t.name as tenant_name, t.slug as tenant_slug
    FROM memberships m
    JOIN tenants t ON t.id = m.tenant_id
    WHERE m.user_id = ?
  `).all(req.user!.id);

  const currentTenant = rawDb.prepare('SELECT id, name, slug FROM tenants WHERE id = ?').get(req.tenantId!);

  return res.json({
    user: req.user,
    role: req.role,
    tenant: currentTenant,
    memberships,
    permissions: req.role ? RolePermissions[req.role] : [],
  });
});

/**
 * POST /api/v1/auth/mfa/setup
 */
authRouter.post('/mfa/setup', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { secretBase32, qrCodeDataUrl } = await generateTotpSecret(req.user!.email);
    // Temporarily save secret awaiting verification
    rawDb.prepare('UPDATE users SET mfa_secret = ? WHERE id = ?').run(secretBase32, req.user!.id);

    return res.json({
      secret: secretBase32,
      qrCode: qrCodeDataUrl,
      instructions: 'Scan this QR code with Google Authenticator, Authy, or Apple Keychain, then enter the 6-digit verification code.',
    });
  } catch (err) {
    console.error('MFA setup error:', err);
    return res.status(500).json({ error: 'Failed to generate MFA credentials' });
  }
});

/**
 * POST /api/v1/auth/mfa/enable
 */
authRouter.post('/mfa/enable', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { totpCode } = req.body;
  if (!totpCode || totpCode.length !== 6) {
    return res.status(400).json({ error: 'A 6-digit TOTP code is required' });
  }

  const user = rawDb.prepare('SELECT mfa_secret FROM users WHERE id = ?').get(req.user!.id) as { mfa_secret?: string };
  if (!user?.mfa_secret) {
    return res.status(400).json({ error: 'MFA setup has not been initiated' });
  }

  const isValid = verifyTotpCode(totpCode, user.mfa_secret);
  if (!isValid) {
    return res.status(400).json({ error: 'Invalid TOTP code' });
  }

  // Enable MFA
  rawDb.prepare('UPDATE users SET mfa_enabled = 1 WHERE id = ?').run(req.user!.id);

  // Generate 10 single-use recovery codes
  const { plainCodes, hashedCodes } = generateRecoveryCodes();
  rawDb.prepare('DELETE FROM recovery_codes WHERE user_id = ?').run(req.user!.id);

  const insertRecovery = rawDb.prepare(
    'INSERT INTO recovery_codes (id, user_id, code_hash, created_at) VALUES (?, ?, ?, ?)'
  );
  const now = new Date().toISOString();
  for (const hash of hashedCodes) {
    insertRecovery.run(crypto.randomUUID(), req.user!.id, hash, now);
  }

  db.logAuditEvent({
    tenantId: req.tenantId!,
    actorId: req.user!.id,
    actorEmail: req.user!.email,
    action: 'auth:mfa_enabled',
    resourceType: 'user',
    resourceId: req.user!.id,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  return res.json({
    message: 'TOTP Multi-Factor Authentication enabled successfully.',
    recoveryCodes: plainCodes,
    warning: 'Save these recovery codes in a secure vault. Each code can only be used once if you lose your authenticator device.',
  });
});

/**
 * GET /api/v1/auth/sessions
 */
authRouter.get('/sessions', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const sessions = rawDb.prepare(`
    SELECT id, device_label, ip_address, user_agent, created_at, last_seen_at
    FROM sessions
    WHERE user_id = ?
    ORDER BY last_seen_at DESC
  `).all(req.user!.id) as Array<{
    id: string;
    device_label: string;
    ip_address: string;
    user_agent: string;
    created_at: string;
    last_seen_at: string;
  }>;

  const mapped = sessions.map((s) => ({
    ...s,
    isCurrent: s.id === req.session?.id,
  }));

  return res.json(mapped);
});

/**
 * POST /api/v1/auth/sessions/:id/revoke
 */
authRouter.post('/sessions/:id/revoke', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const sessionId = req.params.id;
  const target = rawDb.prepare('SELECT id, user_id FROM sessions WHERE id = ?').get(sessionId) as { id: string; user_id: string } | undefined;

  if (!target) {
    return res.status(404).json({ error: 'Session not found' });
  }

  // Users can revoke their own sessions; Admins can revoke anyone's
  if (target.user_id !== req.user!.id && req.role !== 'Owner' && req.role !== 'Admin') {
    return res.status(403).json({ error: 'Permission denied to revoke this session' });
  }

  rawDb.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);

  db.logAuditEvent({
    tenantId: req.tenantId!,
    actorId: req.user!.id,
    actorEmail: req.user!.email,
    action: 'session:revoked',
    resourceType: 'session',
    resourceId: sessionId,
    details: { wasCurrent: sessionId === req.session?.id },
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  return res.json({ message: 'Session revoked successfully' });
});

/**
 * POST /api/v1/auth/tenants/switch
 */
authRouter.post('/tenants/switch', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { tenantId } = req.body;
  if (!tenantId) {
    return res.status(400).json({ error: 'tenantId is required' });
  }

  const membership = rawDb.prepare(`
    SELECT m.role, t.name, t.slug
    FROM memberships m
    JOIN tenants t ON t.id = m.tenant_id
    WHERE m.tenant_id = ? AND m.user_id = ?
  `).get(tenantId, req.user!.id) as { role: any; name: string; slug: string } | undefined;

  if (!membership) {
    return res.status(403).json({ error: 'You are not a member of this tenant' });
  }

  // Update session's active tenant
  rawDb.prepare('UPDATE sessions SET tenant_id = ? WHERE id = ?').run(tenantId, req.session!.id);

  db.logAuditEvent({
    tenantId,
    actorId: req.user!.id,
    actorEmail: req.user!.email,
    action: 'tenant:switched',
    resourceType: 'tenant',
    resourceId: tenantId,
    details: { newRole: membership.role },
  });

  return res.json({
    message: 'Active organization switched successfully',
    tenant: { id: tenantId, name: membership.name, slug: membership.slug },
    role: membership.role,
    permissions: RolePermissions[membership.role as keyof typeof RolePermissions] || [],
  });
});
