-- Unified Enterprise Workspace SQL Schema
-- Implements multi-tenancy, Row-Level Security foundations, RBAC, Agile, Lark messaging, and Notion knowledge base

PRAGMA foreign_keys = ON;

-- 1. Tenancy & Identity
CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  is_email_verified INTEGER NOT NULL DEFAULT 0,
  mfa_enabled INTEGER NOT NULL DEFAULT 0,
  mfa_secret TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS recovery_codes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS memberships (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK(role IN ('Owner', 'Admin', 'Member', 'Guest')),
  created_at TEXT NOT NULL,
  UNIQUE(tenant_id, user_id)
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  token TEXT UNIQUE NOT NULL,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_label TEXT NOT NULL,
  ip_address TEXT NOT NULL,
  user_agent TEXT NOT NULL,
  created_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS invitations (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('Admin', 'Member', 'Guest')),
  token_hash TEXT UNIQUE NOT NULL,
  invited_by_id TEXT NOT NULL REFERENCES users(id),
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- 2. Projects & Agile Delivery (Jira-class)
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  lead_id TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  UNIQUE(tenant_id, key)
);

CREATE TABLE IF NOT EXISTS sprints (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  goal TEXT,
  status TEXT NOT NULL CHECK(status IN ('planned', 'active', 'completed')),
  start_date TEXT,
  end_date TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS issues (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  issue_key TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL CHECK(type IN ('epic', 'story', 'task', 'bug', 'subtask')),
  status TEXT NOT NULL CHECK(status IN ('backlog', 'in_progress', 'review', 'done')),
  priority TEXT NOT NULL CHECK(priority IN ('urgent', 'high', 'medium', 'low')),
  assignee_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  reporter_id TEXT NOT NULL REFERENCES users(id),
  estimate_points INTEGER,
  due_date TEXT,
  sprint_id TEXT REFERENCES sprints(id) ON DELETE SET NULL,
  labels TEXT NOT NULL DEFAULT '[]',
  version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(tenant_id, issue_key)
);

CREATE TABLE IF NOT EXISTS dependency_links (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  source_issue_id TEXT NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  target_issue_id TEXT NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK(type IN ('blocks', 'is_blocked_by', 'relates_to', 'duplicates')),
  created_at TEXT NOT NULL,
  UNIQUE(source_issue_id, target_issue_id, type)
);

CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  issue_id TEXT NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  author_id TEXT NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- 3. Communication (Lark-class)
CREATE TABLE IF NOT EXISTS channels (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  topic TEXT,
  is_private INTEGER NOT NULL DEFAULT 0,
  is_dm INTEGER NOT NULL DEFAULT 0,
  dm_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_by_id TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  UNIQUE(tenant_id, name)
);

CREATE TABLE IF NOT EXISTS channel_members (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  channel_id TEXT NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  UNIQUE(channel_id, user_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  channel_id TEXT NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  parent_id TEXT REFERENCES messages(id) ON DELETE CASCADE,
  reply_count INTEGER NOT NULL DEFAULT 0,
  reactions TEXT NOT NULL DEFAULT '[]',
  converted_to_issue_id TEXT REFERENCES issues(id) ON DELETE SET NULL,
  is_pinned INTEGER NOT NULL DEFAULT 0,
  attachments TEXT NOT NULL DEFAULT '[]',
  is_edited INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 4. Interactive Video Sessions & Meetings (Zoom/Lark Class)
CREATE TABLE IF NOT EXISTS meetings (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  meeting_code TEXT UNIQUE NOT NULL,
  passcode TEXT,
  host_id TEXT NOT NULL REFERENCES users(id),
  channel_id TEXT REFERENCES channels(id) ON DELETE SET NULL,
  status TEXT NOT NULL CHECK(status IN ('waiting', 'active', 'ended')),
  is_recorded INTEGER NOT NULL DEFAULT 0,
  notes TEXT NOT NULL DEFAULT '',
  started_at TEXT,
  ended_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS meeting_participants (
  id TEXT PRIMARY KEY,
  meeting_id TEXT NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK(role IN ('host', 'co-host', 'participant')),
  joined_at TEXT NOT NULL,
  left_at TEXT,
  is_muted INTEGER NOT NULL DEFAULT 0,
  is_camera_off INTEGER NOT NULL DEFAULT 0,
  is_hand_raised INTEGER NOT NULL DEFAULT 0,
  is_screen_sharing INTEGER NOT NULL DEFAULT 0,
  UNIQUE(meeting_id, user_id)
);

-- 5. Knowledge & Documents (Notion-class)
CREATE TABLE IF NOT EXISTS spaces (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '📁',
  description TEXT,
  is_private INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  space_id TEXT NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  icon TEXT DEFAULT '📄',
  status TEXT NOT NULL CHECK(status IN ('draft', 'in_review', 'approved', 'archived')),
  blocks TEXT NOT NULL DEFAULT '[]',
  version_number INTEGER NOT NULL DEFAULT 1,
  is_private INTEGER NOT NULL DEFAULT 0,
  linked_project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  linked_issue_id TEXT REFERENCES issues(id) ON DELETE SET NULL,
  created_by_id TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS document_versions (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  blocks TEXT NOT NULL,
  author_id TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL
);

-- 5. Governance & Tamper-Evident Audit Logging
CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  actor_id TEXT NOT NULL,
  actor_email TEXT NOT NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  details TEXT NOT NULL DEFAULT '{}',
  ip_address TEXT NOT NULL,
  user_agent TEXT NOT NULL,
  prev_hash TEXT NOT NULL,
  event_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- Indexes for performance & tenant-scoped queries
CREATE INDEX IF NOT EXISTS idx_issues_tenant_project ON issues(tenant_id, project_id);
CREATE INDEX IF NOT EXISTS idx_issues_status ON issues(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_messages_channel ON messages(tenant_id, channel_id, created_at);
CREATE INDEX IF NOT EXISTS idx_docs_space ON documents(tenant_id, space_id);
CREATE INDEX IF NOT EXISTS idx_audit_tenant ON audit_events(tenant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_meetings_tenant ON meetings(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_meeting_participants ON meeting_participants(meeting_id, user_id);
