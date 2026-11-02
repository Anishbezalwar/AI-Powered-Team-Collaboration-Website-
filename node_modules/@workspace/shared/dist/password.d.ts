export interface PasswordEvaluation {
    isValid: boolean;
    score: 'weak' | 'fair' | 'good' | 'strong';
    feedback: string[];
}
/**
 * Validates a password strictly against NIST SP 800-63B standards:
 * - Minimum 12 characters (allow up to 128).
 * - Accepts spaces and all Unicode characters.
 * - No arbitrary composition rules (e.g. forcing 1 number + 1 special character).
 * - Checks against known breached/common password corpora.
 */
export declare function evaluatePasswordNist(password: string): PasswordEvaluation;
//# sourceMappingURL=password.d.ts.map