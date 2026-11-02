import { Router, Response } from 'express';
import crypto from 'node:crypto';
import { rawDb, db } from '../db/index.js';
import { AuthenticatedRequest, requireAuth, requirePermission } from '../middleware/auth.js';
import { Permissions, CreateMeetingSchema, UpdateMeetingStateSchema } from '@workspace/shared';
import { broadcastTenantEvent, broadcastToMeeting } from '../realtime/gateway.js';

export const meetingsRouter = Router();

meetingsRouter.use(requireAuth);

/**
 * GET /api/v1/meetings
 * Lists meetings in tenant (active & waiting first, then recent ended).
 */
meetingsRouter.get('/', requirePermission(Permissions.MEETING_READ), (req: AuthenticatedRequest, res: Response) => {
  const meetings = rawDb.prepare(`
    SELECT m.*,
           u.full_name as host_name, u.avatar_url as host_avatar, u.email as host_email,
           c.name as channel_name,
           (SELECT COUNT(*) FROM meeting_participants mp WHERE mp.meeting_id = m.id AND mp.left_at IS NULL) as participant_count
    FROM meetings m
    JOIN users u ON u.id = m.host_id
    LEFT JOIN channels c ON c.id = m.channel_id
    WHERE m.tenant_id = ?
    ORDER BY 
      CASE m.status 
        WHEN 'active' THEN 1 
        WHEN 'waiting' THEN 2 
        ELSE 3 
      END ASC,
      m.created_at DESC
  `).all(req.tenantId!) as any[];

  return res.json(meetings.map((m) => ({
    id: m.id,
    tenantId: m.tenant_id,
    title: m.title,
    meetingCode: m.meeting_code,
    passcode: m.passcode,
    hostId: m.host_id,
    hostName: m.host_name,
    hostAvatar: m.host_avatar,
    channelId: m.channel_id,
    channelName: m.channel_name,
    status: m.status,
    isRecorded: Boolean(m.is_recorded),
    notes: m.notes || '',
    startedAt: m.started_at,
    endedAt: m.ended_at,
    createdAt: m.created_at,
    participantCount: m.participant_count,
  })));
});

/**
 * POST /api/v1/meetings
 * Create an instant or scheduled meeting.
 */
meetingsRouter.post('/', requirePermission(Permissions.MEETING_CREATE), (req: AuthenticatedRequest, res: Response) => {
  const parse = CreateMeetingSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: 'Validation Error', details: parse.error.format() });
  }

  const { title, channelId, passcode } = parse.data;
  const meetingId = crypto.randomUUID();
  const randomSuffix = crypto.randomBytes(3).toString('hex');
  const meetingCode = `mtg-${title.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 10)}-${randomSuffix}`;
  const now = new Date().toISOString();

  rawDb.prepare(`
    INSERT INTO meetings (
      id, tenant_id, title, meeting_code, passcode, host_id, channel_id,
      status, is_recorded, notes, started_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'active', 0, '', ?, ?)
  `).run(
    meetingId,
    req.tenantId!,
    title,
    meetingCode,
    passcode || null,
    req.user!.id,
    channelId || null,
    now,
    now
  );

  // Automatically add host to meeting_participants
  rawDb.prepare(`
    INSERT INTO meeting_participants (
      id, meeting_id, user_id, role, joined_at, is_muted, is_camera_off, is_hand_raised, is_screen_sharing
    ) VALUES (?, ?, ?, 'host', ?, 0, 0, 0, 0)
  `).run(crypto.randomUUID(), meetingId, req.user!.id, now);

  db.logAuditEvent({
    tenantId: req.tenantId!,
    actorId: req.user!.id,
    actorEmail: req.user!.email,
    action: 'meeting:created',
    resourceType: 'meeting',
    resourceId: meetingId,
    details: { title, meetingCode },
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  const createdMeeting = {
    id: meetingId,
    tenantId: req.tenantId,
    title,
    meetingCode,
    passcode: passcode || null,
    hostId: req.user!.id,
    hostName: req.user!.fullName,
    hostAvatar: req.user!.avatarUrl,
    channelId: channelId || null,
    status: 'active',
    isRecorded: false,
    notes: '',
    startedAt: now,
    createdAt: now,
    participantCount: 1,
  };

  broadcastTenantEvent(req.tenantId!, 'meeting:created', createdMeeting);
  return res.status(201).json(createdMeeting);
});

/**
 * GET /api/v1/meetings/:id
 * Get meeting details & active participants.
 */
meetingsRouter.get('/:id', requirePermission(Permissions.MEETING_READ), (req: AuthenticatedRequest, res: Response) => {
  const meeting = rawDb.prepare(`
    SELECT m.*, u.full_name as host_name, u.avatar_url as host_avatar, c.name as channel_name
    FROM meetings m
    JOIN users u ON u.id = m.host_id
    LEFT JOIN channels c ON c.id = m.channel_id
    WHERE (m.id = ? OR m.meeting_code = ?) AND m.tenant_id = ?
  `).get(req.params.id, req.params.id, req.tenantId!) as any;

  if (!meeting) {
    return res.status(404).json({ error: 'Meeting not found or access denied.' });
  }

  const participants = rawDb.prepare(`
    SELECT mp.*, u.full_name as user_name, u.avatar_url as user_avatar, u.email as user_email
    FROM meeting_participants mp
    JOIN users u ON u.id = mp.user_id
    WHERE mp.meeting_id = ? AND mp.left_at IS NULL
    ORDER BY mp.role = 'host' DESC, mp.joined_at ASC
  `).all(meeting.id) as any[];

  return res.json({
    id: meeting.id,
    tenantId: meeting.tenant_id,
    title: meeting.title,
    meetingCode: meeting.meeting_code,
    passcode: meeting.passcode,
    hostId: meeting.host_id,
    hostName: meeting.host_name,
    hostAvatar: meeting.host_avatar,
    channelId: meeting.channel_id,
    channelName: meeting.channel_name,
    status: meeting.status,
    isRecorded: Boolean(meeting.is_recorded),
    notes: meeting.notes || '',
    startedAt: meeting.started_at,
    endedAt: meeting.ended_at,
    createdAt: meeting.created_at,
    participants: participants.map((p) => ({
      id: p.id,
      meetingId: p.meeting_id,
      userId: p.user_id,
      userName: p.user_name,
      userAvatar: p.user_avatar,
      role: p.role,
      joinedAt: p.joined_at,
      isMuted: Boolean(p.is_muted),
      isCameraOff: Boolean(p.is_camera_off),
      isHandRaised: Boolean(p.is_hand_raised),
      isScreenSharing: Boolean(p.is_screen_sharing),
    })),
  });
});

/**
 * POST /api/v1/meetings/:id/join
 * Join meeting as participant.
 */
meetingsRouter.post('/:id/join', requirePermission(Permissions.MEETING_JOIN), (req: AuthenticatedRequest, res: Response) => {
  const meeting = rawDb.prepare('SELECT * FROM meetings WHERE (id = ? OR meeting_code = ?) AND tenant_id = ?')
    .get(req.params.id, req.params.id, req.tenantId!) as any;

  if (!meeting) {
    return res.status(404).json({ error: 'Meeting not found' });
  }

  if (meeting.status === 'ended') {
    return res.status(400).json({ error: 'This meeting has ended.' });
  }

  const now = new Date().toISOString();
  const existing = rawDb.prepare('SELECT * FROM meeting_participants WHERE meeting_id = ? AND user_id = ?')
    .get(meeting.id, req.user!.id) as any;

  if (existing) {
    rawDb.prepare(`
      UPDATE meeting_participants 
      SET left_at = NULL, joined_at = ?, is_muted = 0, is_camera_off = 0, is_hand_raised = 0, is_screen_sharing = 0
      WHERE id = ?
    `).run(now, existing.id);
  } else {
    rawDb.prepare(`
      INSERT INTO meeting_participants (
        id, meeting_id, user_id, role, joined_at, is_muted, is_camera_off, is_hand_raised, is_screen_sharing
      ) VALUES (?, ?, ?, 'participant', ?, 0, 0, 0, 0)
    `).run(crypto.randomUUID(), meeting.id, req.user!.id, now);
  }

  const participantPayload = {
    meetingId: meeting.id,
    userId: req.user!.id,
    userName: req.user!.fullName,
    userAvatar: req.user!.avatarUrl,
    role: meeting.host_id === req.user!.id ? 'host' : 'participant',
    joinedAt: now,
    isMuted: false,
    isCameraOff: false,
    isHandRaised: false,
    isScreenSharing: false,
  };

  broadcastToMeeting(meeting.id, 'meeting:participant_joined', participantPayload);
  broadcastTenantEvent(req.tenantId!, 'meeting:updated', { meetingId: meeting.id, status: meeting.status });

  return res.json({ message: 'Joined meeting successfully', meetingId: meeting.id, participant: participantPayload });
});

/**
 * POST /api/v1/meetings/:id/leave
 * Leave meeting.
 */
meetingsRouter.post('/:id/leave', (req: AuthenticatedRequest, res: Response) => {
  const meeting = rawDb.prepare('SELECT * FROM meetings WHERE (id = ? OR meeting_code = ?) AND tenant_id = ?')
    .get(req.params.id, req.params.id, req.tenantId!) as any;

  if (!meeting) return res.status(404).json({ error: 'Meeting not found' });

  const now = new Date().toISOString();
  rawDb.prepare('UPDATE meeting_participants SET left_at = ? WHERE meeting_id = ? AND user_id = ?')
    .run(now, meeting.id, req.user!.id);

  broadcastToMeeting(meeting.id, 'meeting:participant_left', {
    meetingId: meeting.id,
    userId: req.user!.id,
    userName: req.user!.fullName,
  });

  return res.json({ message: 'Left meeting' });
});

/**
 * PATCH /api/v1/meetings/:id/state
 * Update participant state (mic, camera, hand raise, screen share).
 */
meetingsRouter.patch('/:id/state', (req: AuthenticatedRequest, res: Response) => {
  const parse = UpdateMeetingStateSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'Invalid state' });

  const meeting = rawDb.prepare('SELECT id FROM meetings WHERE (id = ? OR meeting_code = ?) AND tenant_id = ?')
    .get(req.params.id, req.params.id, req.tenantId!) as any;

  if (!meeting) return res.status(404).json({ error: 'Meeting not found' });

  const participant = rawDb.prepare('SELECT * FROM meeting_participants WHERE meeting_id = ? AND user_id = ?')
    .get(meeting.id, req.user!.id) as any;

  if (!participant) return res.status(404).json({ error: 'Not a participant in this meeting' });

  const isMuted = parse.data.isMuted !== undefined ? (parse.data.isMuted ? 1 : 0) : participant.is_muted;
  const isCameraOff = parse.data.isCameraOff !== undefined ? (parse.data.isCameraOff ? 1 : 0) : participant.is_camera_off;
  const isHandRaised = parse.data.isHandRaised !== undefined ? (parse.data.isHandRaised ? 1 : 0) : participant.is_hand_raised;
  const isScreenSharing = parse.data.isScreenSharing !== undefined ? (parse.data.isScreenSharing ? 1 : 0) : participant.is_screen_sharing;

  rawDb.prepare(`
    UPDATE meeting_participants
    SET is_muted = ?, is_camera_off = ?, is_hand_raised = ?, is_screen_sharing = ?
    WHERE id = ?
  `).run(isMuted, isCameraOff, isHandRaised, isScreenSharing, participant.id);

  const statePayload = {
    meetingId: meeting.id,
    userId: req.user!.id,
    isMuted: Boolean(isMuted),
    isCameraOff: Boolean(isCameraOff),
    isHandRaised: Boolean(isHandRaised),
    isScreenSharing: Boolean(isScreenSharing),
  };

  broadcastToMeeting(meeting.id, 'meeting:participant_state', statePayload);
  return res.json(statePayload);
});

/**
 * POST /api/v1/meetings/:id/end
 * End meeting for all participants (Host or Admin only).
 */
meetingsRouter.post('/:id/end', (req: AuthenticatedRequest, res: Response) => {
  const meeting = rawDb.prepare('SELECT * FROM meetings WHERE (id = ? OR meeting_code = ?) AND tenant_id = ?')
    .get(req.params.id, req.params.id, req.tenantId!) as any;

  if (!meeting) return res.status(404).json({ error: 'Meeting not found' });

  if (meeting.host_id !== req.user!.id && req.role !== 'Owner' && req.role !== 'Admin') {
    return res.status(403).json({ error: 'Only the host or admin can end this meeting for everyone.' });
  }

  const now = new Date().toISOString();
  rawDb.prepare("UPDATE meetings SET status = 'ended', ended_at = ? WHERE id = ?").run(now, meeting.id);
  rawDb.prepare('UPDATE meeting_participants SET left_at = ? WHERE meeting_id = ? AND left_at IS NULL').run(now, meeting.id);

  broadcastToMeeting(meeting.id, 'meeting:ended', { meetingId: meeting.id });
  broadcastTenantEvent(req.tenantId!, 'meeting:updated', { meetingId: meeting.id, status: 'ended' });

  return res.json({ message: 'Meeting ended successfully' });
});

/**
 * POST /api/v1/meetings/:id/save-notes
 * Export meeting notes & action items to Notion Knowledge Base!
 */
meetingsRouter.post('/:id/save-notes', (req: AuthenticatedRequest, res: Response) => {
  const { notes, spaceId } = req.body;
  const meeting = rawDb.prepare('SELECT * FROM meetings WHERE (id = ? OR meeting_code = ?) AND tenant_id = ?')
    .get(req.params.id, req.params.id, req.tenantId!) as any;

  if (!meeting) return res.status(404).json({ error: 'Meeting not found' });

  // Update meeting notes
  rawDb.prepare('UPDATE meetings SET notes = ? WHERE id = ?').run(notes || '', meeting.id);

  // Target space
  const space = spaceId
    ? rawDb.prepare('SELECT id FROM spaces WHERE id = ? AND tenant_id = ?').get(spaceId, req.tenantId!)
    : rawDb.prepare('SELECT id FROM spaces WHERE tenant_id = ? ORDER BY created_at ASC LIMIT 1').get(req.tenantId!);

  if (!space) return res.status(400).json({ error: 'No space available to save meeting notes' });

  const targetSpaceId = (space as any).id;
  const docId = crypto.randomUUID();
  const now = new Date().toISOString();

  const blocks = [
    { id: 'b1', type: 'h1', content: `Meeting Notes: ${meeting.title}` },
    { id: 'b2', type: 'callout', content: `Session held on ${new Date().toLocaleDateString()} with meeting code ${meeting.meeting_code}. Hosted by ${req.user!.fullName}.` },
    { id: 'b3', type: 'h2', content: 'Discussion & Minutes' },
    { id: 'b4', type: 'paragraph', content: notes || 'No written discussion notes captured.' },
    { id: 'b5', type: 'h2', content: 'Action Items' },
    { id: 'b6', type: 'checklist', content: 'Review action items generated during session', checked: false },
  ];

  rawDb.prepare(`
    INSERT INTO documents (
      id, tenant_id, space_id, title, icon, status, blocks, version_number,
      is_private, created_by_id, created_at, updated_at
    ) VALUES (?, ?, ?, ?, '📝', 'draft', ?, 1, 0, ?, ?, ?)
  `).run(
    docId,
    req.tenantId!,
    targetSpaceId,
    `Meeting Summary - ${meeting.title}`,
    JSON.stringify(blocks),
    req.user!.id,
    now,
    now
  );

  return res.json({ message: 'Meeting notes published as a Notion document!', documentId: docId });
});
