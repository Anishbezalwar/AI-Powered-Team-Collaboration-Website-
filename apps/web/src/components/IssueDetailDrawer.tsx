import React, { useState, useEffect } from 'react';
import {
  X,
  Link2,
  MessageSquare,
  AlertTriangle,
  Send,
  Calendar,
  Layers,
  Flame,
  Clock,
  ArrowRight,
  Shield,
  Trash2,
} from 'lucide-react';
import { api } from '../api.js';

interface IssueDetailDrawerProps {
  issueId: string;
  allIssues: any[];
  currentRole: string;
  onClose: () => void;
  onRefresh: () => void;
}

export const IssueDetailDrawer: React.FC<IssueDetailDrawerProps> = ({
  issueId,
  allIssues,
  currentRole,
  onClose,
  onRefresh,
}) => {
  const [issue, setIssue] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [linkTargetId, setLinkTargetId] = useState('');
  const [linkType, setLinkType] = useState('blocks');
  const [linkError, setLinkError] = useState<string | null>(null);

  const fetchDetails = async () => {
    try {
      setLoading(true);
      const data = await api.issues.get(issueId);
      setIssue(data);
    } catch (err: any) {
      alert(`Failed to load issue details: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [issueId]);

  const handleUpdateStatus = async (status: string) => {
    try {
      await api.issues.update(issueId, { status, version: issue.version });
      await fetchDetails();
      onRefresh();
    } catch (err: any) {
      alert(`Update failed: ${err.message}`);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    try {
      await api.issues.addComment(issueId, commentText.trim());
      setCommentText('');
      await fetchDetails();
    } catch (err: any) {
      alert(`Failed to post comment: ${err.message}`);
    }
  };

  const handleAddLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkTargetId) return;
    setLinkError(null);
    try {
      await api.issues.link(issueId, { targetIssueId: linkTargetId, type: linkType });
      setLinkTargetId('');
      await fetchDetails();
      onRefresh();
    } catch (err: any) {
      setLinkError(err.message);
    }
  };

  if (loading || !issue) {
    return (
      <div className="fixed inset-y-0 right-0 w-full max-w-xl bg-[#111827] border-l border-white/10 z-50 flex items-center justify-center p-6 text-slate-400">
        Loading issue details...
      </div>
    );
  }

  const otherIssues = allIssues.filter((i) => i.id !== issue.id);

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-2xl bg-[#101726] border-l border-white/10 shadow-2xl z-50 flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
      {/* Drawer Header */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between bg-[#131B2E]">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            {issue.issue_key}
          </span>
          <span className="text-xs uppercase font-semibold text-slate-400">({issue.type})</span>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Drawer Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {/* Title & Status */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-white leading-snug">{issue.title}</h2>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-400">Status:</span>
              <select
                value={issue.status}
                disabled={currentRole === 'Guest'}
                onChange={(e) => handleUpdateStatus(e.target.value)}
                className="bg-white/[0.06] border border-white/10 rounded-lg px-2.5 py-1 text-xs font-semibold text-indigo-300 focus:outline-none focus:border-indigo-500 transition"
              >
                <option value="backlog">Backlog</option>
                <option value="in_progress">In Progress</option>
                <option value="review">Code Review</option>
                <option value="done">Done</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <span>Priority:</span>
              <span className="font-semibold text-slate-200 uppercase">{issue.priority}</span>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <span>Assignee:</span>
              <span className="font-semibold text-slate-200">{issue.assignee_name || 'Unassigned'}</span>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Description</h3>
          <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">
            {issue.description || 'No description provided.'}
          </div>
        </div>

        {/* Issue Dependencies with Cycle Detection */}
        <div className="space-y-3 p-4 rounded-xl bg-slate-900/60 border border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Link2 className="w-4 h-4 text-indigo-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Issue Dependencies ({issue.links?.length || 0})
              </h3>
            </div>
            <span className="text-[10px] text-emerald-400 font-semibold">Cycle Detection Active</span>
          </div>

          {linkError && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-xs text-rose-300">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <strong>Circular Dependency Prevented:</strong>
                <p className="mt-0.5">{linkError}</p>
              </div>
            </div>
          )}

          {/* Links List */}
          <div className="space-y-1.5">
            {issue.links?.map((link: any) => (
              <div
                key={link.id}
                className="flex items-center justify-between p-2 rounded-lg bg-white/[0.03] border border-white/5 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-[10px] uppercase font-bold">
                    {link.type.replace('_', ' ')}
                  </span>
                  <span className="font-mono text-slate-400">{link.target_issue_key}</span>
                  <span className="text-slate-200 truncate max-w-[240px]">{link.target_title}</span>
                </div>
                <span className="px-1.5 py-0.5 rounded bg-white/10 text-slate-400 text-[10px] uppercase">
                  {link.target_status}
                </span>
              </div>
            ))}

            {(!issue.links || issue.links.length === 0) && (
              <p className="text-xs text-slate-500 italic">No dependency links established yet.</p>
            )}
          </div>

          {/* Add Link Form */}
          {currentRole !== 'Guest' && (
            <form onSubmit={handleAddLink} className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/5">
              <select
                value={linkType}
                onChange={(e) => setLinkType(e.target.value)}
                className="bg-white/[0.06] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
              >
                <option value="blocks">Blocks</option>
                <option value="is_blocked_by">Is Blocked By</option>
                <option value="relates_to">Relates To</option>
                <option value="duplicates">Duplicates</option>
              </select>

              <select
                value={linkTargetId}
                onChange={(e) => setLinkTargetId(e.target.value)}
                className="flex-1 bg-white/[0.06] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none min-w-[160px]"
              >
                <option value="">Select target issue...</option>
                {otherIssues.map((oi) => (
                  <option key={oi.id} value={oi.id}>
                    {oi.issue_key} - {oi.title}
                  </option>
                ))}
              </select>

              <button
                type="submit"
                disabled={!linkTargetId}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-xs font-semibold text-white transition"
              >
                Link
              </button>
            </form>
          )}
        </div>

        {/* Comments & Activity Stream */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-slate-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Activity & Comments ({issue.comments?.length || 0})
            </h3>
          </div>

          <div className="space-y-2.5">
            {issue.comments?.map((comment: any) => (
              <div key={comment.id} className="p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-200">{comment.author_name}</span>
                    <span className="text-slate-500">{new Date(comment.created_at).toLocaleTimeString()}</span>
                  </div>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">{comment.content}</p>
              </div>
            ))}

            {(!issue.comments || issue.comments.length === 0) && (
              <p className="text-xs text-slate-500 italic">No comments posted yet.</p>
            )}
          </div>

          {/* Add Comment */}
          {currentRole !== 'Guest' && (
            <form onSubmit={handleAddComment} className="flex gap-2 pt-2">
              <input
                type="text"
                placeholder="Write a comment or @mention a teammate..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="flex-1 bg-white/[0.04] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
              />
              <button
                type="submit"
                disabled={!commentText.trim()}
                className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-xs font-semibold text-white transition flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Post</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
