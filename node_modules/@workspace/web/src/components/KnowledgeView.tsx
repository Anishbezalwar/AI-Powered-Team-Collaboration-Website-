import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  FileText,
  Clock,
  History,
  CheckSquare,
  Square,
  Code,
  AlertCircle,
  Plus,
  Save,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { api } from '../api.js';

interface KnowledgeViewProps {
  spaces: any[];
  selectedSpaceId: string;
  currentRole: string;
  onRefreshSpaces: () => void;
}

export const KnowledgeView: React.FC<KnowledgeViewProps> = ({
  spaces,
  selectedSpaceId,
  currentRole,
  onRefreshSpaces,
}) => {
  const [documents, setDocuments] = useState<any[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [activeDoc, setActiveDoc] = useState<any | null>(null);
  const [blocks, setBlocks] = useState<any[]>([]);
  const [docTitle, setDocTitle] = useState('');
  const [docStatus, setDocStatus] = useState('draft');
  const [versionsDrawerOpen, setVersionsDrawerOpen] = useState(false);
  const [versions, setVersions] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [newDocModalOpen, setNewDocModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  const fetchDocuments = async () => {
    if (!selectedSpaceId) return;
    try {
      const data = await api.documents.list(selectedSpaceId);
      setDocuments(data);
      if (data.length > 0 && !selectedDocId) {
        setSelectedDocId(data[0].id);
      }
    } catch (err: any) {
      console.error('Failed to fetch docs:', err);
    }
  };

  const fetchDocDetail = async (id: string) => {
    try {
      const doc = await api.documents.get(id);
      setActiveDoc(doc);
      setDocTitle(doc.title);
      setDocStatus(doc.status);
      setBlocks(doc.blocks || []);
    } catch (err: any) {
      alert(`Failed to load document: ${err.message}`);
    }
  };

  const fetchVersions = async () => {
    if (!selectedDocId) return;
    try {
      const v = await api.documents.listVersions(selectedDocId);
      setVersions(v);
    } catch (err: any) {
      console.error('Failed to fetch versions:', err);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [selectedSpaceId]);

  useEffect(() => {
    if (selectedDocId) {
      fetchDocDetail(selectedDocId);
    }
  }, [selectedDocId]);

  const handleSaveDocument = async () => {
    if (!selectedDocId) return;
    setSaving(true);
    try {
      const updated = await api.documents.update(selectedDocId, {
        title: docTitle,
        status: docStatus,
        blocks,
      });
      setActiveDoc(updated);
      alert(`Document saved! New snapshot version v${updated.versionNumber} recorded.`);
      fetchDocuments();
    } catch (err: any) {
      alert(`Save failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleRestoreVersion = async (versionNumber: number) => {
    if (!selectedDocId) return;
    try {
      await api.documents.restoreVersion(selectedDocId, versionNumber);
      alert(`Document successfully restored to v${versionNumber}!`);
      setVersionsDrawerOpen(false);
      fetchDocDetail(selectedDocId);
      fetchDocuments();
    } catch (err: any) {
      alert(`Restore failed: ${err.message}`);
    }
  };

  const handleToggleChecklist = (blockId: string) => {
    setBlocks((prev) =>
      prev.map((b) => (b.id === blockId ? { ...b, checked: !b.checked } : b))
    );
  };

  const handleBlockContentChange = (blockId: string, content: string) => {
    setBlocks((prev) =>
      prev.map((b) => (b.id === blockId ? { ...b, content } : b))
    );
  };

  const handleAddBlock = (type: string) => {
    const newBlock = {
      id: 'b-' + Math.random().toString(36).substring(2, 9),
      type,
      content: type === 'checklist' ? 'New task item...' : 'New text...',
      checked: false,
    };
    setBlocks((prev) => [...prev, newBlock]);
  };

  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !selectedSpaceId) return;

    try {
      const doc = await api.documents.create({
        spaceId: selectedSpaceId,
        title: newTitle.trim(),
        icon: '📄',
      });
      setNewTitle('');
      setNewDocModalOpen(false);
      fetchDocuments();
      setSelectedDocId(doc.id);
    } catch (err: any) {
      alert(`Failed to create document: ${err.message}`);
    }
  };

  return (
    <div className="flex-1 flex h-full bg-[#0B0F17] overflow-hidden">
      {/* Left Documents Sub-list */}
      <div className="w-64 border-r border-white/10 bg-[#0E131F]/70 flex flex-col justify-between">
        <div className="p-3 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Pages</h3>
            {currentRole !== 'Guest' && (
              <button
                onClick={() => setNewDocModalOpen(true)}
                className="p-1 rounded hover:bg-white/10 text-slate-300 hover:text-white"
                title="New Page"
              >
                <Plus className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="space-y-1">
            {documents.map((doc) => (
              <button
                key={doc.id}
                onClick={() => setSelectedDocId(doc.id)}
                className={`w-full flex items-center justify-between p-2 rounded-xl text-xs text-left transition ${
                  selectedDocId === doc.id
                    ? 'bg-indigo-600/20 text-indigo-300 font-semibold border border-indigo-500/30'
                    : 'text-slate-300 hover:bg-white/[0.04]'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <span>{doc.icon || '📄'}</span>
                  <span className="truncate">{doc.title}</span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">v{doc.version_number}</span>
              </button>
            ))}

            {documents.length === 0 && (
              <p className="text-xs text-slate-500 italic p-2">No pages in this space.</p>
            )}
          </div>
        </div>
      </div>

      {/* Main Document Block Editor */}
      {activeDoc ? (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#0B0F17]">
          {/* Document Header */}
          <div className="h-14 px-6 border-b border-white/10 flex items-center justify-between bg-[#0E131F]/50 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{activeDoc.icon || '📄'}</span>
              <input
                type="text"
                disabled={currentRole === 'Guest'}
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
                className="bg-transparent text-sm font-bold text-white focus:outline-none focus:border-b border-indigo-500 transition min-w-[240px]"
              />
              <span className="px-2 py-0.5 rounded-full bg-white/10 text-[10px] uppercase font-bold text-slate-400">
                v{activeDoc.version_number}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <select
                value={docStatus}
                disabled={currentRole === 'Guest'}
                onChange={(e) => setDocStatus(e.target.value)}
                className="bg-white/[0.06] border border-white/10 rounded-lg px-2.5 py-1 text-xs text-slate-300 focus:outline-none"
              >
                <option value="draft">Draft</option>
                <option value="in_review">In Review</option>
                <option value="approved">Approved</option>
                <option value="archived">Archived</option>
              </select>

              <button
                onClick={() => {
                  fetchVersions();
                  setVersionsDrawerOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-slate-300 transition"
              >
                <History className="w-3.5 h-3.5 text-indigo-400" />
                <span>Version History</span>
              </button>

              {currentRole !== 'Guest' && (
                <button
                  onClick={handleSaveDocument}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-xs font-semibold text-white shadow-lg shadow-indigo-600/30 transition"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{saving ? 'Saving...' : 'Save Snapshot'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Block Content Canvas */}
          <div className="flex-1 overflow-y-auto p-8 max-w-4xl mx-auto w-full space-y-4">
            {blocks.map((block) => (
              <div key={block.id} className="group relative">
                {block.type === 'h1' && (
                  <input
                    type="text"
                    disabled={currentRole === 'Guest'}
                    value={block.content}
                    onChange={(e) => handleBlockContentChange(block.id, e.target.value)}
                    className="w-full bg-transparent text-2xl font-bold text-white focus:outline-none border-b border-transparent focus:border-indigo-500/50 pb-1"
                  />
                )}

                {block.type === 'h2' && (
                  <input
                    type="text"
                    disabled={currentRole === 'Guest'}
                    value={block.content}
                    onChange={(e) => handleBlockContentChange(block.id, e.target.value)}
                    className="w-full bg-transparent text-lg font-bold text-slate-200 focus:outline-none border-b border-transparent focus:border-indigo-500/50 pb-1 mt-4"
                  />
                )}

                {block.type === 'paragraph' && (
                  <textarea
                    rows={2}
                    disabled={currentRole === 'Guest'}
                    value={block.content}
                    onChange={(e) => handleBlockContentChange(block.id, e.target.value)}
                    className="w-full bg-transparent text-xs text-slate-300 leading-relaxed focus:outline-none resize-none"
                  />
                )}

                {block.type === 'checklist' && (
                  <div className="flex items-start gap-2.5 py-1">
                    <button
                      disabled={currentRole === 'Guest'}
                      onClick={() => handleToggleChecklist(block.id)}
                      className="mt-0.5 text-indigo-400 hover:text-indigo-300 transition"
                    >
                      {block.checked ? (
                        <CheckSquare className="w-4 h-4 fill-indigo-500/20" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-500" />
                      )}
                    </button>
                    <input
                      type="text"
                      disabled={currentRole === 'Guest'}
                      value={block.content}
                      onChange={(e) => handleBlockContentChange(block.id, e.target.value)}
                      className={`flex-1 bg-transparent text-xs focus:outline-none ${
                        block.checked ? 'line-through text-slate-500' : 'text-slate-200'
                      }`}
                    />
                  </div>
                )}

                {block.type === 'callout' && (
                  <div className="p-3.5 rounded-xl bg-indigo-950/30 border border-indigo-500/30 flex items-start gap-3">
                    <AlertCircle className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                    <textarea
                      rows={2}
                      disabled={currentRole === 'Guest'}
                      value={block.content}
                      onChange={(e) => handleBlockContentChange(block.id, e.target.value)}
                      className="flex-1 bg-transparent text-xs text-indigo-200 focus:outline-none resize-none leading-relaxed"
                    />
                  </div>
                )}

                {block.type === 'code' && (
                  <div className="rounded-xl bg-slate-950/80 border border-white/10 p-3 font-mono text-xs text-emerald-400">
                    <textarea
                      rows={3}
                      disabled={currentRole === 'Guest'}
                      value={block.content}
                      onChange={(e) => handleBlockContentChange(block.id, e.target.value)}
                      className="w-full bg-transparent focus:outline-none resize-none text-emerald-300"
                    />
                  </div>
                )}
              </div>
            ))}

            {/* Add Block Toolbar */}
            {currentRole !== 'Guest' && (
              <div className="pt-4 border-t border-white/5 flex items-center gap-2 text-xs text-slate-400">
                <span className="text-[11px] font-semibold uppercase">Add Block:</span>
                <button
                  onClick={() => handleAddBlock('h2')}
                  className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-slate-300"
                >
                  + Heading
                </button>
                <button
                  onClick={() => handleAddBlock('paragraph')}
                  className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-slate-300"
                >
                  + Text
                </button>
                <button
                  onClick={() => handleAddBlock('checklist')}
                  className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-slate-300"
                >
                  + Checklist
                </button>
                <button
                  onClick={() => handleAddBlock('callout')}
                  className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-slate-300"
                >
                  + Callout
                </button>
                <button
                  onClick={() => handleAddBlock('code')}
                  className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-slate-300"
                >
                  + Code
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-slate-500 text-xs">
          Select or create a page to view knowledge documentation.
        </div>
      )}

      {/* Version History Drawer */}
      {versionsDrawerOpen && (
        <div className="fixed inset-y-0 right-0 w-80 bg-[#131B2E] border-l border-white/10 shadow-2xl z-50 flex flex-col p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <History className="w-4 h-4 text-indigo-400" />
              Version Snapshots
            </h3>
            <button onClick={() => setVersionsDrawerOpen(false)} className="text-slate-400 hover:text-white">
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2.5">
            {versions.map((ver) => (
              <div
                key={ver.id}
                className="p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-indigo-300 font-mono">Snapshot v{ver.version_number}</span>
                  <span className="text-[10px] text-slate-500">{new Date(ver.created_at).toLocaleDateString()}</span>
                </div>
                <div className="text-[11px] text-slate-400">By {ver.author_name}</div>
                {currentRole !== 'Guest' && (
                  <button
                    onClick={() => handleRestoreVersion(ver.version_number)}
                    className="w-full flex items-center justify-center gap-1.5 py-1 rounded bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 text-[11px] font-semibold transition"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Restore this Version</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* New Page Modal */}
      {newDocModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#131B2E] border border-white/10 p-5 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-white">Create New Page</h3>
            <form onSubmit={handleCreateDocument} className="space-y-3">
              <input
                type="text"
                placeholder="Page Title (e.g. Sprint 1 Architecture Review)"
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setNewDocModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-white/5 text-xs text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 text-xs font-semibold text-white"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
