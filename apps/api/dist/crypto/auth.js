import crypto from 'node:crypto';
import * as OTPAuth from 'otpauth';
import QRCode from 'qrcode';
const ITERATIONS = 100000;
const KEY_LEN = 64;
const DIGEST = 'sha512';
/**
 * Enterprise Password Hashing using PBKDF2-SHA512 (OWASP recommended parameters).
 * Generates unique per-user cryptographically random 32-byte salt.
 */
export function hashPassword(password) {
    const salt = crypto.randomBytes(32).toString('hex');
    const derivedKey = crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LEN, DIGEST).toString('hex');
    return `$pbkdf2$v=1$i=${ITERATIONS}$s=${salt}$h=${derivedKey}`;
}
/**
 * Constant-time password verification preventing timing side-channel attacks.
 */
export function verifyPassword(password, storedHash) {
    try {
        const parts = storedHash.split('$');
        // Format: ["", "pbkdf2", "v=1", "i=100000", "s=<salt>", "h=<hash>"]
        if (parts.length !== 6 || parts[1] !== 'pbkdf2') {
            return false;
        }
        const iterPart = parts[3].split('=')[1];
        const salt = parts[4].split('=')[1];
        const originalHash = parts[5].split('=')[1];
        const iterations = parseInt(iterPart, 10);
        const checkKey = crypto.pbkdf2Sync(password, salt, iterations, KEY_LEN, DIGEST).toString('hex');
        const bufA = Buffer.from(checkKey, 'hex');
        const bufB = Buffer.from(originalHash, 'hex');
        if (bufA.length !== bufB.length)
            return false;
        return crypto.timingSafeEqual(bufA, bufB);
    }
    catch {
        return false;
    }
}
/**
 * Dummy password calculation used for non-existent users to equalize timing profile.
 */
export function fakeTimingEqualizer() {
    const dummySalt = '0000000000000000000000000000000000000000000000000000000000000000';
    crypto.pbkdf2Sync('dummy-timing-probe-password', dummySalt, ITERATIONS, KEY_LEN, DIGEST);
}
/**
 * Generates a 256-bit cryptographically secure random session token.
 */
export function generateSecureToken() {
    return crypto.randomBytes(32).toString('hex');
}
/**
 * SHA-256 hash calculation for tokens, recovery codes, and audit integrity.
 */
export function sha256(data) {
    return crypto.createHash('sha256').update(data).digest('hex');
}
/**
 * Generates 10 single-use recovery codes.
 * Returns both plain text codes (shown once to user) and their SHA-256 hashes (stored in database).
 */
export function generateRecoveryCodes() {
    const plainCodes = [];
    const hashedCodes = [];
    for (let i = 0; i < 10; i++) {
        const code = crypto.randomBytes(5).toString('hex').toUpperCase(); // 10 chars, e.g. A3F89B12C0
        plainCodes.push(code);
        hashedCodes.push(sha256(code));
    }
    return { plainCodes, hashedCodes };
}
/**
 * Generates RFC 6238 compliant TOTP secret and QR code URI.
 */
export async function generateTotpSecret(email, issuer = 'Unified Enterprise Workspace') {
    const secret = new OTPAuth.Secret({ size: 20 });
    const totp = new OTPAuth.TOTP({
        issuer,
        label: email,
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret,
    });
    const uri = totp.toString();
    const qrCodeDataUrl = await QRCode.toDataURL(uri);
    return {
        secretBase32: secret.base32,
        uri,
        qrCodeDataUrl,
    };
}
/**
 * Verifies a 6-digit TOTP code against a Base32 secret with a +/- 1 step window.
 */
export function verifyTotpCode(code, secretBase32) {
    try {
        const totp = new OTPAuth.TOTP({
            issuer: 'Unified Enterprise Workspace',
            algorithm: 'SHA1',
            digits: 6,
            period: 30,
            secret: OTPAuth.Secret.fromBase32(secretBase32),
        });
        const delta = totp.validate({ token: code.trim(), window: 1 });
        return delta !== null;
    }
    catch {
        return false;
    }
}
