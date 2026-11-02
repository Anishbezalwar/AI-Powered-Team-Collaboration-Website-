import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import { sha256 } from '../crypto/auth.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../data');
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}
const DB_PATH = path.join(DATA_DIR, 'workspace.db');
export const rawDb = new DatabaseSync(DB_PATH);
// Initialize schema
const schemaPath = path.join(__dirname, 'schema.sql');
const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
rawDb.exec(schemaSql);
// Safe migrations for existing SQLite databases
try {
    rawDb.exec('ALTER TABLE channels ADD COLUMN is_dm INTEGER NOT NULL DEFAULT 0');
}
catch { }
try {
    rawDb.exec('ALTER TABLE channels ADD COLUMN dm_user_id TEXT REFERENCES users(id) ON DELETE SET NULL');
}
catch { }
try {
    rawDb.exec('ALTER TABLE messages ADD COLUMN is_pinned INTEGER NOT NULL DEFAULT 0');
}
catch { }
try {
    rawDb.exec("ALTER TABLE messages ADD COLUMN attachments TEXT NOT NULL DEFAULT '[]'");
}
catch { }
try {
    rawDb.exec('ALTER TABLE messages ADD COLUMN is_edited INTEGER NOT NULL DEFAULT 0');
}
catch { }
export const db = {
    raw: rawDb,
    /**
     * Appends an immutable audit event with SHA-256 hash chaining to detect tampering.
     */
    logAuditEvent(input) {
        const id = crypto.randomUUID();
        const createdAt = new Date().toISOString();
        const detailsJson = JSON.stringify(input.details || {});
        const ipAddress = input.ipAddress || '127.0.0.1';
        const userAgent = input.userAgent || 'system';
        // Get latest audit event hash for this tenant (Genesis hash if first event)
        const lastEventStmt = rawDb.prepare('SELECT event_hash FROM audit_events WHERE tenant_id = ? ORDER BY created_at DESC, rowid DESC LIMIT 1');
        const lastEvent = lastEventStmt.get(input.tenantId);
        const prevHash = lastEvent ? lastEvent.event_hash : '0'.repeat(64);
        // Compute cryptographic chain hash
        const rawToHash = `${prevHash}|${id}|${input.tenantId}|${input.action}|${input.actorId}|${createdAt}|${detailsJson}`;
        const eventHash = sha256(rawToHash);
        const insertStmt = rawDb.prepare(`
      INSERT INTO audit_events (
        id, tenant_id, actor_id, actor_email, action, resource_type, resource_id,
        details, ip_address, user_agent, prev_hash, event_hash, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
        insertStmt.run(id, input.tenantId, input.actorId, input.actorEmail, input.action, input.resourceType, input.resourceId, detailsJson, ipAddress, userAgent, prevHash, eventHash, createdAt);
    },
    /**
     * Cryptographically verifies the audit log hash chain for a tenant.
     * Returns validity status and event count.
     */
    verifyAuditIntegrity(tenantId) {
        const stmt = rawDb.prepare('SELECT * FROM audit_events WHERE tenant_id = ? ORDER BY created_at ASC, rowid ASC');
        const rows = stmt.all(tenantId);
        let expectedPrevHash = '0'.repeat(64);
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            if (row.prev_hash !== expectedPrevHash) {
                return {
                    isValid: false,
                    count: rows.length,
                    error: `Audit chain broken at event ${row.id}: expected prev_hash ${expectedPrevHash}, found ${row.prev_hash}`,
                };
            }
            const rawToHash = `${row.prev_hash}|${row.id}|${row.tenant_id}|${row.action}|${row.actor_id}|${row.created_at}|${row.details}`;
            const computedHash = sha256(rawToHash);
            if (computedHash !== row.event_hash) {
                return {
                    isValid: false,
                    count: rows.length,
                    error: `Audit tamper detected at event ${row.id}: recomputed hash does not match stored hash`,
                };
            }
            expectedPrevHash = row.event_hash;
        }
        return { isValid: true, count: rows.length };
    },
    /**
     * Cycle detection algorithm for issue dependency links.
     * Checks whether adding a directed link from source -> target creates a cycle.
     */
    detectDependencyCycle(tenantId, sourceIssueId, targetIssueId) {
        if (sourceIssueId === targetIssueId)
            return true;
        const stmt = rawDb.prepare("SELECT source_issue_id, target_issue_id FROM dependency_links WHERE tenant_id = ? AND type = 'blocks'");
        const links = stmt.all(tenantId);
        // Adjacency graph
        const adj = new Map();
        for (const link of links) {
            if (!adj.has(link.source_issue_id))
                adj.set(link.source_issue_id, []);
            adj.get(link.source_issue_id).push(link.target_issue_id);
        }
        // Add candidate edge: sourceIssueId blocks targetIssueId
        if (!adj.has(sourceIssueId))
            adj.set(sourceIssueId, []);
        adj.get(sourceIssueId).push(targetIssueId);
        // Run DFS to detect cycle starting from targetIssueId to see if it reaches sourceIssueId
        const visited = new Set();
        const stack = [targetIssueId];
        while (stack.length > 0) {
            const curr = stack.pop();
            if (curr === sourceIssueId) {
                return true; // Cycle detected!
            }
            if (!visited.has(curr)) {
                visited.add(curr);
                const neighbors = adj.get(curr) || [];
                for (const neighbor of neighbors) {
                    stack.push(neighbor);
                }
            }
        }
        return false;
    },
};
