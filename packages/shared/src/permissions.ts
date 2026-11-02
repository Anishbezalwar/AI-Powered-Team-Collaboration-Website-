export const Permissions = {
  // Tenancy & Administration
  TENANT_MANAGE: 'tenant:manage',
  TENANT_SETTINGS: 'tenant:settings',
  AUDIT_READ: 'audit:read',
  SECURITY_MANAGE: 'security:manage',

  // Users & Roles
  USER_INVITE: 'user:invite',
  USER_MANAGE: 'user:manage',
  ROLE_ASSIGN: 'role:assign',

  // Projects & Agile Delivery
  PROJECT_READ: 'project:read',
  PROJECT_CREATE: 'project:create',
  PROJECT_UPDATE: 'project:update',
  PROJECT_DELETE: 'project:delete',

  // Issues & Workflows
  ISSUE_READ: 'issue:read',
  ISSUE_CREATE: 'issue:create',
  ISSUE_UPDATE: 'issue:update',
  ISSUE_DELETE: 'issue:delete',
  ISSUE_TRANSITION: 'issue:transition',
  ISSUE_LINK: 'issue:link',
  SPRINT_MANAGE: 'sprint:manage',
  WORKFLOW_MANAGE: 'workflow:manage',

  // Communication (Lark-Class)
  CHANNEL_READ: 'channel:read',
  CHANNEL_CREATE: 'channel:create',
  CHANNEL_UPDATE: 'channel:update',
  CHANNEL_DELETE: 'channel:delete',
  CHANNEL_JOIN_PRIVATE: 'channel:join_private',
  MESSAGE_SEND: 'message:send',
  MESSAGE_EDIT: 'message:edit',
  MESSAGE_DELETE: 'message:delete',
  MESSAGE_PIN: 'message:pin',
  MESSAGE_CONVERT: 'message:convert_to_issue',

  // Video Meetings & Interaction Sessions (Zoom/Lark Class)
  MEETING_READ: 'meeting:read',
  MEETING_CREATE: 'meeting:create',
  MEETING_JOIN: 'meeting:join',
  MEETING_END: 'meeting:end',

  // Knowledge & Documents (Notion-Class)
  DOC_READ: 'document:read',
  DOC_CREATE: 'document:create',
  DOC_UPDATE: 'document:update',
  DOC_DELETE: 'document:delete',
  DOC_RESTORE: 'document:restore',
  DOC_PUBLISH: 'document:publish',
} as const;

export type Permission = (typeof Permissions)[keyof typeof Permissions];

export type SystemRole = 'Owner' | 'Admin' | 'Member' | 'Guest';

export const RolePermissions: Record<SystemRole, Permission[]> = {
  Owner: Object.values(Permissions),

  Admin: [
    Permissions.TENANT_SETTINGS,
    Permissions.AUDIT_READ,
    Permissions.SECURITY_MANAGE,
    Permissions.USER_INVITE,
    Permissions.USER_MANAGE,
    Permissions.ROLE_ASSIGN,
    Permissions.PROJECT_READ,
    Permissions.PROJECT_CREATE,
    Permissions.PROJECT_UPDATE,
    Permissions.ISSUE_READ,
    Permissions.ISSUE_CREATE,
    Permissions.ISSUE_UPDATE,
    Permissions.ISSUE_TRANSITION,
    Permissions.ISSUE_LINK,
    Permissions.SPRINT_MANAGE,
    Permissions.WORKFLOW_MANAGE,
    Permissions.CHANNEL_READ,
    Permissions.CHANNEL_CREATE,
    Permissions.CHANNEL_UPDATE,
    Permissions.CHANNEL_JOIN_PRIVATE,
    Permissions.MESSAGE_SEND,
    Permissions.MESSAGE_EDIT,
    Permissions.MESSAGE_DELETE,
    Permissions.MESSAGE_PIN,
    Permissions.MESSAGE_CONVERT,
    Permissions.MEETING_READ,
    Permissions.MEETING_CREATE,
    Permissions.MEETING_JOIN,
    Permissions.MEETING_END,
    Permissions.DOC_READ,
    Permissions.DOC_CREATE,
    Permissions.DOC_UPDATE,
    Permissions.DOC_DELETE,
    Permissions.DOC_RESTORE,
    Permissions.DOC_PUBLISH,
  ],

  Member: [
    Permissions.PROJECT_READ,
    Permissions.ISSUE_READ,
    Permissions.ISSUE_CREATE,
    Permissions.ISSUE_UPDATE,
    Permissions.ISSUE_TRANSITION,
    Permissions.ISSUE_LINK,
    Permissions.CHANNEL_READ,
    Permissions.CHANNEL_CREATE,
    Permissions.MESSAGE_SEND,
    Permissions.MESSAGE_EDIT,
    Permissions.MESSAGE_PIN,
    Permissions.MESSAGE_CONVERT,
    Permissions.MEETING_READ,
    Permissions.MEETING_CREATE,
    Permissions.MEETING_JOIN,
    Permissions.DOC_READ,
    Permissions.DOC_CREATE,
    Permissions.DOC_UPDATE,
  ],

  Guest: [
    Permissions.PROJECT_READ,
    Permissions.ISSUE_READ,
    Permissions.CHANNEL_READ,
    Permissions.MEETING_READ,
    Permissions.MEETING_JOIN,
    Permissions.DOC_READ,
  ],
};

/**
 * Central authorization helper checking whether an actor with a given role has a specific permission.
 */
export function can(role: string, permission: Permission): boolean {
  const normalizedRole = role as SystemRole;
  const granted = RolePermissions[normalizedRole];
  if (!granted) return false;
  return granted.includes(permission);
}
