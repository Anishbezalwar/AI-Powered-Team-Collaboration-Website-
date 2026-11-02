import { Router } from 'express';
import crypto from 'node:crypto';
import { rawDb, db } from '../db/index.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import { Permissions, CreateChannelSchema, SendMessageSchema, ConvertMessageToIssueSchema } from '@workspace/shared';
import { broadcastToChannel, broadcastTenantEvent } from '../realtime/gateway.js';
export const channelsRouter = Router();
channelsRouter.use(requireAuth);
/**
 * GET /api/v1/channels
 * Returns public channels and only private channels/DMs the user belongs to.
 */
channelsRouter.get('/', requirePermission(Permissions.CHANNEL_READ), (req, res) => {
    const channels = rawDb.prepare(`
    SELECT c.*,
           (SELECT COUNT(*) FROM messages m WHERE m.channel_id = c.id) as message_count,
           (SELECT u.full_name FROM users u WHERE u.id = c.dm_user_id) as dm_user_name
    FROM channels c
    WHERE c.tenant_id = ?
      AND (
        c.is_private = 0 
        OR EXISTS (SELECT 1 FROM channel_members cm WHERE cm.channel_id = c.id AND cm.user_id = ?)
        OR ? IN ('Owner', 'Admin')
      )
    ORDER BY c.is_dm ASC, c.created_at ASC
  `).all(req.tenantId, req.user.id, req.role);
    return res.json(channels.map((c) => ({
        ...c,
        isPrivate: Boolean(c.is_private),
        isDm: Boolean(c.is_dm),
        dmUserId: c.dm_user_id,
        dmUserName: c.dm_user_name,
    })));
});
/**
 * POST /api/v1/channels
 */
channelsRouter.post('/', requirePermission(Permissions.CHANNEL_CREATE), (req, res) => {
    const parse = CreateChannelSchema.safeParse(req.body);
    if (!parse.success) {
        return res.status(400).json({ error: 'Validation Error', details: parse.error.format() });
    }
    const { name, topic, isPrivate, projectId } = parse.data;
    // Check unique name in tenant
    const existing = rawDb.prepare('SELECT id FROM channels WHERE tenant_id = ? AND name = ?').get(req.tenantId, name.toLowerCase());
    if (existing) {
        return res.status(400).json({ error: `Channel '#${name}' already exists in this workspace.` });
    }
    const channelId = crypto.randomUUID();
    const now = new Date().toISOString();
    rawDb.prepare(`
    INSERT INTO channels (id, tenant_id, project_id, name, topic, is_private, is_dm, created_by_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)
  `).run(channelId, req.tenantId, projectId || null, name.toLowerCase(), topic || '', isPrivate ? 1 : 0, req.user.id, now);
    // If private, automatically add creator to channel_members
    if (isPrivate) {
        rawDb.prepare(`
      INSERT INTO channel_members (id, tenant_id, channel_id, user_id, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(crypto.randomUUID(), req.tenantId, channelId, req.user.id, now);
    }
    db.logAuditEvent({
        tenantId: req.tenantId,
        actorId: req.user.id,
        actorEmail: req.user.email,
        action: 'channel:created',
        resourceType: 'channel',
        resourceId: channelId,
        details: { name, isPrivate },
    });
    const createdChannel = {
        id: channelId,
        tenantId: req.tenantId,
        projectId: projectId || null,
        name: name.toLowerCase(),
        topic,
        isPrivate,
        isDm: false,
        createdById: req.user.id,
        createdAt: now,
    };
    broadcastTenantEvent(req.tenantId, 'channel:created', createdChannel);
    return res.status(201).json(createdChannel);
});
/**
 * POST /api/v1/channels/dm
 * Create or retrieve 1-on-1 direct message conversation between two organization users.
 */
channelsRouter.post('/dm', (req, res) => {
    const { targetUserId } = req.body;
    if (!targetUserId) {
        return res.status(400).json({ error: 'targetUserId is required' });
    }
    const targetUser = rawDb.prepare(`
    SELECT u.id, u.full_name, u.avatar_url, u.email
    FROM users u
    JOIN memberships m ON m.user_id = u.id
    WHERE u.id = ? AND m.tenant_id = ?
  `).get(targetUserId, req.tenantId);
    if (!targetUser) {
        return res.status(404).json({ error: 'Target user not found in this organization' });
    }
    // Check if DM channel already exists between these two users
    const existingDm = rawDb.prepare(`
    SELECT c.*
    FROM channels c
    WHERE c.tenant_id = ? AND c.is_dm = 1
      AND EXISTS (SELECT 1 FROM channel_members cm WHERE cm.channel_id = c.id AND cm.user_id = ?)
      AND EXISTS (SELECT 1 FROM channel_members cm WHERE cm.channel_id = c.id AND cm.user_id = ?)
    LIMIT 1
  `).get(req.tenantId, req.user.id, targetUserId);
    if (existingDm) {
        return res.json({
            ...existingDm,
            isPrivate: true,
            isDm: true,
            dmUserId: targetUserId,
            dmUserName: targetUser.full_name,
        });
    }
    // Create new DM channel
    const channelId = crypto.randomUUID();
    const now = new Date().toISOString();
    const dmName = `dm-${req.user.id.slice(0, 5)}-${targetUserId.slice(0, 5)}`;
    rawDb.prepare(`
    INSERT INTO channels (id, tenant_id, name, topic, is_private, is_dm, dm_user_id, created_by_id, created_at)
    VALUES (?, ?, ?, ?, 1, 1, ?, ?, ?)
  `).run(channelId, req.tenantId, dmName, `Direct Message with ${targetUser.full_name}`, targetUserId, req.user.id, now);
    rawDb.prepare('INSERT INTO channel_members (id, tenant_id, channel_id, user_id, created_at) VALUES (?, ?, ?, ?, ?)')
        .run(crypto.randomUUID(), req.tenantId, channelId, req.user.id, now);
    rawDb.prepare('INSERT INTO channel_members (id, tenant_id, channel_id, user_id, created_at) VALUES (?, ?, ?, ?, ?)')
        .run(crypto.randomUUID(), req.tenantId, channelId, targetUserId, now);
    const newChannel = {
        id: channelId,
        tenantId: req.tenantId,
        name: dmName,
        topic: `Direct Message with ${targetUser.full_name}`,
        isPrivate: true,
        isDm: true,
        dmUserId: targetUserId,
        dmUserName: targetUser.full_name,
        createdById: req.user.id,
        createdAt: now,
    };
    broadcastTenantEvent(req.tenantId, 'channel:created', newChannel);
    return res.status(201).json(newChannel);
});
/**
 * GET /api/v1/channels/:id/messages
 */
channelsRouter.get('/:id/messages', (req, res) => {
    const channel = rawDb.prepare('SELECT * FROM channels WHERE id = ? AND tenant_id = ?').get(req.params.id, req.tenantId);
    if (!channel) {
        return res.status(404).json({ error: 'Channel not found' });
    }
    // Private channel access check
    if (channel.is_private) {
        const isMember = rawDb.prepare('SELECT 1 FROM channel_members WHERE channel_id = ? AND user_id = ?').get(channel.id, req.user.id);
        if (!isMember && req.role !== 'Owner' && req.role !== 'Admin') {
            return res.status(403).json({ error: 'Access Denied', message: 'You are not a member of this private channel.' });
        }
    }
    const messages = rawDb.prepare(`
    SELECT m.*,
           u.full_name as sender_name, u.avatar_url as sender_avatar, u.email as sender_email,
           i.issue_key as linked_issue_key, i.title as linked_issue_title
    FROM messages m
    JOIN users u ON u.id = m.sender_id
    LEFT JOIN issues i ON i.id = m.converted_to_issue_id
    WHERE m.channel_id = ? AND m.tenant_id = ? AND m.parent_id IS NULL
    ORDER BY m.created_at ASC
  `).all(req.params.id, req.tenantId);
    return res.json(messages.map((m) => ({
        id: m.id,
        tenantId: m.tenant_id,
        channelId: m.channel_id,
        senderId: m.sender_id,
        senderName: m.sender_name,
        sender_name: m.sender_name,
        senderAvatar: m.sender_avatar,
        sender_avatar: m.sender_avatar,
        senderEmail: m.sender_email,
        content: m.content,
        parentId: m.parent_id,
        replyCount: m.reply_count,
        reply_count: m.reply_count,
        reactions: JSON.parse(m.reactions || '[]'),
        attachments: JSON.parse(m.attachments || '[]'),
        isPinned: Boolean(m.is_pinned),
        isEdited: Boolean(m.is_edited),
        convertedToIssueId: m.converted_to_issue_id,
        linkedIssueKey: m.linked_issue_key,
        createdAt: m.created_at,
        updatedAt: m.updated_at,
    })));
});
/**
 * GET /api/v1/channels/:id/messages/:messageId/replies
 * Get threaded replies for a specific message.
 */
channelsRouter.get('/:id/messages/:messageId/replies', (req, res) => {
    const replies = rawDb.prepare(`
    SELECT m.*,
           u.full_name as sender_name, u.avatar_url as sender_avatar, u.email as sender_email
    FROM messages m
    JOIN users u ON u.id = m.sender_id
    WHERE m.parent_id = ? AND m.tenant_id = ?
    ORDER BY m.created_at ASC
  `).all(req.params.messageId, req.tenantId);
    return res.json(replies.map((m) => ({
        id: m.id,
        tenantId: m.tenant_id,
        channelId: m.channel_id,
        senderId: m.sender_id,
        senderName: m.sender_name,
        sender_name: m.sender_name,
        senderAvatar: m.sender_avatar,
        sender_avatar: m.sender_avatar,
        senderEmail: m.sender_email,
        content: m.content,
        parentId: m.parent_id,
        reactions: JSON.parse(m.reactions || '[]'),
        attachments: JSON.parse(m.attachments || '[]'),
        isPinned: Boolean(m.is_pinned),
        isEdited: Boolean(m.is_edited),
        createdAt: m.created_at,
        updatedAt: m.updated_at,
    })));
});
/**
 * POST /api/v1/channels/:id/messages
 */
channelsRouter.post('/:id/messages', requirePermission(Permissions.MESSAGE_SEND), (req, res) => {
    const parse = SendMessageSchema.safeParse(req.body);
    if (!parse.success) {
        return res.status(400).json({ error: 'Validation Error', details: parse.error.format() });
    }
    const channel = rawDb.prepare('SELECT * FROM channels WHERE id = ? AND tenant_id = ?').get(req.params.id, req.tenantId);
    if (!channel) {
        return res.status(404).json({ error: 'Channel not found' });
    }
    if (channel.is_private) {
        const isMember = rawDb.prepare('SELECT 1 FROM channel_members WHERE channel_id = ? AND user_id = ?').get(channel.id, req.user.id);
        if (!isMember && req.role !== 'Owner' && req.role !== 'Admin') {
            return res.status(403).json({ error: 'Forbidden', message: 'You cannot send messages to this private channel.' });
        }
    }
    const { content, parentId, attachments } = parse.data;
    const messageId = crypto.randomUUID();
    const now = new Date().toISOString();
    const attachmentsJson = JSON.stringify(attachments || []);
    rawDb.prepare(`
    INSERT INTO messages (
      id, tenant_id, channel_id, sender_id, content, parent_id, reply_count,
      reactions, is_pinned, attachments, is_edited, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, 0, '[]', 0, ?, 0, ?, ?)
  `).run(messageId, req.tenantId, req.params.id, req.user.id, content, parentId || null, attachmentsJson, now, now);
    // If this is a threaded reply, increment parent's reply_count
    if (parentId) {
        rawDb.prepare('UPDATE messages SET reply_count = reply_count + 1 WHERE id = ?').run(parentId);
    }
    const messagePayload = {
        id: messageId,
        tenantId: req.tenantId,
        channelId: req.params.id,
        senderId: req.user.id,
        senderName: req.user.fullName,
        senderAvatar: req.user.avatarUrl,
        senderEmail: req.user.email,
        content,
        parentId: parentId || null,
        replyCount: 0,
        reactions: [],
        attachments: attachments || [],
        isPinned: false,
        isEdited: false,
        createdAt: now,
        updatedAt: now,
    };
    broadcastToChannel(req.params.id, 'message:new', messagePayload);
    return res.status(201).json(messagePayload);
});
/**
 * POST /api/v1/channels/messages/:id/pin
 * Toggles pin status on a message.
 */
channelsRouter.post('/messages/:id/pin', requirePermission(Permissions.MESSAGE_PIN), (req, res) => {
    const message = rawDb.prepare('SELECT * FROM messages WHERE id = ? AND tenant_id = ?').get(req.params.id, req.tenantId);
    if (!message)
        return res.status(404).json({ error: 'Message not found' });
    const newPinState = message.is_pinned ? 0 : 1;
    rawDb.prepare('UPDATE messages SET is_pinned = ? WHERE id = ?').run(newPinState, req.params.id);
    broadcastToChannel(message.channel_id, 'message:pinned', {
        messageId: req.params.id,
        isPinned: Boolean(newPinState),
    });
    return res.json({ isPinned: Boolean(newPinState) });
});
/**
 * POST /api/v1/channels/messages/:id/reactions
 * Toggles an emoji reaction on a message.
 */
channelsRouter.post('/messages/:id/reactions', (req, res) => {
    const { emoji } = req.body;
    if (!emoji)
        return res.status(400).json({ error: 'Emoji is required' });
    const message = rawDb.prepare('SELECT * FROM messages WHERE id = ? AND tenant_id = ?').get(req.params.id, req.tenantId);
    if (!message)
        return res.status(404).json({ error: 'Message not found' });
    const reactions = JSON.parse(message.reactions || '[]');
    const existingIndex = reactions.findIndex((r) => r.emoji === emoji);
    if (existingIndex > -1) {
        const rx = reactions[existingIndex];
        const userIndex = rx.userIds.indexOf(req.user.id);
        if (userIndex > -1) {
            rx.userIds.splice(userIndex, 1);
            rx.count -= 1;
            if (rx.count <= 0)
                reactions.splice(existingIndex, 1);
        }
        else {
            rx.userIds.push(req.user.id);
            rx.count += 1;
        }
    }
    else {
        reactions.push({ emoji, count: 1, userIds: [req.user.id] });
    }
    const updatedJson = JSON.stringify(reactions);
    rawDb.prepare('UPDATE messages SET reactions = ? WHERE id = ?').run(updatedJson, req.params.id);
    broadcastToChannel(message.channel_id, 'message:reaction', {
        messageId: req.params.id,
        reactions,
    });
    return res.json({ reactions });
});
/**
 * GET /api/v1/channels/:id/members
 */
channelsRouter.get('/:id/members', (req, res) => {
    const members = rawDb.prepare(`
    SELECT u.id, u.full_name as fullName, u.email, u.avatar_url as avatarUrl, m.role
    FROM channel_members cm
    JOIN users u ON u.id = cm.user_id
    JOIN memberships m ON m.user_id = u.id AND m.tenant_id = cm.tenant_id
    WHERE cm.channel_id = ? AND cm.tenant_id = ?
  `).all(req.params.id, req.tenantId);
    return res.json(members);
});
/**
 * POST /api/v1/channels/messages/:id/convert-to-issue
 * The Lark "Message-to-Work" Conversion Bridge!
 */
channelsRouter.post('/messages/:id/convert-to-issue', requirePermission(Permissions.MESSAGE_CONVERT), (req, res) => {
    const parse = ConvertMessageToIssueSchema.safeParse(req.body);
    if (!parse.success) {
        return res.status(400).json({ error: 'Validation Error', details: parse.error.format() });
    }
    const message = rawDb.prepare(`
    SELECT m.*, u.full_name as sender_name
    FROM messages m
    JOIN users u ON u.id = m.sender_id
    WHERE m.id = ? AND m.tenant_id = ?
  `).get(req.params.id, req.tenantId);
    if (!message) {
        return res.status(404).json({ error: 'Message not found' });
    }
    const { projectId, title, description, type, priority, assigneeId, dueDate } = parse.data;
    // Verify target project
    const project = rawDb.prepare('SELECT key FROM projects WHERE id = ? AND tenant_id = ?').get(projectId, req.tenantId);
    if (!project) {
        return res.status(404).json({ error: 'Target project not found' });
    }
    // Generate next issue key
    const countRow = rawDb.prepare('SELECT COUNT(*) as cnt FROM issues WHERE project_id = ?').get(projectId);
    const issueKey = `${project.key}-${countRow.cnt + 1}`;
    const issueId = crypto.randomUUID();
    const now = new Date().toISOString();
    // Create issue
    rawDb.prepare(`
    INSERT INTO issues (
      id, tenant_id, project_id, issue_key, title, description, type, status,
      priority, assignee_id, reporter_id, due_date, labels, version, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'backlog', ?, ?, ?, ?, '["converted-from-chat"]', 1, ?, ?)
  `).run(issueId, req.tenantId, projectId, issueKey, title, `${description}\n\n---\n*Originating Lark Discussion*: [Message #${req.params.id}] by ${message.sender_name}`, type, priority, assigneeId || null, req.user.id, dueDate || null, now, now);
    // Update source message with reference to created issue
    rawDb.prepare('UPDATE messages SET converted_to_issue_id = ? WHERE id = ?').run(issueId, req.params.id);
    // Post automated bot confirmation in the channel
    const botMessageId = crypto.randomUUID();
    const botContent = `🤖 **Message converted to issue**: [${issueKey}] **${title}** (Priority: ${priority}, Type: ${type})`;
    rawDb.prepare(`
    INSERT INTO messages (
      id, tenant_id, channel_id, sender_id, content, parent_id, reply_count,
      reactions, is_pinned, attachments, is_edited, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, 0, '[]', 0, '[]', 0, ?, ?)
  `).run(botMessageId, req.tenantId, message.channel_id, req.user.id, botContent, message.id, now, now);
    rawDb.prepare('UPDATE messages SET reply_count = reply_count + 1 WHERE id = ?').run(message.id);
    db.logAuditEvent({
        tenantId: req.tenantId,
        actorId: req.user.id,
        actorEmail: req.user.email,
        action: 'message:converted_to_issue',
        resourceType: 'issue',
        resourceId: issueId,
        details: { sourceMessageId: req.params.id, issueKey, title },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
    });
    broadcastToChannel(message.channel_id, 'message:converted', {
        sourceMessageId: req.params.id,
        issueId,
        issueKey,
    });
    return res.status(201).json({
        message: 'Message successfully converted into trackable issue',
        issue: {
            id: issueId,
            issueKey,
            title,
            type,
            priority,
            status: 'backlog',
            projectId,
        },
    });
});
