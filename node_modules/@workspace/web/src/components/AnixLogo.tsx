import React, { useState } from 'react';

// ========================================================
// 🌌 ANIX BESPOKE VECTOR WORDMARK
// Precision geometric vector typography with liquid metallic gradients,
// optical crown on 'I', quantum singularity starburst on 'X', and shimmer sweep.
// ========================================================
export const AnixWordmark: React.FC<{
  className?: string;
  isHovered?: boolean;
}> = ({ className = 'h-7', isHovered = false }) => {
  return (
    <div className={`relative inline-flex items-center select-none ${className}`}>
      {/* Ambient Atmospheric Bloom behind wordmark */}
      <div
        className={`absolute -inset-x-3 -inset-y-2 bg-gradient-to-r from-cyan-500/25 via-indigo-500/25 to-fuchsia-500/25 rounded-xl blur-lg pointer-events-none transition-all duration-500 ${
          isHovered ? 'opacity-100 scale-105' : 'opacity-40 scale-100'
        }`}
      />

      {/* Precision Handcrafted SVG Architectural Wordmark */}
      <svg
        viewBox="0 0 184 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-full w-auto overflow-visible drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)] filter transition-all duration-300"
      >
        <defs>
          {/* Liquid Metallic Platinum-Cyan Gradient */}
          <linearGradient id="wordmarkGradA" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="25%" stopColor="#A5F3FC" />
            <stop offset="65%" stopColor="#38BDF8" />
            <stop offset="100%" stopColor="#818CF8" />
          </linearGradient>

          {/* Liquid Cobalt-Indigo-Violet Gradient */}
          <linearGradient id="wordmarkGradN" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="20%" stopColor="#7DD3FC" />
            <stop offset="60%" stopColor="#6366F1" />
            <stop offset="100%" stopColor="#A855F7" />
          </linearGradient>

          {/* Luminous Quantum Pillar Gradient for 'I' */}
          <linearGradient id="wordmarkGradI" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#E0F2FE" />
            <stop offset="35%" stopColor="#38BDF8" />
            <stop offset="80%" stopColor="#818CF8" />
            <stop offset="100%" stopColor="#C084FC" />
          </linearGradient>

          {/* Crossbeam Gradient 1 for 'X' (Cyan to Cobalt) */}
          <linearGradient id="wordmarkBeamCyan" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="25%" stopColor="#00F2FE" />
            <stop offset="70%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#6366F1" />
          </linearGradient>

          {/* Crossbeam Gradient 2 for 'X' (Violet to Hot Pink) */}
          <linearGradient id="wordmarkBeamPink" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="40%" stopColor="#818CF8" />
            <stop offset="80%" stopColor="#EC4899" />
            <stop offset="100%" stopColor="#FFFFFF" />
          </linearGradient>

          {/* Radial Singularity Glow at X Nexus */}
          <radialGradient id="nexusRadialGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#00F2FE" stopOpacity="0.9" />
            <stop offset="45%" stopColor="#818CF8" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#6366F1" stopOpacity="0" />
          </radialGradient>

          {/* Shimmer Light Flare Sweep Mask */}
          <linearGradient id="anixShimmerGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0" />
            <stop offset="45%" stopColor="#FFFFFF" stopOpacity="0.15" />
            <stop offset="50%" stopColor="#FFFFFF" stopOpacity="0.85" />
            <stop offset="55%" stopColor="#FFFFFF" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </linearGradient>

          {/* Quantum Glow Filter */}
          <filter id="anixQuantumFilter" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* -------------------------------------------------------- */}
        {/* LETTER 'A': Architectural Delta Glyph                    */}
        {/* -------------------------------------------------------- */}
        <g className="transition-transform duration-300 group-hover:-translate-y-0.5">
          {/* Main Body with Cutout */}
          <path
            d="M8 42 L24 8 H32 L48 42 H39 L35.5 32 H20.5 L17 42 H8 Z M28 17 L35 31.5 H21 Z"
            fill="url(#wordmarkGradA)"
            fillRule="evenodd"
          />
          {/* Cyan Energy Crossbar Conduit */}
          <line
            x1="19"
            y1="31.5"
            x2="37"
            y2="31.5"
            stroke="#00F2FE"
            strokeWidth="2.2"
            strokeLinecap="round"
            opacity="0.95"
            filter="drop-shadow(0 0 4px #00F2FE)"
          />
          {/* Apex Micro Diamond Glint */}
          <polygon
            points="28,2 30.5,5.5 28,9 25.5,5.5"
            fill="#FFFFFF"
            filter="drop-shadow(0 0 5px #00F2FE)"
            className="animate-pulse"
          />
        </g>

        {/* -------------------------------------------------------- */}
        {/* LETTER 'N': Monolithic Dual Pylon with Bevel Slash        */}
        {/* -------------------------------------------------------- */}
        <g className="transition-transform duration-300 group-hover:-translate-y-0.5">
          <path
            d="M56 42 V8 H65.5 L90.5 33 V8 H100 V42 H90.5 L65.5 17 V42 H56 Z"
            fill="url(#wordmarkGradN)"
          />
          {/* Laser Highlight on Diagonal Cut */}
          <line
            x1="65.5"
            y1="8"
            x2="90.5"
            y2="33"
            stroke="#A5F3FC"
            strokeWidth="1.2"
            opacity="0.75"
          />
        </g>

        {/* -------------------------------------------------------- */}
        {/* LETTER 'I': Quantum Monolith Pillar & Crown Diamond      */}
        {/* -------------------------------------------------------- */}
        <g className="transition-transform duration-300 group-hover:-translate-y-0.5">
          {/* Pillar Body */}
          <rect
            x="112"
            y="15"
            width="11"
            height="27"
            rx="2"
            fill="url(#wordmarkGradI)"
          />
          {/* Center Light Channel */}
          <line
            x1="117.5"
            y1="18"
            x2="117.5"
            y2="39"
            stroke="#FFFFFF"
            strokeWidth="1.6"
            strokeLinecap="round"
            opacity="0.9"
            filter="drop-shadow(0 0 3px #38BDF8)"
          />
          {/* Floating Quantum Crown Gem */}
          <polygon
            points="117.5,2 121.5,7 117.5,12 113.5,7"
            fill="#00F2FE"
            filter="drop-shadow(0 0 6px #00F2FE)"
            className="animate-pulse"
          />
          <circle cx="117.5" cy="7" r="1.4" fill="#FFFFFF" />
        </g>

        {/* -------------------------------------------------------- */}
        {/* LETTER 'X': Hero Nexus Convergence Cross & Singularity   */}
        {/* -------------------------------------------------------- */}
        <g className="transition-transform duration-300 group-hover:-translate-y-0.5">
          {/* Beam 1: Top-Left to Bottom-Right */}
          <path
            d="M136 8 H146 L174 42 H164 L136 8 Z"
            fill="url(#wordmarkBeamCyan)"
          />
          {/* Beam 2: Top-Right to Bottom-Left */}
          <path
            d="M164 8 H174 L146 42 H136 L164 8 Z"
            fill="url(#wordmarkBeamPink)"
            opacity="0.92"
          />

          {/* EXACT MATHEMATICAL NEXUS INTERSECTION: Center at (155, 25) */}
          {/* 1. Atmospheric Radial Bloom */}
          <circle cx="155" cy="25" r="10" fill="url(#nexusRadialGlow)" />

          {/* 2. Four-Point Singularity Lens Flare Star */}
          <path
            d="M155 14 Q155 25 166 25 Q155 25 155 36 Q155 25 144 25 Q155 25 155 14 Z"
            fill="#FFFFFF"
            filter="url(#anixQuantumFilter)"
            className="animate-pulse"
          />

          {/* 3. Central Pure White Radiant Core */}
          <circle
            cx="155"
            cy="25"
            r="2.6"
            fill="#FFFFFF"
            filter="drop-shadow(0 0 6px #00F2FE)"
          />

          {/* 4. Peripheral Energy Ring */}
          <circle
            cx="155"
            cy="25"
            r="6.5"
            fill="none"
            stroke="#00F2FE"
            strokeWidth="0.9"
            strokeDasharray="2 2"
            opacity="0.8"
            className="animate-[spin_6s_linear_infinite]"
          />

          {/* Micro Accent Sparkles */}
          <text
            x="174"
            y="12"
            fill="#EC4899"
            fontSize="8"
            className="select-none animate-[anix-sparkle-twinkle_3s_infinite_ease-in-out_1s]"
            style={{ fontFamily: 'monospace' }}
          >
            ✦
          </text>
        </g>

        {/* -------------------------------------------------------- */}
        {/* SPECULAR SHIMMER SWEEP OVERLAY                          */}
        {/* -------------------------------------------------------- */}
        <rect
          x="-100"
          y="0"
          width="80"
          height="48"
          fill="url(#anixShimmerGrad)"
          transform="skewX(-25)"
          className="pointer-events-none"
          style={{ animation: 'anix-shimmer-sweep 4.5s infinite cubic-bezier(0.4, 0, 0.2, 1)' }}
        />
      </svg>
    </div>
  );
};

// ========================================================
// 🌌 ANIX EMBLEM CREST
// Multi-layered geometric shield with rotating astrolabe dial,
// precision facet gradients, and singularity node.
// ========================================================
export const AnixEmblem: React.FC<{
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  isHovered?: boolean;
}> = ({ size = 'md', isHovered = false }) => {
  const emblemSizes = {
    xs: { box: 'w-6 h-6', inner: 'rounded-md', reticle: false, p: 'p-[1px]' },
    sm: { box: 'w-8 h-8', inner: 'rounded-[9px]', reticle: true, p: 'p-[1.5px]' },
    md: { box: 'w-10 h-10', inner: 'rounded-xl', reticle: true, p: 'p-[2px]' },
    lg: { box: 'w-16 h-16', inner: 'rounded-2xl', reticle: true, p: 'p-[2.5px]' },
    xl: { box: 'w-24 h-24', inner: 'rounded-3xl', reticle: true, p: 'p-[3px]' },
  }[size];

  return (
    <div className="relative flex items-center justify-center">
      {/* Outer Atmospheric Aura */}
      <div
        className={`absolute -inset-2 rounded-2xl bg-gradient-to-tr from-cyan-500 via-indigo-600 to-fuchsia-500 blur-lg transition-all duration-700 pointer-events-none ${
          isHovered ? 'opacity-90 scale-110 anix-aurora-bg' : 'opacity-40 scale-100'
        }`}
      />

      {/* Orbiting Astrolabe Reticle (for size >= sm) */}
      {emblemSizes.reticle && (
        <div
          className="absolute -inset-2.5 pointer-events-none opacity-45 group-hover:opacity-85 transition-opacity duration-500"
          style={{ animation: 'anix-spin-slow 24s linear infinite' }}
        >
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <circle
              cx="50"
              cy="50"
              r="46"
              fill="none"
              stroke="url(#anixRingGrad)"
              strokeWidth="1.2"
              strokeDasharray="4 8"
              opacity="0.8"
            />
            <polygon points="50,1 52,4 48,4" fill="#00F2FE" />
            <polygon points="99,50 96,52 96,48" fill="#818CF8" />
            <polygon points="50,99 48,96 52,96" fill="#F472B6" />
            <polygon points="1,50 4,48 4,52" fill="#34D399" />
            <defs>
              <linearGradient id="anixRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00F2FE" />
                <stop offset="50%" stopColor="#818CF8" />
                <stop offset="100%" stopColor="#EC4899" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      )}

      {/* Main Beveled Prism Frame */}
      <div
        className={`relative ${emblemSizes.box} ${emblemSizes.p} rounded-xl bg-gradient-to-tr from-cyan-400 via-indigo-500 to-fuchsia-500 shadow-xl shadow-cyan-500/20 transition-transform duration-300 group-hover:scale-105`}
      >
        {/* Core Chamber */}
        <div
          className={`w-full h-full ${emblemSizes.inner} bg-[#070B14] flex items-center justify-center relative overflow-hidden`}
        >
          <div className="absolute inset-0 bg-radial-at-c from-cyan-500/20 via-transparent to-transparent pointer-events-none" />

          {/* Shimmer Light Flare Sweep */}
          <div
            className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/25 to-transparent -skew-x-12 pointer-events-none"
            style={{ animation: 'anix-shimmer-sweep 3.6s infinite ease-in-out' }}
          />

          {/* Custom SVG Geometric Crest */}
          <svg
            viewBox="0 0 44 44"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-3/4 h-3/4 drop-shadow-[0_0_10px_rgba(56,189,248,0.7)] transition-all duration-300 group-hover:brightness-125"
          >
            <defs>
              <linearGradient id="crestGradApex" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FFFFFF" />
                <stop offset="25%" stopColor="#00F2FE" />
                <stop offset="70%" stopColor="#6366F1" />
                <stop offset="100%" stopColor="#EC4899" />
              </linearGradient>
              <linearGradient id="crestGradCross" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#10B981" />
                <stop offset="60%" stopColor="#00F2FE" />
                <stop offset="100%" stopColor="#A855F7" />
              </linearGradient>
              <filter id="crestCoreGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="1.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Monolithic Outer Chevron (A) */}
            <path
              d="M22 3L38 31H30L22 17L14 31H6L22 3Z"
              fill="url(#crestGradApex)"
            />

            {/* Intersecting Nexus Crossbeam */}
            <path
              d="M13 25.5H31L33.5 29.5H10.5L13 25.5Z"
              fill="url(#crestGradCross)"
              opacity="0.95"
            />

            {/* Diamond Prism Core */}
            <polygon
              points="22,15 25.5,21 22,27 18.5,21"
              fill="#FFFFFF"
              opacity="0.4"
              className="animate-pulse"
            />

            {/* Quantum Node */}
            <circle
              cx="22"
              cy="21"
              r="2.8"
              fill="#FFFFFF"
              filter="url(#crestCoreGlow)"
              className="animate-pulse"
            />

            {/* Precision Optics Tick */}
            <line
              x1="22"
              y1="11"
              x2="22"
              y2="13.5"
              stroke="#00F2FE"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>

      {/* Active Telemetry Status Ping */}
      <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-gradient-to-r from-cyan-400 to-indigo-500 shadow-[0_0_8px_#00F2FE]" />
      </span>
    </div>
  );
};

// ========================================================
// 🌟 MASTER ANIX BRAND IDENTITY COMPONENT
// Combines Emblem, Bespoke Vector Wordmark, Capsule Badge, and Subtitle.
// ========================================================
export interface AnixLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showSubtitle?: boolean;
  showBadge?: boolean;
  subtitleText?: string;
  badgeText?: string;
  className?: string;
  variant?: 'full' | 'compact' | 'emblem-only' | 'wordmark-only';
  onClick?: () => void;
}

export const AnixLogo: React.FC<AnixLogoProps> = ({
  size = 'md',
  showSubtitle = true,
  showBadge = true,
  subtitleText = 'Enterprise Operating System',
  badgeText = 'OS',
  className = '',
  variant = 'full',
  onClick,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  // Scaled dimensions map
  const dimensions = {
    xs: {
      wordmarkHeight: 'h-4',
      badgePadding: 'px-1 py-0.2 text-[8px]',
      badgeDot: 'w-1 h-1',
      subtext: 'text-[8px] tracking-[0.16em]',
      gap: 'gap-1.5',
    },
    sm: {
      wordmarkHeight: 'h-6',
      badgePadding: 'px-1.5 py-0.5 text-[9px]',
      badgeDot: 'w-1.5 h-1.5',
      subtext: 'text-[9px] tracking-[0.2em]',
      gap: 'gap-2.5',
    },
    md: {
      wordmarkHeight: 'h-8',
      badgePadding: 'px-2 py-0.5 text-[10px]',
      badgeDot: 'w-1.5 h-1.5',
      subtext: 'text-[10px] tracking-[0.22em]',
      gap: 'gap-3',
    },
    lg: {
      wordmarkHeight: 'h-12',
      badgePadding: 'px-2.5 py-1 text-xs',
      badgeDot: 'w-2 h-2',
      subtext: 'text-xs tracking-[0.25em]',
      gap: 'gap-4',
    },
    xl: {
      wordmarkHeight: 'h-16',
      badgePadding: 'px-3 py-1.5 text-sm',
      badgeDot: 'w-2.5 h-2.5',
      subtext: 'text-sm tracking-[0.28em]',
      gap: 'gap-5',
    },
  }[size];

  if (variant === 'emblem-only') {
    return <AnixEmblem size={size} isHovered={isHovered} />;
  }

  if (variant === 'wordmark-only') {
    return <AnixWordmark className={dimensions.wordmarkHeight} isHovered={isHovered} />;
  }

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`inline-flex items-center ${dimensions.gap} select-none group cursor-pointer ${className}`}
      title="ANIX OS | Autonomous Enterprise Collaboration Operating System"
    >
      {/* 1. Multi-Depth Emblem */}
      <AnixEmblem size={size} isHovered={isHovered} />

      {/* 2. Wordmark + Badge + Subtitle Stack */}
      <div className="flex flex-col justify-center">
        <div className="flex items-center gap-2">
          {/* Precision Architectural Vector Wordmark */}
          <AnixWordmark className={dimensions.wordmarkHeight} isHovered={isHovered} />

          {/* High-Tech Capsule Badge */}
          {showBadge && (
            <div className="inline-flex items-center gap-1.5 ml-0.5">
              <div
                className={`relative inline-flex items-center gap-1.5 ${dimensions.badgePadding} rounded-md bg-gradient-to-r from-cyan-950/70 via-indigo-950/60 to-slate-900/90 border border-cyan-400/40 shadow-[0_0_12px_rgba(6,182,212,0.25)] backdrop-blur-md transition-all duration-300 group-hover:border-cyan-400/80 group-hover:shadow-[0_0_18px_rgba(6,182,212,0.45)]`}
              >
                <span className={`${dimensions.badgeDot} rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_#34D399]`} />
                <span className="font-anix font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-200 via-indigo-200 to-pink-200 uppercase tracking-wider leading-none">
                  {badgeText}
                </span>

                {(size === 'lg' || size === 'xl') && (
                  <span className="text-[10px] font-mono font-bold text-cyan-300/80 pl-1 border-l border-cyan-400/30">
                    v2.4
                  </span>
                )}
              </div>

              {(size === 'lg' || size === 'xl') && (
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold flex items-center gap-1.5 shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  KERNEL ACTIVE
                </span>
              )}
            </div>
          )}
        </div>

        {/* 3. Subtitle / Byline */}
        {showSubtitle && (
          <div className="flex items-center gap-2 mt-1">
            <span className="h-[1px] w-3 bg-gradient-to-r from-transparent to-cyan-500/60" />
            <span
              className={`font-mono font-medium ${dimensions.subtext} text-slate-400 uppercase tracking-[0.22em] group-hover:text-cyan-300 transition-colors duration-300`}
            >
              {subtitleText}
            </span>
            <span className="h-[1px] w-3 bg-gradient-to-l from-transparent to-cyan-500/60" />
          </div>
        )}
      </div>
    </div>
  );
};
