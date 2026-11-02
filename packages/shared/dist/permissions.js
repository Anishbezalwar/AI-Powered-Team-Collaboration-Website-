"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RolePermissions = exports.Permissions = void 0;
exports.can = can;
exports.Permissions = {
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
};
exports.RolePermissions = {
    Owner: Object.values(exports.Permissions),
    Admin: [
        exports.Permissions.TENANT_SETTINGS,
        exports.Permissions.AUDIT_READ,
        exports.Permissions.SECURITY_MANAGE,
        exports.Permissions.USER_INVITE,
        exports.Permissions.USER_MANAGE,
        exports.Permissions.ROLE_ASSIGN,
        exports.Permissions.PROJECT_READ,
        exports.Permissions.PROJECT_CREATE,
        exports.Permissions.PROJECT_UPDATE,
        exports.Permissions.ISSUE_READ,
        exports.Permissions.ISSUE_CREATE,
        exports.Permissions.ISSUE_UPDATE,
        exports.Permissions.ISSUE_TRANSITION,
        exports.Permissions.ISSUE_LINK,
        exports.Permissions.SPRINT_MANAGE,
        exports.Permissions.WORKFLOW_MANAGE,
        exports.Permissions.CHANNEL_READ,
        exports.Permissions.CHANNEL_CREATE,
        exports.Permissions.CHANNEL_UPDATE,
        exports.Permissions.CHANNEL_JOIN_PRIVATE,
        exports.Permissions.MESSAGE_SEND,
        exports.Permissions.MESSAGE_EDIT,
        exports.Permissions.MESSAGE_DELETE,
        exports.Permissions.MESSAGE_PIN,
        exports.Permissions.MESSAGE_CONVERT,
        exports.Permissions.MEETING_READ,
        exports.Permissions.MEETING_CREATE,
        exports.Permissions.MEETING_JOIN,
        exports.Permissions.MEETING_END,
        exports.Permissions.DOC_READ,
        exports.Permissions.DOC_CREATE,
        exports.Permissions.DOC_UPDATE,
        exports.Permissions.DOC_DELETE,
        exports.Permissions.DOC_RESTORE,
        exports.Permissions.DOC_PUBLISH,
    ],
    Member: [
        exports.Permissions.PROJECT_READ,
        exports.Permissions.ISSUE_READ,
        exports.Permissions.ISSUE_CREATE,
        exports.Permissions.ISSUE_UPDATE,
        exports.Permissions.ISSUE_TRANSITION,
        exports.Permissions.ISSUE_LINK,
        exports.Permissions.CHANNEL_READ,
        exports.Permissions.CHANNEL_CREATE,
        exports.Permissions.MESSAGE_SEND,
        exports.Permissions.MESSAGE_EDIT,
        exports.Permissions.MESSAGE_PIN,
        exports.Permissions.MESSAGE_CONVERT,
        exports.Permissions.MEETING_READ,
        exports.Permissions.MEETING_CREATE,
        exports.Permissions.MEETING_JOIN,
        exports.Permissions.DOC_READ,
        exports.Permissions.DOC_CREATE,
        exports.Permissions.DOC_UPDATE,
    ],
    Guest: [
        exports.Permissions.PROJECT_READ,
        exports.Permissions.ISSUE_READ,
        exports.Permissions.CHANNEL_READ,
        exports.Permissions.MEETING_READ,
        exports.Permissions.MEETING_JOIN,
        exports.Permissions.DOC_READ,
    ],
};
/**
 * Central authorization helper checking whether an actor with a given role has a specific permission.
 */
function can(role, permission) {
    const normalizedRole = role;
    const granted = exports.RolePermissions[normalizedRole];
    if (!granted)
        return false;
    return granted.includes(permission);
}
