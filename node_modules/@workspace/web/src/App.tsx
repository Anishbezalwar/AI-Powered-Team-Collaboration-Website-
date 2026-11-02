import React, { useState, useEffect } from 'react';
import { api } from './api.js';
import { Header } from './components/Header.js';
import { Sidebar, ActiveTab } from './components/Sidebar.js';
import { AgileBoardView } from './components/AgileBoardView.js';
import { ChannelsView } from './components/ChannelsView.js';
import { MeetingsView } from './components/MeetingsView.js';
import { KnowledgeView } from './components/KnowledgeView.js';
import { SecurityAdminView } from './components/SecurityAdminView.js';
import { IssueDetailDrawer } from './components/IssueDetailDrawer.js';
import { CreateIssueModal } from './components/CreateIssueModal.js';
import { CreateChannelModal } from './components/CreateChannelModal.js';
import { FloatingMeetingWidget } from './components/FloatingMeetingWidget.js';
import { CommandPalette } from './components/CommandPalette.js';
import { AnixLogo } from './components/AnixLogo.js';
import {
  Zap,
  ShieldCheck,
  Lock,
  ArrowRight,
  Layers,
  Sparkles,
  CheckCircle2,
  Users,
} from 'lucide-react';

export function App() {
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [currentTenant, setCurrentTenant] = useState<any | null>(null);
  const [currentRole, setCurrentRole] = useState<string>('Owner');
  const [allMemberships, setAllMemberships] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // View state
  const [activeTab, setActiveTab] = useState<ActiveTab>('agile');

  // Domain data
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [sprints, setSprints] = useState<any[]>([]);
  const [issues, setIssues] = useState<any[]>([]);
  const [channels, setChannels] = useState<any[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState<string>('');
  const [spaces, setSpaces] = useState<any[]>([]);
  const [selectedSpaceId, setSelectedSpaceId] = useState<string>('');
  const [meetings, setMeetings] = useState<any[]>([]);
  const [activeMeeting, setActiveMeeting] = useState<any | null>(null);

  // Modals & Drawers
  const [selectedIssue, setSelectedIssue] = useState<any | null>(null);
  const [createIssueOpen, setCreateIssueOpen] = useState(false);
  const [createChannelOpen, setCreateChannelOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginTotp, setLoginTotp] = useState('');
  const [mfaRequired, setMfaRequired] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Initialize and check session
  const initApp = async () => {
    try {
      setLoading(true);
      const data = await api.auth.me();
      setCurrentUser(data.user);
      setCurrentTenant(data.tenant);
      setCurrentRole(data.role);
      setAllMemberships(data.memberships);
      await loadTenantData();
    } catch {
      setCurrentUser(null);
    } finally {
      setLoading(false);
    }
  };

  const loadTenantData = async () => {
    try {
      const [projs, chans, spcs, mtgs] = await Promise.all([
        api.projects.list(),
        api.channels.list(),
        api.documents.listSpaces(),
        api.meetings.list(),
      ]);

      setMeetings(mtgs || []);

      setProjects(projs);
      if (projs.length > 0) {
        const activeProjId = projs[0].id;
        setSelectedProjectId(activeProjId);
        const [projIssues, projSprints] = await Promise.all([
          api.issues.list({ projectId: activeProjId }),
          api.projects.listSprints(activeProjId),
        ]);
        setIssues(projIssues);
        setSprints(projSprints);
      }

      setChannels(chans);
      if (chans.length > 0) {
        setSelectedChannelId(chans[0].id);
      }

      setSpaces(spcs);
      if (spcs.length > 0) {
        setSelectedSpaceId(spcs[0].id);
      }
    } catch (err) {
      console.error('Failed to load tenant data:', err);
    }
  };

  useEffect(() => {
    initApp();
  }, []);

  const refreshIssues = async () => {
    if (!selectedProjectId) return;
    try {
      const [projIssues, projSprints] = await Promise.all([
        api.issues.list({ projectId: selectedProjectId }),
        api.projects.listSprints(selectedProjectId),
      ]);
      setIssues(projIssues);
      setSprints(projSprints);
    } catch (err) {
      console.error('Refresh issues error:', err);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    try {
      const res = await api.auth.login({
        email: loginEmail,
        password: loginPassword,
        totpCode: loginTotp || undefined,
      });

      if (res.requireMfa) {
        setMfaRequired(true);
        return;
      }

      localStorage.setItem('auth_token', res.token);
      await initApp();
    } catch (err: any) {
      setLoginError(err.message);
    }
  };

  // Quick One-Click Demo Persona Login
  const handleDemoLogin = async (email: string) => {
    setLoginError(null);
    try {
      const res = await api.auth.login({
        email,
        password: 'Password12345!',
      });
      localStorage.setItem('auth_token', res.token);
      await initApp();
    } catch (err: any) {
      setLoginError(err.message);
    }
  };

  const handleSwitchTenant = async (tenantId: string) => {
    try {
      await api.auth.switchTenant(tenantId);
      await initApp();
    } catch (err: any) {
      alert(`Switch organization failed: ${err.message}`);
    }
  };

  const handleSwitchRole = (role: string) => {
    setCurrentRole(role);
  };

  const handleLogout = async () => {
    try {
      await api.auth.logout();
    } finally {
      localStorage.removeItem('auth_token');
      setCurrentUser(null);
      setCurrentTenant(null);
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-screen bg-[#070A11] anix-grid-pattern flex flex-col items-center justify-center relative overflow-hidden select-none">
        {/* Ambient Glow Orbs */}
        <div className="anix-ambient-orb w-96 h-96 -top-20 -left-20 bg-cyan-500/20" />
        <div className="anix-ambient-orb w-96 h-96 -bottom-20 -right-20 bg-indigo-500/20" />

        <div className="relative z-10 flex flex-col items-center space-y-6">
          {/* Animated ANIX Master Emblem */}
          <AnixLogo size="lg" showSubtitle={false} showBadge={false} />

          {/* High-tech Loading Progress */}
          <div className="w-64 space-y-2">
            <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden relative">
              <div
                className="h-full bg-gradient-to-r from-cyan-400 via-indigo-500 to-pink-500 rounded-full animate-pulse"
                style={{
                  width: '100%',
                  animation: 'anix-gradient-flow 2s infinite ease-in-out',
                }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-widest text-cyan-300">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                KERNEL v2.4 INITIALIZING
              </span>
              <span className="text-slate-400 font-bold">100%</span>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 font-mono tracking-wider flex items-center gap-2">
            <span>ASVS L2 Security</span>
            <span>•</span>
            <span>Zero-Trust RLS</span>
            <span>•</span>
            <span>WebRTC Signaling</span>
          </div>
        </div>
      </div>
    );
  }

  // Unauthenticated: Sleek Login & Demo Persona Selector
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#070A11] anix-grid-pattern flex flex-col items-center justify-center p-4 selection:bg-cyan-500/30 relative overflow-hidden">
        {/* Ambient Radial Lights */}
        <div className="anix-ambient-orb w-[500px] h-[500px] -top-32 left-1/4 bg-cyan-500/15" />
        <div className="anix-ambient-orb w-[500px] h-[500px] -bottom-32 right-1/4 bg-fuchsia-600/15" />

        <div className="w-full max-w-lg space-y-6 relative z-10">
          {/* Hero Header with ANIX Master Brand */}
          <div className="flex flex-col items-center text-center space-y-3">
            <AnixLogo size="lg" showSubtitle={true} showBadge={true} />

            <p className="text-xs text-slate-300 max-w-md font-medium tracking-wide">
              Autonomous Collaboration Platform combining Jira Agile, Lark Realtime Chat, Zoom Video Huddles & Notion Knowledge Base.
            </p>

            {/* Architecture Capability Tags */}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              <span className="text-[10px] font-mono uppercase px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/10 text-cyan-300 font-semibold flex items-center gap-1.5 shadow-sm">
                <ShieldCheck className="w-3 h-3 text-cyan-400" />
                OWASP ASVS L2
              </span>
              <span className="text-[10px] font-mono uppercase px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/10 text-indigo-300 font-semibold flex items-center gap-1.5 shadow-sm">
                <Lock className="w-3 h-3 text-indigo-400" />
                Row-Level Security
              </span>
              <span className="text-[10px] font-mono uppercase px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/10 text-pink-300 font-semibold flex items-center gap-1.5 shadow-sm">
                <Sparkles className="w-3 h-3 text-pink-400" />
                High-Fidelity WebRTC
              </span>
            </div>
          </div>

          {/* Quick Demo Personas */}
          <div className="glass-panel p-4 rounded-2xl border border-white/10 space-y-3 shadow-xl">
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-300">
              <span className="flex items-center gap-1.5 font-anix">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                Instant Demo Access
              </span>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                READY TO TEST
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                onClick={() => handleDemoLogin('owner@acme.com')}
                className="p-3 rounded-xl bg-white/[0.03] hover:bg-cyan-500/10 border border-white/10 hover:border-cyan-500/40 text-left transition duration-200 group relative overflow-hidden"
              >
                <div className="font-semibold text-white group-hover:text-cyan-300 flex items-center justify-between">
                  <span>Alice Vance</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">Owner</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">Acme Corp • Full Control</div>
              </button>

              <button
                onClick={() => handleDemoLogin('admin@acme.com')}
                className="p-3 rounded-xl bg-white/[0.03] hover:bg-indigo-500/10 border border-white/10 hover:border-indigo-500/40 text-left transition duration-200 group relative overflow-hidden"
              >
                <div className="font-semibold text-white group-hover:text-indigo-300 flex items-center justify-between">
                  <span>Bob Smith</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">Admin</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">Acme Corp • SysAdmin</div>
              </button>

              <button
                onClick={() => handleDemoLogin('dev@acme.com')}
                className="p-3 rounded-xl bg-white/[0.03] hover:bg-emerald-500/10 border border-white/10 hover:border-emerald-500/40 text-left transition duration-200 group relative overflow-hidden"
              >
                <div className="font-semibold text-white group-hover:text-emerald-300 flex items-center justify-between">
                  <span>Charlie Day</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Member</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">Acme Corp • Engineering</div>
              </button>

              <button
                onClick={() => handleDemoLogin('tony@stark.com')}
                className="p-3 rounded-xl bg-white/[0.03] hover:bg-amber-500/10 border border-white/10 hover:border-amber-500/40 text-left transition duration-200 group relative overflow-hidden"
              >
                <div className="font-semibold text-white group-hover:text-amber-300 flex items-center justify-between">
                  <span>Tony Stark</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">Tenant B</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">Stark Ind. • Cross-Isolation</div>
              </button>
            </div>
          </div>

          {/* Standard Login Form with Animated Border Beam */}
          <div className="anix-beam-card p-[1px] shadow-2xl">
            <div className="anix-beam-inner p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-anix">
                  {mfaRequired ? 'Multi-Factor Challenge' : 'Enterprise Credentials'}
                </h2>
                <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                  SHA-256 SESSION
                </span>
              </div>

              {loginError && (
                <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-xs text-rose-300">
                  {loginError}
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-3.5">
                {!mfaRequired ? (
                  <>
                    <div>
                      <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">
                        Corporate Email
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="name@enterprise.com"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        className="w-full bg-white/[0.04] border border-white/10 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none transition shadow-inner"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">
                        Password
                      </label>
                      <input
                        type="password"
                        required
                        placeholder="••••••••••••"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        className="w-full bg-white/[0.04] border border-white/10 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none transition shadow-inner"
                      />
                    </div>
                  </>
                ) : (
                  <div>
                    <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">
                      Enter 6-Digit TOTP Code
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="000000"
                      value={loginTotp}
                      onChange={(e) => setLoginTotp(e.target.value)}
                      className="w-full text-center tracking-widest text-lg font-mono font-bold bg-white/[0.04] border border-white/10 rounded-xl py-2.5 text-white focus:outline-none focus:border-cyan-400 shadow-inner"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 via-indigo-600 to-pink-500 hover:from-cyan-400 hover:via-indigo-500 hover:to-pink-400 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 transition duration-300 flex items-center justify-center gap-2 group"
                >
                  <span className="font-anix tracking-wider">
                    {mfaRequired ? 'AUTHENTICATE MFA' : 'AUTHENTICATE & ENTER ANIX'}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-1" />
                </button>
              </form>
            </div>
          </div>

          <div className="text-center text-[11px] text-slate-500 font-mono flex items-center justify-center gap-2">
            <span>ANIX KERNEL v2.4</span>
            <span>•</span>
            <span>Zero-Trust Enterprise Isolation</span>
          </div>
        </div>
      </div>
    );
  }

  // Authenticated: Main Enterprise OS Workspace Shell
  return (
    <div className="h-screen w-screen flex flex-col bg-[#0B0F17] overflow-hidden select-none">
      {/* Top Header */}
      <Header
        currentTenant={currentTenant}
        currentUser={currentUser}
        currentRole={currentRole}
        allMemberships={allMemberships}
        onSwitchTenant={handleSwitchTenant}
        onSwitchRole={handleSwitchRole}
        onOpenSearch={() => setCommandPaletteOpen(true)}
        onOpenSecurity={() => setActiveTab('security')}
        onOpenMfa={() => setActiveTab('security')}
        onOpenSessions={() => setActiveTab('security')}
        onStartInstantMeeting={() => setActiveTab('meetings')}
        onLogout={handleLogout}
      />

      {/* Main OS Body: Sidebar + Active View */}
      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          projects={projects}
          channels={channels}
          spaces={spaces}
          meetings={meetings}
          selectedProjectId={selectedProjectId}
          selectedChannelId={selectedChannelId}
          selectedSpaceId={selectedSpaceId}
          onSelectProject={(id) => {
            setSelectedProjectId(id);
            refreshIssues();
          }}
          onSelectChannel={setSelectedChannelId}
          onSelectSpace={setSelectedSpaceId}
          onOpenCreateIssue={() => setCreateIssueOpen(true)}
          onOpenCreateChannel={() => setCreateChannelOpen(true)}
          onStartInstantMeeting={() => setActiveTab('meetings')}
        />

        <main className="flex-1 flex flex-col overflow-hidden relative">
          {activeTab === 'agile' && (
            <AgileBoardView
              issues={issues}
              sprints={sprints}
              currentRole={currentRole}
              onRefreshIssues={refreshIssues}
              onSelectIssue={setSelectedIssue}
              onOpenCreateIssue={() => setCreateIssueOpen(true)}
            />
          )}

          {activeTab === 'channels' && (
            <ChannelsView
              channels={channels}
              selectedChannelId={selectedChannelId}
              currentUser={currentUser}
              currentRole={currentRole}
              projects={projects}
              onSelectChannel={setSelectedChannelId}
              onRefreshChannels={loadTenantData}
              onStartHuddle={async (channel) => {
                try {
                  const mtg = await api.meetings.create({
                    title: `#${channel.name} Video Huddle`,
                    channelId: channel.id,
                  });
                  setActiveMeeting(mtg);
                  setActiveTab('meetings');
                } catch (err: any) {
                  alert(`Failed to start huddle: ${err.message}`);
                }
              }}
            />
          )}

          {activeTab === 'meetings' && (
            <MeetingsView
              currentRole={currentRole}
              currentUser={currentUser}
              currentTenant={currentTenant}
              activeMeeting={activeMeeting}
              onJoinMeeting={(mtg) => setActiveMeeting(mtg)}
              onLeaveMeeting={() => setActiveMeeting(null)}
              onOpenKnowledge={() => setActiveTab('knowledge')}
            />
          )}

          {activeTab === 'knowledge' && (
            <KnowledgeView
              spaces={spaces}
              selectedSpaceId={selectedSpaceId}
              currentRole={currentRole}
              onRefreshSpaces={loadTenantData}
            />
          )}

          {activeTab === 'security' && (
            <SecurityAdminView
              currentRole={currentRole}
              currentUser={currentUser}
              currentTenant={currentTenant}
            />
          )}
        </main>
      </div>

      {/* Floating Picture-in-Picture Mini Video Widget when meeting is active in background */}
      {activeMeeting && activeTab !== 'meetings' && (
        <FloatingMeetingWidget
          meeting={activeMeeting}
          currentUser={currentUser}
          onExpand={() => setActiveTab('meetings')}
          onLeave={() => setActiveMeeting(null)}
        />
      )}

      {/* Drawers and Modals */}
      {selectedIssue && (
        <IssueDetailDrawer
          issueId={selectedIssue.id}
          allIssues={issues}
          currentRole={currentRole}
          onClose={() => setSelectedIssue(null)}
          onRefresh={refreshIssues}
        />
      )}

      {createIssueOpen && (
        <CreateIssueModal
          projectId={selectedProjectId}
          onClose={() => setCreateIssueOpen(false)}
          onCreated={refreshIssues}
        />
      )}

      {createChannelOpen && (
        <CreateChannelModal
          projects={projects}
          onClose={() => setCreateChannelOpen(false)}
          onCreated={(newChan) => {
            loadTenantData();
            setSelectedChannelId(newChan.id);
            setActiveTab('channels');
          }}
        />
      )}

      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onSelectIssue={(issue) => {
          setSelectedIssue(issue);
          setActiveTab('agile');
        }}
        onSelectChannel={(channelId) => {
          setSelectedChannelId(channelId);
          setActiveTab('channels');
        }}
        onSelectDoc={(docId) => {
          setActiveTab('knowledge');
        }}
        onSwitchTenant={handleSwitchTenant}
        onOpenCreateIssue={() => setCreateIssueOpen(true)}
        onOpenSecurity={() => setActiveTab('security')}
      />
    </div>
  );
}
