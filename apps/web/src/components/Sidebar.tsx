import React from 'react';
import {
  Kanban,
  MessageSquare,
  BookOpen,
  ShieldAlert,
  FolderKanban,
  FileText,
  Hash,
  Lock,
  Plus,
  Video,
  Radio,
  User,
  Sparkles,
} from 'lucide-react';

export type ActiveTab = 'agile' | 'channels' | 'meetings' | 'knowledge' | 'security';

interface SidebarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  projects: any[];
  channels: any[];
  spaces: any[];
  meetings?: any[];
  selectedProjectId?: string;
  selectedChannelId?: string;
  selectedSpaceId?: string;
  onSelectProject: (id: string) => void;
  onSelectChannel: (id: string) => void;
  onSelectSpace: (id: string) => void;
  onOpenCreateIssue: () => void;
  onOpenCreateChannel: () => void;
  onStartInstantMeeting?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  projects,
  channels,
  spaces,
  meetings = [],
  selectedProjectId,
  selectedChannelId,
  selectedSpaceId,
  onSelectProject,
  onSelectChannel,
  onSelectSpace,
  onOpenCreateIssue,
  onOpenCreateChannel,
  onStartInstantMeeting,
}) => {
  const regularChannels = channels.filter((c) => !c.isDm && !c.is_dm);
  const directMessages = channels.filter((c) => c.isDm || c.is_dm);

  return (
    <aside className="w-64 border-r border-white/10 bg-[#0B0F17]/95 flex flex-col justify-between select-none">
      <div className="p-3 space-y-6 overflow-y-auto">
        {/* Main Operating System Navigation */}
        <div className="space-y-1">
          <button
            onClick={() => onSelectTab('agile')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition ${
              activeTab === 'agile'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-300 hover:bg-white/[0.05]'
            }`}
          >
            <Kanban className="w-4 h-4" />
            <span>Agile Delivery (Jira)</span>
          </button>

          <button
            onClick={() => onSelectTab('channels')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition ${
              activeTab === 'channels'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-300 hover:bg-white/[0.05]'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <div className="flex-1 flex items-center justify-between">
              <span>Team Channels (Lark)</span>
              {channels.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/10 text-slate-300">
                  {channels.length}
                </span>
              )}
            </div>
          </button>

          <button
            onClick={() => onSelectTab('meetings')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition ${
              activeTab === 'meetings'
                ? 'bg-gradient-to-r from-emerald-600 to-indigo-600 text-white shadow-lg shadow-emerald-600/30'
                : 'text-slate-300 hover:bg-white/[0.05]'
            }`}
          >
            <Video className="w-4 h-4 text-emerald-400" />
            <div className="flex-1 flex items-center justify-between">
              <span>Meetings & Huddles</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
          </button>

          <button
            onClick={() => onSelectTab('knowledge')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition ${
              activeTab === 'knowledge'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-300 hover:bg-white/[0.05]'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Knowledge Base (Notion)</span>
          </button>

          <button
            onClick={() => onSelectTab('security')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition ${
              activeTab === 'security'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-300 hover:bg-white/[0.05]'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Security & Audit Center</span>
          </button>
        </div>

        {/* Sub-tree based on active tab */}
        {activeTab === 'agile' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between px-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              <span>Projects</span>
              <button
                onClick={onOpenCreateIssue}
                className="p-1 rounded hover:bg-white/10 text-slate-300 hover:text-white transition"
                title="Create Issue"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="space-y-0.5">
              {projects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => onSelectProject(p.id)}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs text-left transition ${
                    selectedProjectId === p.id
                      ? 'bg-white/[0.08] text-indigo-300 font-medium'
                      : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-200'
                  }`}
                >
                  <FolderKanban className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span className="truncate">{p.name} ({p.key})</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'channels' && (
          <div className="space-y-4">
            {/* Team Channels */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between px-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                <span>Channels</span>
                <button
                  onClick={onOpenCreateChannel}
                  className="p-1 rounded hover:bg-white/10 text-slate-300 hover:text-white transition"
                  title="New Channel"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="space-y-0.5">
                {regularChannels.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => onSelectChannel(c.id)}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs text-left transition ${
                      selectedChannelId === c.id
                        ? 'bg-white/[0.08] text-indigo-300 font-medium'
                        : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-200'
                    }`}
                  >
                    {c.is_private || c.isPrivate ? (
                      <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    ) : (
                      <Hash className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    )}
                    <span className="truncate">{c.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Direct Messages */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between px-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                <span>Direct Messages</span>
              </div>
              <div className="space-y-0.5">
                {directMessages.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => onSelectChannel(c.id)}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs text-left transition ${
                      selectedChannelId === c.id
                        ? 'bg-white/[0.08] text-indigo-300 font-medium'
                        : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-200'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                    <span className="truncate">{c.dmUserName || c.name.replace('dm-', '')}</span>
                  </button>
                ))}
                {directMessages.length === 0 && (
                  <div className="px-2 py-1 text-[11px] text-slate-500 italic">
                    Click 'Start DM' in chat to message a colleague.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'meetings' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              <span>Huddle Rooms</span>
              <span className="text-emerald-400 font-bold text-[10px]">HD 1080p</span>
            </div>

            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/10 space-y-2 text-xs">
              <div className="text-slate-300 font-semibold flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                <span>Live Collaboration</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Screen share, audio visualizers, hand raise, and live collaborative whiteboards.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'knowledge' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between px-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              <span>Spaces</span>
            </div>
            <div className="space-y-0.5">
              {spaces.map((s) => (
                <button
                  key={s.id}
                  onClick={() => onSelectSpace(s.id)}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs text-left transition ${
                    selectedSpaceId === s.id
                      ? 'bg-white/[0.08] text-indigo-300 font-medium'
                      : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-200'
                  }`}
                >
                  <span className="text-sm shrink-0">{s.icon || '📁'}</span>
                  <span className="truncate">{s.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Footer Info: ANIX OS Status */}
      <div className="p-3 border-t border-white/10 text-[11px] bg-white/[0.01]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
            <span className="font-anix font-bold text-xs tracking-wider text-slate-200">
              ANIX KERNEL
            </span>
          </div>
          <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            v2.4 ONLINE
          </span>
        </div>
        <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
          <span>OWASP ASVS L2</span>
          <span className="text-emerald-400 font-semibold">Active</span>
        </div>
        <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400 font-mono">
          <span>Row-Level Security</span>
          <span className="text-indigo-400 font-semibold">Enforced</span>
        </div>
      </div>
    </aside>
  );
};
