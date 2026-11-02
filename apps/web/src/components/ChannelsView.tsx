import React, { useState, useEffect, useRef } from 'react';
import {
  Hash,
  Lock,
  Send,
  Smile,
  Zap,
  ArrowRight,
  MessageSquare,
  Users,
  AlertCircle,
  Plus,
  CheckCircle2,
  Pin,
  Code,
  Mic,
  Paperclip,
  Video,
  Radio,
  FileCode,
  FileText,
  Play,
  Volume2,
  ChevronDown,
  X,
  UserPlus,
} from 'lucide-react';
import { api } from '../api.js';
import { useRealtime } from '../hooks/useRealtime.js';
import { ThreadDrawer } from './ThreadDrawer.js';

interface ChannelsViewProps {
  channels: any[];
  selectedChannelId: string;
  currentUser: any;
  currentRole: string;
  projects: any[];
  onSelectChannel: (id: string) => void;
  onRefreshChannels: () => void;
  onStartHuddle?: (channel: any) => void;
}

export const ChannelsView: React.FC<ChannelsViewProps> = ({
  channels,
  selectedChannelId,
  currentUser,
  currentRole,
  projects,
  onSelectChannel,
  onRefreshChannels,
  onStartHuddle,
}) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [convertingMessage, setConvertingMessage] = useState<any | null>(null);

  // Threading state
  const [activeThreadMessage, setActiveThreadMessage] = useState<any | null>(null);

  // Members Drawer state
  const [membersDrawerOpen, setMembersDrawerOpen] = useState(false);
  const [channelMembers, setChannelMembers] = useState<any[]>([]);

  // Direct Message Modal state
  const [dmModalOpen, setDmModalOpen] = useState(false);
  const [orgUsers, setOrgUsers] = useState<any[]>([]);

  // Code Snippet Composer Modal
  const [codeModalOpen, setCodeModalOpen] = useState(false);
  const [codeSnippetContent, setCodeSnippetContent] = useState('');
  const [codeSnippetLang, setCodeSnippetLang] = useState('typescript');
  const [codeSnippetTitle, setCodeSnippetTitle] = useState('snippet.ts');

  // Voice Note Simulator state
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [voiceSeconds, setVoiceSeconds] = useState(0);

  // Typing indicator state
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const typingTimeoutRef = useRef<any>(null);

  // Message-to-Work review form state
  const [convertProjectId, setConvertProjectId] = useState('');
  const [convertTitle, setConvertTitle] = useState('');
  const [convertDescription, setConvertDescription] = useState('');
  const [convertType, setConvertType] = useState('task');
  const [convertPriority, setConvertPriority] = useState('medium');
  const [convertLoading, setConvertLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const {
    subscribe,
    joinChannel,
    leaveChannel,
    startTyping,
    stopTyping,
  } = useRealtime();

  const currentChannel = channels.find((c) => c.id === selectedChannelId);

  const fetchMessages = async () => {
    if (!selectedChannelId) return;
    try {
      const data = await api.channels.getMessages(selectedChannelId);
      setMessages(data);
    } catch (err: any) {
      console.error('Failed to fetch messages:', err);
    }
  };

  const fetchMembers = async () => {
    if (!selectedChannelId) return;
    try {
      const data = await api.channels.getMembers(selectedChannelId);
      setChannelMembers(data);
    } catch (err: any) {
      console.error('Failed to fetch channel members:', err);
    }
  };

  useEffect(() => {
    fetchMessages();
    fetchMembers();
    setTypingUsers([]);

    if (selectedChannelId) {
      joinChannel(selectedChannelId);
    }

    return () => {
      if (selectedChannelId) {
        leaveChannel(selectedChannelId);
      }
    };
  }, [selectedChannelId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Real-time WebSocket Listeners
  useEffect(() => {
    const unsubMsg = subscribe('message:new', (msg) => {
      if (msg.channelId === selectedChannelId) {
        if (!msg.parentId) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
        }
      }
    });

    const unsubRx = subscribe('message:reaction', (data) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === data.messageId ? { ...m, reactions: data.reactions } : m))
      );
    });

    const unsubPin = subscribe('message:pinned', (data) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === data.messageId ? { ...m, isPinned: data.isPinned } : m))
      );
    });

    const unsubTyping = subscribe('typing:update', (data) => {
      if (data.channelId === selectedChannelId && data.userName) {
        if (data.isTyping) {
          setTypingUsers((prev) => Array.from(new Set([...prev, data.userName])));
        } else {
          setTypingUsers((prev) => prev.filter((name) => name !== data.userName));
        }
      }
    });

    return () => {
      unsubMsg();
      unsubRx();
      unsubPin();
      unsubTyping();
    };
  }, [selectedChannelId, subscribe]);

  // Handle Input Typing
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    if (!selectedChannelId || !currentUser) return;

    startTyping(selectedChannelId, currentUser.fullName);
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping(selectedChannelId, currentUser.fullName);
    }, 2000);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !selectedChannelId) return;

    const text = inputText;
    setInputText('');
    stopTyping(selectedChannelId, currentUser?.fullName || 'User');

    try {
      await api.channels.sendMessage(selectedChannelId, { content: text });
      fetchMessages();
    } catch (err: any) {
      alert(`Message failed: ${err.message}`);
    }
  };

  const handleSendCodeSnippet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codeSnippetContent.trim() || !selectedChannelId) return;

    try {
      await api.channels.sendMessage(selectedChannelId, {
        content: `Shared a code snippet: \`${codeSnippetTitle}\``,
        attachments: [
          {
            type: 'code',
            name: codeSnippetTitle,
            codeLang: codeSnippetLang,
            codeSnippet: codeSnippetContent,
          },
        ],
      });
      setCodeModalOpen(false);
      setCodeSnippetContent('');
      fetchMessages();
    } catch (err: any) {
      alert(`Failed to share code: ${err.message}`);
    }
  };

  // Voice Note Recording Simulator
  const handleStartVoiceRecording = () => {
    setIsRecordingVoice(true);
    setVoiceSeconds(0);
    const interval = setInterval(() => {
      setVoiceSeconds((prev) => {
        if (prev >= 12) {
          clearInterval(interval);
          return prev;
        }
        return prev + 1;
      });
    }, 1000);
  };

  const handleSendVoiceNote = async () => {
    setIsRecordingVoice(false);
    if (!selectedChannelId) return;

    try {
      await api.channels.sendMessage(selectedChannelId, {
        content: `🎙️ Voice Memo (${voiceSeconds || 7}s)`,
        attachments: [
          {
            type: 'voice',
            name: `Voice_Memo_${Date.now().toString().slice(-4)}.m4a`,
            audioDuration: voiceSeconds || 7,
          },
        ],
      });
      setVoiceSeconds(0);
      fetchMessages();
    } catch (err: any) {
      alert(`Failed to send voice memo: ${err.message}`);
    }
  };

  const handleTogglePin = async (messageId: string) => {
    try {
      await api.channels.togglePin(messageId);
      fetchMessages();
    } catch (err: any) {
      alert(`Pin toggle failed: ${err.message}`);
    }
  };

  const handleToggleReaction = async (messageId: string, emoji: string) => {
    try {
      await api.channels.toggleReaction(messageId, emoji);
      fetchMessages();
    } catch (err: any) {
      console.error('Reaction failed:', err);
    }
  };

  // Direct Message Creation
  const handleOpenDmModal = async () => {
    try {
      const users = await api.admin.listUsers();
      setOrgUsers(users.filter((u: any) => u.id !== currentUser?.id));
      setDmModalOpen(true);
    } catch (err: any) {
      alert(`Failed to load colleagues: ${err.message}`);
    }
  };

  const handleStartDmWithUser = async (userId: string) => {
    try {
      const dmChannel = await api.channels.createDm(userId);
      setDmModalOpen(false);
      onRefreshChannels();
      onSelectChannel(dmChannel.id);
    } catch (err: any) {
      alert(`Failed to open DM: ${err.message}`);
    }
  };

  const openConvertToIssueModal = (msg: any) => {
    setConvertingMessage(msg);
    setConvertProjectId(projects[0]?.id || '');
    setConvertTitle(msg.content.slice(0, 60));
    setConvertDescription(msg.content);
    setConvertType('task');
    setConvertPriority('medium');
  };

  const handleConfirmConvertToIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!convertingMessage) return;

    setConvertLoading(true);
    try {
      await api.channels.convertToIssue(convertingMessage.id, {
        projectId: convertProjectId,
        title: convertTitle,
        description: convertDescription,
        type: convertType,
        priority: convertPriority,
      });

      setConvertingMessage(null);
      alert('⚡ Message successfully converted into a Jira-class tracked issue!');
      fetchMessages();
      onRefreshChannels();
    } catch (err: any) {
      alert(`Conversion failed: ${err.message}`);
    } finally {
      setConvertLoading(false);
    }
  };

  if (!currentChannel) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-xs space-y-3">
        <MessageSquare className="w-10 h-10 text-slate-600" />
        <p>Select a team channel or start a Direct Message from the sidebar to begin collaborating.</p>
        <button
          onClick={handleOpenDmModal}
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center gap-2"
        >
          <UserPlus className="w-4 h-4" />
          <span>New Direct Message</span>
        </button>
      </div>
    );
  }

  const pinnedMessages = messages.filter((m) => m.isPinned);

  return (
    <div className="flex-1 flex h-full bg-[#0B0F17] overflow-hidden select-none relative">
      {/* Main Chat Center Column */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Channel Header Bar */}
        <div className="h-14 px-4 border-b border-white/10 flex items-center justify-between bg-[#0E131F]/80 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-2.5">
            {currentChannel.isDm ? (
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-xs text-white shadow">
                👤
              </div>
            ) : currentChannel.isPrivate ? (
              <Lock className="w-4 h-4 text-amber-400" />
            ) : (
              <Hash className="w-4 h-4 text-slate-400" />
            )}

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white">
                  {currentChannel.isDm
                    ? currentChannel.dmUserName || currentChannel.name.replace('dm-', 'Direct: ')
                    : `#${currentChannel.name}`}
                </h2>
                {currentChannel.isDm && (
                  <span className="px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-semibold">
                    1-on-1 DM
                  </span>
                )}
              </div>
              {currentChannel.topic && (
                <p className="text-[11px] text-slate-400 truncate max-w-sm sm:max-w-md">
                  {currentChannel.topic}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Channel Video Huddle Button */}
            <button
              onClick={() => onStartHuddle && onStartHuddle(currentChannel)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-xs font-semibold text-white shadow-lg shadow-emerald-600/25 transition"
              title="Start instant video huddle in this channel"
            >
              <Video className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Start Huddle</span>
            </button>

            {/* Direct Message Starter */}
            <button
              onClick={handleOpenDmModal}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition"
              title="Start Direct Message"
            >
              <UserPlus className="w-3.5 h-3.5" />
            </button>

            {/* Channel Members Toggle */}
            <button
              onClick={() => setMembersDrawerOpen(!membersDrawerOpen)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium border transition ${
                membersDrawerOpen
                  ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/40'
                  : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden md:inline">{channelMembers.length || 3} Members</span>
            </button>
          </div>
        </div>

        {/* Pinned Messages Banner (If any) */}
        {pinnedMessages.length > 0 && (
          <div className="px-4 py-2 bg-indigo-950/30 border-b border-indigo-500/20 flex items-center justify-between text-xs text-indigo-200">
            <div className="flex items-center gap-2 truncate">
              <Pin className="w-3.5 h-3.5 text-indigo-400 shrink-0 fill-indigo-400" />
              <span className="font-semibold text-indigo-300 shrink-0">Pinned Announcement:</span>
              <span className="truncate">{pinnedMessages[0].content}</span>
            </div>
            <button
              onClick={() => handleTogglePin(pinnedMessages[0].id)}
              className="text-[11px] text-indigo-400 hover:underline shrink-0 ml-2"
            >
              Unpin
            </button>
          </div>
        )}

        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start gap-3 group hover:bg-white/[0.02] p-2.5 rounded-2xl transition relative ${
                msg.isPinned ? 'bg-indigo-950/15 border-l-2 border-indigo-500' : ''
              }`}
            >
              <div className="w-8 h-8 rounded-full bg-slate-700 border border-white/10 flex items-center justify-center text-sm shrink-0 shadow">
                {msg.sender_avatar || msg.senderAvatar || '👤'}
              </div>

              <div className="flex-1 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white">
                    {msg.sender_name || msg.senderName}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {new Date(msg.created_at || msg.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>

                  {msg.isPinned && (
                    <span className="flex items-center gap-1 text-[10px] text-indigo-400 font-semibold">
                      <Pin className="w-2.5 h-2.5 fill-indigo-400" />
                      Pinned
                    </span>
                  )}

                  {msg.linked_issue_key && (
                    <span className="px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-mono font-bold">
                      Linked: {msg.linked_issue_key}
                    </span>
                  )}
                </div>

                <div className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">
                  {msg.content}
                </div>

                {/* Attachments (Code snippet, Voice note, Files) */}
                {msg.attachments?.map((att: any, i: number) => (
                  <div key={i} className="mt-2">
                    {att.type === 'code' && (
                      <div className="max-w-xl rounded-xl bg-[#070A0F] border border-white/10 p-3 font-mono text-xs overflow-x-auto space-y-2">
                        <div className="flex items-center justify-between text-[11px] text-slate-400 border-b border-white/10 pb-1.5">
                          <span className="font-semibold text-indigo-300 flex items-center gap-1.5">
                            <Code className="w-3.5 h-3.5" />
                            {att.name}
                          </span>
                          <span className="uppercase text-[10px]">{att.codeLang}</span>
                        </div>
                        <pre className="text-slate-300 whitespace-pre leading-relaxed text-[11px]">
                          {att.codeSnippet}
                        </pre>
                      </div>
                    )}

                    {att.type === 'voice' && (
                      <div className="max-w-xs rounded-xl bg-gradient-to-r from-indigo-900/40 to-slate-900 border border-indigo-500/30 p-2.5 flex items-center gap-3 shadow">
                        <button className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white shrink-0 shadow-md">
                          <Play className="w-3.5 h-3.5 ml-0.5 fill-white" />
                        </button>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-0.5 h-4">
                            {[4, 8, 12, 6, 14, 10, 8, 16, 12, 6, 10, 4, 8, 12].map((h, idx) => (
                              <span
                                key={idx}
                                className="w-1 bg-indigo-400 rounded-full"
                                style={{ height: `${h}px` }}
                              />
                            ))}
                          </div>
                          <div className="flex justify-between text-[10px] text-slate-400">
                            <span>{att.name}</span>
                            <span>{att.audioDuration || 7}s</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {/* Reactions and Reply Counts */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  {msg.reactions?.map((rx: any) => (
                    <button
                      key={rx.emoji}
                      onClick={() => handleToggleReaction(msg.id, rx.emoji)}
                      className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] border transition ${
                        rx.userIds?.includes(currentUser?.id)
                          ? 'bg-indigo-600/30 border-indigo-500/50 text-indigo-300'
                          : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      <span>{rx.emoji}</span>
                      <span className="font-semibold">{rx.count}</span>
                    </button>
                  ))}

                  {/* Quick Reactions Bar */}
                  <div className="opacity-0 group-hover:opacity-100 transition flex items-center gap-1">
                    {['👍', '🚀', '🔥', '❤️', '🎉', '👀'].map((em) => (
                      <button
                        key={em}
                        onClick={() => handleToggleReaction(msg.id, em)}
                        className="p-1 rounded hover:bg-white/10 text-xs text-slate-400 hover:text-white transition"
                      >
                        {em}
                      </button>
                    ))}
                  </div>

                  {/* Thread Replies Button */}
                  <button
                    onClick={() => setActiveThreadMessage(msg)}
                    className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] font-medium text-slate-300 transition"
                  >
                    <MessageSquare className="w-3 h-3 text-indigo-400" />
                    <span>
                      {msg.reply_count || msg.replyCount
                        ? `${msg.reply_count || msg.replyCount} replies`
                        : 'Reply'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Message Action Bar (Hover Overlay) */}
              <div className="opacity-0 group-hover:opacity-100 transition absolute right-3 top-2 flex items-center gap-1 bg-[#131B2E] border border-white/10 rounded-xl p-1 shadow-xl">
                {/* Pin / Unpin Button */}
                <button
                  onClick={() => handleTogglePin(msg.id)}
                  className={`p-1.5 rounded-lg text-xs transition ${
                    msg.isPinned
                      ? 'text-indigo-400 bg-indigo-600/20'
                      : 'text-slate-400 hover:text-white hover:bg-white/10'
                  }`}
                  title={msg.isPinned ? 'Unpin message' : 'Pin message to channel banner'}
                >
                  <Pin className="w-3.5 h-3.5" />
                </button>

                {/* Reply in Thread */}
                <button
                  onClick={() => setActiveThreadMessage(msg)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
                  title="Reply in thread"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                </button>

                {/* Lark-to-Jira Message-to-Work Conversion */}
                {currentRole !== 'Guest' && (
                  <button
                    onClick={() => openConvertToIssueModal(msg)}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-[11px] font-semibold text-indigo-300 transition"
                    title="Convert this chat message directly into a tracked Jira issue"
                  >
                    <Zap className="w-3 h-3 text-indigo-400" />
                    <span>To Issue</span>
                  </button>
                )}
              </div>
            </div>
          ))}

          {messages.length === 0 && (
            <div className="h-64 flex flex-col items-center justify-center text-slate-500 space-y-2">
              <MessageSquare className="w-8 h-8 text-slate-600" />
              <p className="text-xs">No messages yet. Send a message to start the conversation!</p>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Live Typing Indicator */}
        {typingUsers.length > 0 && (
          <div className="px-4 py-1.5 text-[11px] text-slate-400 flex items-center gap-1.5 italic bg-[#0E131F]/50">
            <span className="flex items-center gap-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" />
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce delay-100" />
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce delay-200" />
            </span>
            <span>{typingUsers.join(', ')} is typing...</span>
          </div>
        )}

        {/* Rich Message Composer Bar */}
        <div className="p-4 border-t border-white/10 bg-[#0E131F]/90">
          {/* Voice recording preview banner */}
          {isRecordingVoice && (
            <div className="mb-2 p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-between text-xs text-rose-300 animate-pulse">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-rose-400" />
                <span>Recording voice memo... ({voiceSeconds}s)</span>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsRecordingVoice(false)}
                  className="px-2 py-1 rounded bg-white/10 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSendVoiceNote}
                  className="px-3 py-1 rounded bg-rose-600 hover:bg-rose-500 font-bold text-white shadow"
                >
                  Send Voice
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleSendMessage} className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="text"
                disabled={currentRole === 'Guest'}
                placeholder={
                  currentRole === 'Guest'
                    ? 'Guest role is read-only in this channel'
                    : `Message ${currentChannel.isDm ? currentChannel.name : '#' + currentChannel.name}...`
                }
                value={inputText}
                onChange={handleInputChange}
                className="flex-1 bg-white/[0.04] border border-white/10 rounded-2xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition disabled:opacity-50"
              />

              <button
                type="submit"
                disabled={!inputText.trim() || currentRole === 'Guest'}
                className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-xs font-semibold text-white transition flex items-center gap-1.5 shadow-lg shadow-indigo-600/25"
              >
                <Send className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Send</span>
              </button>
            </div>

            {/* Rich Action Buttons under input */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-1.5">
                {/* Code Snippet Modal Button */}
                <button
                  type="button"
                  onClick={() => setCodeModalOpen(true)}
                  disabled={currentRole === 'Guest'}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition text-xs flex items-center gap-1"
                  title="Share Code Snippet"
                >
                  <Code className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="hidden sm:inline text-[11px]">Code</span>
                </button>

                {/* Voice Memo Button */}
                <button
                  type="button"
                  onClick={handleStartVoiceRecording}
                  disabled={currentRole === 'Guest' || isRecordingVoice}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition text-xs flex items-center gap-1"
                  title="Record Voice Memo"
                >
                  <Mic className="w-3.5 h-3.5 text-rose-400" />
                  <span className="hidden sm:inline text-[11px]">Voice</span>
                </button>

                {/* Instant Huddle Launcher */}
                <button
                  type="button"
                  onClick={() => onStartHuddle && onStartHuddle(currentChannel)}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition text-xs flex items-center gap-1"
                  title="Launch Video Huddle"
                >
                  <Video className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden sm:inline text-[11px]">Huddle</span>
                </button>
              </div>

              <div className="text-[11px] text-slate-500">
                Press Enter to send
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Thread Drawer (When user clicks reply in thread) */}
      {activeThreadMessage && (
        <ThreadDrawer
          channelId={selectedChannelId}
          parentMessage={activeThreadMessage}
          currentUser={currentUser}
          currentRole={currentRole}
          onClose={() => setActiveThreadMessage(null)}
          onReplyAdded={fetchMessages}
        />
      )}

      {/* Channel Members Drawer */}
      {membersDrawerOpen && (
        <aside className="w-72 border-l border-white/10 bg-[#0E131F] flex flex-col h-full shadow-2xl z-30 select-none">
          <div className="h-14 px-4 border-b border-white/10 flex items-center justify-between bg-[#131B2E]">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Channel Members</h3>
            </div>
            <button
              onClick={() => setMembersDrawerOpen(false)}
              className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {channelMembers.map((m) => (
              <div
                key={m.id}
                className="p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 flex items-center justify-between transition"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-xs">
                    {m.avatarUrl || '👤'}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white">{m.fullName}</div>
                    <div className="text-[10px] text-slate-400">{m.email}</div>
                  </div>
                </div>

                <span className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] text-slate-300">
                  {m.role}
                </span>
              </div>
            ))}
          </div>
        </aside>
      )}

      {/* New Direct Message Modal */}
      {dmModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#131B2E] border border-white/10 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Start Direct Message</h3>
                  <p className="text-[11px] text-slate-400">1-on-1 private conversation with a colleague</p>
                </div>
              </div>
              <button
                onClick={() => setDmModalOpen(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {orgUsers.map((u) => (
                <button
                  key={u.id}
                  onClick={() => handleStartDmWithUser(u.id)}
                  className="w-full p-2.5 rounded-xl bg-white/[0.03] hover:bg-indigo-600/20 border border-white/5 hover:border-indigo-500/30 text-left flex items-center justify-between transition group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-sm">
                      {u.avatar_url || '👤'}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-white group-hover:text-indigo-300">
                        {u.full_name}
                      </div>
                      <div className="text-[11px] text-slate-400">{u.email}</div>
                    </div>
                  </div>
                  <span className="text-xs text-indigo-400 group-hover:translate-x-1 transition">
                    Message →
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Code Snippet Composer Modal */}
      {codeModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-[#131B2E] border border-white/10 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
                  <Code className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Share Code Snippet</h3>
                  <p className="text-[11px] text-slate-400">Post syntax-highlighted code block to channel</p>
                </div>
              </div>
              <button
                onClick={() => setCodeModalOpen(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSendCodeSnippet} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">
                    Filename / Title
                  </label>
                  <input
                    type="text"
                    value={codeSnippetTitle}
                    onChange={(e) => setCodeSnippetTitle(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">
                    Language
                  </label>
                  <select
                    value={codeSnippetLang}
                    onChange={(e) => setCodeSnippetLang(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white"
                  >
                    <option value="typescript">TypeScript</option>
                    <option value="javascript">JavaScript</option>
                    <option value="python">Python</option>
                    <option value="sql">SQL</option>
                    <option value="json">JSON</option>
                    <option value="bash">Bash / Shell</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">
                  Code Content
                </label>
                <textarea
                  rows={8}
                  required
                  placeholder="// Paste your code here..."
                  value={codeSnippetContent}
                  onChange={(e) => setCodeSnippetContent(e.target.value)}
                  className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-xs text-emerald-400 font-mono focus:outline-none focus:border-indigo-500 leading-relaxed"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setCodeModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!codeSnippetContent.trim()}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-xs font-semibold text-white shadow-lg shadow-indigo-600/30"
                >
                  Post Code Snippet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lark "Message-to-Work" Conversion Review Modal */}
      {convertingMessage && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-[#131B2E] border border-white/10 p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-600/30 flex items-center justify-center text-indigo-400">
                  <Zap className="w-4 h-4 fill-indigo-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Message-to-Work Bridge</h3>
                  <p className="text-[11px] text-slate-400">Review and confirm candidate issue extraction</p>
                </div>
              </div>
              <button
                onClick={() => setConvertingMessage(null)}
                className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmConvertToIssue} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">Target Project</label>
                <select
                  value={convertProjectId}
                  onChange={(e) => setConvertProjectId(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.key})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">Issue Title</label>
                <input
                  type="text"
                  required
                  value={convertTitle}
                  onChange={(e) => setConvertTitle(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">Description (From Chat)</label>
                <textarea
                  rows={3}
                  value={convertDescription}
                  onChange={(e) => setConvertDescription(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">Issue Type</label>
                  <select
                    value={convertType}
                    onChange={(e) => setConvertType(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  >
                    <option value="story">Story</option>
                    <option value="task">Task</option>
                    <option value="bug">Bug</option>
                    <option value="epic">Epic</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">Priority</label>
                  <select
                    value={convertPriority}
                    onChange={(e) => setConvertPriority(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  >
                    <option value="urgent">Urgent</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setConvertingMessage(null)}
                  className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={convertLoading}
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-lg shadow-indigo-600/30 disabled:opacity-50 flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{convertLoading ? 'Converting...' : 'Confirm & Create Issue'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
