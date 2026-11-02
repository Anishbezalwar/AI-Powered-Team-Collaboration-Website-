"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateDocumentSchema = exports.CreateDocumentSchema = exports.CreateSpaceSchema = exports.ConvertMessageToIssueSchema = exports.UpdateMeetingStateSchema = exports.CreateMeetingSchema = exports.EditMessageSchema = exports.SendMessageSchema = exports.MessageAttachmentSchema = exports.CreateChannelSchema = exports.LinkIssueSchema = exports.CreateSprintSchema = exports.UpdateIssueSchema = exports.CreateIssueSchema = exports.CreateProjectSchema = exports.InviteUserSchema = exports.PasswordResetConfirmSchema = exports.PasswordResetRequestSchema = exports.MfaVerifySchema = exports.LoginSchema = exports.SignUpSchema = void 0;
const zod_1 = require("zod");
exports.SignUpSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(12, 'Password must be at least 12 characters').max(128),
    fullName: zod_1.z.string().min(2).max(100),
    tenantName: zod_1.z.string().min(2).max(100).optional(),
});
exports.LoginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(1),
    totpCode: zod_1.z.string().length(6).optional(),
    recoveryCode: zod_1.z.string().optional(),
});
exports.MfaVerifySchema = zod_1.z.object({
    totpCode: zod_1.z.string().length(6),
});
exports.PasswordResetRequestSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
});
exports.PasswordResetConfirmSchema = zod_1.z.object({
    token: zod_1.z.string().min(10),
    newPassword: zod_1.z.string().min(12).max(128),
});
exports.InviteUserSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    role: zod_1.z.enum(['Admin', 'Member', 'Guest']),
});
exports.CreateProjectSchema = zod_1.z.object({
    key: zod_1.z.string().min(2).max(10).toUpperCase(),
    name: zod_1.z.string().min(2).max(100),
    description: zod_1.z.string().max(1000).optional().default(''),
});
exports.CreateIssueSchema = zod_1.z.object({
    projectId: zod_1.z.string().uuid(),
    title: zod_1.z.string().min(3).max(255),
    description: zod_1.z.string().max(10000).optional().default(''),
    type: zod_1.z.enum(['epic', 'story', 'task', 'bug', 'subtask']),
    status: zod_1.z.enum(['backlog', 'in_progress', 'review', 'done']).default('backlog'),
    priority: zod_1.z.enum(['urgent', 'high', 'medium', 'low']).default('medium'),
    assigneeId: zod_1.z.string().uuid().optional(),
    estimatePoints: zod_1.z.number().int().min(0).max(100).optional(),
    dueDate: zod_1.z.string().optional(),
    sprintId: zod_1.z.string().uuid().optional(),
    labels: zod_1.z.array(zod_1.z.string()).default([]),
});
exports.UpdateIssueSchema = zod_1.z.object({
    title: zod_1.z.string().min(3).max(255).optional(),
    description: zod_1.z.string().max(10000).optional(),
    type: zod_1.z.enum(['epic', 'story', 'task', 'bug', 'subtask']).optional(),
    status: zod_1.z.enum(['backlog', 'in_progress', 'review', 'done']).optional(),
    priority: zod_1.z.enum(['urgent', 'high', 'medium', 'low']).optional(),
    assigneeId: zod_1.z.string().uuid().nullable().optional(),
    estimatePoints: zod_1.z.number().int().min(0).max(100).nullable().optional(),
    dueDate: zod_1.z.string().nullable().optional(),
    sprintId: zod_1.z.string().uuid().nullable().optional(),
    labels: zod_1.z.array(zod_1.z.string()).optional(),
    version: zod_1.z.number().int().optional(),
});
exports.CreateSprintSchema = zod_1.z.object({
    projectId: zod_1.z.string().uuid(),
    name: zod_1.z.string().min(2).max(100),
    goal: zod_1.z.string().max(500).optional(),
    startDate: zod_1.z.string().optional(),
    endDate: zod_1.z.string().optional(),
});
exports.LinkIssueSchema = zod_1.z.object({
    targetIssueId: zod_1.z.string().uuid(),
    type: zod_1.z.enum(['blocks', 'is_blocked_by', 'relates_to', 'duplicates']),
});
exports.CreateChannelSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).max(50).regex(/^[a-z0-9-_]+$/, 'Channel name must be lowercase alphanumeric with hyphens or underscores'),
    topic: zod_1.z.string().max(250).optional(),
    isPrivate: zod_1.z.boolean().default(false),
    projectId: zod_1.z.string().uuid().optional(),
});
exports.MessageAttachmentSchema = zod_1.z.object({
    id: zod_1.z.string().optional(),
    type: zod_1.z.enum(['file', 'code', 'voice', 'image']),
    name: zod_1.z.string().min(1).max(255),
    url: zod_1.z.string().optional(),
    size: zod_1.z.string().optional(),
    codeLang: zod_1.z.string().optional(),
    codeSnippet: zod_1.z.string().optional(),
    audioDuration: zod_1.z.number().optional(),
});
exports.SendMessageSchema = zod_1.z.object({
    content: zod_1.z.string().min(1).max(5000),
    parentId: zod_1.z.string().uuid().optional(),
    attachments: zod_1.z.array(exports.MessageAttachmentSchema).optional(),
});
exports.EditMessageSchema = zod_1.z.object({
    content: zod_1.z.string().min(1).max(5000),
});
exports.CreateMeetingSchema = zod_1.z.object({
    title: zod_1.z.string().min(2).max(100),
    channelId: zod_1.z.string().uuid().optional(),
    passcode: zod_1.z.string().max(20).optional(),
});
exports.UpdateMeetingStateSchema = zod_1.z.object({
    isMuted: zod_1.z.boolean().optional(),
    isCameraOff: zod_1.z.boolean().optional(),
    isHandRaised: zod_1.z.boolean().optional(),
    isScreenSharing: zod_1.z.boolean().optional(),
});
exports.ConvertMessageToIssueSchema = zod_1.z.object({
    projectId: zod_1.z.string().uuid(),
    title: zod_1.z.string().min(3).max(255),
    description: zod_1.z.string().max(10000),
    type: zod_1.z.enum(['epic', 'story', 'task', 'bug', 'subtask']).default('task'),
    priority: zod_1.z.enum(['urgent', 'high', 'medium', 'low']).default('medium'),
    assigneeId: zod_1.z.string().uuid().optional(),
    dueDate: zod_1.z.string().optional(),
});
exports.CreateSpaceSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).max(100),
    icon: zod_1.z.string().min(1).max(10).default('📁'),
    description: zod_1.z.string().max(500).optional(),
    isPrivate: zod_1.z.boolean().default(false),
});
exports.CreateDocumentSchema = zod_1.z.object({
    spaceId: zod_1.z.string().uuid(),
    title: zod_1.z.string().min(1).max(255),
    icon: zod_1.z.string().max(10).default('📄'),
    isPrivate: zod_1.z.boolean().default(false),
    linkedProjectId: zod_1.z.string().uuid().optional(),
    linkedIssueId: zod_1.z.string().uuid().optional(),
});
exports.UpdateDocumentSchema = zod_1.z.object({
    title: zod_1.z.string().min(1).max(255).optional(),
    icon: zod_1.z.string().max(10).optional(),
    status: zod_1.z.enum(['draft', 'in_review', 'approved', 'archived']).optional(),
    blocks: zod_1.z.array(zod_1.z.object({
        id: zod_1.z.string(),
        type: zod_1.z.enum(['paragraph', 'h1', 'h2', 'h3', 'checklist', 'bullet', 'code', 'callout', 'table']),
        content: zod_1.z.string(),
        checked: zod_1.z.boolean().optional(),
        language: zod_1.z.string().optional(),
    })).optional(),
    isPrivate: zod_1.z.boolean().optional(),
});
