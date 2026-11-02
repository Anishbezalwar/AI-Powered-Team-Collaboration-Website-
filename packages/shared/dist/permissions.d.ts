export declare const Permissions: {
    readonly TENANT_MANAGE: "tenant:manage";
    readonly TENANT_SETTINGS: "tenant:settings";
    readonly AUDIT_READ: "audit:read";
    readonly SECURITY_MANAGE: "security:manage";
    readonly USER_INVITE: "user:invite";
    readonly USER_MANAGE: "user:manage";
    readonly ROLE_ASSIGN: "role:assign";
    readonly PROJECT_READ: "project:read";
    readonly PROJECT_CREATE: "project:create";
    readonly PROJECT_UPDATE: "project:update";
    readonly PROJECT_DELETE: "project:delete";
    readonly ISSUE_READ: "issue:read";
    readonly ISSUE_CREATE: "issue:create";
    readonly ISSUE_UPDATE: "issue:update";
    readonly ISSUE_DELETE: "issue:delete";
    readonly ISSUE_TRANSITION: "issue:transition";
    readonly ISSUE_LINK: "issue:link";
    readonly SPRINT_MANAGE: "sprint:manage";
    readonly WORKFLOW_MANAGE: "workflow:manage";
    readonly CHANNEL_READ: "channel:read";
    readonly CHANNEL_CREATE: "channel:create";
    readonly CHANNEL_UPDATE: "channel:update";
    readonly CHANNEL_DELETE: "channel:delete";
    readonly CHANNEL_JOIN_PRIVATE: "channel:join_private";
    readonly MESSAGE_SEND: "message:send";
    readonly MESSAGE_EDIT: "message:edit";
    readonly MESSAGE_DELETE: "message:delete";
    readonly MESSAGE_PIN: "message:pin";
    readonly MESSAGE_CONVERT: "message:convert_to_issue";
    readonly MEETING_READ: "meeting:read";
    readonly MEETING_CREATE: "meeting:create";
    readonly MEETING_JOIN: "meeting:join";
    readonly MEETING_END: "meeting:end";
    readonly DOC_READ: "document:read";
    readonly DOC_CREATE: "document:create";
    readonly DOC_UPDATE: "document:update";
    readonly DOC_DELETE: "document:delete";
    readonly DOC_RESTORE: "document:restore";
    readonly DOC_PUBLISH: "document:publish";
};
export type Permission = (typeof Permissions)[keyof typeof Permissions];
export type SystemRole = 'Owner' | 'Admin' | 'Member' | 'Guest';
export declare const RolePermissions: Record<SystemRole, Permission[]>;
/**
 * Central authorization helper checking whether an actor with a given role has a specific permission.
 */
export declare function can(role: string, permission: Permission): boolean;
//# sourceMappingURL=permissions.d.ts.map