"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluatePasswordNist = evaluatePasswordNist;
const COMMON_BREACHED_PASSWORDS = new Set([
    'password12345',
    '123456789012',
    'qwertyuiop12',
    'admin12345678',
    'welcome123456',
    'iloveyou12345',
    'monkey1234567',
    'dragon1234567',
    'sunshine12345',
    'princess12345',
    'football12345',
    'charlie123456',
    'shadow1234567',
    'superman12345',
]);
/**
 * Validates a password strictly against NIST SP 800-63B standards:
 * - Minimum 12 characters (allow up to 128).
 * - Accepts spaces and all Unicode characters.
 * - No arbitrary composition rules (e.g. forcing 1 number + 1 special character).
 * - Checks against known breached/common password corpora.
 */
function evaluatePasswordNist(password) {
    const feedback = [];
    if (!password || password.length < 12) {
        feedback.push('Password must be at least 12 characters in length (NIST SP 800-63B).');
    }
    if (password.length > 128) {
        feedback.push('Password must not exceed 128 characters.');
    }
    const normalized = password.toLowerCase().trim();
    if (COMMON_BREACHED_PASSWORDS.has(normalized)) {
        feedback.push('This password appears in known data breach corpora and is unsafe.');
    }
    // Calculate entropy heuristic
    let score = 'weak';
    if (password.length >= 12 && feedback.length === 0) {
        const hasLower = /[a-z]/.test(password);
        const hasUpper = /[A-Z]/.test(password);
        const hasDigit = /[0-9]/.test(password);
        const hasSymbolOrSpace = /[^a-zA-Z0-9]/.test(password);
        const varietyCount = [hasLower, hasUpper, hasDigit, hasSymbolOrSpace].filter(Boolean).length;
        if (password.length >= 16 && varietyCount >= 3) {
            score = 'strong';
        }
        else if (password.length >= 14 || varietyCount >= 3) {
            score = 'good';
        }
        else {
            score = 'fair';
        }
    }
    return {
        isValid: feedback.length === 0,
        score,
        feedback,
    };
}
