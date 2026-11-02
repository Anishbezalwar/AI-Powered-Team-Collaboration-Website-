import { Router } from 'express';
import { rawDb } from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';
export const searchRouter = Router();
searchRouter.use(requireAuth);
/**
 * GET /api/v1/search?q=term
 * Permission-aware global search across Issues, Messages, and Documents with tenant isolation.
 */
searchRouter.get('/', (req, res) => {
    const queryTerm = (req.query.q || '').trim();
    if (!queryTerm || queryTerm.length < 2) {
        return res.json({ issues: [], messages: [], documents: [] });
    }
    const likePattern = `%${queryTerm}%`;
    // 1. Search Issues
    const issues = rawDb.prepare(`
    SELECT i.id, i.issue_key, i.title, i.type, i.priority, i.status, p.key as project_key
    FROM issues i
    JOIN projects p ON p.id = i.project_id
    WHERE i.tenant_id = ?
      AND (i.title LIKE ? OR i.description LIKE ? OR i.issue_key LIKE ?)
    LIMIT 10
  `).all(req.tenantId, likePattern, likePattern, likePattern);
    // 2. Search Messages (permission-safe: only accessible channels)
    const messages = rawDb.prepare(`
    SELECT m.id, m.content, m.channel_id, m.created_at, c.name as channel_name, u.full_name as sender_name
    FROM messages m
    JOIN channels c ON c.id = m.channel_id
    JOIN users u ON u.id = m.sender_id
    WHERE m.tenant_id = ?
      AND m.content LIKE ?
      AND (
        c.is_private = 0
        OR EXISTS (SELECT 1 FROM channel_members cm WHERE cm.channel_id = c.id AND cm.user_id = ?)
        OR ? IN ('Owner', 'Admin')
      )
    LIMIT 10
  `).all(req.tenantId, likePattern, req.user.id, req.role);
    // 3. Search Documents (permission-safe: only accessible documents)
    const documents = rawDb.prepare(`
    SELECT d.id, d.title, d.icon, d.status, s.name as space_name
    FROM documents d
    JOIN spaces s ON s.id = d.space_id
    WHERE d.tenant_id = ?
      AND (d.title LIKE ? OR d.blocks LIKE ?)
      AND (
        d.is_private = 0
        OR d.created_by_id = ?
        OR ? IN ('Owner', 'Admin')
      )
    LIMIT 10
  `).all(req.tenantId, likePattern, likePattern, req.user.id, req.role);
    return res.json({
        issues,
        messages,
        documents,
    });
});
