const API_BASE = '/api/v1';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('auth_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include', // sends cookies
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || data.error || `Request failed with status ${response.status}`);
  }

  return data as T;
}

export const api = {
  auth: {
    login: (body: any) => request<any>('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
    signup: (body: any) => request<any>('/auth/signup', { method: 'POST', body: JSON.stringify(body) }),
    logout: () => request<any>('/auth/logout', { method: 'POST' }),
    me: () => request<any>('/auth/me'),
    getSessions: () => request<any[]>('/auth/sessions'),
    revokeSession: (id: string) => request<any>(`/auth/sessions/${id}/revoke`, { method: 'POST' }),
    setupMfa: () => request<any>('/auth/mfa/setup', { method: 'POST' }),
    enableMfa: (totpCode: string) => request<any>('/auth/mfa/enable', { method: 'POST', body: JSON.stringify({ totpCode }) }),
    switchTenant: (tenantId: string) => request<any>('/auth/tenants/switch', { method: 'POST', body: JSON.stringify({ tenantId }) }),
  },
  projects: {
    list: () => request<any[]>('/projects'),
    create: (body: any) => request<any>('/projects', { method: 'POST', body: JSON.stringify(body) }),
    listSprints: (projectId: string) => request<any[]>(`/projects/${projectId}/sprints`),
    createSprint: (projectId: string, body: any) => request<any>(`/projects/${projectId}/sprints`, { method: 'POST', body: JSON.stringify(body) }),
    startSprint: (sprintId: string) => request<any>(`/projects/sprints/${sprintId}/start`, { method: 'POST' }),
    completeSprint: (sprintId: string, targetSprintId?: string) =>
      request<any>(`/projects/sprints/${sprintId}/complete`, { method: 'POST', body: JSON.stringify({ targetSprintId }) }),
  },
  issues: {
    list: (params?: Record<string, string>) => {
      const search = params ? '?' + new URLSearchParams(params).toString() : '';
      return request<any[]>(`/issues${search}`);
    },
    get: (id: string) => request<any>(`/issues/${id}`),
    create: (body: any) => request<any>('/issues', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: string, body: any) => request<any>(`/issues/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    delete: (id: string) => request<any>(`/issues/${id}`, { method: 'DELETE' }),
    link: (id: string, body: any) => request<any>(`/issues/${id}/links`, { method: 'POST', body: JSON.stringify(body) }),
    addComment: (id: string, content: string) => request<any>(`/issues/${id}/comments`, { method: 'POST', body: JSON.stringify({ content }) }),
  },
  channels: {
    list: () => request<any[]>('/channels'),
    create: (body: any) => request<any>('/channels', { method: 'POST', body: JSON.stringify(body) }),
    getMessages: (channelId: string) => request<any[]>(`/channels/${channelId}/messages`),
    sendMessage: (channelId: string, body: any) => request<any>(`/channels/${channelId}/messages`, { method: 'POST', body: JSON.stringify(body) }),
    getReplies: (channelId: string, messageId: string) =>
      request<any[]>(`/channels/${channelId}/messages/${messageId}/replies`),
    togglePin: (messageId: string) =>
      request<any>(`/channels/messages/${messageId}/pin`, { method: 'POST' }),
    createDm: (targetUserId: string) =>
      request<any>('/channels/dm', { method: 'POST', body: JSON.stringify({ targetUserId }) }),
    getMembers: (channelId: string) =>
      request<any[]>(`/channels/${channelId}/members`),
    toggleReaction: (messageId: string, emoji: string) =>
      request<any>(`/channels/messages/${messageId}/reactions`, { method: 'POST', body: JSON.stringify({ emoji }) }),
    convertToIssue: (messageId: string, body: any) =>
      request<any>(`/channels/messages/${messageId}/convert-to-issue`, { method: 'POST', body: JSON.stringify(body) }),
  },
  meetings: {
    list: () => request<any[]>('/meetings'),
    create: (body: any) => request<any>('/meetings', { method: 'POST', body: JSON.stringify(body) }),
    get: (id: string) => request<any>(`/meetings/${id}`),
    join: (id: string) => request<any>(`/meetings/${id}/join`, { method: 'POST' }),
    leave: (id: string) => request<any>(`/meetings/${id}/leave`, { method: 'POST' }),
    updateState: (id: string, body: any) => request<any>(`/meetings/${id}/state`, { method: 'PATCH', body: JSON.stringify(body) }),
    end: (id: string) => request<any>(`/meetings/${id}/end`, { method: 'POST' }),
    saveNotes: (id: string, body: any) => request<any>(`/meetings/${id}/save-notes`, { method: 'POST', body: JSON.stringify(body) }),
  },
  documents: {
    listSpaces: () => request<any[]>('/documents/spaces'),
    createSpace: (body: any) => request<any>('/documents/spaces', { method: 'POST', body: JSON.stringify(body) }),
    list: (spaceId?: string) => request<any[]>(`/documents${spaceId ? `?spaceId=${spaceId}` : ''}`),
    get: (id: string) => request<any>(`/documents/${id}`),
    create: (body: any) => request<any>('/documents', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: string, body: any) => request<any>(`/documents/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    listVersions: (id: string) => request<any[]>(`/documents/${id}/versions`),
    restoreVersion: (id: string, versionNumber: number) =>
      request<any>(`/documents/${id}/versions/${versionNumber}/restore`, { method: 'POST' }),
  },
  admin: {
    listUsers: () => request<any[]>('/admin/users'),
    inviteUser: (body: any) => request<any>('/admin/users/invite', { method: 'POST', body: JSON.stringify(body) }),
    updateRole: (userId: string, role: string) => request<any>(`/admin/users/${userId}/role`, { method: 'PATCH', body: JSON.stringify({ role }) }),
    getAuditEvents: () => request<any[]>('/admin/audit-events'),
    verifyAudit: () => request<any>('/admin/audit-verify'),
    runPenetrationTest: () => request<any>('/admin/penetration-test', { method: 'POST' }),
  },
  search: {
    query: (q: string) => request<{ issues: any[]; messages: any[]; documents: any[] }>(`/search?q=${encodeURIComponent(q)}`),
  },
};
