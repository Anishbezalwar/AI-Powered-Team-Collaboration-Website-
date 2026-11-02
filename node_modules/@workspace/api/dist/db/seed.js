import { rawDb, db } from './index.js';
import { hashPassword } from '../crypto/auth.js';
export function runSeed() {
    console.log('🌱 Starting database seed for demo organizations...');
    // Clear existing data for fresh reproducible demo
    rawDb.exec(`
    DELETE FROM audit_events;
    DELETE FROM meeting_participants;
    DELETE FROM meetings;
    DELETE FROM document_versions;
    DELETE FROM documents;
    DELETE FROM spaces;
    DELETE FROM messages;
    DELETE FROM channel_members;
    DELETE FROM channels;
    DELETE FROM comments;
    DELETE FROM dependency_links;
    DELETE FROM issues;
    DELETE FROM sprints;
    DELETE FROM projects;
    DELETE FROM invitations;
    DELETE FROM sessions;
    DELETE FROM memberships;
    DELETE FROM recovery_codes;
    DELETE FROM users;
    DELETE FROM tenants;
  `);
    const now = new Date().toISOString();
    const defaultPasswordHash = hashPassword('Password12345!');
    // ==========================================
    // 1. TENANT 1: ACME CORPORATION
    // ==========================================
    const acmeId = '11111111-1111-1111-1111-111111111111';
    rawDb.prepare('INSERT INTO tenants (id, slug, name, created_at) VALUES (?, ?, ?, ?)').run(acmeId, 'acme-corp', 'Acme Corporation', now);
    // Users
    const aliceId = 'u1111111-1111-1111-1111-111111111111';
    const bobId = 'u1111111-1111-1111-1111-111111111112';
    const charlieId = 'u1111111-1111-1111-1111-111111111113';
    const graceId = 'u1111111-1111-1111-1111-111111111114';
    const insertUser = rawDb.prepare(`
    INSERT INTO users (id, email, password_hash, full_name, avatar_url, is_email_verified, mfa_enabled, created_at)
    VALUES (?, ?, ?, ?, ?, 1, 0, ?)
  `);
    insertUser.run(aliceId, 'owner@acme.com', defaultPasswordHash, 'Alice Vance (Owner)', '👩‍💼', now);
    insertUser.run(bobId, 'admin@acme.com', defaultPasswordHash, 'Bob Smith (Admin)', '👨‍💼', now);
    insertUser.run(charlieId, 'dev@acme.com', defaultPasswordHash, 'Charlie Day (Member)', '👨‍💻', now);
    insertUser.run(graceId, 'guest@acme.com', defaultPasswordHash, 'Grace Hopper (Guest)', '👩‍🎓', now);
    // Memberships
    const insertMember = rawDb.prepare('INSERT INTO memberships (id, tenant_id, user_id, role, created_at) VALUES (?, ?, ?, ?, ?)');
    insertMember.run('m1111-1', acmeId, aliceId, 'Owner', now);
    insertMember.run('m1111-2', acmeId, bobId, 'Admin', now);
    insertMember.run('m1111-3', acmeId, charlieId, 'Member', now);
    insertMember.run('m1111-4', acmeId, graceId, 'Guest', now);
    // Project CLOUD
    const cloudProjId = 'p1111111-1111-1111-1111-111111111111';
    rawDb.prepare(`
    INSERT INTO projects (id, tenant_id, key, name, description, lead_id, created_at)
    VALUES (?, ?, 'CLOUD', 'Next-Gen Cloud Platform', 'Multi-tenant enterprise SaaS workspace combining Jira, Lark, and Notion workflows.', ?, ?)
  `).run(cloudProjId, acmeId, aliceId, now);
    // Sprints
    const sprint1Id = 's1111111-1111-1111-1111-111111111111';
    const sprint2Id = 's1111111-1111-1111-1111-111111111112';
    const insertSprint = rawDb.prepare(`
    INSERT INTO sprints (id, tenant_id, project_id, name, goal, status, start_date, end_date, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
    insertSprint.run(sprint1Id, acmeId, cloudProjId, 'Sprint 1 - Foundations & Core Auth', 'Deliver Auth-A, Row-Level Security, and the Agile Board baseline.', 'active', '2026-10-20', '2026-11-03', now);
    insertSprint.run(sprint2Id, acmeId, cloudProjId, 'Sprint 2 - Lark Messaging & Knowledge Base', 'Deliver real-time communication, channels, and Notion-style documents.', 'planned', '2026-11-04', '2026-11-18', now);
    // Issues
    const insertIssue = rawDb.prepare(`
    INSERT INTO issues (
      id, tenant_id, project_id, issue_key, title, description, type, status,
      priority, assignee_id, reporter_id, estimate_points, due_date, sprint_id, labels, version, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
  `);
    const issue1 = 'i1111111-1111-1111-1111-111111111111';
    const issue2 = 'i1111111-1111-1111-1111-111111111112';
    const issue3 = 'i1111111-1111-1111-1111-111111111113';
    const issue4 = 'i1111111-1111-1111-1111-111111111114';
    const issue5 = 'i1111111-1111-1111-1111-111111111115';
    insertIssue.run(issue1, acmeId, cloudProjId, 'CLOUD-1', 'Architect Multi-Tenant Row-Level Security', 'Enforce tenant_id isolation in PostgreSQL using session settings and non-superuser roles.', 'epic', 'done', 'urgent', aliceId, aliceId, 8, '2026-10-22', sprint1Id, JSON.stringify(['security', 'db']), now, now);
    insertIssue.run(issue2, acmeId, cloudProjId, 'CLOUD-2', 'Implement TOTP Multi-Factor Authentication', 'Build RFC 6238 compliant TOTP generator with QR code and 10 single-use hashed recovery codes.', 'story', 'in_progress', 'high', charlieId, bobId, 5, '2026-10-28', sprint1Id, JSON.stringify(['auth', 'mfa']), now, now);
    insertIssue.run(issue3, acmeId, cloudProjId, 'CLOUD-3', 'Build Centralized can() Policy Engine', 'Ensure all mutating and read endpoints evaluate action strings rather than raw role names.', 'task', 'review', 'high', bobId, aliceId, 3, '2026-10-27', sprint1Id, JSON.stringify(['authz']), now, now);
    insertIssue.run(issue4, acmeId, cloudProjId, 'CLOUD-4', 'Design Message-to-Work Conversion Review Modal', 'Allow users to hover messages in Lark channels and convert them directly into Jira-style issues.', 'story', 'in_progress', 'medium', charlieId, aliceId, 5, '2026-10-30', sprint1Id, JSON.stringify(['messaging', 'workflow']), now, now);
    insertIssue.run(issue5, acmeId, cloudProjId, 'CLOUD-5', 'Benchmark WebSocket Delivery Latency under 500ms', 'Verify p95 real-time message delivery is under 500ms across active browser tabs.', 'task', 'backlog', 'low', null, bobId, 2, '2026-11-05', sprint2Id, JSON.stringify(['performance']), now, now);
    // Dependency Link: CLOUD-1 blocks CLOUD-2
    rawDb.prepare(`
    INSERT INTO dependency_links (id, tenant_id, source_issue_id, target_issue_id, type, created_at)
    VALUES (?, ?, ?, ?, 'blocks', ?)
  `).run('dl1111-1', acmeId, issue1, issue2, now);
    // Lark Channels
    // Lark Channels & DMs
    const insertChannel = rawDb.prepare(`
    INSERT INTO channels (id, tenant_id, project_id, name, topic, is_private, is_dm, dm_user_id, created_by_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
    const chanGenId = 'c1111111-1111-1111-1111-111111111111';
    const chanEngId = 'c1111111-1111-1111-1111-111111111112';
    const chanSecId = 'c1111111-1111-1111-1111-111111111113';
    const chanDmAliceCharlie = 'c1111111-1111-1111-1111-111111111114';
    insertChannel.run(chanGenId, acmeId, cloudProjId, 'general', 'Company-wide announcements and team discussions', 0, 0, null, aliceId, now);
    insertChannel.run(chanEngId, acmeId, cloudProjId, 'engineering', 'Platform architecture, sprints, and code reviews', 0, 0, null, bobId, now);
    insertChannel.run(chanSecId, acmeId, cloudProjId, 'launch-war-room', 'Restricted security review channel', 1, 0, null, aliceId, now);
    insertChannel.run(chanDmAliceCharlie, acmeId, null, 'dm-charlie-day', 'Direct conversation with Charlie Day', 1, 1, charlieId, aliceId, now);
    // Channel memberships for private channels
    const insertChanMember = rawDb.prepare('INSERT INTO channel_members (id, tenant_id, channel_id, user_id, created_at) VALUES (?, ?, ?, ?, ?)');
    insertChanMember.run('cm-1', acmeId, chanSecId, aliceId, now);
    insertChanMember.run('cm-2', acmeId, chanSecId, bobId, now);
    insertChanMember.run('cm-3', acmeId, chanSecId, charlieId, now);
    insertChanMember.run('cm-dm-1', acmeId, chanDmAliceCharlie, aliceId, now);
    insertChanMember.run('cm-dm-2', acmeId, chanDmAliceCharlie, charlieId, now);
    // Messages in #engineering
    const insertMsg = rawDb.prepare(`
    INSERT INTO messages (
      id, tenant_id, channel_id, sender_id, content, parent_id, reply_count,
      reactions, converted_to_issue_id, is_pinned, attachments, is_edited, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
    const msg1Id = 'm1111111-1111-1111-1111-111111111111';
    const msg2Id = 'm1111111-1111-1111-1111-111111111112';
    const msg3Id = 'm1111111-1111-1111-1111-111111111113';
    const msg4Id = 'm1111111-1111-1111-1111-111111111114';
    insertMsg.run(msg1Id, acmeId, chanEngId, charlieId, 'Hey team! The NIST SP 800-63B password requirements and breached password check are passing our test suite! 🎉', null, 1, JSON.stringify([{ emoji: '🚀', count: 3, userIds: [aliceId, bobId, charlieId] }, { emoji: '🔥', count: 2, userIds: [aliceId, bobId] }]), null, 1, JSON.stringify([
        { type: 'code', name: 'auth-validator.ts', codeLang: 'typescript', codeSnippet: 'export function validateNistPassword(pw: string) {\n  return pw.length >= 12 && !breachList.has(pw);\n}' }
    ]), 0, now, now);
    insertMsg.run(msg2Id, acmeId, chanEngId, bobId, 'Great work Charlie! Next up is verifying that revoked sessions immediately terminate connected WebSockets.', msg1Id, 0, JSON.stringify([{ emoji: '👍', count: 2, userIds: [aliceId, charlieId] }]), null, 0, '[]', 0, now, now);
    insertMsg.run(msg3Id, acmeId, chanEngId, aliceId, 'Notice: Let us make sure that we convert our thread about the audit log SHA-256 chain verification into an issue.', null, 0, JSON.stringify([]), issue4, 0, '[]', 0, now, now);
    insertMsg.run(msg4Id, acmeId, chanDmAliceCharlie, aliceId, 'Hi Charlie! Can you join the Zoom/Lark interactive session huddle right now for sprint planning?', null, 0, JSON.stringify([]), null, 0, '[]', 0, now, now);
    // Notion Spaces & Documents
    const spaceEngId = 'sp111111-1111-1111-1111-111111111111';
    rawDb.prepare(`
    INSERT INTO spaces (id, tenant_id, name, icon, description, is_private, created_at)
    VALUES (?, ?, 'Engineering Hub', '⚡', 'Core architecture, technical decisions, and security guidelines.', 0, ?)
  `).run(spaceEngId, acmeId, now);
    const doc1Id = 'd1111111-1111-1111-1111-111111111111';
    const docBlocks = JSON.stringify([
        { id: 'b1', type: 'h1', content: 'Unified Enterprise Workspace - System Architecture' },
        { id: 'b2', type: 'callout', content: 'This document defines the high-assurance security model, PostgreSQL Row-Level Security, and tenant isolation policies.' },
        { id: 'b3', type: 'h2', content: 'Core Tenets' },
        { id: 'b4', type: 'checklist', content: 'Enforce tenant isolation at the database level with RLS', checked: true },
        { id: 'b5', type: 'checklist', content: 'Rotate session tokens on login and privilege escalation', checked: true },
        { id: 'b6', type: 'checklist', content: 'Implement RFC 6238 TOTP with hashed recovery codes', checked: true },
        { id: 'b7', type: 'checklist', content: 'Tamper-evident audit logging with SHA-256 hash chaining', checked: true },
        { id: 'b8', type: 'code', content: 'can(actor.role, "issue:create") && belongsToTenant(actor, resource)', language: 'typescript' }
    ]);
    rawDb.prepare(`
    INSERT INTO documents (
      id, tenant_id, space_id, title, icon, status, blocks, version_number,
      is_private, linked_project_id, linked_issue_id, created_by_id, created_at, updated_at
    ) VALUES (?, ?, ?, 'System Architecture & Security Blueprint', '🛡️', 'approved', ?, 2, 0, ?, ?, ?, ?, ?)
  `).run(doc1Id, acmeId, spaceEngId, docBlocks, cloudProjId, issue1, aliceId, now, now);
    // Document Version 1 snapshot
    rawDb.prepare(`
    INSERT INTO document_versions (id, document_id, version_number, title, blocks, author_id, created_at)
    VALUES (?, ?, 1, 'Initial System Architecture Draft', ?, ?, ?)
  `).run('dv1111-1', doc1Id, docBlocks, aliceId, now);
    // Audit Events for Acme
    db.logAuditEvent({
        tenantId: acmeId,
        actorId: aliceId,
        actorEmail: 'owner@acme.com',
        action: 'tenant:created',
        resourceType: 'tenant',
        resourceId: acmeId,
        details: { name: 'Acme Corporation', slug: 'acme-corp' },
    });
    // Seed Interactive Video Meetings for Acme
    const insertMeeting = rawDb.prepare(`
    INSERT INTO meetings (id, tenant_id, title, meeting_code, passcode, host_id, channel_id, status, is_recorded, notes, started_at, ended_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
    const insertMeetingParticipant = rawDb.prepare(`
    INSERT INTO meeting_participants (id, meeting_id, user_id, role, joined_at, is_muted, is_camera_off, is_hand_raised, is_screen_sharing)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
    const mtgAcme1 = 'mtg11111-1111-1111-1111-111111111111';
    const mtgAcme2 = 'mtg11111-1111-1111-1111-111111111112';
    insertMeeting.run(mtgAcme1, acmeId, 'Daily Agile Standup & Incident Swarm', 'mtg-acme-standup', '123456', aliceId, chanEngId, 'active', 1, '# Daily Standup Notes\n- Alice: RLS multi-tenant testing complete.\n- Bob: Session revocation WebSocket hooks in progress.\n- Charlie: NIST password audit tests passing.', now, null, now);
    insertMeetingParticipant.run('mp-1', mtgAcme1, aliceId, 'host', now, 0, 0, 0, 0);
    insertMeetingParticipant.run('mp-2', mtgAcme1, bobId, 'participant', now, 1, 0, 0, 0);
    insertMeetingParticipant.run('mp-3', mtgAcme1, charlieId, 'participant', now, 0, 0, 1, 0);
    insertMeeting.run(mtgAcme2, acmeId, 'Sprint 2 Architecture & Threat Modeling', 'mtg-acme-threat', '654321', bobId, chanSecId, 'waiting', 0, '', null, null, now);
    db.logAuditEvent({
        tenantId: acmeId,
        actorId: aliceId,
        actorEmail: 'owner@acme.com',
        action: 'project:created',
        resourceType: 'project',
        resourceId: cloudProjId,
        details: { key: 'CLOUD', name: 'Next-Gen Cloud Platform' },
    });
    db.logAuditEvent({
        tenantId: acmeId,
        actorId: bobId,
        actorEmail: 'admin@acme.com',
        action: 'auth:login_success',
        resourceType: 'session',
        resourceId: 'initial-session',
        details: { method: 'password', ip: '192.168.1.100' },
    });
    // ==========================================
    // 2. TENANT 2: STARK INDUSTRIES
    // ==========================================
    const starkId = '22222222-2222-2222-2222-222222222222';
    rawDb.prepare('INSERT INTO tenants (id, slug, name, created_at) VALUES (?, ?, ?, ?)').run(starkId, 'stark-industries', 'Stark Industries', now);
    const tonyId = 'u2222222-2222-2222-2222-222222222221';
    const pepperId = 'u2222222-2222-2222-2222-222222222222';
    const peterId = 'u2222222-2222-2222-2222-222222222223';
    insertUser.run(tonyId, 'tony@stark.com', defaultPasswordHash, 'Tony Stark (Owner)', '🦾', now);
    insertUser.run(pepperId, 'pepper@stark.com', defaultPasswordHash, 'Pepper Potts (Admin)', '👩‍💼', now);
    insertUser.run(peterId, 'peter@stark.com', defaultPasswordHash, 'Peter Parker (Member)', '🕷️', now);
    insertMember.run('m2222-1', starkId, tonyId, 'Owner', now);
    insertMember.run('m2222-2', starkId, pepperId, 'Admin', now);
    insertMember.run('m2222-3', starkId, peterId, 'Member', now);
    const markProjId = 'p2222222-2222-2222-2222-222222222222';
    rawDb.prepare(`
    INSERT INTO projects (id, tenant_id, key, name, description, lead_id, created_at)
    VALUES (?, ?, 'MARK', 'Mark LXXXV Propulsion & Nanotech', 'Next-generation tactical flight system and arc stabilization.', ?, ?)
  `).run(markProjId, starkId, tonyId, now);
    const starkSprintId = 's2222222-2222-2222-2222-222222222221';
    insertSprint.run(starkSprintId, starkId, markProjId, 'Phase 1 - Arc Reactor Output Tuning', 'Stabilize plasma containment and nanite flow.', 'active', '2026-10-15', '2026-11-01', now);
    insertIssue.run('i2222-1', starkId, markProjId, 'MARK-1', 'Calibrate Vibranium-Titanium Matrix', 'High-stress kinetic impact testing in orbital simulations.', 'task', 'in_progress', 'urgent', tonyId, tonyId, 13, '2026-10-29', starkSprintId, JSON.stringify(['armor', 'defense']), now, now);
    insertIssue.run('i2222-2', starkId, markProjId, 'MARK-2', 'Synthesize Nanite Repair Flow Rate', 'Ensure instantaneous self-healing on localized armor breach.', 'story', 'backlog', 'high', peterId, tonyId, 8, '2026-11-02', starkSprintId, JSON.stringify(['nanotech']), now, now);
    insertChannel.run('c2222-1', starkId, markProjId, 'arc-reactor', 'Restricted power generation monitoring', 0, 0, null, tonyId, now);
    insertChannel.run('c2222-2', starkId, markProjId, 'avengers-ops', 'Confidential Avengers dispatch thread', 1, 0, null, tonyId, now);
    insertChanMember.run('cm-stark-1', starkId, 'c2222-2', tonyId, now);
    insertChanMember.run('cm-stark-2', starkId, 'c2222-2', pepperId, now);
    const mtgStark1 = 'mtg22222-2222-2222-2222-222222222221';
    insertMeeting.run(mtgStark1, starkId, 'Mark LXXXV Tactical Flight Readiness', 'mtg-stark-flight', '999999', tonyId, 'c2222-1', 'active', 1, '# Tactical Flight Notes\n- Tony: Thruster vectoring stable at Mach 3.\n- Peter: Web-fluid high-altitude viscosity verified.', now, null, now);
    insertMeetingParticipant.run('mp-stark-1', mtgStark1, tonyId, 'host', now, 0, 0, 0, 1);
    insertMeetingParticipant.run('mp-stark-2', mtgStark1, peterId, 'participant', now, 0, 0, 0, 0);
    const spaceStarkId = 'sp222222-2222-2222-2222-222222222222';
    rawDb.prepare(`
    INSERT INTO spaces (id, tenant_id, name, icon, description, is_private, created_at)
    VALUES (?, ?, 'Stark Labs R&D', '🔬', 'Top-secret armor blueprints and AI integration specs.', 0, ?)
  `).run(spaceStarkId, starkId, now);
    rawDb.prepare(`
    INSERT INTO documents (
      id, tenant_id, space_id, title, icon, status, blocks, version_number,
      is_private, linked_project_id, created_by_id, created_at, updated_at
    ) VALUES (?, ?, ?, 'Mark LXXXV Schematic Overview', '🚀', 'approved', ?, 1, 0, ?, ?, ?, ?)
  `).run('d2222-1', starkId, spaceStarkId, JSON.stringify([
        { id: 'b1', type: 'h1', content: 'Mark LXXXV Nanotech Architecture' },
        { id: 'b2', type: 'callout', content: 'Classified: Access restricted to authorized Stark Industries engineers only.' }
    ]), markProjId, tonyId, now, now);
    db.logAuditEvent({
        tenantId: starkId,
        actorId: tonyId,
        actorEmail: 'tony@stark.com',
        action: 'tenant:created',
        resourceType: 'tenant',
        resourceId: starkId,
        details: { name: 'Stark Industries', slug: 'stark-industries' },
    });
    console.log('✅ Seed complete!');
    console.log('🏢 Demo Tenant 1: Acme Corporation (owner@acme.com / Password12345!)');
    console.log('🏢 Demo Tenant 2: Stark Industries (tony@stark.com / Password12345!)');
}
if (process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.endsWith('seed.js')) {
    runSeed();
}
