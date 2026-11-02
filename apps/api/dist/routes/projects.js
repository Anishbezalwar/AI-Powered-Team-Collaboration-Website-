import { Router } from 'express';
import crypto from 'node:crypto';
import { rawDb, db } from '../db/index.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import { Permissions, CreateProjectSchema, CreateSprintSchema } from '@workspace/shared';
export const projectsRouter = Router();
projectsRouter.use(requireAuth);
/**
 * GET /api/v1/projects
 */
projectsRouter.get('/', requirePermission(Permissions.PROJECT_READ), (req, res) => {
    const projects = rawDb.prepare(`
    SELECT p.id, p.tenant_id, p.key, p.name, p.description, p.lead_id, p.created_at,
           u.full_name as lead_name, u.email as lead_email
    FROM projects p
    JOIN users u ON u.id = p.lead_id
    WHERE p.tenant_id = ?
    ORDER BY p.created_at DESC
  `).all(req.tenantId);
    return res.json(projects);
});
/**
 * POST /api/v1/projects
 */
projectsRouter.post('/', requirePermission(Permissions.PROJECT_CREATE), (req, res) => {
    const parse = CreateProjectSchema.safeParse(req.body);
    if (!parse.success) {
        return res.status(400).json({ error: 'Validation Error', details: parse.error.format() });
    }
    const { key, name, description } = parse.data;
    // Check unique key in tenant
    const existing = rawDb.prepare('SELECT id FROM projects WHERE tenant_id = ? AND key = ?').get(req.tenantId, key);
    if (existing) {
        return res.status(400).json({ error: `Project key '${key}' already exists in this workspace.` });
    }
    const projectId = crypto.randomUUID();
    const now = new Date().toISOString();
    rawDb.prepare(`
    INSERT INTO projects (id, tenant_id, key, name, description, lead_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(projectId, req.tenantId, key, name, description || '', req.user.id, now);
    // Auto-create initial default channel for project
    const channelName = `${key.toLowerCase()}-team`;
    rawDb.prepare(`
    INSERT INTO channels (id, tenant_id, project_id, name, topic, is_private, created_by_id, created_at)
    VALUES (?, ?, ?, ?, ?, 0, ?, ?)
  `).run(crypto.randomUUID(), req.tenantId, projectId, channelName, `Discussions for project ${name}`, req.user.id, now);
    db.logAuditEvent({
        tenantId: req.tenantId,
        actorId: req.user.id,
        actorEmail: req.user.email,
        action: 'project:created',
        resourceType: 'project',
        resourceId: projectId,
        details: { key, name },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
    });
    return res.status(201).json({
        id: projectId,
        tenantId: req.tenantId,
        key,
        name,
        description,
        leadId: req.user.id,
        createdAt: now,
    });
});
/**
 * GET /api/v1/projects/:id/sprints
 */
projectsRouter.get('/:id/sprints', requirePermission(Permissions.PROJECT_READ), (req, res) => {
    const sprints = rawDb.prepare(`
    SELECT * FROM sprints WHERE tenant_id = ? AND project_id = ? ORDER BY created_at ASC
  `).all(req.tenantId, req.params.id);
    return res.json(sprints);
});
/**
 * POST /api/v1/projects/:id/sprints
 */
projectsRouter.post('/:id/sprints', requirePermission(Permissions.SPRINT_MANAGE), (req, res) => {
    const parse = CreateSprintSchema.safeParse({ ...req.body, projectId: req.params.id });
    if (!parse.success) {
        return res.status(400).json({ error: 'Validation Error', details: parse.error.format() });
    }
    const { projectId, name, goal, startDate, endDate } = parse.data;
    const sprintId = crypto.randomUUID();
    const now = new Date().toISOString();
    rawDb.prepare(`
    INSERT INTO sprints (id, tenant_id, project_id, name, goal, status, start_date, end_date, created_at)
    VALUES (?, ?, ?, ?, ?, 'planned', ?, ?, ?)
  `).run(sprintId, req.tenantId, projectId, name, goal || null, startDate || null, endDate || null, now);
    db.logAuditEvent({
        tenantId: req.tenantId,
        actorId: req.user.id,
        actorEmail: req.user.email,
        action: 'sprint:created',
        resourceType: 'sprint',
        resourceId: sprintId,
        details: { projectId, name },
    });
    return res.status(201).json({
        id: sprintId,
        tenantId: req.tenantId,
        projectId,
        name,
        goal,
        status: 'planned',
        startDate,
        endDate,
        createdAt: now,
    });
});
/**
 * POST /api/v1/sprints/:id/start
 */
projectsRouter.post('/sprints/:id/start', requirePermission(Permissions.SPRINT_MANAGE), (req, res) => {
    const sprint = rawDb.prepare('SELECT * FROM sprints WHERE id = ? AND tenant_id = ?').get(req.params.id, req.tenantId);
    if (!sprint) {
        return res.status(404).json({ error: 'Sprint not found' });
    }
    rawDb.prepare("UPDATE sprints SET status = 'active', start_date = ? WHERE id = ? AND tenant_id = ?").run(new Date().toISOString(), req.params.id, req.tenantId);
    db.logAuditEvent({
        tenantId: req.tenantId,
        actorId: req.user.id,
        actorEmail: req.user.email,
        action: 'sprint:started',
        resourceType: 'sprint',
        resourceId: req.params.id,
        details: { name: sprint.name },
    });
    return res.json({ message: 'Sprint started successfully', status: 'active' });
});
/**
 * POST /api/v1/sprints/:id/complete
 */
projectsRouter.post('/sprints/:id/complete', requirePermission(Permissions.SPRINT_MANAGE), (req, res) => {
    const sprint = rawDb.prepare('SELECT * FROM sprints WHERE id = ? AND tenant_id = ?').get(req.params.id, req.tenantId);
    if (!sprint) {
        return res.status(404).json({ error: 'Sprint not found' });
    }
    const { targetSprintId } = req.body; // Incomplete issues carry over to targetSprintId or backlog (null)
    // Mark sprint complete
    rawDb.prepare("UPDATE sprints SET status = 'completed', end_date = ? WHERE id = ? AND tenant_id = ?").run(new Date().toISOString(), req.params.id, req.tenantId);
    // Carry over incomplete issues
    const carryOverResult = rawDb.prepare(`
    UPDATE issues
    SET sprint_id = ?, updated_at = ?
    WHERE tenant_id = ? AND sprint_id = ? AND status != 'done'
  `).run(targetSprintId || null, new Date().toISOString(), req.tenantId, req.params.id);
    db.logAuditEvent({
        tenantId: req.tenantId,
        actorId: req.user.id,
        actorEmail: req.user.email,
        action: 'sprint:completed',
        resourceType: 'sprint',
        resourceId: req.params.id,
        details: {
            name: sprint.name,
            carriedOverCount: carryOverResult.changes,
            targetSprintId: targetSprintId || 'backlog',
        },
    });
    return res.json({
        message: 'Sprint completed successfully',
        status: 'completed',
        carriedOverIssues: carryOverResult.changes,
    });
});
