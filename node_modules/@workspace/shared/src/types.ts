import { SystemRole } from './permissions.js';

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  createdAt: string;
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  isEmailVerified: boolean;
  mfaEnabled: boolean;
  createdAt: string;
}

export interface Membership {
  id: string;
  tenantId: string;
  userId: string;
  role: SystemRole;
  createdAt: string;
}

export interface Session {
  id: string;
  tenantId: string;
  userId: string;
  deviceLabel: string;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
}

export type IssueType = 'epic' | 'story' | 'task' | 'bug' | 'subtask';
export type IssuePriority = 'urgent' | 'high' | 'medium' | 'low';
export type IssueStatus = 'backlog' | 'in_progress' | 'review' | 'done';

export interface Project {
  id: string;
  tenantId: string;
  key: string;
  name: string;
  description: string;
  leadId: string;
  createdAt: string;
}

export interface Issue {
  id: string;
  tenantId: string;
  projectId: string;
  issueKey: string;
  title: string;
  description: string;
  type: IssueType;
  status: IssueStatus;
  priority: IssuePriority;
  assigneeId?: string;
  reporterId: string;
  estimatePoints?: number;
  dueDate?: string;
  sprintId?: string;
  labels: string[];
  version: number;
  createdAt: string;
  updatedAt: string;
}

export type SprintStatus = 'planned' | 'active' | 'completed';

export interface Sprint {
  id: string;
  tenantId: string;
  projectId: string;
  name: string;
  goal?: string;
  status: SprintStatus;
  startDate?: string;
  endDate?: string;
  createdAt: string;
}

export type DependencyLinkType = 'blocks' | 'is_blocked_by' | 'relates_to' | 'duplicates';

export interface DependencyLink {
  id: string;
  tenantId: string;
  sourceIssueId: string;
  targetIssueId: string;
  type: DependencyLinkType;
  createdAt: string;
}

export interface Comment {
  id: string;
  tenantId: string;
  issueId: string;
  authorId: string;
  content: string;
  createdAt: string;
}

export interface Channel {
  id: string;
  tenantId: string;
  projectId?: string;
  name: string;
  topic?: string;
  isPrivate: boolean;
  isDm?: boolean;
  dmUserId?: string;
  dmUserName?: string;
  createdById: string;
  createdAt: string;
}

export interface MessageReaction {
  emoji: string;
  count: number;
  userIds: string[];
}

export interface MessageAttachment {
  id?: string;
  type: 'file' | 'code' | 'voice' | 'image';
  name: string;
  url?: string;
  size?: string;
  codeLang?: string;
  codeSnippet?: string;
  audioDuration?: number;
}

export interface Message {
  id: string;
  tenantId: string;
  channelId: string;
  senderId: string;
  senderName?: string;
  senderAvatar?: string;
  senderEmail?: string;
  content: string;
  parentId?: string;
  replyCount: number;
  reactions: MessageReaction[];
  convertedToIssueId?: string;
  linkedIssueKey?: string;
  isPinned?: boolean;
  isEdited?: boolean;
  attachments?: MessageAttachment[];
  createdAt: string;
  updatedAt: string;
}

export type MeetingStatus = 'waiting' | 'active' | 'ended';
export type MeetingRole = 'host' | 'co-host' | 'participant';

export interface MeetingParticipant {
  id: string;
  meetingId: string;
  userId: string;
  userName?: string;
  userAvatar?: string;
  role: MeetingRole;
  joinedAt: string;
  leftAt?: string;
  isMuted: boolean;
  isCameraOff: boolean;
  isHandRaised: boolean;
  isScreenSharing?: boolean;
}

export interface Meeting {
  id: string;
  tenantId: string;
  title: string;
  meetingCode: string;
  passcode?: string;
  hostId: string;
  hostName?: string;
  hostAvatar?: string;
  channelId?: string;
  channelName?: string;
  status: MeetingStatus;
  isRecorded: boolean;
  notes: string;
  startedAt?: string;
  endedAt?: string;
  createdAt: string;
  participantCount?: number;
  participants?: MeetingParticipant[];
}

export type BlockType =
  | 'paragraph'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'checklist'
  | 'bullet'
  | 'code'
  | 'callout'
  | 'table';

export interface DocumentBlock {
  id: string;
  type: BlockType;
  content: string;
  checked?: boolean;
  language?: string;
}

export type DocumentStatus = 'draft' | 'in_review' | 'approved' | 'archived';

export interface Space {
  id: string;
  tenantId: string;
  name: string;
  icon: string;
  description?: string;
  isPrivate: boolean;
  createdAt: string;
}

export interface Document {
  id: string;
  tenantId: string;
  spaceId: string;
  title: string;
  icon?: string;
  status: DocumentStatus;
  blocks: DocumentBlock[];
  versionNumber: number;
  isPrivate: boolean;
  linkedProjectId?: string;
  linkedIssueId?: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentVersion {
  id: string;
  documentId: string;
  versionNumber: number;
  title: string;
  blocks: DocumentBlock[];
  authorId: string;
  createdAt: string;
}

export interface AuditEvent {
  id: string;
  tenantId: string;
  actorId: string;
  actorEmail: string;
  action: string;
  resourceType: string;
  resourceId: string;
  details: Record<string, unknown>;
  ipAddress: string;
  userAgent: string;
  prevHash: string;
  eventHash: string;
  createdAt: string;
}

export interface ConvertMessageToIssuePayload {
  channelId: string;
  messageId: string;
  projectId: string;
  title: string;
  description: string;
  type: IssueType;
  priority: IssuePriority;
  assigneeId?: string;
  dueDate?: string;
}
