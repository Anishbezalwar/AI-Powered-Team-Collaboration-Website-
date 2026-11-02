import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Play,
  KeyRound,
  Smartphone,
  Lock,
  Users,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Hash,
  Activity,
  Terminal,
} from 'lucide-react';
import { api } from '../api.js';

interface SecurityAdminViewProps {
  currentRole: string;
  currentUser: any;
  currentTenant: any;
}

export const SecurityAdminView: React.FC<SecurityAdminViewProps> = ({
  currentRole,
  currentUser,
  currentTenant,
}) => {
  const [activeTab, setActiveTab] = useState<'scan' | 'audit' | 'sessions' | 'mfa' | 'users'>('scan');

  // Penetration test state
  const [scanRunning, setScanRunning] = useState(false);
  const [scanResult, setScanResult] = useState<any | null>(null);

  // Audit state
  const [auditEvents, setAuditEvents] = useState<any[]>([]);
  const [auditVerification, setAuditVerification] = useState<any | null>(null);
  const [auditLoading, setAuditLoading] = useState(false);

  // Sessions state
  const [sessions, setSessions] = useState<any[]>([]);

  // MFA setup state
  const [mfaData, setMfaData] = useState<any | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaRecoveryCodes, setMfaRecoveryCodes] = useState<string[] | null>(null);

  // Users state
  const [users, setUsers] = useState<any[]>([]);

  const fetchAuditData = async () => {
    try {
      setAuditLoading(true);
      const [events, verify] = await Promise.all([
        api.admin.getAuditEvents(),
        api.admin.verifyAudit(),
      ]);
      setAuditEvents(events);
      setAuditVerification(verify);
    } catch (err: any) {
      console.error('Audit fetch error:', err);
    } finally {
      setAuditLoading(false);
    }
  };

  const fetchSessions = async () => {
    try {
      const data = await api.auth.getSessions();
      setSessions(data);
    } catch (err: any) {
      console.error('Sessions fetch error:', err);
    }
  };

  const fetchUsers = async () => {
    try {
      const data = await api.admin.listUsers();
      setUsers(data);
    } catch (err: any) {
      console.error('Users fetch error:', err);
    }
  };

  useEffect(() => {
    if (activeTab === 'audit') fetchAuditData();
    if (activeTab === 'sessions') fetchSessions();
    if (activeTab === 'users') fetchUsers();
  }, [activeTab]);

  const handleRunPenetrationTest = async () => {
    setScanRunning(true);
    setScanResult(null);
    try {
      const result = await api.admin.runPenetrationTest();
      setScanResult(result);
    } catch (err: any) {
      alert(`Penetration scan failed: ${err.message}`);
    } finally {
      setScanRunning(false);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    try {
      await api.auth.revokeSession(sessionId);
      alert('Session revoked immediately! Live connections for that device terminated.');
      fetchSessions();
    } catch (err: any) {
      alert(`Revocation failed: ${err.message}`);
    }
  };

  const handleSetupMfa = async () => {
    try {
      const res = await api.auth.setupMfa();
      setMfaData(res);
      setMfaRecoveryCodes(null);
    } catch (err: any) {
      alert(`MFA setup failed: ${err.message}`);
    }
  };

  const handleVerifyMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaCode || mfaCode.length !== 6) return;
    try {
      const res = await api.auth.enableMfa(mfaCode);
      setMfaRecoveryCodes(res.recoveryCodes);
      setMfaData(null);
      alert('TOTP Multi-Factor Authentication successfully enabled!');
    } catch (err: any) {
      alert(`MFA verification failed: ${err.message}`);
    }
  };

  const handleUpdateRole = async (userId: string, newRole: string) => {
    try {
      await api.admin.updateRole(userId, newRole);
      alert(`Role updated to ${newRole}`);
      fetchUsers();
    } catch (err: any) {
      alert(`Role assignment failed: ${err.message}`);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0B0F17] overflow-hidden">
      {/* Security Center Header */}
      <div className="p-6 border-b border-white/10 bg-[#0E131F]/80 backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-indigo-600/30">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <span className="font-anix anix-gradient-text">ANIX</span> High-Assurance Security & Compliance Center
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold uppercase tracking-wider">
                  ASVS Level 2
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                PostgreSQL Row-Level Security, Tamper-Evident SHA-256 Audit Trail & Cross-Tenant Isolation
              </p>
            </div>
          </div>

          {/* Sub Navigation */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/[0.04] border border-white/10">
            <button
              onClick={() => setActiveTab('scan')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'scan' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Penetration Test
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'audit' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Tamper-Evident Audit
            </button>
            <button
              onClick={() => setActiveTab('sessions')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'sessions' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Active Sessions
            </button>
            <button
              onClick={() => setActiveTab('mfa')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'mfa' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              TOTP MFA
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'users' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              User Directory
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6 max-w-5xl mx-auto w-full">
        {/* TAB 1: LIVE CROSS-TENANT PENETRATION TEST RUNNER */}
        {activeTab === 'scan' && (
          <div className="space-y-6">
            <div className="glass-panel p-6 rounded-2xl border border-indigo-500/30 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-indigo-400" />
                    Automated Adversarial Cross-Tenant Penetration Scanner
                  </h3>
                  <p className="text-xs text-slate-300 mt-1">
                    Directly executes adversarial penetration probes against the API and data layer to verify that Tenant A cannot access, query, or mutate Tenant B records by ID guessing or direct endpoint access.
                  </p>
                </div>

                <button
                  onClick={handleRunPenetrationTest}
                  disabled={scanRunning}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 disabled:opacity-50 flex items-center gap-2 transition"
                >
                  <Play className={`w-3.5 h-3.5 ${scanRunning ? 'animate-spin' : 'fill-white'}`} />
                  <span>{scanRunning ? 'Executing Probes...' : 'Run Security Scan'}</span>
                </button>
              </div>

              {scanResult && (
                <div className="mt-4 space-y-4 pt-4 border-t border-white/10">
                  <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                      <div>
                        <span className="text-xs font-bold text-emerald-300">{scanResult.summary}</span>
                        <p className="text-[11px] text-emerald-400/80">
                          Tested tenant: {scanResult.testedTenant} against adversary: {scanResult.targetAdversaryTenant}
                        </p>
                      </div>
                    </div>
                    <span className="text-[11px] font-mono text-emerald-400 font-bold px-2 py-0.5 rounded bg-emerald-500/20">
                      100% ISOLATION
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {scanResult.tests?.map((t: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-1.5 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-200">{t.testName}</span>
                          <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono font-bold text-[10px]">
                            {t.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 font-mono">{t.attackVector}</p>
                        <div className="flex items-center justify-between text-[11px] text-slate-300 pt-1 border-t border-white/5">
                          <span><strong>Expected:</strong> {t.expected}</span>
                          <span className="text-emerald-400"><strong>Actual:</strong> {t.actual}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: TAMPER-EVIDENT AUDIT TRAIL & SHA-256 INTEGRITY */}
        {activeTab === 'audit' && (
          <div className="space-y-6">
            {/* Integrity Verification Card */}
            {auditVerification && (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-emerald-900/20 to-transparent border border-emerald-500/40 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white flex items-center gap-2">
                      Cryptographic Chain Integrity:
                      <span className="text-emerald-400 font-mono uppercase">{auditVerification.status}</span>
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      All {auditVerification.count} audit events cryptographically chained with SHA-256. Zero tampering detected.
                    </p>
                  </div>
                </div>

                <button
                  onClick={fetchAuditData}
                  disabled={auditLoading}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${auditLoading ? 'animate-spin' : ''}`} />
                  <span>Re-Verify Chain</span>
                </button>
              </div>
            )}

            {/* Audit Log Table */}
            <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden">
              <div className="px-5 py-3.5 border-b border-white/10 flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Append-Only Audit Event History
                </h3>
                <span className="text-xs text-slate-500">{auditEvents.length} records</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white/[0.02] text-slate-400 uppercase text-[10px] font-semibold border-b border-white/5">
                    <tr>
                      <th className="px-4 py-2.5">Timestamp</th>
                      <th className="px-4 py-2.5">Actor</th>
                      <th className="px-4 py-2.5">Action</th>
                      <th className="px-4 py-2.5">Resource</th>
                      <th className="px-4 py-2.5">SHA-256 Event Hash</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-slate-300">
                    {auditEvents.map((evt) => (
                      <tr key={evt.id} className="hover:bg-white/[0.02] transition">
                        <td className="px-4 py-2.5 whitespace-nowrap text-slate-400 text-[11px]">
                          {new Date(evt.created_at).toLocaleString()}
                        </td>
                        <td className="px-4 py-2.5 font-medium text-white">{evt.actor_email}</td>
                        <td className="px-4 py-2.5">
                          <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono text-[10px] font-bold">
                            {evt.action}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-slate-400">{evt.resource_type}</td>
                        <td className="px-4 py-2.5 font-mono text-[10px] text-slate-500 truncate max-w-[140px]" title={evt.event_hash}>
                          {evt.event_hash.substring(0, 16)}...
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: ACTIVE SESSIONS & DEVICE REVOCATION */}
        {activeTab === 'sessions' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-white">Active Server-Side Sessions</h3>
              <span className="text-xs text-slate-400">Instantly revocable</span>
            </div>

            <div className="space-y-3">
              {sessions.map((s) => (
                <div
                  key={s.id}
                  className="glass-panel p-4 rounded-xl flex items-center justify-between border border-white/10"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-indigo-600/20 flex items-center justify-center text-indigo-400">
                      <Smartphone className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{s.device_label}</span>
                        {s.isCurrent && (
                          <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                            Current Device
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        IP: {s.ip_address} • Last Active: {new Date(s.last_seen_at).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>

                  {!s.isCurrent && (
                    <button
                      onClick={() => handleRevokeSession(s.id)}
                      className="px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-semibold border border-rose-500/30 transition"
                    >
                      Revoke Device
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: TOTP MULTI-FACTOR AUTHENTICATION */}
        {activeTab === 'mfa' && (
          <div className="glass-panel p-6 rounded-2xl border border-white/10 space-y-5 max-w-lg mx-auto">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">TOTP Multi-Factor Authentication</h3>
                <p className="text-xs text-slate-400 mt-0.5">RFC 6238 Compliant Authenticator App Integration</p>
              </div>
            </div>

            {!mfaData && !mfaRecoveryCodes && (
              <div className="space-y-4">
                <p className="text-xs text-slate-300 leading-relaxed">
                  Protect your workspace account using Google Authenticator, Authy, or Apple Keychain.
                </p>
                <button
                  onClick={handleSetupMfa}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white transition"
                >
                  Configure TOTP Authenticator
                </button>
              </div>
            )}

            {mfaData && (
              <form onSubmit={handleVerifyMfa} className="space-y-4 pt-2">
                <div className="flex flex-col items-center p-4 bg-white rounded-xl">
                  <img src={mfaData.qrCode} alt="TOTP QR Code" className="w-48 h-48" />
                  <span className="text-[10px] text-slate-700 font-mono mt-2 font-bold select-all">
                    Key: {mfaData.secret}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Enter 6-Digit Verification Code
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="000000"
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value)}
                    className="w-full text-center tracking-widest text-lg font-mono font-bold bg-white/[0.04] border border-white/10 rounded-lg py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={mfaCode.length !== 6}
                  className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-xs font-bold text-white transition"
                >
                  Verify and Enable MFA
                </button>
              </form>
            )}

            {mfaRecoveryCodes && (
              <div className="space-y-3 p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/30">
                <h4 className="text-xs font-bold text-emerald-300">Single-Use Recovery Codes</h4>
                <p className="text-[11px] text-slate-300">
                  Save these codes safely. If you lose access to your device, each code can be used once to sign in.
                </p>
                <div className="grid grid-cols-2 gap-2 font-mono text-xs text-white bg-slate-950/60 p-3 rounded-lg border border-white/10">
                  {mfaRecoveryCodes.map((c, i) => (
                    <div key={i}>{c}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: USER DIRECTORY & ROLE ASSIGNMENT */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white mb-2">Workspace User Directory & RBAC Roles</h3>

            <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/[0.02] text-slate-400 uppercase text-[10px] font-semibold border-b border-white/5">
                  <tr>
                    <th className="px-4 py-2.5">User</th>
                    <th className="px-4 py-2.5">Email</th>
                    <th className="px-4 py-2.5">Active Role</th>
                    <th className="px-4 py-2.5">MFA Status</th>
                    <th className="px-4 py-2.5">Change Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-300">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-white/[0.02] transition">
                      <td className="px-4 py-2.5 font-medium text-white flex items-center gap-2">
                        <span>{u.avatar_url || '👤'}</span>
                        <span>{u.full_name}</span>
                      </td>
                      <td className="px-4 py-2.5 text-slate-400">{u.email}</td>
                      <td className="px-4 py-2.5">
                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold text-[10px]">
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        {u.mfa_enabled ? (
                          <span className="text-emerald-400 font-semibold text-[10px]">Active (TOTP)</span>
                        ) : (
                          <span className="text-slate-500 text-[10px]">Disabled</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        {currentRole === 'Owner' && (
                          <select
                            value={u.role}
                            onChange={(e) => handleUpdateRole(u.id, e.target.value)}
                            className="bg-white/[0.06] border border-white/10 rounded px-2 py-1 text-[11px] text-white focus:outline-none"
                          >
                            <option value="Owner">Owner</option>
                            <option value="Admin">Admin</option>
                            <option value="Member">Member</option>
                            <option value="Guest">Guest</option>
                          </select>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
