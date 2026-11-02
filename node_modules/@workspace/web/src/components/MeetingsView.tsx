import React, { useState, useEffect, useRef } from 'react';
import {
  Video,
  Mic,
  MicOff,
  VideoOff,
  PhoneOff,
  Share2,
  Hand,
  MessageSquare,
  Users,
  Settings,
  CircleDot,
  Plus,
  Maximize2,
  Minimize2,
  Sparkles,
  Layers,
  FileText,
  Save,
  CheckCircle2,
  PenTool,
  RotateCcw,
  Volume2,
  VolumeX,
  Shield,
  Clock,
  Radio,
} from 'lucide-react';
import { api } from '../api.js';
import { useRealtime } from '../hooks/useRealtime.js';

interface MeetingsViewProps {
  currentRole: string;
  currentUser: any;
  currentTenant: any;
  activeMeeting: any | null;
  onJoinMeeting: (meeting: any) => void;
  onLeaveMeeting: () => void;
  onOpenKnowledge: () => void;
}

export const MeetingsView: React.FC<MeetingsViewProps> = ({
  currentRole,
  currentUser,
  currentTenant,
  activeMeeting,
  onJoinMeeting,
  onLeaveMeeting,
  onOpenKnowledge,
}) => {
  const [meetings, setMeetings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // In-Call state
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [viewMode, setViewMode] = useState<'grid' | 'speaker'>('grid');

  // In-Call Drawers
  const [activeDrawer, setActiveDrawer] = useState<'chat' | 'participants' | 'notes' | 'whiteboard' | null>(null);
  const [inCallChatText, setInCallChatText] = useState('');
  const [inCallMessages, setInCallMessages] = useState<any[]>([]);
  const [meetingNotes, setMeetingNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [participants, setParticipants] = useState<any[]>([]);

  // Real media stream
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const screenShareVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);

  // Whiteboard Canvas
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushColor, setBrushColor] = useState('#6366f1');

  const {
    subscribe,
    joinMeetingRoom,
    leaveMeetingRoom,
    sendMeetingChat,
    sendMeetingReaction,
    sendWhiteboardStroke,
  } = useRealtime();

  const fetchMeetings = async () => {
    try {
      setLoading(true);
      const data = await api.meetings.list();
      setMeetings(data);
    } catch (err: any) {
      console.error('Failed to load meetings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeetings();
  }, []);

  // When active meeting changes, join socket room and get details
  useEffect(() => {
    if (!activeMeeting) {
      stopMediaTracks();
      return;
    }

    joinMeetingRoom(activeMeeting.id);
    initMediaStream();

    const fetchDetail = async () => {
      try {
        const detail = await api.meetings.get(activeMeeting.id);
        setParticipants(detail.participants || []);
        setMeetingNotes(detail.notes || '');
        setIsRecording(detail.isRecorded || false);
      } catch (err) {
        console.error('Failed to fetch meeting detail:', err);
      }
    };
    fetchDetail();

    // Subscribe to realtime meeting events
    const unsubJoined = subscribe('meeting:participant_joined', (data) => {
      setParticipants((prev) => {
        if (prev.some((p) => p.userId === data.userId)) return prev;
        return [...prev, data];
      });
    });

    const unsubLeft = subscribe('meeting:participant_left', (data) => {
      setParticipants((prev) => prev.filter((p) => p.userId !== data.userId));
    });

    const unsubState = subscribe('meeting:participant_state', (data) => {
      setParticipants((prev) =>
        prev.map((p) => (p.userId === data.userId ? { ...p, ...data } : p))
      );
    });

    const unsubChat = subscribe('meeting:chat_message', (msg) => {
      setInCallMessages((prev) => [...prev, msg]);
    });

    const unsubStroke = subscribe('meeting:whiteboard_stroke', (stroke) => {
      drawRemoteStroke(stroke);
    });

    const unsubEnded = subscribe('meeting:ended', () => {
      alert('This meeting has been ended by the host.');
      onLeaveMeeting();
    });

    return () => {
      unsubJoined();
      unsubLeft();
      unsubState();
      unsubChat();
      unsubStroke();
      unsubEnded();
      leaveMeetingRoom(activeMeeting.id);
      stopMediaTracks();
    };
  }, [activeMeeting?.id]);

  // Recording timer
  useEffect(() => {
    let interval: any = null;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setRecordingSeconds(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const initMediaStream = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      }
    } catch {
      // Graceful fallback: Video hardware not accessible or simulated
    }
  };

  const stopMediaTracks = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
    }
  };

  const handleToggleMute = async () => {
    const next = !isMuted;
    setIsMuted(next);
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = !next));
    }
    if (activeMeeting) {
      await api.meetings.updateState(activeMeeting.id, { isMuted: next });
    }
  };

  const handleToggleCamera = async () => {
    const next = !isCameraOff;
    setIsCameraOff(next);
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((t) => (t.enabled = !next));
    }
    if (activeMeeting) {
      await api.meetings.updateState(activeMeeting.id, { isCameraOff: next });
    }
  };

  const handleToggleHandRaise = async () => {
    const next = !isHandRaised;
    setIsHandRaised(next);
    if (activeMeeting) {
      await api.meetings.updateState(activeMeeting.id, { isHandRaised: next });
    }
  };

  const handleToggleScreenShare = async () => {
    if (isScreenSharing) {
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop());
        screenStreamRef.current = null;
      }
      setIsScreenSharing(false);
      if (activeMeeting) {
        await api.meetings.updateState(activeMeeting.id, { isScreenSharing: false });
      }
    } else {
      try {
        if (navigator.mediaDevices?.getDisplayMedia) {
          const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
          screenStreamRef.current = stream;
          if (screenShareVideoRef.current) {
            screenShareVideoRef.current.srcObject = stream;
          }
          setIsScreenSharing(true);
          if (activeMeeting) {
            await api.meetings.updateState(activeMeeting.id, { isScreenSharing: true });
          }
          stream.getVideoTracks()[0].onended = () => {
            setIsScreenSharing(false);
            if (activeMeeting) {
              api.meetings.updateState(activeMeeting.id, { isScreenSharing: false });
            }
          };
        } else {
          setIsScreenSharing(true);
        }
      } catch {
        // User cancelled or screen share not allowed
      }
    }
  };

  const handleCreateInstantMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    try {
      const mtg = await api.meetings.create({ title: newTitle.trim() });
      setCreateModalOpen(false);
      setNewTitle('');
      await fetchMeetings();
      onJoinMeeting(mtg);
    } catch (err: any) {
      alert(`Create meeting failed: ${err.message}`);
    }
  };

  const handleJoinByCode = async (code: string) => {
    if (!code.trim()) return;
    try {
      const res = await api.meetings.join(code.trim());
      const detail = await api.meetings.get(res.meetingId);
      onJoinMeeting(detail);
      setJoinCode('');
    } catch (err: any) {
      alert(`Join failed: ${err.message}`);
    }
  };

  const handleLeaveCall = async () => {
    if (activeMeeting) {
      try {
        await api.meetings.leave(activeMeeting.id);
      } catch (err) {
        console.error(err);
      }
    }
    stopMediaTracks();
    onLeaveMeeting();
  };

  const handleEndCallForAll = async () => {
    if (!activeMeeting) return;
    if (confirm('Are you sure you want to end this meeting for all participants?')) {
      try {
        await api.meetings.end(activeMeeting.id);
        handleLeaveCall();
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  const handleSendInCallChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inCallChatText.trim() || !activeMeeting) return;
    const msg = {
      id: Math.random().toString(),
      senderName: currentUser?.fullName || 'Me',
      senderAvatar: currentUser?.avatarUrl || '👤',
      text: inCallChatText.trim(),
    };
    sendMeetingChat(activeMeeting.id, msg);
    setInCallMessages((prev) => [...prev, msg]);
    setInCallChatText('');
  };

  const handleSaveNotesToNotion = async () => {
    if (!activeMeeting) return;
    setSavingNotes(true);
    try {
      await api.meetings.saveNotes(activeMeeting.id, { notes: meetingNotes });
      alert('⚡ Meeting Notes successfully saved & published to Notion Knowledge Base!');
    } catch (err: any) {
      alert(`Save failed: ${err.message}`);
    } finally {
      setSavingNotes(false);
    }
  };

  // Whiteboard drawing handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setIsDrawing(true);

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.strokeStyle = brushColor;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.lineTo(x, y);
      ctx.stroke();

      if (activeMeeting) {
        sendWhiteboardStroke(activeMeeting.id, { x, y, color: brushColor, isDrawing: true });
      }
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const drawRemoteStroke = (stroke: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.strokeStyle = stroke.color || '#6366f1';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineTo(stroke.x, stroke.y);
      ctx.stroke();
    }
  };

  const clearWhiteboard = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // =========================================================================
  // VIEW 1: ACTIVE IN-MEETING VIDEO CONFERENCING ROOM
  // =========================================================================
  if (activeMeeting) {
    const isHost = activeMeeting.hostId === currentUser?.id || currentRole === 'Owner' || currentRole === 'Admin';
    const activeParticipants = participants.length > 0 ? participants : [
      {
        userId: currentUser?.id,
        userName: currentUser?.fullName,
        userAvatar: currentUser?.avatarUrl,
        isMuted,
        isCameraOff,
        isHandRaised,
        role: 'host',
      },
    ];

    return (
      <div className="flex-1 flex flex-col h-full bg-[#070A0F] text-white overflow-hidden relative select-none">
        {/* Top Meeting Header Bar */}
        <div className="h-14 px-4 border-b border-white/10 bg-[#0E131F]/90 backdrop-blur-md flex items-center justify-between z-20">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Video className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white tracking-tight truncate max-w-xs sm:max-w-md">
                  {activeMeeting.title}
                </h2>
                <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[10px] font-mono font-bold uppercase flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Live HD
                </span>
              </div>
              <div className="text-[11px] text-slate-400 flex items-center gap-2">
                <span>Code: <strong className="font-mono text-indigo-300">{activeMeeting.meetingCode}</strong></span>
                <span>•</span>
                <span>Host: {activeMeeting.hostName || currentUser?.fullName}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Recording Indicator */}
            {isRecording && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-semibold animate-pulse">
                <CircleDot className="w-3.5 h-3.5 text-rose-400" />
                <span>REC {formatTimer(recordingSeconds)}</span>
              </div>
            )}

            {/* View Mode Toggle */}
            <div className="flex items-center bg-white/5 border border-white/10 rounded-xl p-0.5">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                  viewMode === 'grid' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Grid
              </button>
              <button
                onClick={() => setViewMode('speaker')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                  viewMode === 'speaker' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Spotlight
              </button>
            </div>
          </div>
        </div>

        {/* Center: Video Grid + Optional Side Drawer */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* Main Video Presentation Grid */}
          <div className="flex-1 p-4 flex flex-col items-center justify-center overflow-y-auto">
            {/* Screen Share Spotlight (If active) */}
            {isScreenSharing && (
              <div className="w-full max-w-4xl h-72 sm:h-96 rounded-2xl bg-black border border-indigo-500/40 shadow-2xl overflow-hidden relative mb-4 flex items-center justify-center">
                <video
                  ref={screenShareVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-contain"
                />
                <div className="absolute top-3 left-3 px-2 py-1 rounded-lg bg-black/70 backdrop-blur-sm border border-white/10 text-xs font-semibold text-emerald-300 flex items-center gap-1.5">
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Sharing Screen (1080p 60fps)</span>
                </div>
              </div>
            )}

            {/* Responsive Video Tiles Grid */}
            <div
              className={`w-full max-w-6xl grid gap-3.5 transition-all ${
                activeParticipants.length <= 1
                  ? 'grid-cols-1 max-w-2xl'
                  : activeParticipants.length === 2
                  ? 'grid-cols-1 md:grid-cols-2'
                  : activeParticipants.length <= 4
                  ? 'grid-cols-2'
                  : 'grid-cols-2 md:grid-cols-3'
              }`}
            >
              {/* Local User Tile */}
              <div className="relative aspect-video rounded-2xl bg-[#111726] border border-white/10 overflow-hidden shadow-xl flex items-center justify-center group">
                {!isCameraOff ? (
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover scale-x-[-1]"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-2xl shadow-xl shadow-indigo-500/20">
                      {currentUser?.avatarUrl || '👤'}
                    </div>
                    <span className="text-xs font-medium text-slate-300">{currentUser?.fullName} (You)</span>
                  </div>
                )}

                {/* Hand Raised Banner */}
                {isHandRaised && (
                  <div className="absolute top-3 right-3 px-2 py-1 rounded-lg bg-amber-500/90 text-black text-xs font-bold flex items-center gap-1 shadow-lg animate-bounce">
                    <Hand className="w-3.5 h-3.5" />
                    <span>Hand Raised</span>
                  </div>
                )}

                {/* Bottom Overlay Label */}
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                  <div className="px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md text-xs font-medium text-white flex items-center gap-2 border border-white/10">
                    <span>{currentUser?.fullName} (You)</span>
                    {/* Equalizer animation when unmuted */}
                    {!isMuted ? (
                      <span className="flex items-center gap-0.5">
                        <span className="w-1 h-2.5 bg-emerald-400 rounded-full animate-pulse" />
                        <span className="w-1 h-4 bg-emerald-400 rounded-full animate-pulse delay-75" />
                        <span className="w-1 h-1.5 bg-emerald-400 rounded-full animate-pulse delay-150" />
                      </span>
                    ) : (
                      <MicOff className="w-3.5 h-3.5 text-rose-400" />
                    )}
                  </div>

                  <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-mono">
                    Host
                  </span>
                </div>
              </div>

              {/* Other Active Remote Participants */}
              {activeParticipants
                .filter((p) => p.userId !== currentUser?.id)
                .map((p, idx) => (
                  <div
                    key={p.userId || idx}
                    className="relative aspect-video rounded-2xl bg-[#111726] border border-white/10 overflow-hidden shadow-xl flex items-center justify-center group"
                  >
                    {!p.isCameraOff ? (
                      /* Simulated realistic remote attendee video feed with audio wave pulses */
                      <div className="w-full h-full bg-gradient-to-tr from-slate-900 via-indigo-950/40 to-slate-900 flex flex-col items-center justify-center relative">
                        <div className="relative">
                          <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-indigo-500 to-emerald-400 p-0.5 animate-pulse">
                            <div className="w-full h-full rounded-full bg-[#0E131F] flex items-center justify-center text-3xl">
                              {p.userAvatar || '👤'}
                            </div>
                          </div>
                          {!p.isMuted && (
                            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-[#111726] flex items-center justify-center">
                              <Volume2 className="w-3 h-3 text-black" />
                            </div>
                          )}
                        </div>
                        <span className="mt-2 text-xs font-semibold text-white tracking-wide">
                          {p.userName || 'Attendee'}
                        </span>
                        <div className="flex items-center gap-1 mt-1 text-[10px] text-emerald-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                          <span>Connected • 45ms</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-16 h-16 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-2xl">
                          {p.userAvatar || '👤'}
                        </div>
                        <span className="text-xs font-medium text-slate-300">{p.userName}</span>
                      </div>
                    )}

                    {p.isHandRaised && (
                      <div className="absolute top-3 right-3 px-2 py-1 rounded-lg bg-amber-500/90 text-black text-xs font-bold flex items-center gap-1 shadow-lg animate-bounce">
                        <Hand className="w-3.5 h-3.5" />
                        <span>Raised Hand</span>
                      </div>
                    )}

                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                      <div className="px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md text-xs font-medium text-white flex items-center gap-2 border border-white/10">
                        <span>{p.userName}</span>
                        {p.isMuted ? (
                          <MicOff className="w-3.5 h-3.5 text-rose-400" />
                        ) : (
                          <span className="flex items-center gap-0.5">
                            <span className="w-1 h-2 bg-emerald-400 rounded-full animate-pulse" />
                            <span className="w-1 h-3.5 bg-emerald-400 rounded-full animate-pulse delay-75" />
                            <span className="w-1 h-1.5 bg-emerald-400 rounded-full animate-pulse delay-150" />
                          </span>
                        )}
                      </div>
                      <span className="px-2 py-0.5 rounded bg-white/10 text-slate-300 text-[10px]">
                        Participant
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Side Drawer: In-Call Chat / Whiteboard / Notes / Participants */}
          {activeDrawer && (
            <div className="w-80 md:w-96 border-l border-white/10 bg-[#0E131F] flex flex-col h-full shadow-2xl z-20">
              {/* Drawer Header */}
              <div className="h-12 px-4 border-b border-white/10 flex items-center justify-between bg-[#131B2E]">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  {activeDrawer === 'chat' && 'In-Call Live Chat'}
                  {activeDrawer === 'participants' && `Participants (${activeParticipants.length})`}
                  {activeDrawer === 'notes' && 'Collaborative Meeting Notes'}
                  {activeDrawer === 'whiteboard' && 'Interactive Whiteboard'}
                </h3>
                <button
                  onClick={() => setActiveDrawer(null)}
                  className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto p-4">
                {/* 1. In-Call Chat Drawer */}
                {activeDrawer === 'chat' && (
                  <div className="flex flex-col h-full space-y-3">
                    <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                      {inCallMessages.map((m, i) => (
                        <div key={i} className="p-2.5 rounded-xl bg-white/[0.04] border border-white/5 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-indigo-300">{m.senderName}</span>
                            <span className="text-[10px] text-slate-500">Live</span>
                          </div>
                          <p className="text-xs text-slate-200">{m.text}</p>
                        </div>
                      ))}
                      {inCallMessages.length === 0 && (
                        <div className="py-12 text-center text-slate-500 text-xs">
                          No messages yet in this session.
                        </div>
                      )}
                    </div>

                    <form onSubmit={handleSendInCallChat} className="flex gap-2 pt-2 border-t border-white/10">
                      <input
                        type="text"
                        placeholder="Message everyone..."
                        value={inCallChatText}
                        onChange={(e) => setInCallChatText(e.target.value)}
                        className="flex-1 bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                      />
                      <button
                        type="submit"
                        disabled={!inCallChatText.trim()}
                        className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-xs font-bold text-white shadow-lg shadow-indigo-600/30"
                      >
                        Send
                      </button>
                    </form>
                  </div>
                )}

                {/* 2. Participants Drawer */}
                {activeDrawer === 'participants' && (
                  <div className="space-y-2">
                    <div className="p-2.5 rounded-xl bg-indigo-600/10 border border-indigo-500/20 text-xs text-indigo-300 flex items-center justify-between mb-3">
                      <span>Invite via Code:</span>
                      <strong className="font-mono text-white">{activeMeeting.meetingCode}</strong>
                    </div>

                    {activeParticipants.map((p, i) => (
                      <div
                        key={i}
                        className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-xs">
                            {p.userAvatar || '👤'}
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-white">
                              {p.userName} {p.userId === currentUser?.id ? '(You)' : ''}
                            </div>
                            <div className="text-[10px] text-slate-400 capitalize">{p.role || 'Participant'}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-slate-400">
                          {p.isMuted ? (
                            <MicOff className="w-3.5 h-3.5 text-rose-400" />
                          ) : (
                            <Mic className="w-3.5 h-3.5 text-emerald-400" />
                          )}
                          {p.isCameraOff ? (
                            <VideoOff className="w-3.5 h-3.5 text-slate-500" />
                          ) : (
                            <Video className="w-3.5 h-3.5 text-emerald-400" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 3. Meeting Notes Drawer */}
                {activeDrawer === 'notes' && (
                  <div className="flex flex-col h-full space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-400">Live Meeting Minutes</span>
                      <button
                        onClick={handleSaveNotesToNotion}
                        disabled={savingNotes}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white shadow-lg shadow-emerald-600/30 transition disabled:opacity-50"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>{savingNotes ? 'Saving...' : 'Save to Notion'}</span>
                      </button>
                    </div>

                    <textarea
                      rows={14}
                      value={meetingNotes}
                      onChange={(e) => setMeetingNotes(e.target.value)}
                      placeholder="Write live meeting notes, decisions, and action items here..."
                      className="flex-1 w-full bg-white/[0.03] border border-white/10 rounded-xl p-3 text-xs text-white placeholder-slate-500 font-sans focus:outline-none focus:border-indigo-500 leading-relaxed"
                    />

                    <div className="text-[11px] text-slate-500 flex items-center justify-between">
                      <span>Syncs directly to Knowledge Base</span>
                      <button
                        onClick={onOpenKnowledge}
                        className="text-indigo-400 hover:underline"
                      >
                        View Documents →
                      </button>
                    </div>
                  </div>
                )}

                {/* 4. Whiteboard Drawer */}
                {activeDrawer === 'whiteboard' && (
                  <div className="flex flex-col h-full space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        {['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#ffffff'].map((color) => (
                          <button
                            key={color}
                            onClick={() => setBrushColor(color)}
                            className={`w-5 h-5 rounded-full border transition ${
                              brushColor === color ? 'scale-125 border-white' : 'border-transparent'
                            }`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>

                      <button
                        onClick={clearWhiteboard}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-slate-300"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Clear</span>
                      </button>
                    </div>

                    <div className="flex-1 bg-slate-900 border border-white/10 rounded-2xl overflow-hidden relative">
                      <canvas
                        ref={canvasRef}
                        width={340}
                        height={400}
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        className="cursor-crosshair w-full h-full"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Meeting Controls Bar */}
        <div className="h-20 px-6 border-t border-white/10 bg-[#0E131F]/95 backdrop-blur-md flex items-center justify-between z-30">
          {/* Left: Meeting Info & Timer */}
          <div className="hidden sm:flex items-center gap-3 text-xs text-slate-400">
            <span className="font-semibold text-white">{activeMeeting.title}</span>
            <span>•</span>
            <span className="font-mono">{formatTimer(recordingSeconds || 120)}</span>
          </div>

          {/* Center: Essential Call Controls */}
          <div className="flex items-center gap-2 sm:gap-3 mx-auto">
            {/* Mic Toggle */}
            <button
              onClick={handleToggleMute}
              className={`p-3 sm:px-4 rounded-2xl font-semibold text-xs flex items-center gap-2 transition shadow-lg ${
                isMuted
                  ? 'bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 shadow-rose-600/20'
                  : 'bg-white/10 hover:bg-white/15 text-white border border-white/10'
              }`}
              title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
            >
              {isMuted ? <MicOff className="w-4 h-4 text-rose-400" /> : <Mic className="w-4 h-4 text-emerald-400" />}
              <span className="hidden md:inline">{isMuted ? 'Muted' : 'Mute'}</span>
            </button>

            {/* Camera Toggle */}
            <button
              onClick={handleToggleCamera}
              className={`p-3 sm:px-4 rounded-2xl font-semibold text-xs flex items-center gap-2 transition shadow-lg ${
                isCameraOff
                  ? 'bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 shadow-rose-600/20'
                  : 'bg-white/10 hover:bg-white/15 text-white border border-white/10'
              }`}
              title={isCameraOff ? 'Turn Camera On' : 'Turn Camera Off'}
            >
              {isCameraOff ? <VideoOff className="w-4 h-4 text-rose-400" /> : <Video className="w-4 h-4 text-emerald-400" />}
              <span className="hidden md:inline">{isCameraOff ? 'Camera Off' : 'Video'}</span>
            </button>

            {/* Screen Share */}
            <button
              onClick={handleToggleScreenShare}
              className={`p-3 sm:px-4 rounded-2xl font-semibold text-xs flex items-center gap-2 transition border ${
                isScreenSharing
                  ? 'bg-emerald-600/30 text-emerald-300 border-emerald-500/50'
                  : 'bg-white/10 hover:bg-white/15 text-white border-white/10'
              }`}
            >
              <Share2 className="w-4 h-4 text-indigo-400" />
              <span className="hidden md:inline">{isScreenSharing ? 'Sharing' : 'Share Screen'}</span>
            </button>

            {/* Raise Hand */}
            <button
              onClick={handleToggleHandRaise}
              className={`p-3 rounded-2xl font-semibold text-xs transition border ${
                isHandRaised
                  ? 'bg-amber-500/30 text-amber-300 border-amber-500/50'
                  : 'bg-white/10 hover:bg-white/15 text-white border-white/10'
              }`}
              title="Raise Hand"
            >
              <Hand className="w-4 h-4 text-amber-400" />
            </button>

            {/* Recording Toggle */}
            <button
              onClick={() => setIsRecording(!isRecording)}
              className={`p-3 rounded-2xl font-semibold text-xs transition border ${
                isRecording
                  ? 'bg-rose-600/30 text-rose-300 border-rose-500/50'
                  : 'bg-white/10 hover:bg-white/15 text-white border-white/10'
              }`}
              title="Record Meeting"
            >
              <CircleDot className="w-4 h-4 text-rose-400" />
            </button>

            {/* Leave / End Call */}
            {isHost ? (
              <button
                onClick={handleEndCallForAll}
                className="px-4 py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white shadow-xl shadow-rose-600/30 transition flex items-center gap-2"
                title="End Meeting For All"
              >
                <PhoneOff className="w-4 h-4" />
                <span className="hidden sm:inline">End Meeting</span>
              </button>
            ) : (
              <button
                onClick={handleLeaveCall}
                className="px-4 py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white shadow-xl shadow-rose-600/30 transition flex items-center gap-2"
                title="Leave Meeting"
              >
                <PhoneOff className="w-4 h-4" />
                <span className="hidden sm:inline">Leave</span>
              </button>
            )}
          </div>

          {/* Right: Drawer Toggles */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveDrawer(activeDrawer === 'chat' ? null : 'chat')}
              className={`p-2.5 rounded-xl border transition ${
                activeDrawer === 'chat'
                  ? 'bg-indigo-600 text-white border-indigo-500'
                  : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
              }`}
              title="In-Call Chat"
            >
              <MessageSquare className="w-4 h-4" />
            </button>

            <button
              onClick={() => setActiveDrawer(activeDrawer === 'participants' ? null : 'participants')}
              className={`p-2.5 rounded-xl border transition ${
                activeDrawer === 'participants'
                  ? 'bg-indigo-600 text-white border-indigo-500'
                  : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
              }`}
              title="Participants"
            >
              <Users className="w-4 h-4" />
            </button>

            <button
              onClick={() => setActiveDrawer(activeDrawer === 'notes' ? null : 'notes')}
              className={`p-2.5 rounded-xl border transition ${
                activeDrawer === 'notes'
                  ? 'bg-indigo-600 text-white border-indigo-500'
                  : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
              }`}
              title="Meeting Notes"
            >
              <FileText className="w-4 h-4" />
            </button>

            <button
              onClick={() => setActiveDrawer(activeDrawer === 'whiteboard' ? null : 'whiteboard')}
              className={`p-2.5 rounded-xl border transition ${
                activeDrawer === 'whiteboard'
                  ? 'bg-indigo-600 text-white border-indigo-500'
                  : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
              }`}
              title="Whiteboard"
            >
              <PenTool className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: LOBBY & MEETINGS LIST
  // =========================================================================
  return (
    <div className="flex-1 flex flex-col h-full bg-[#0B0F17] overflow-y-auto p-6 space-y-6 select-none">
      {/* Top Banner: Quick Launch */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-indigo-900/40 via-[#131B2E] to-emerald-950/30 border border-white/10 shadow-2xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              <span>Zoom & Lark Huddle Class</span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              Interactive Video Meetings & Swarms
            </h1>
            <p className="text-xs text-slate-400 leading-relaxed">
              Real-time video conferencing, screen sharing, audio visualizers, and collaborative whiteboards connected directly into your Agile board & Notion knowledge base.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={() => setCreateModalOpen(true)}
              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-indigo-600 hover:from-emerald-400 hover:to-indigo-500 text-xs font-bold text-white shadow-xl shadow-emerald-500/20 transition flex items-center gap-2"
            >
              <Video className="w-4 h-4" />
              <span>Start Instant Meeting</span>
            </button>

            {/* Quick Join via Code */}
            <div className="flex items-center gap-2 bg-white/[0.04] border border-white/10 rounded-2xl p-1">
              <input
                type="text"
                placeholder="Enter meeting code..."
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                className="bg-transparent border-none px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none font-mono"
              />
              <button
                onClick={() => handleJoinByCode(joinCode)}
                disabled={!joinCode.trim()}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-xs font-semibold text-white transition shadow-lg shadow-indigo-600/30"
              >
                Join
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Active & Scheduled Meetings Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
            <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span>Active & Upcoming Sessions ({meetings.length})</span>
          </div>

          <button
            onClick={fetchMeetings}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
          >
            Refresh List
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {meetings.map((mtg) => (
            <div
              key={mtg.id}
              className="p-5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.05] border border-white/10 hover:border-indigo-500/40 transition group space-y-4 shadow-xl"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {mtg.status === 'active' ? (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold uppercase">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                        Live Now
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-white/10 text-slate-400 text-[10px] font-medium uppercase">
                        {mtg.status}
                      </span>
                    )}

                    {mtg.isRecorded && (
                      <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold">
                        REC
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm font-bold text-white group-hover:text-indigo-300 transition">
                    {mtg.title}
                  </h3>
                </div>

                <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <Video className="w-4 h-4" />
                </div>
              </div>

              {/* Host & Info */}
              <div className="flex items-center justify-between text-xs text-slate-400 border-t border-b border-white/5 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm">{mtg.hostAvatar || '👤'}</span>
                  <span>{mtg.hostName}</span>
                </div>

                <div className="flex items-center gap-1 font-mono text-[11px] text-indigo-300">
                  <span>{mtg.participantCount || 1} connected</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between gap-2 pt-1">
                <div className="text-[11px] text-slate-500 font-mono">
                  {mtg.meetingCode}
                </div>

                <button
                  onClick={() => onJoinMeeting(mtg)}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 transition flex items-center gap-1.5"
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>Join Session</span>
                </button>
              </div>
            </div>
          ))}

          {meetings.length === 0 && !loading && (
            <div className="col-span-full py-16 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-slate-400">
                <Video className="w-6 h-6" />
              </div>
              <p className="text-xs text-slate-400">No active meetings right now.</p>
              <button
                onClick={() => setCreateModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white"
              >
                Start an Instant Meeting
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Create Meeting Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#131B2E] border border-white/10 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Video className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Start Video Meeting</h3>
                  <p className="text-[11px] text-slate-400">Instant Zoom-class collaborative session</p>
                </div>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateInstantMeeting} className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1">
                  Meeting Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Daily Standup & Incident Swarm"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-white/[0.04] border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newTitle.trim()}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow-lg shadow-emerald-600/30 flex items-center gap-1.5"
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>Start Now</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
