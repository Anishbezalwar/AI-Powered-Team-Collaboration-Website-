import { z } from 'zod';
export declare const SignUpSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
    fullName: z.ZodString;
    tenantName: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
    fullName: string;
    tenantName?: string | undefined;
}, {
    email: string;
    password: string;
    fullName: string;
    tenantName?: string | undefined;
}>;
export declare const LoginSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
    totpCode: z.ZodOptional<z.ZodString>;
    recoveryCode: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
    totpCode?: string | undefined;
    recoveryCode?: string | undefined;
}, {
    email: string;
    password: string;
    totpCode?: string | undefined;
    recoveryCode?: string | undefined;
}>;
export declare const MfaVerifySchema: z.ZodObject<{
    totpCode: z.ZodString;
}, "strip", z.ZodTypeAny, {
    totpCode: string;
}, {
    totpCode: string;
}>;
export declare const PasswordResetRequestSchema: z.ZodObject<{
    email: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
}, {
    email: string;
}>;
export declare const PasswordResetConfirmSchema: z.ZodObject<{
    token: z.ZodString;
    newPassword: z.ZodString;
}, "strip", z.ZodTypeAny, {
    token: string;
    newPassword: string;
}, {
    token: string;
    newPassword: string;
}>;
export declare const InviteUserSchema: z.ZodObject<{
    email: z.ZodString;
    role: z.ZodEnum<["Admin", "Member", "Guest"]>;
}, "strip", z.ZodTypeAny, {
    email: string;
    role: "Admin" | "Member" | "Guest";
}, {
    email: string;
    role: "Admin" | "Member" | "Guest";
}>;
export declare const CreateProjectSchema: z.ZodObject<{
    key: z.ZodString;
    name: z.ZodString;
    description: z.ZodDefault<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    key: string;
    name: string;
    description: string;
}, {
    key: string;
    name: string;
    description?: string | undefined;
}>;
export declare const CreateIssueSchema: z.ZodObject<{
    projectId: z.ZodString;
    title: z.ZodString;
    description: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    type: z.ZodEnum<["epic", "story", "task", "bug", "subtask"]>;
    status: z.ZodDefault<z.ZodEnum<["backlog", "in_progress", "review", "done"]>>;
    priority: z.ZodDefault<z.ZodEnum<["urgent", "high", "medium", "low"]>>;
    assigneeId: z.ZodOptional<z.ZodString>;
    estimatePoints: z.ZodOptional<z.ZodNumber>;
    dueDate: z.ZodOptional<z.ZodString>;
    sprintId: z.ZodOptional<z.ZodString>;
    labels: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    type: "epic" | "story" | "task" | "bug" | "subtask";
    status: "backlog" | "in_progress" | "review" | "done";
    description: string;
    projectId: string;
    title: string;
    priority: "urgent" | "high" | "medium" | "low";
    labels: string[];
    assigneeId?: string | undefined;
    estimatePoints?: number | undefined;
    dueDate?: string | undefined;
    sprintId?: string | undefined;
}, {
    type: "epic" | "story" | "task" | "bug" | "subtask";
    projectId: string;
    title: string;
    status?: "backlog" | "in_progress" | "review" | "done" | undefined;
    description?: string | undefined;
    priority?: "urgent" | "high" | "medium" | "low" | undefined;
    assigneeId?: string | undefined;
    estimatePoints?: number | undefined;
    dueDate?: string | undefined;
    sprintId?: string | undefined;
    labels?: string[] | undefined;
}>;
export declare const UpdateIssueSchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    type: z.ZodOptional<z.ZodEnum<["epic", "story", "task", "bug", "subtask"]>>;
    status: z.ZodOptional<z.ZodEnum<["backlog", "in_progress", "review", "done"]>>;
    priority: z.ZodOptional<z.ZodEnum<["urgent", "high", "medium", "low"]>>;
    assigneeId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    estimatePoints: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    dueDate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    sprintId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    labels: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    version: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    type?: "epic" | "story" | "task" | "bug" | "subtask" | undefined;
    status?: "backlog" | "in_progress" | "review" | "done" | undefined;
    description?: string | undefined;
    title?: string | undefined;
    priority?: "urgent" | "high" | "medium" | "low" | undefined;
    assigneeId?: string | null | undefined;
    estimatePoints?: number | null | undefined;
    dueDate?: string | null | undefined;
    sprintId?: string | null | undefined;
    labels?: string[] | undefined;
    version?: number | undefined;
}, {
    type?: "epic" | "story" | "task" | "bug" | "subtask" | undefined;
    status?: "backlog" | "in_progress" | "review" | "done" | undefined;
    description?: string | undefined;
    title?: string | undefined;
    priority?: "urgent" | "high" | "medium" | "low" | undefined;
    assigneeId?: string | null | undefined;
    estimatePoints?: number | null | undefined;
    dueDate?: string | null | undefined;
    sprintId?: string | null | undefined;
    labels?: string[] | undefined;
    version?: number | undefined;
}>;
export declare const CreateSprintSchema: z.ZodObject<{
    projectId: z.ZodString;
    name: z.ZodString;
    goal: z.ZodOptional<z.ZodString>;
    startDate: z.ZodOptional<z.ZodString>;
    endDate: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name: string;
    projectId: string;
    goal?: string | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
}, {
    name: string;
    projectId: string;
    goal?: string | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
}>;
export declare const LinkIssueSchema: z.ZodObject<{
    targetIssueId: z.ZodString;
    type: z.ZodEnum<["blocks", "is_blocked_by", "relates_to", "duplicates"]>;
}, "strip", z.ZodTypeAny, {
    type: "blocks" | "is_blocked_by" | "relates_to" | "duplicates";
    targetIssueId: string;
}, {
    type: "blocks" | "is_blocked_by" | "relates_to" | "duplicates";
    targetIssueId: string;
}>;
export declare const CreateChannelSchema: z.ZodObject<{
    name: z.ZodString;
    topic: z.ZodOptional<z.ZodString>;
    isPrivate: z.ZodDefault<z.ZodBoolean>;
    projectId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name: string;
    isPrivate: boolean;
    projectId?: string | undefined;
    topic?: string | undefined;
}, {
    name: string;
    projectId?: string | undefined;
    topic?: string | undefined;
    isPrivate?: boolean | undefined;
}>;
export declare const MessageAttachmentSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    type: z.ZodEnum<["file", "code", "voice", "image"]>;
    name: z.ZodString;
    url: z.ZodOptional<z.ZodString>;
    size: z.ZodOptional<z.ZodString>;
    codeLang: z.ZodOptional<z.ZodString>;
    codeSnippet: z.ZodOptional<z.ZodString>;
    audioDuration: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    type: "file" | "code" | "voice" | "image";
    name: string;
    id?: string | undefined;
    url?: string | undefined;
    size?: string | undefined;
    codeLang?: string | undefined;
    codeSnippet?: string | undefined;
    audioDuration?: number | undefined;
}, {
    type: "file" | "code" | "voice" | "image";
    name: string;
    id?: string | undefined;
    url?: string | undefined;
    size?: string | undefined;
    codeLang?: string | undefined;
    codeSnippet?: string | undefined;
    audioDuration?: number | undefined;
}>;
export declare const SendMessageSchema: z.ZodObject<{
    content: z.ZodString;
    parentId: z.ZodOptional<z.ZodString>;
    attachments: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodOptional<z.ZodString>;
        type: z.ZodEnum<["file", "code", "voice", "image"]>;
        name: z.ZodString;
        url: z.ZodOptional<z.ZodString>;
        size: z.ZodOptional<z.ZodString>;
        codeLang: z.ZodOptional<z.ZodString>;
        codeSnippet: z.ZodOptional<z.ZodString>;
        audioDuration: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        type: "file" | "code" | "voice" | "image";
        name: string;
        id?: string | undefined;
        url?: string | undefined;
        size?: string | undefined;
        codeLang?: string | undefined;
        codeSnippet?: string | undefined;
        audioDuration?: number | undefined;
    }, {
        type: "file" | "code" | "voice" | "image";
        name: string;
        id?: string | undefined;
        url?: string | undefined;
        size?: string | undefined;
        codeLang?: string | undefined;
        codeSnippet?: string | undefined;
        audioDuration?: number | undefined;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    content: string;
    parentId?: string | undefined;
    attachments?: {
        type: "file" | "code" | "voice" | "image";
        name: string;
        id?: string | undefined;
        url?: string | undefined;
        size?: string | undefined;
        codeLang?: string | undefined;
        codeSnippet?: string | undefined;
        audioDuration?: number | undefined;
    }[] | undefined;
}, {
    content: string;
    parentId?: string | undefined;
    attachments?: {
        type: "file" | "code" | "voice" | "image";
        name: string;
        id?: string | undefined;
        url?: string | undefined;
        size?: string | undefined;
        codeLang?: string | undefined;
        codeSnippet?: string | undefined;
        audioDuration?: number | undefined;
    }[] | undefined;
}>;
export declare const EditMessageSchema: z.ZodObject<{
    content: z.ZodString;
}, "strip", z.ZodTypeAny, {
    content: string;
}, {
    content: string;
}>;
export declare const CreateMeetingSchema: z.ZodObject<{
    title: z.ZodString;
    channelId: z.ZodOptional<z.ZodString>;
    passcode: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    title: string;
    channelId?: string | undefined;
    passcode?: string | undefined;
}, {
    title: string;
    channelId?: string | undefined;
    passcode?: string | undefined;
}>;
export declare const UpdateMeetingStateSchema: z.ZodObject<{
    isMuted: z.ZodOptional<z.ZodBoolean>;
    isCameraOff: z.ZodOptional<z.ZodBoolean>;
    isHandRaised: z.ZodOptional<z.ZodBoolean>;
    isScreenSharing: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    isMuted?: boolean | undefined;
    isCameraOff?: boolean | undefined;
    isHandRaised?: boolean | undefined;
    isScreenSharing?: boolean | undefined;
}, {
    isMuted?: boolean | undefined;
    isCameraOff?: boolean | undefined;
    isHandRaised?: boolean | undefined;
    isScreenSharing?: boolean | undefined;
}>;
export declare const ConvertMessageToIssueSchema: z.ZodObject<{
    projectId: z.ZodString;
    title: z.ZodString;
    description: z.ZodString;
    type: z.ZodDefault<z.ZodEnum<["epic", "story", "task", "bug", "subtask"]>>;
    priority: z.ZodDefault<z.ZodEnum<["urgent", "high", "medium", "low"]>>;
    assigneeId: z.ZodOptional<z.ZodString>;
    dueDate: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "epic" | "story" | "task" | "bug" | "subtask";
    description: string;
    projectId: string;
    title: string;
    priority: "urgent" | "high" | "medium" | "low";
    assigneeId?: string | undefined;
    dueDate?: string | undefined;
}, {
    description: string;
    projectId: string;
    title: string;
    type?: "epic" | "story" | "task" | "bug" | "subtask" | undefined;
    priority?: "urgent" | "high" | "medium" | "low" | undefined;
    assigneeId?: string | undefined;
    dueDate?: string | undefined;
}>;
export declare const CreateSpaceSchema: z.ZodObject<{
    name: z.ZodString;
    icon: z.ZodDefault<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    isPrivate: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    name: string;
    isPrivate: boolean;
    icon: string;
    description?: string | undefined;
}, {
    name: string;
    description?: string | undefined;
    isPrivate?: boolean | undefined;
    icon?: string | undefined;
}>;
export declare const CreateDocumentSchema: z.ZodObject<{
    spaceId: z.ZodString;
    title: z.ZodString;
    icon: z.ZodDefault<z.ZodString>;
    isPrivate: z.ZodDefault<z.ZodBoolean>;
    linkedProjectId: z.ZodOptional<z.ZodString>;
    linkedIssueId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    title: string;
    isPrivate: boolean;
    icon: string;
    spaceId: string;
    linkedProjectId?: string | undefined;
    linkedIssueId?: string | undefined;
}, {
    title: string;
    spaceId: string;
    isPrivate?: boolean | undefined;
    icon?: string | undefined;
    linkedProjectId?: string | undefined;
    linkedIssueId?: string | undefined;
}>;
export declare const UpdateDocumentSchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    icon: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<["draft", "in_review", "approved", "archived"]>>;
    blocks: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        type: z.ZodEnum<["paragraph", "h1", "h2", "h3", "checklist", "bullet", "code", "callout", "table"]>;
        content: z.ZodString;
        checked: z.ZodOptional<z.ZodBoolean>;
        language: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        type: "code" | "paragraph" | "h1" | "h2" | "h3" | "checklist" | "bullet" | "callout" | "table";
        id: string;
        content: string;
        checked?: boolean | undefined;
        language?: string | undefined;
    }, {
        type: "code" | "paragraph" | "h1" | "h2" | "h3" | "checklist" | "bullet" | "callout" | "table";
        id: string;
        content: string;
        checked?: boolean | undefined;
        language?: string | undefined;
    }>, "many">>;
    isPrivate: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    blocks?: {
        type: "code" | "paragraph" | "h1" | "h2" | "h3" | "checklist" | "bullet" | "callout" | "table";
        id: string;
        content: string;
        checked?: boolean | undefined;
        language?: string | undefined;
    }[] | undefined;
    status?: "draft" | "in_review" | "approved" | "archived" | undefined;
    title?: string | undefined;
    isPrivate?: boolean | undefined;
    icon?: string | undefined;
}, {
    blocks?: {
        type: "code" | "paragraph" | "h1" | "h2" | "h3" | "checklist" | "bullet" | "callout" | "table";
        id: string;
        content: string;
        checked?: boolean | undefined;
        language?: string | undefined;
    }[] | undefined;
    status?: "draft" | "in_review" | "approved" | "archived" | undefined;
    title?: string | undefined;
    isPrivate?: boolean | undefined;
    icon?: string | undefined;
}>;
//# sourceMappingURL=schemas.d.ts.map