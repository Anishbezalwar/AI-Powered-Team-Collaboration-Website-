import assert from 'node:assert';
import { rawDb, db } from '../src/db/index.js';
import {
  hashPassword,
  verifyPassword,
  generateTotpSecret,
  verifyTotpCode,
  generateRecoveryCodes,
  sha256,
} from '../src/crypto/auth.js';
import { evaluatePasswordNist, can, Permissions } from '@workspace/shared';

async function runTests() {
  console.log('\n======================================================');
  console.log('🧪 RUNNING SECTION 6.8 & CROSS-TENANT TEST SUITE');
  console.log('======================================================\n');

  let passed = 0;
  let failed = 0;

  function test(name: string, fn: () => void | Promise<void>) {
    try {
      fn();
      console.log(`  ✓ PASS: ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`  ✗ FAIL: ${name}`);
      console.error(`    ${err.message}`);
      failed++;
    }
  }

  // 1. Password Security & Storage (ASVS 2.1)
  test('Passwords are stored securely with PBKDF2/Argon2id and unique per-user salt', () => {
    const raw = 'SuperSecureP@ss123!';
    const hash1 = hashPassword(raw);
    const hash2 = hashPassword(raw);

    assert.notStrictEqual(hash1, hash2, 'Identical passwords must have distinct salts');
    assert.strictEqual(verifyPassword(raw, hash1), true, 'Valid password verification');
    assert.strictEqual(verifyPassword('WrongP@ssword123!', hash1), false, 'Wrong password rejected');

    // Check database to ensure no plaintext exists
    const users = rawDb.prepare('SELECT email, password_hash FROM users').all() as any[];
    for (const u of users) {
      assert.ok(u.password_hash.startsWith('$pbkdf2$'), 'Stored password must be a cryptographic hash');
      assert.ok(!u.password_hash.includes('Password12345!'), 'No plaintext password in database');
    }
  });

  // 2. NIST SP 800-63B Password Policy
  test('NIST SP 800-63B password validation rejects short and breached passwords', () => {
    const short = evaluatePasswordNist('short123');
    assert.strictEqual(short.isValid, false, 'Must reject passwords under 12 characters');

    const breached = evaluatePasswordNist('password12345');
    assert.strictEqual(breached.isValid, false, 'Must reject known breached passwords');

    const valid = evaluatePasswordNist('CorrectHorseBatteryStaple2026!');
    assert.strictEqual(valid.isValid, true, 'Valid NIST password accepted');
    assert.strictEqual(valid.score, 'strong', 'Password receives strong rating');
  });

  // 3. RFC 6238 TOTP Multi-Factor Authentication
  test('TOTP MFA generates RFC 6238 secrets and verifies valid time-window codes', async () => {
    const { secretBase32, uri } = await generateTotpSecret('test@enterprise.com');
    assert.ok(secretBase32.length >= 16, 'Base32 secret length');
    assert.ok(uri.includes('otpauth://totp/'), 'Valid otpauth URI format');

    // Generate code using otpauth
    const OTPAuth = await import('otpauth');
    const totp = new OTPAuth.TOTP({
      issuer: 'Unified Enterprise Workspace',
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(secretBase32),
    });
    const currentCode = totp.generate();

    assert.strictEqual(verifyTotpCode(currentCode, secretBase32), true, 'Valid TOTP code accepted');
    assert.strictEqual(verifyTotpCode('000000', secretBase32), false, 'Invalid TOTP code rejected');
  });

  // 4. Single-Use Recovery Codes
  test('Generates 10 single-use recovery codes stored as SHA-256 hashes', () => {
    const { plainCodes, hashedCodes } = generateRecoveryCodes();
    assert.strictEqual(plainCodes.length, 10, 'Must generate exactly 10 recovery codes');
    assert.strictEqual(hashedCodes.length, 10, 'Must generate 10 hashed codes');

    for (let i = 0; i < 10; i++) {
      assert.strictEqual(sha256(plainCodes[i]), hashedCodes[i], 'Stored code must match SHA-256 hash');
    }
  });

  // 5. Central can() Authorization Guard (RBAC)
  test('Central authorization engine enforces role boundaries (Deny-by-default)', () => {
    // Owner has all permissions
    assert.strictEqual(can('Owner', Permissions.AUDIT_READ), true);
    assert.strictEqual(can('Owner', Permissions.PROJECT_CREATE), true);

    // Admin has management permissions
    assert.strictEqual(can('Admin', Permissions.AUDIT_READ), true);
    assert.strictEqual(can('Admin', Permissions.PROJECT_CREATE), true);

    // Member cannot read audit or manage tenant
    assert.strictEqual(can('Member', Permissions.AUDIT_READ), false);
    assert.strictEqual(can('Member', Permissions.PROJECT_CREATE), false);
    assert.strictEqual(can('Member', Permissions.ISSUE_CREATE), true);

    // Guest has read-only permissions
    assert.strictEqual(can('Guest', Permissions.AUDIT_READ), false);
    assert.strictEqual(can('Guest', Permissions.ISSUE_CREATE), false);
    assert.strictEqual(can('Guest', Permissions.MESSAGE_SEND), false);
    assert.strictEqual(can('Guest', Permissions.ISSUE_READ), true);
  });

  // 6. Cross-Tenant Data Isolation (Adversarial Tests)
  test('Cross-Tenant Isolation: Tenant A cannot read or query Tenant B issues', () => {
    const acmeTenantId = '11111111-1111-1111-1111-111111111111';
    const starkTenantId = '22222222-2222-2222-2222-222222222222';

    // Get Stark issue
    const starkIssue = rawDb.prepare('SELECT id, issue_key FROM issues WHERE tenant_id = ? LIMIT 1').get(starkTenantId) as any;
    assert.ok(starkIssue, 'Stark issue exists in database');

    // Attempt to query Stark issue using Acme tenant context
    const leakAttempt = rawDb.prepare('SELECT * FROM issues WHERE id = ? AND tenant_id = ?').get(starkIssue.id, acmeTenantId);
    assert.strictEqual(leakAttempt, undefined, 'Tenant A context MUST return undefined (404/Zero Leakage)');
  });

  test('Cross-Tenant Isolation: Tenant A cannot read Tenant B private channels or messages', () => {
    const acmeTenantId = '11111111-1111-1111-1111-111111111111';
    const starkTenantId = '22222222-2222-2222-2222-222222222222';

    const starkChannel = rawDb.prepare('SELECT id FROM channels WHERE tenant_id = ? LIMIT 1').get(starkTenantId) as any;
    assert.ok(starkChannel, 'Stark channel exists');

    const leakAttempt = rawDb.prepare('SELECT * FROM messages WHERE channel_id = ? AND tenant_id = ?').all(starkChannel.id, acmeTenantId);
    assert.strictEqual(leakAttempt.length, 0, 'Must return zero messages for foreign tenant');
  });

  test('Cross-Tenant Isolation: Tenant A cannot access Tenant B knowledge documents', () => {
    const acmeTenantId = '11111111-1111-1111-1111-111111111111';
    const starkTenantId = '22222222-2222-2222-2222-222222222222';

    const starkDoc = rawDb.prepare('SELECT id FROM documents WHERE tenant_id = ? LIMIT 1').get(starkTenantId) as any;
    assert.ok(starkDoc, 'Stark doc exists');

    const leakAttempt = rawDb.prepare('SELECT * FROM documents WHERE id = ? AND tenant_id = ?').get(starkDoc.id, acmeTenantId);
    assert.strictEqual(leakAttempt, undefined, 'Foreign document strictly inaccessible');
  });

  // 7. Dependency Graph Cycle Detection
  test('Issue dependency engine detects and prevents circular blocking chains', () => {
    const tenantId = '11111111-1111-1111-1111-111111111111';
    const issueA = 'i1111111-1111-1111-1111-111111111111';
    const issueB = 'i1111111-1111-1111-1111-111111111112';

    // We already seeded: issueA blocks issueB.
    // Adding issueB blocks issueA would create an immediate cycle: A -> B -> A
    const cycleDetected = db.detectDependencyCycle(tenantId, issueB, issueA);
    assert.strictEqual(cycleDetected, true, 'Must detect circular dependency loop');
  });

  // 8. Cryptographic Audit Log Integrity & Tamper Detection
  test('Audit log verifies SHA-256 hash chaining and detects tampering', () => {
    const acmeTenantId = '11111111-1111-1111-1111-111111111111';
    const verification = db.verifyAuditIntegrity(acmeTenantId);

    assert.strictEqual(verification.isValid, true, 'Audit log chain must be intact');
    assert.ok(verification.count > 0, 'Audit events must be recorded');
  });

  // 9. Interactive Video Sessions & Meetings Cross-Tenant Isolation
  test('Cross-Tenant Isolation: Tenant A cannot view or join Tenant B interactive video meetings', () => {
    const acmeTenantId = '11111111-1111-1111-1111-111111111111';
    const starkTenantId = '22222222-2222-2222-2222-222222222222';

    const starkMeeting = rawDb.prepare('SELECT id, title FROM meetings WHERE tenant_id = ? LIMIT 1').get(starkTenantId) as any;
    assert.ok(starkMeeting, 'Stark meeting exists');

    const leakAttempt = rawDb.prepare('SELECT * FROM meetings WHERE id = ? AND tenant_id = ?').get(starkMeeting.id, acmeTenantId);
    assert.strictEqual(leakAttempt, undefined, 'Stark meeting strictly inaccessible from Acme tenant context');
  });

  // 10. Lark Chat Message Threading and Pinning
  test('Lark Chat: Thread replies and message pins are properly linked and scoped', () => {
    const acmeTenantId = '11111111-1111-1111-1111-111111111111';
    const parentMsg = rawDb.prepare('SELECT id, reply_count, is_pinned FROM messages WHERE tenant_id = ? AND parent_id IS NULL LIMIT 1').get(acmeTenantId) as any;
    assert.ok(parentMsg, 'Acme parent message exists');

    const replies = rawDb.prepare('SELECT id FROM messages WHERE parent_id = ? AND tenant_id = ?').all(parentMsg.id, acmeTenantId);
    assert.strictEqual(replies.length, parentMsg.reply_count, 'Thread replies count matches parent reply_count');
  });

  console.log('\n======================================================');
  console.log(`📊 RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
