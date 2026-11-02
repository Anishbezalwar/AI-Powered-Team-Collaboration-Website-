import React, { useState, useEffect } from 'react';
import {
  Search,
  X,
  Zap,
  MessageSquare,
  FileText,
  Building2,
  Shield,
  ArrowRight,
  Plus,
} from 'lucide-react';
import { api } from '../api.js';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectIssue: (issue: any) => void;
  onSelectChannel: (channelId: string) => void;
  onSelectDoc: (docId: string) => void;
  onSwitchTenant: (tenantId: string) => void;
  onOpenCreateIssue: () => void;
  onOpenSecurity: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onSelectIssue,
  onSelectChannel,
  onSelectDoc,
  onSwitchTenant,
  onOpenCreateIssue,
  onOpenSecurity,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ issues: any[]; messages: any[]; documents: any[] }>({
    issues: [],
    messages: [],
    documents: [],
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else setQuery('');
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setResults({ issues: [], messages: [], documents: [] });
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await api.search.query(query);
        setResults(data);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-start justify-center pt-20 p-4">
      <div className="w-full max-w-xl rounded-2xl bg-[#131B2E] border border-white/10 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Search Input Bar */}
        <div className="p-3.5 border-b border-white/10 flex items-center gap-3">
          <Search className="w-4 h-4 text-indigo-400 shrink-0" />
          <input
            type="text"
            autoFocus
            placeholder="Type a command or search issues, messages, documents..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
          />
          <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] font-mono text-slate-400">ESC</kbd>
        </div>

        {/* Results Stream */}
        <div className="max-h-96 overflow-y-auto p-2 space-y-4">
          {/* Quick Actions */}
          {!query && (
            <div className="space-y-1">
              <div className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Quick Actions
              </div>
              <button
                onClick={() => {
                  onOpenCreateIssue();
                  onClose();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-slate-300 hover:bg-white/[0.06] transition text-left"
              >
                <Plus className="w-4 h-4 text-indigo-400" />
                <span>Create New Agile Issue</span>
              </button>
              <button
                onClick={() => {
                  onOpenSecurity();
                  onClose();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-slate-300 hover:bg-white/[0.06] transition text-left"
              >
                <Shield className="w-4 h-4 text-emerald-400" />
                <span>Run Adversarial Cross-Tenant Security Scan</span>
              </button>
              <button
                onClick={() => {
                  onSwitchTenant('11111111-1111-1111-1111-111111111111');
                  onClose();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-slate-300 hover:bg-white/[0.06] transition text-left"
              >
                <Building2 className="w-4 h-4 text-indigo-400" />
                <span>Switch to Acme Corporation</span>
              </button>
              <button
                onClick={() => {
                  onSwitchTenant('22222222-2222-2222-2222-222222222222');
                  onClose();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-slate-300 hover:bg-white/[0.06] transition text-left"
              >
                <Building2 className="w-4 h-4 text-amber-400" />
                <span>Switch to Stark Industries</span>
              </button>
            </div>
          )}

          {/* Issues */}
          {results.issues?.length > 0 && (
            <div className="space-y-1">
              <div className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Agile Issues ({results.issues.length})
              </div>
              {results.issues.map((i) => (
                <button
                  key={i.id}
                  onClick={() => {
                    onSelectIssue(i);
                    onClose();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-slate-300 hover:bg-white/[0.06] transition text-left"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="font-mono text-indigo-400 font-bold">{i.issue_key}</span>
                    <span className="truncate">{i.title}</span>
                  </div>
                  <span className="text-[10px] uppercase font-bold text-slate-500">{i.status}</span>
                </button>
              ))}
            </div>
          )}

          {/* Messages */}
          {results.messages?.length > 0 && (
            <div className="space-y-1">
              <div className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Lark Chat Messages ({results.messages.length})
              </div>
              {results.messages.map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    onSelectChannel(m.channel_id);
                    onClose();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-slate-300 hover:bg-white/[0.06] transition text-left"
                >
                  <div className="flex items-center gap-2 truncate">
                    <MessageSquare className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span className="text-slate-400">#{m.channel_name}:</span>
                    <span className="truncate">{m.content}</span>
                  </div>
                  <span className="text-[10px] text-slate-500">{m.sender_name}</span>
                </button>
              ))}
            </div>
          )}

          {/* Documents */}
          {results.documents?.length > 0 && (
            <div className="space-y-1">
              <div className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Knowledge Documents ({results.documents.length})
              </div>
              {results.documents.map((d) => (
                <button
                  key={d.id}
                  onClick={() => {
                    onSelectDoc(d.id);
                    onClose();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-slate-300 hover:bg-white/[0.06] transition text-left"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span>{d.icon || '📄'}</span>
                    <span className="truncate">{d.title}</span>
                  </div>
                  <span className="text-[10px] text-slate-500">{d.space_name}</span>
                </button>
              ))}
            </div>
          )}

          {query && !loading && results.issues.length === 0 && results.messages.length === 0 && results.documents.length === 0 && (
            <div className="p-6 text-center text-xs text-slate-500">
              No results found matching &quot;{query}&quot;.
            </div>
          )}
        </div>

        {/* ANIX Omni-Search Footer */}
        <div className="px-4 py-2.5 border-t border-white/10 bg-white/[0.02] flex items-center justify-between text-[10px] text-slate-500 font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span className="font-anix font-bold text-slate-300 tracking-wider">ANIX OMNI-SEARCH</span>
          </div>
          <div className="flex items-center gap-3">
            <span>Navigate: ↑↓</span>
            <span>Open: ↵</span>
            <span>Dismiss: ESC</span>
          </div>
        </div>
      </div>
    </div>
  );
};
