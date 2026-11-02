import { z } from 'zod';

export const SignUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(12, 'Password must be at least 12 characters').max(128),
  fullName: z.string().min(2).max(100),
  tenantName: z.string().min(2).max(100).optional(),
});

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  totpCode: z.string().length(6).optional(),
  recoveryCode: z.string().optional(),
});

export const MfaVerifySchema = z.object({
  totpCode: z.string().length(6),
});

export const PasswordResetRequestSchema = z.object({
  email: z.string().email(),
});

export const PasswordResetConfirmSchema = z.object({
  token: z.string().min(10),
  newPassword: z.string().min(12).max(128),
});

export const InviteUserSchema = z.object({
  email: z.string().email(),
  role: z.enum(['Admin', 'Member', 'Guest']),
});

export const CreateProjectSchema = z.object({
  key: z.string().min(2).max(10).toUpperCase(),
  name: z.string().min(2).max(100),
  description: z.string().max(1000).optional().default(''),
});

export const CreateIssueSchema = z.object({
  projectId: z.string().uuid(),
  title: z.string().min(3).max(255),
  description: z.string().max(10000).optional().default(''),
  type: z.enum(['epic', 'story', 'task', 'bug', 'subtask']),
  status: z.enum(['backlog', 'in_progress', 'review', 'done']).default('backlog'),
  priority: z.enum(['urgent', 'high', 'medium', 'low']).default('medium'),
  assigneeId: z.string().uuid().optional(),
  estimatePoints: z.number().int().min(0).max(100).optional(),
  dueDate: z.string().optional(),
  sprintId: z.string().uuid().optional(),
  labels: z.array(z.string()).default([]),
});

export const UpdateIssueSchema = z.object({
  title: z.string().min(3).max(255).optional(),
  description: z.string().max(10000).optional(),
  type: z.enum(['epic', 'story', 'task', 'bug', 'subtask']).optional(),
  status: z.enum(['backlog', 'in_progress', 'review', 'done']).optional(),
  priority: z.enum(['urgent', 'high', 'medium', 'low']).optional(),
  assigneeId: z.string().uuid().nullable().optional(),
  estimatePoints: z.number().int().min(0).max(100).nullable().optional(),
  dueDate: z.string().nullable().optional(),
  sprintId: z.string().uuid().nullable().optional(),
  labels: z.array(z.string()).optional(),
  version: z.number().int().optional(),
});

export const CreateSprintSchema = z.object({
  projectId: z.string().uuid(),
  name: z.string().min(2).max(100),
  goal: z.string().max(500).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const LinkIssueSchema = z.object({
  targetIssueId: z.string().uuid(),
  type: z.enum(['blocks', 'is_blocked_by', 'relates_to', 'duplicates']),
});

export const CreateChannelSchema = z.object({
  name: z.string().min(2).max(50).regex(/^[a-z0-9-_]+$/, 'Channel name must be lowercase alphanumeric with hyphens or underscores'),
  topic: z.string().max(250).optional(),
  isPrivate: z.boolean().default(false),
  projectId: z.string().uuid().optional(),
});

export const MessageAttachmentSchema = z.object({
  id: z.string().optional(),
  type: z.enum(['file', 'code', 'voice', 'image']),
  name: z.string().min(1).max(255),
  url: z.string().optional(),
  size: z.string().optional(),
  codeLang: z.string().optional(),
  codeSnippet: z.string().optional(),
  audioDuration: z.number().optional(),
});

export const SendMessageSchema = z.object({
  content: z.string().min(1).max(5000),
  parentId: z.string().uuid().optional(),
  attachments: z.array(MessageAttachmentSchema).optional(),
});

export const EditMessageSchema = z.object({
  content: z.string().min(1).max(5000),
});

export const CreateMeetingSchema = z.object({
  title: z.string().min(2).max(100),
  channelId: z.string().uuid().optional(),
  passcode: z.string().max(20).optional(),
});

export const UpdateMeetingStateSchema = z.object({
  isMuted: z.boolean().optional(),
  isCameraOff: z.boolean().optional(),
  isHandRaised: z.boolean().optional(),
  isScreenSharing: z.boolean().optional(),
});

export const ConvertMessageToIssueSchema = z.object({
  projectId: z.string().uuid(),
  title: z.string().min(3).max(255),
  description: z.string().max(10000),
  type: z.enum(['epic', 'story', 'task', 'bug', 'subtask']).default('task'),
  priority: z.enum(['urgent', 'high', 'medium', 'low']).default('medium'),
  assigneeId: z.string().uuid().optional(),
  dueDate: z.string().optional(),
});

export const CreateSpaceSchema = z.object({
  name: z.string().min(2).max(100),
  icon: z.string().min(1).max(10).default('📁'),
  description: z.string().max(500).optional(),
  isPrivate: z.boolean().default(false),
});

export const CreateDocumentSchema = z.object({
  spaceId: z.string().uuid(),
  title: z.string().min(1).max(255),
  icon: z.string().max(10).default('📄'),
  isPrivate: z.boolean().default(false),
  linkedProjectId: z.string().uuid().optional(),
  linkedIssueId: z.string().uuid().optional(),
});

export const UpdateDocumentSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  icon: z.string().max(10).optional(),
  status: z.enum(['draft', 'in_review', 'approved', 'archived']).optional(),
  blocks: z.array(
    z.object({
      id: z.string(),
      type: z.enum(['paragraph', 'h1', 'h2', 'h3', 'checklist', 'bullet', 'code', 'callout', 'table']),
      content: z.string(),
      checked: z.boolean().optional(),
      language: z.string().optional(),
    })
  ).optional(),
  isPrivate: z.boolean().optional(),
});
