import React from 'react';
import { Maximize2, Mic, MicOff, PhoneOff, Video, VideoOff } from 'lucide-react';

interface FloatingMeetingWidgetProps {
  meeting: any;
  currentUser: any;
  onExpand: () => void;
  onLeave: () => void;
}

export const FloatingMeetingWidget: React.FC<FloatingMeetingWidgetProps> = ({
  meeting,
  currentUser,
  onExpand,
  onLeave,
}) => {
  if (!meeting) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 w-72 rounded-2xl bg-[#111726]/95 border border-indigo-500/40 shadow-2xl backdrop-blur-xl overflow-hidden select-none animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Top bar */}
      <div className="px-3 py-2 bg-[#0E131F] border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-1.5 truncate">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <span className="text-xs font-bold text-white truncate max-w-[140px]">{meeting.title}</span>
        </div>

        <button
          onClick={onExpand}
          className="p-1 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition"
          title="Expand to Full Meeting"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Mini Video / Audio Feed */}
      <div className="relative aspect-video bg-[#070A0F] flex flex-col items-center justify-center p-3">
        <div className="relative">
          <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-indigo-500 to-emerald-400 p-0.5">
            <div className="w-full h-full rounded-full bg-[#0E131F] flex items-center justify-center text-xl">
              {currentUser?.avatarUrl || '👤'}
            </div>
          </div>
          <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
            <span className="w-1.5 h-1.5 bg-black rounded-full" />
          </span>
        </div>

        <span className="text-[11px] font-medium text-slate-300 mt-2 truncate max-w-[180px]">
          {currentUser?.fullName} (Active Session)
        </span>

        {/* Audio Equalizer visualizer */}
        <div className="flex items-center gap-1 mt-1">
          <span className="w-1 h-2 bg-emerald-400 rounded-full animate-pulse" />
          <span className="w-1 h-3.5 bg-emerald-400 rounded-full animate-pulse delay-75" />
          <span className="w-1 h-1.5 bg-emerald-400 rounded-full animate-pulse delay-150" />
          <span className="w-1 h-3 bg-emerald-400 rounded-full animate-pulse delay-100" />
        </div>
      </div>

      {/* Mini Control Footer */}
      <div className="p-2 border-t border-white/10 flex items-center justify-between bg-[#0E131F]">
        <button
          onClick={onExpand}
          className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-[11px] font-semibold text-white transition flex items-center gap-1 shadow-md shadow-indigo-600/20"
        >
          <Video className="w-3 h-3" />
          <span>Expand View</span>
        </button>

        <button
          onClick={onLeave}
          className="p-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white transition shadow-md shadow-rose-600/20"
          title="Leave Meeting"
        >
          <PhoneOff className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
