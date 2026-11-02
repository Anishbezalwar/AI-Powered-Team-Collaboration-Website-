import React, { useState, useEffect, useRef } from 'react';
import { X, Send, MessageSquare, Zap, Clock, Smile } from 'lucide-react';
import { api } from '../api.js';

interface ThreadDrawerProps {
  channelId: string;
  parentMessage: any;
  currentUser: any;
  currentRole: string;
  onClose: () => void;
  onReplyAdded: () => void;
}

export const ThreadDrawer: React.FC<ThreadDrawerProps> = ({
  channelId,
  parentMessage,
  currentUser,
  currentRole,
  onClose,
  onReplyAdded,
}) => {
  const [replies, setReplies] = useState<any[]>([]);
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(false);
  const repliesEndRef = useRef<HTMLDivElement | null>(null);

  const fetchReplies = async () => {
    if (!channelId || !parentMessage?.id) return;
    try {
      const data = await api.channels.getReplies(channelId, parentMessage.id);
      setReplies(data);
    } catch (err: any) {
      console.error('Failed to load thread replies:', err);
    }
  };

  useEffect(() => {
    fetchReplies();
  }, [channelId, parentMessage?.id]);

  useEffect(() => {
    repliesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [replies]);

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !channelId || !parentMessage?.id) return;

    const text = replyText;
    setReplyText('');
    setLoading(true);

    try {
      await api.channels.sendMessage(channelId, {
        content: text,
        parentId: parentMessage.id,
      });
      await fetchReplies();
      onReplyAdded();
    } catch (err: any) {
      alert(`Reply failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleReaction = async (messageId: string, emoji: string) => {
    try {
      await api.channels.toggleReaction(messageId, emoji);
      fetchReplies();
    } catch (err: any) {
      console.error('Failed to react:', err);
    }
  };

  return (
    <aside className="w-96 border-l border-white/10 bg-[#0E131F] flex flex-col h-full shadow-2xl z-30 select-none">
      {/* Thread Header */}
      <div className="h-14 px-4 border-b border-white/10 flex items-center justify-between bg-[#131B2E]">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-indigo-400" />
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">Thread</h3>
          <span className="text-[11px] text-slate-400">({replies.length} replies)</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Original Parent Message Card */}
        <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10 space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-xs shadow">
              {parentMessage.sender_avatar || parentMessage.senderAvatar || '👤'}
            </div>
            <div>
              <div className="text-xs font-semibold text-white">
                {parentMessage.sender_name || parentMessage.senderName}
              </div>
              <div className="text-[10px] text-slate-400">
                {new Date(parentMessage.created_at || parentMessage.createdAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </div>
          </div>
          <div className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">
            {parentMessage.content}
          </div>
        </div>

        {/* Separator */}
        <div className="flex items-center gap-2">
          <div className="h-px bg-white/10 flex-1" />
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Replies</span>
          <div className="h-px bg-white/10 flex-1" />
        </div>

        {/* Replies List */}
        <div className="space-y-3">
          {replies.map((reply) => (
            <div key={reply.id} className="flex items-start gap-2.5 p-2 rounded-xl hover:bg-white/[0.02] transition">
              <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-xs shrink-0 shadow">
                {reply.sender_avatar || reply.senderAvatar || '👤'}
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-white">
                    {reply.sender_name || reply.senderName}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {new Date(reply.created_at || reply.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <div className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {reply.content}
                </div>

                {/* Reaction Badges */}
                <div className="flex flex-wrap items-center gap-1 pt-1">
                  {reply.reactions?.map((rx: any) => (
                    <button
                      key={rx.emoji}
                      onClick={() => handleToggleReaction(reply.id, rx.emoji)}
                      className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] border transition ${
                        rx.userIds?.includes(currentUser?.id)
                          ? 'bg-indigo-600/30 border-indigo-500/50 text-indigo-300'
                          : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      <span>{rx.emoji}</span>
                      <span className="font-semibold">{rx.count}</span>
                    </button>
                  ))}
                  <div className="flex items-center gap-0.5">
                    {['👍', '❤️', '🔥'].map((em) => (
                      <button
                        key={em}
                        onClick={() => handleToggleReaction(reply.id, em)}
                        className="p-1 rounded hover:bg-white/10 text-[10px] text-slate-400 hover:text-white transition"
                      >
                        {em}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {replies.length === 0 && (
            <div className="py-8 text-center text-slate-500 text-xs">
              No replies yet. Start the thread!
            </div>
          )}

          <div ref={repliesEndRef} />
        </div>
      </div>

      {/* Reply Input Box */}
      <div className="p-3 border-t border-white/10 bg-[#131B2E]">
        <form onSubmit={handleSendReply} className="flex items-center gap-2">
          <input
            type="text"
            disabled={currentRole === 'Guest'}
            placeholder={
              currentRole === 'Guest'
                ? 'Guest role cannot reply'
                : 'Reply in thread...'
            }
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            className="flex-1 bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!replyText.trim() || currentRole === 'Guest' || loading}
            className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white transition shadow-lg shadow-indigo-600/25"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </aside>
  );
};
