import { Router } from 'express';
import crypto from 'node:crypto';
import { rawDb, db } from '../db/index.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import { Permissions, CreateSpaceSchema, CreateDocumentSchema, UpdateDocumentSchema, } from '@workspace/shared';
export const documentsRouter = Router();
documentsRouter.use(requireAuth);
/**
 * GET /api/v1/spaces
 */
documentsRouter.get('/spaces', requirePermission(Permissions.DOC_READ), (req, res) => {
    const spaces = rawDb.prepare(`
    SELECT s.*,
           (SELECT COUNT(*) FROM documents d WHERE d.space_id = s.id) as doc_count
    FROM spaces s
    WHERE s.tenant_id = ?
    ORDER BY s.created_at ASC
  `).all(req.tenantId);
    return res.json(spaces);
});
/**
 * POST /api/v1/spaces
 */
documentsRouter.post('/spaces', requirePermission(Permissions.DOC_CREATE), (req, res) => {
    const parse = CreateSpaceSchema.safeParse(req.body);
    if (!parse.success) {
        return res.status(400).json({ error: 'Validation Error', details: parse.error.format() });
    }
    const { name, icon, description, isPrivate } = parse.data;
    const spaceId = crypto.randomUUID();
    const now = new Date().toISOString();
    rawDb.prepare(`
    INSERT INTO spaces (id, tenant_id, name, icon, description, is_private, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(spaceId, req.tenantId, name, icon || '📁', description || '', isPrivate ? 1 : 0, now);
    db.logAuditEvent({
        tenantId: req.tenantId,
        actorId: req.user.id,
        actorEmail: req.user.email,
        action: 'space:created',
        resourceType: 'space',
        resourceId: spaceId,
        details: { name },
    });
    return res.status(201).json({
        id: spaceId,
        tenantId: req.tenantId,
        name,
        icon,
        description,
        isPrivate,
        createdAt: now,
    });
});
/**
 * GET /api/v1/documents
 */
documentsRouter.get('/', requirePermission(Permissions.DOC_READ), (req, res) => {
    const { spaceId } = req.query;
    let query = `
    SELECT d.id, d.tenant_id, d.space_id, d.title, d.icon, d.status, d.version_number,
           d.is_private, d.linked_project_id, d.linked_issue_id, d.created_by_id, d.created_at, d.updated_at,
           u.full_name as author_name, s.name as space_name
    FROM documents d
    JOIN spaces s ON s.id = d.space_id
    JOIN users u ON u.id = d.created_by_id
    WHERE d.tenant_id = ?
  `;
    const params = [req.tenantId];
    if (spaceId) {
        query += ' AND d.space_id = ?';
        params.push(spaceId);
    }
    // Filter private docs unless creator or admin/owner
    if (req.role !== 'Owner' && req.role !== 'Admin') {
        query += ' AND (d.is_private = 0 OR d.created_by_id = ?)';
        params.push(req.user.id);
    }
    query += ' ORDER BY d.updated_at DESC';
    const docs = rawDb.prepare(query).all(...params);
    return res.json(docs);
});
/**
 * GET /api/v1/documents/:id
 */
documentsRouter.get('/:id', requirePermission(Permissions.DOC_READ), (req, res) => {
    const doc = rawDb.prepare(`
    SELECT d.*, u.full_name as author_name, s.name as space_name,
           p.key as linked_project_key, p.name as linked_project_name,
           i.issue_key as linked_issue_key, i.title as linked_issue_title
    FROM documents d
    JOIN spaces s ON s.id = d.space_id
    JOIN users u ON u.id = d.created_by_id
    LEFT JOIN projects p ON p.id = d.linked_project_id
    LEFT JOIN issues i ON i.id = d.linked_issue_id
    WHERE d.id = ? AND d.tenant_id = ?
  `).get(req.params.id, req.tenantId);
    if (!doc) {
        return res.status(404).json({ error: 'Document not found' });
    }
    if (doc.is_private && doc.created_by_id !== req.user.id && req.role !== 'Owner' && req.role !== 'Admin') {
        return res.status(403).json({ error: 'Forbidden', message: 'This document is private.' });
    }
    return res.json({
        ...doc,
        blocks: JSON.parse(doc.blocks || '[]'),
    });
});
/**
 * POST /api/v1/documents
 */
documentsRouter.post('/', requirePermission(Permissions.DOC_CREATE), (req, res) => {
    const parse = CreateDocumentSchema.safeParse(req.body);
    if (!parse.success) {
        return res.status(400).json({ error: 'Validation Error', details: parse.error.format() });
    }
    const { spaceId, title, icon, isPrivate, linkedProjectId, linkedIssueId } = parse.data;
    // Verify space belongs to tenant
    const space = rawDb.prepare('SELECT id FROM spaces WHERE id = ? AND tenant_id = ?').get(spaceId, req.tenantId);
    if (!space) {
        return res.status(404).json({ error: 'Space not found' });
    }
    const docId = crypto.randomUUID();
    const now = new Date().toISOString();
    const initialBlocks = JSON.stringify([
        { id: 'b1', type: 'h1', content: title },
        { id: 'b2', type: 'paragraph', content: 'Start typing or use the block tools to collaborate...' },
    ]);
    rawDb.prepare(`
    INSERT INTO documents (
      id, tenant_id, space_id, title, icon, status, blocks, version_number,
      is_private, linked_project_id, linked_issue_id, created_by_id, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, 'draft', ?, 1, ?, ?, ?, ?, ?, ?)
  `).run(docId, req.tenantId, spaceId, title, icon || '📄', initialBlocks, isPrivate ? 1 : 0, linkedProjectId || null, linkedIssueId || null, req.user.id, now, now);
    // Snapshot version 1
    rawDb.prepare(`
    INSERT INTO document_versions (id, document_id, version_number, title, blocks, author_id, created_at)
    VALUES (?, ?, 1, ?, ?, ?, ?)
  `).run(crypto.randomUUID(), docId, title, initialBlocks, req.user.id, now);
    db.logAuditEvent({
        tenantId: req.tenantId,
        actorId: req.user.id,
        actorEmail: req.user.email,
        action: 'document:created',
        resourceType: 'document',
        resourceId: docId,
        details: { title, spaceId },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
    });
    return res.status(201).json({
        id: docId,
        tenantId: req.tenantId,
        spaceId,
        title,
        icon: icon || '📄',
        status: 'draft',
        blocks: JSON.parse(initialBlocks),
        versionNumber: 1,
        isPrivate: Boolean(isPrivate),
        createdAt: now,
        updatedAt: now,
    });
});
/**
 * PATCH /api/v1/documents/:id
 */
documentsRouter.patch('/:id', requirePermission(Permissions.DOC_UPDATE), (req, res) => {
    const parse = UpdateDocumentSchema.safeParse(req.body);
    if (!parse.success) {
        return res.status(400).json({ error: 'Validation Error', details: parse.error.format() });
    }
    const doc = rawDb.prepare('SELECT * FROM documents WHERE id = ? AND tenant_id = ?').get(req.params.id, req.tenantId);
    if (!doc) {
        return res.status(404).json({ error: 'Document not found' });
    }
    if (doc.is_private && doc.created_by_id !== req.user.id && req.role !== 'Owner' && req.role !== 'Admin') {
        return res.status(403).json({ error: 'Forbidden', message: 'You cannot edit this private document.' });
    }
    const updates = parse.data;
    const newVersion = doc.version_number + 1;
    const now = new Date().toISOString();
    const title = updates.title !== undefined ? updates.title : doc.title;
    const icon = updates.icon !== undefined ? updates.icon : doc.icon;
    const status = updates.status !== undefined ? updates.status : doc.status;
    const blocksJson = updates.blocks !== undefined ? JSON.stringify(updates.blocks) : doc.blocks;
    const isPrivate = updates.isPrivate !== undefined ? (updates.isPrivate ? 1 : 0) : doc.is_private;
    rawDb.prepare(`
    UPDATE documents
    SET title = ?, icon = ?, status = ?, blocks = ?, is_private = ?, version_number = ?, updated_at = ?
    WHERE id = ? AND tenant_id = ?
  `).run(title, icon, status, blocksJson, isPrivate, newVersion, now, req.params.id, req.tenantId);
    // Save historical snapshot
    rawDb.prepare(`
    INSERT INTO document_versions (id, document_id, version_number, title, blocks, author_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(crypto.randomUUID(), req.params.id, newVersion, title, blocksJson, req.user.id, now);
    db.logAuditEvent({
        tenantId: req.tenantId,
        actorId: req.user.id,
        actorEmail: req.user.email,
        action: 'document:updated',
        resourceType: 'document',
        resourceId: req.params.id,
        details: { version: newVersion, statusChanged: status !== doc.status ? status : undefined },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
    });
    return res.json({
        id: req.params.id,
        title,
        icon,
        status,
        blocks: JSON.parse(blocksJson),
        versionNumber: newVersion,
        isPrivate: Boolean(isPrivate),
        updatedAt: now,
    });
});
/**
 * GET /api/v1/documents/:id/versions
 */
documentsRouter.get('/:id/versions', requirePermission(Permissions.DOC_READ), (req, res) => {
    const doc = rawDb.prepare('SELECT id FROM documents WHERE id = ? AND tenant_id = ?').get(req.params.id, req.tenantId);
    if (!doc) {
        return res.status(404).json({ error: 'Document not found' });
    }
    const versions = rawDb.prepare(`
    SELECT dv.id, dv.version_number, dv.title, dv.created_at,
           u.full_name as author_name, u.avatar_url as author_avatar
    FROM document_versions dv
    JOIN users u ON u.id = dv.author_id
    WHERE dv.document_id = ?
    ORDER BY dv.version_number DESC
  `).all(req.params.id);
    return res.json(versions);
});
/**
 * POST /api/v1/documents/:id/versions/:versionNumber/restore
 * Restores historical version snapshot!
 */
documentsRouter.post('/:id/versions/:versionNumber/restore', requirePermission(Permissions.DOC_RESTORE), (req, res) => {
    const doc = rawDb.prepare('SELECT * FROM documents WHERE id = ? AND tenant_id = ?').get(req.params.id, req.tenantId);
    if (!doc) {
        return res.status(404).json({ error: 'Document not found' });
    }
    const historical = rawDb.prepare(`
    SELECT * FROM document_versions WHERE document_id = ? AND version_number = ?
  `).get(req.params.id, req.params.versionNumber);
    if (!historical) {
        return res.status(404).json({ error: 'Historical version not found' });
    }
    const newVersion = doc.version_number + 1;
    const now = new Date().toISOString();
    // Restore content
    rawDb.prepare(`
    UPDATE documents
    SET title = ?, blocks = ?, version_number = ?, updated_at = ?
    WHERE id = ? AND tenant_id = ?
  `).run(historical.title, historical.blocks, newVersion, now, req.params.id, req.tenantId);
    // Record restoration as new snapshot
    rawDb.prepare(`
    INSERT INTO document_versions (id, document_id, version_number, title, blocks, author_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(crypto.randomUUID(), req.params.id, newVersion, historical.title, historical.blocks, req.user.id, now);
    db.logAuditEvent({
        tenantId: req.tenantId,
        actorId: req.user.id,
        actorEmail: req.user.email,
        action: 'document:restored',
        resourceType: 'document',
        resourceId: req.params.id,
        details: { restoredFromVersion: req.params.versionNumber, newVersion },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
    });
    return res.json({
        message: `Document successfully restored from version ${req.params.versionNumber}`,
        versionNumber: newVersion,
        title: historical.title,
        blocks: JSON.parse(historical.blocks),
    });
});
