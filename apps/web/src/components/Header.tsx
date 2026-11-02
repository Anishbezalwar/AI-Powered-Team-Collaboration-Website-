import React, { useState } from 'react';
import {
  Shield,
  Search,
  Users,
  Building2,
  LogOut,
  Smartphone,
  KeyRound,
  CheckCircle2,
  ChevronDown,
  Sparkles,
  Zap,
  Video,
} from 'lucide-react';

import { AnixLogo } from './AnixLogo.js';

interface HeaderProps {
  currentTenant: any;
  currentUser: any;
  currentRole: string;
  allMemberships: any[];
  onSwitchTenant: (tenantId: string) => void;
  onSwitchRole: (role: string) => void;
  onOpenSearch: () => void;
  onOpenSecurity: () => void;
  onOpenMfa: () => void;
  onOpenSessions: () => void;
  onStartInstantMeeting?: () => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTenant,
  currentUser,
  currentRole,
  allMemberships,
  onSwitchTenant,
  onSwitchRole,
  onOpenSearch,
  onOpenSecurity,
  onOpenMfa,
  onOpenSessions,
  onStartInstantMeeting,
  onLogout,
}) => {
  const [tenantDropdownOpen, setTenantDropdownOpen] = useState(false);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  const roles = ['Owner', 'Admin', 'Member', 'Guest'];

  return (
    <header className="h-14 border-b border-white/10 bg-[#0E131F]/90 backdrop-blur-md px-4 flex items-center justify-between sticky top-0 z-40">
      {/* Left: Brand & Tenant Switcher */}
      <div className="flex items-center gap-3">
        <AnixLogo size="sm" showSubtitle={false} showBadge={true} />

        <div className="h-4 w-px bg-white/10 mx-1" />

        {/* Tenant Switcher */}
        <div className="relative">
          <button
            onClick={() => {
              setTenantDropdownOpen(!tenantDropdownOpen);
              setRoleDropdownOpen(false);
              setProfileDropdownOpen(false);
            }}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-medium text-slate-200 transition"
          >
            <Building2 className="w-3.5 h-3.5 text-indigo-400" />
            <span className="max-w-[130px] truncate">{currentTenant?.name || 'Organization'}</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {tenantDropdownOpen && (
            <div className="absolute left-0 mt-2 w-56 rounded-xl bg-[#131B2E] border border-white/10 shadow-2xl p-1 z-50">
              <div className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Switch Organization (Multi-Tenancy)
              </div>
              <button
                onClick={() => {
                  onSwitchTenant('11111111-1111-1111-1111-111111111111');
                  setTenantDropdownOpen(false);
                }}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs text-left transition ${
                  currentTenant?.id === '11111111-1111-1111-1111-111111111111'
                    ? 'bg-indigo-600/20 text-indigo-300 font-medium'
                    : 'text-slate-300 hover:bg-white/[0.06]'
                }`}
              >
                <span>Acme Corporation</span>
                {currentTenant?.id === '11111111-1111-1111-1111-111111111111' && (
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
                )}
              </button>
              <button
                onClick={() => {
                  onSwitchTenant('22222222-2222-2222-2222-222222222222');
                  setTenantDropdownOpen(false);
                }}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs text-left transition ${
                  currentTenant?.id === '22222222-2222-2222-2222-222222222222'
                    ? 'bg-indigo-600/20 text-indigo-300 font-medium'
                    : 'text-slate-300 hover:bg-white/[0.06]'
                }`}
              >
                <span>Stark Industries</span>
                {currentTenant?.id === '22222222-2222-2222-2222-222222222222' && (
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
                )}
              </button>
            </div>
          )}
        </div>

        {/* Role Simulator */}
        <div className="relative">
          <button
            onClick={() => {
              setRoleDropdownOpen(!roleDropdownOpen);
              setTenantDropdownOpen(false);
              setProfileDropdownOpen(false);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-xs font-medium text-emerald-300 transition"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Role: <strong>{currentRole}</strong></span>
            <ChevronDown className="w-3 h-3 text-emerald-400" />
          </button>

          {roleDropdownOpen && (
            <div className="absolute left-0 mt-2 w-48 rounded-xl bg-[#131B2E] border border-white/10 shadow-2xl p-1 z-50">
              <div className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Simulate RBAC Role
              </div>
              {roles.map((r) => (
                <button
                  key={r}
                  onClick={() => {
                    onSwitchRole(r);
                    setRoleDropdownOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-left transition ${
                    currentRole === r ? 'bg-emerald-600/20 text-emerald-300 font-semibold' : 'text-slate-300 hover:bg-white/[0.06]'
                  }`}
                >
                  <span>{r}</span>
                  {currentRole === r && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Center: Search & Command Palette Trigger */}
      <button
        onClick={onOpenSearch}
        className="hidden md:flex items-center gap-3 px-3 py-1.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 text-xs text-slate-400 hover:text-slate-200 transition w-72"
      >
        <Search className="w-3.5 h-3.5 text-slate-400" />
        <span className="flex-1 text-left">Search issues, messages, docs...</span>
        <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] font-mono text-slate-300">Ctrl K</kbd>
      </button>

      {/* Right: Security, WebSocket, Profile */}
      <div className="flex items-center gap-2.5">
        {/* Live sync pill */}
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-400 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="hidden sm:inline">Live Sync</span>
        </div>

        {/* Global Meet Now Button */}
        {onStartInstantMeeting && (
          <button
            onClick={onStartInstantMeeting}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 border border-emerald-500/30 text-xs font-semibold text-white shadow-md shadow-emerald-600/20 transition"
            title="Start instant video huddle"
          >
            <Video className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Meet Now</span>
          </button>
        )}

        {/* Security Shield & Penetration Test Center Button */}
        <button
          onClick={onOpenSecurity}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-xs font-medium text-indigo-300 transition"
          title="Security, Audit & Cross-Tenant Penetration Scanner"
        >
          <Shield className="w-3.5 h-3.5 text-indigo-400" />
          <span className="hidden sm:inline">Security Center</span>
        </button>

        {/* Profile Avatar & Menu */}
        <div className="relative">
          <button
            onClick={() => {
              setProfileDropdownOpen(!profileDropdownOpen);
              setTenantDropdownOpen(false);
              setRoleDropdownOpen(false);
            }}
            className="flex items-center gap-2 p-1 rounded-lg hover:bg-white/[0.06] transition"
          >
            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-sm shadow">
              {currentUser?.avatarUrl || '👤'}
            </div>
            <span className="hidden lg:inline text-xs font-medium text-slate-200">{currentUser?.fullName}</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {profileDropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-xl bg-[#131B2E] border border-white/10 shadow-2xl p-1 z-50">
              <div className="px-3 py-2 border-b border-white/10 mb-1">
                <div className="text-xs font-semibold text-white truncate">{currentUser?.fullName}</div>
                <div className="text-[11px] text-slate-400 truncate">{currentUser?.email}</div>
              </div>

              <button
                onClick={() => {
                  onOpenSessions();
                  setProfileDropdownOpen(false);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs text-slate-300 hover:bg-white/[0.06] transition"
              >
                <Smartphone className="w-3.5 h-3.5 text-indigo-400" />
                <span>Active Sessions ({`Revoke Devices`})</span>
              </button>

              <button
                onClick={() => {
                  onOpenMfa();
                  setProfileDropdownOpen(false);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs text-slate-300 hover:bg-white/[0.06] transition"
              >
                <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
                <span>MFA Configuration (TOTP)</span>
              </button>

              <div className="my-1 border-t border-white/10" />

              <button
                onClick={() => {
                  onLogout();
                  setProfileDropdownOpen(false);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs text-rose-400 hover:bg-rose-500/10 transition"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
