import React, { useState } from 'react';
import {
  Plus,
  Play,
  CheckCircle2,
  Calendar,
  Layers,
  AlertCircle,
  Clock,
  Filter,
  Search,
  Tag,
  ArrowRight,
  Flame,
} from 'lucide-react';
import { api } from '../api.js';

interface AgileBoardViewProps {
  issues: any[];
  sprints: any[];
  currentRole: string;
  onRefreshIssues: () => void;
  onSelectIssue: (issue: any) => void;
  onOpenCreateIssue: () => void;
}

const COLUMNS = [
  { id: 'backlog', title: 'Backlog', color: 'border-slate-500/30' },
  { id: 'in_progress', title: 'In Progress', color: 'border-indigo-500/40' },
  { id: 'review', title: 'Code Review', color: 'border-amber-500/40' },
  { id: 'done', title: 'Done', color: 'border-emerald-500/40' },
];

export const AgileBoardView: React.FC<AgileBoardViewProps> = ({
  issues,
  sprints,
  currentRole,
  onRefreshIssues,
  onSelectIssue,
  onOpenCreateIssue,
}) => {
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [draggedIssueId, setDraggedIssueId] = useState<string | null>(null);
  const [completingSprint, setCompletingSprint] = useState<any | null>(null);

  const activeSprint = sprints.find((s) => s.status === 'active');

  // Filter issues
  const filteredIssues = issues.filter((issue) => {
    if (filterPriority !== 'all' && issue.priority !== filterPriority) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchTitle = issue.title.toLowerCase().includes(q);
      const matchKey = issue.issue_key.toLowerCase().includes(q);
      if (!matchTitle && !matchKey) return false;
    }
    return true;
  });

  // Handle Drag & Drop with Optimistic UI & Rollback on failure
  const handleDragStart = (e: React.DragEvent, issueId: string) => {
    e.dataTransfer.setData('text/plain', issueId);
    setDraggedIssueId(issueId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault();
    const issueId = e.dataTransfer.getData('text/plain') || draggedIssueId;
    if (!issueId) return;

    const issue = issues.find((i) => i.id === issueId);
    if (!issue || issue.status === targetStatus) return;

    const originalStatus = issue.status;

    // Optimistically update
    issue.status = targetStatus;

    try {
      await api.issues.update(issueId, {
        status: targetStatus,
        version: issue.version,
      });
      onRefreshIssues();
    } catch (err: any) {
      // Rollback on conflict or failure
      issue.status = originalStatus;
      alert(`Status update failed: ${err.message}`);
      onRefreshIssues();
    } finally {
      setDraggedIssueId(null);
    }
  };

  const handleCompleteSprint = async () => {
    if (!activeSprint) return;
    try {
      await api.projects.completeSprint(activeSprint.id);
      setCompletingSprint(null);
      alert(`Sprint '${activeSprint.name}' completed! Unfinished work carried over to backlog.`);
      onRefreshIssues();
    } catch (err: any) {
      alert(`Failed to complete sprint: ${err.message}`);
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold uppercase flex items-center gap-1"><Flame className="w-2.5 h-2.5 text-rose-400" /> Urgent</span>;
      case 'high':
        return <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-semibold">High</span>;
      case 'medium':
        return <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px]">Medium</span>;
      default:
        return <span className="px-1.5 py-0.5 rounded bg-slate-500/20 text-slate-300 text-[10px]">Low</span>;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'epic':
        return <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[10px] font-bold">⚡ EPIC</span>;
      case 'bug':
        return <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[10px] font-bold">🐞 BUG</span>;
      case 'story':
        return <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">📖 STORY</span>;
      default:
        return <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-[10px] font-bold">✓ TASK</span>;
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#0B0F17]">
      {/* Sprint Header & Filter Bar */}
      <div className="p-4 border-b border-white/10 space-y-3">
        {/* Active Sprint Banner */}
        {activeSprint && (
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-gradient-to-r from-indigo-900/30 via-indigo-800/10 to-transparent border border-indigo-500/30">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                <Play className="w-4 h-4 fill-indigo-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-white tracking-tight">{activeSprint.name}</h2>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold uppercase tracking-wider border border-emerald-500/30">
                    Active Sprint
                  </span>
                </div>
                {activeSprint.goal && (
                  <p className="text-xs text-slate-300 mt-0.5 italic">{activeSprint.goal}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {currentRole !== 'Guest' && (
                <button
                  onClick={() => setCompletingSprint(activeSprint)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-xs font-semibold text-emerald-300 transition flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Complete Sprint</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Filters and Create Issue button */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filter issues by key or title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/10 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="bg-white/[0.04] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 transition"
            >
              <option value="all">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          {currentRole !== 'Guest' && (
            <button
              onClick={onOpenCreateIssue}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-lg shadow-indigo-600/25 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Create Issue</span>
            </button>
          )}
        </div>
      </div>

      {/* Kanban Board Columns */}
      <div className="flex-1 p-4 overflow-x-auto">
        <div className="grid grid-cols-4 gap-4 min-w-[900px] h-full items-start">
          {COLUMNS.map((col) => {
            const colIssues = filteredIssues.filter((i) => i.status === col.id);

            return (
              <div
                key={col.id}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, col.id)}
                className={`flex flex-col h-full max-h-[calc(100vh-210px)] rounded-xl bg-slate-900/50 border ${col.color} p-3 transition`}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-3 mb-2 border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-200">{col.title}</span>
                    <span className="w-5 h-5 rounded-full bg-white/10 text-[11px] font-semibold text-slate-300 flex items-center justify-center">
                      {colIssues.length}
                    </span>
                  </div>
                </div>

                {/* Cards Container */}
                <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                  {colIssues.map((issue) => (
                    <div
                      key={issue.id}
                      draggable={currentRole !== 'Guest'}
                      onDragStart={(e) => handleDragStart(e, issue.id)}
                      onClick={() => onSelectIssue(issue)}
                      className="glass-card p-3 rounded-xl cursor-pointer hover:border-indigo-500/40 transition select-none group"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-1.5">
                          {getTypeIcon(issue.type)}
                          <span className="text-xs font-mono font-semibold text-indigo-400 group-hover:underline">
                            {issue.issue_key}
                          </span>
                        </div>
                        {getPriorityBadge(issue.priority)}
                      </div>

                      <h4 className="text-xs font-medium text-slate-200 line-clamp-2 leading-relaxed mb-2.5">
                        {issue.title}
                      </h4>

                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-white/5">
                        <div className="flex items-center gap-2">
                          {issue.estimate_points && (
                            <span className="px-1.5 py-0.5 rounded bg-white/5 text-slate-300 text-[10px] font-mono">
                              {issue.estimate_points} pts
                            </span>
                          )}
                          {issue.due_date && (
                            <span className="flex items-center gap-1 text-[10px] text-slate-400">
                              <Calendar className="w-3 h-3 text-slate-500" />
                              {issue.due_date}
                            </span>
                          )}
                        </div>

                        <div className="w-6 h-6 rounded-full bg-slate-700 border border-white/10 flex items-center justify-center text-xs" title={issue.assignee_name || 'Unassigned'}>
                          {issue.assignee_avatar || (issue.assignee_name ? issue.assignee_name[0] : '👤')}
                        </div>
                      </div>
                    </div>
                  ))}

                  {colIssues.length === 0 && (
                    <div className="h-24 rounded-lg border border-dashed border-white/10 flex items-center justify-center text-xs text-slate-500">
                      Drop cards here
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Complete Sprint Modal */}
      {completingSprint && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#131B2E] border border-white/10 p-5 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Complete Sprint: {completingSprint.name}
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Completing this sprint will automatically mark all closed work as done, and carry over any incomplete issues back to the backlog or next sprint.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setCompletingSprint(null)}
                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleCompleteSprint}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white shadow-lg shadow-emerald-600/30"
              >
                Confirm & Complete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
