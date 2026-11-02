import { Router, Response } from 'express';
import crypto from 'node:crypto';
import { rawDb, db } from '../db/index.js';
import { AuthenticatedRequest, requireAuth, requirePermission } from '../middleware/auth.js';
import { Permissions, CreateIssueSchema, UpdateIssueSchema, LinkIssueSchema } from '@workspace/shared';

export const issuesRouter = Router();

issuesRouter.use(requireAuth);

/**
 * GET /api/v1/issues
 */
issuesRouter.get('/', requirePermission(Permissions.ISSUE_READ), (req: AuthenticatedRequest, res: Response) => {
  const { projectId, status, priority, sprintId, assigneeId } = req.query;

  let query = `
    SELECT i.*, 
           p.key as project_key, p.name as project_name,
           u_rep.full_name as reporter_name, u_rep.email as reporter_email,
           u_ass.full_name as assignee_name, u_ass.avatar_url as assignee_avatar,
           s.name as sprint_name
    FROM issues i
    JOIN projects p ON p.id = i.project_id
    JOIN users u_rep ON u_rep.id = i.reporter_id
    LEFT JOIN users u_ass ON u_ass.id = i.assignee_id
    LEFT JOIN sprints s ON s.id = i.sprint_id
    WHERE i.tenant_id = ?
  `;

  const params: any[] = [req.tenantId!];

  if (projectId) {
    query += ' AND i.project_id = ?';
    params.push(projectId);
  }
  if (status) {
    query += ' AND i.status = ?';
    params.push(status);
  }
  if (priority) {
    query += ' AND i.priority = ?';
    params.push(priority);
  }
  if (sprintId) {
    query += ' AND i.sprint_id = ?';
    params.push(sprintId);
  }
  if (assigneeId) {
    query += ' AND i.assignee_id = ?';
    params.push(assigneeId);
  }

  query += ' ORDER BY i.created_at DESC';

  const issues = rawDb.prepare(query).all(...params).map((row: any) => ({
    ...row,
    labels: JSON.parse(row.labels || '[]'),
  }));

  return res.json(issues);
});

/**
 * GET /api/v1/issues/:id
 */
issuesRouter.get('/:id', requirePermission(Permissions.ISSUE_READ), (req: AuthenticatedRequest, res: Response) => {
  const issue = rawDb.prepare(`
    SELECT i.*, 
           p.key as project_key, p.name as project_name,
           u_rep.full_name as reporter_name, u_rep.email as reporter_email,
           u_ass.full_name as assignee_name, u_ass.avatar_url as assignee_avatar,
           s.name as sprint_name
    FROM issues i
    JOIN projects p ON p.id = i.project_id
    JOIN users u_rep ON u_rep.id = i.reporter_id
    LEFT JOIN users u_ass ON u_ass.id = i.assignee_id
    LEFT JOIN sprints s ON s.id = i.sprint_id
    WHERE i.id = ? AND i.tenant_id = ?
  `).get(req.params.id, req.tenantId!) as any;

  if (!issue) {
    return res.status(404).json({ error: 'Issue not found' });
  }

  // Get dependency links
  const links = rawDb.prepare(`
    SELECT dl.id, dl.type, dl.created_at,
           target.id as target_issue_id, target.issue_key as target_issue_key, target.title as target_title, target.status as target_status
    FROM dependency_links dl
    JOIN issues target ON target.id = dl.target_issue_id
    WHERE dl.source_issue_id = ? AND dl.tenant_id = ?
  `).all(req.params.id, req.tenantId!);

  // Get comments
  const comments = rawDb.prepare(`
    SELECT c.*, u.full_name as author_name, u.avatar_url as author_avatar
    FROM comments c
    JOIN users u ON u.id = c.author_id
    WHERE c.issue_id = ? AND c.tenant_id = ?
    ORDER BY c.created_at ASC
  `).all(req.params.id, req.tenantId!);

  return res.json({
    ...issue,
    labels: JSON.parse(issue.labels || '[]'),
    links,
    comments,
  });
});

/**
 * POST /api/v1/issues
 */
issuesRouter.post('/', requirePermission(Permissions.ISSUE_CREATE), (req: AuthenticatedRequest, res: Response) => {
  const parse = CreateIssueSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: 'Validation Error', details: parse.error.format() });
  }

  const { projectId, title, description, type, status, priority, assigneeId, estimatePoints, dueDate, sprintId, labels } = parse.data;

  // Verify project belongs to tenant
  const project = rawDb.prepare('SELECT key FROM projects WHERE id = ? AND tenant_id = ?').get(projectId, req.tenantId!) as { key: string } | undefined;
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }

  // Generate next issue key in project
  const countRow = rawDb.prepare('SELECT COUNT(*) as cnt FROM issues WHERE project_id = ?').get(projectId) as { cnt: number };
  const issueNumber = countRow.cnt + 1;
  const issueKey = `${project.key}-${issueNumber}`;

  const issueId = crypto.randomUUID();
  const now = new Date().toISOString();

  rawDb.prepare(`
    INSERT INTO issues (
      id, tenant_id, project_id, issue_key, title, description, type, status,
      priority, assignee_id, reporter_id, estimate_points, due_date, sprint_id, labels, version, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
  `).run(
    issueId,
    req.tenantId!,
    projectId,
    issueKey,
    title,
    description || '',
    type,
    status || 'backlog',
    priority || 'medium',
    assigneeId || null,
    req.user!.id,
    estimatePoints || null,
    dueDate || null,
    sprintId || null,
    JSON.stringify(labels || []),
    now,
    now
  );

  db.logAuditEvent({
    tenantId: req.tenantId!,
    actorId: req.user!.id,
    actorEmail: req.user!.email,
    action: 'issue:created',
    resourceType: 'issue',
    resourceId: issueId,
    details: { issueKey, title, type, priority, status },
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  return res.status(201).json({
    id: issueId,
    tenantId: req.tenantId,
    projectId,
    issueKey,
    title,
    description,
    type,
    status,
    priority,
    assigneeId,
    reporterId: req.user!.id,
    estimatePoints,
    dueDate,
    sprintId,
    labels: labels || [],
    version: 1,
    createdAt: now,
    updatedAt: now,
  });
});

/**
 * PATCH /api/v1/issues/:id
 * Supports optimistic UI with optimistic concurrency checking via `version`.
 */
issuesRouter.patch('/:id', requirePermission(Permissions.ISSUE_UPDATE), (req: AuthenticatedRequest, res: Response) => {
  const parse = UpdateIssueSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: 'Validation Error', details: parse.error.format() });
  }

  const issue = rawDb.prepare('SELECT * FROM issues WHERE id = ? AND tenant_id = ?').get(req.params.id, req.tenantId!) as any;
  if (!issue) {
    return res.status(404).json({ error: 'Issue not found' });
  }

  // Optimistic locking check
  if (parse.data.version !== undefined && parse.data.version !== issue.version) {
    return res.status(409).json({
      error: 'Conflict',
      code: 'OPTIMISTIC_LOCK_CONFLICT',
      message: 'This issue was modified by another session. Please refresh and retry your changes.',
      currentVersion: issue.version,
    });
  }

  const updates = parse.data;
  const newVersion = issue.version + 1;
  const now = new Date().toISOString();

  const title = updates.title !== undefined ? updates.title : issue.title;
  const description = updates.description !== undefined ? updates.description : issue.description;
  const type = updates.type !== undefined ? updates.type : issue.type;
  const status = updates.status !== undefined ? updates.status : issue.status;
  const priority = updates.priority !== undefined ? updates.priority : issue.priority;
  const assigneeId = updates.assigneeId !== undefined ? updates.assigneeId : issue.assignee_id;
  const estimatePoints = updates.estimatePoints !== undefined ? updates.estimatePoints : issue.estimate_points;
  const dueDate = updates.dueDate !== undefined ? updates.dueDate : issue.due_date;
  const sprintId = updates.sprintId !== undefined ? updates.sprintId : issue.sprint_id;
  const labels = updates.labels !== undefined ? JSON.stringify(updates.labels) : issue.labels;

  rawDb.prepare(`
    UPDATE issues
    SET title = ?, description = ?, type = ?, status = ?, priority = ?,
        assignee_id = ?, estimate_points = ?, due_date = ?, sprint_id = ?,
        labels = ?, version = ?, updated_at = ?
    WHERE id = ? AND tenant_id = ?
  `).run(
    title,
    description,
    type,
    status,
    priority,
    assigneeId,
    estimatePoints,
    dueDate,
    sprintId,
    labels,
    newVersion,
    now,
    req.params.id,
    req.tenantId!
  );

  db.logAuditEvent({
    tenantId: req.tenantId!,
    actorId: req.user!.id,
    actorEmail: req.user!.email,
    action: 'issue:updated',
    resourceType: 'issue',
    resourceId: req.params.id,
    details: {
      issueKey: issue.issue_key,
      statusChanged: status !== issue.status ? { from: issue.status, to: status } : undefined,
    },
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  return res.json({
    id: req.params.id,
    issueKey: issue.issue_key,
    title,
    description,
    type,
    status,
    priority,
    assigneeId,
    estimatePoints,
    dueDate,
    sprintId,
    labels: JSON.parse(labels),
    version: newVersion,
    updatedAt: now,
  });
});

/**
 * DELETE /api/v1/issues/:id
 */
issuesRouter.delete('/:id', requirePermission(Permissions.ISSUE_DELETE), (req: AuthenticatedRequest, res: Response) => {
  const issue = rawDb.prepare('SELECT issue_key FROM issues WHERE id = ? AND tenant_id = ?').get(req.params.id, req.tenantId!) as { issue_key: string } | undefined;
  if (!issue) {
    return res.status(404).json({ error: 'Issue not found' });
  }

  rawDb.prepare('DELETE FROM issues WHERE id = ? AND tenant_id = ?').run(req.params.id, req.tenantId!);

  db.logAuditEvent({
    tenantId: req.tenantId!,
    actorId: req.user!.id,
    actorEmail: req.user!.email,
    action: 'issue:deleted',
    resourceType: 'issue',
    resourceId: req.params.id,
    details: { issueKey: issue.issue_key },
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  return res.json({ message: 'Issue deleted successfully' });
});

/**
 * POST /api/v1/issues/:id/links
 * Adds dependency link with cycle detection algorithm!
 */
issuesRouter.post('/:id/links', requirePermission(Permissions.ISSUE_LINK), (req: AuthenticatedRequest, res: Response) => {
  const parse = LinkIssueSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: 'Validation Error', details: parse.error.format() });
  }

  const sourceIssueId = req.params.id;
  const { targetIssueId, type } = parse.data;

  if (sourceIssueId === targetIssueId) {
    return res.status(400).json({ error: 'An issue cannot be linked to itself.' });
  }

  // Verify target issue exists in this tenant
  const target = rawDb.prepare('SELECT id, issue_key FROM issues WHERE id = ? AND tenant_id = ?').get(targetIssueId, req.tenantId!) as any;
  if (!target) {
    return res.status(404).json({ error: 'Target issue not found in this workspace' });
  }

  // CYCLE DETECTION: If type is 'blocks' or 'is_blocked_by', check for circular graph
  if (type === 'blocks') {
    const createsCycle = db.detectDependencyCycle(req.tenantId!, sourceIssueId, targetIssueId);
    if (createsCycle) {
      return res.status(400).json({
        error: 'Circular Dependency Detected',
        code: 'CYCLE_DETECTED',
        message: 'Cannot link issues: adding this dependency creates an impossible circular blocking chain.',
      });
    }
  }

  const linkId = crypto.randomUUID();
  const now = new Date().toISOString();

  try {
    rawDb.prepare(`
      INSERT INTO dependency_links (id, tenant_id, source_issue_id, target_issue_id, type, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(linkId, req.tenantId!, sourceIssueId, targetIssueId, type, now);
  } catch (err: any) {
    if (err.message?.includes('UNIQUE')) {
      return res.status(400).json({ error: 'This dependency link already exists.' });
    }
    throw err;
  }

  db.logAuditEvent({
    tenantId: req.tenantId!,
    actorId: req.user!.id,
    actorEmail: req.user!.email,
    action: 'issue:linked',
    resourceType: 'dependency_link',
    resourceId: linkId,
    details: { sourceIssueId, targetIssueId, type },
  });

  return res.status(201).json({
    id: linkId,
    sourceIssueId,
    targetIssueId,
    type,
    createdAt: now,
  });
});

/**
 * POST /api/v1/issues/:id/comments
 */
issuesRouter.post('/:id/comments', (req: AuthenticatedRequest, res: Response) => {
  const { content } = req.body;
  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'Comment content cannot be empty' });
  }

  const issue = rawDb.prepare('SELECT id FROM issues WHERE id = ? AND tenant_id = ?').get(req.params.id, req.tenantId!);
  if (!issue) {
    return res.status(404).json({ error: 'Issue not found' });
  }

  const commentId = crypto.randomUUID();
  const now = new Date().toISOString();

  rawDb.prepare(`
    INSERT INTO comments (id, tenant_id, issue_id, author_id, content, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(commentId, req.tenantId!, req.params.id, req.user!.id, content.trim(), now);

  return res.status(201).json({
    id: commentId,
    issueId: req.params.id,
    authorId: req.user!.id,
    authorName: req.user!.fullName,
    authorAvatar: req.user!.avatarUrl,
    content: content.trim(),
    createdAt: now,
  });
});
