import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import {
  UserPlus,
  KeyRound,
  X,
  Check,
  Loader2,
  Shield,
  Users,
  Copy,
  Clock,
  ChevronDown,
  ChevronUp,
  MessageSquarePlus,
} from 'lucide-react';
import { formatDateTime } from '../lib/format';

interface AppUser {
  id: string;
  email: string;
  name: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

async function adminFetch(action: string, body: Record<string, unknown>) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const res = await fetch('/.netlify/functions/admin-users', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ action, ...body }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export default function AdminUsersPage() {
  const { isAdmin, user } = useAuth();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);

  // Create user state
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createRole, setCreateRole] = useState<'admin' | 'coordinator'>('coordinator');
  const [createSaving, setCreateSaving] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState(false);

  // Reset password state
  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [resetUserName, setResetUserName] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [resetSaving, setResetSaving] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);

  // Change role state
  const [changingRoleId, setChangingRoleId] = useState<string | null>(null);

  // Copied state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Login history state
  const [loginHistory, setLoginHistory] = useState<{ user_id: string; user_name: string; user_email: string; logged_in_at: string }[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  // Suggestions state
  const [suggestions, setSuggestions] = useState<{ id: string; message: string; status: string; submitted_by_name: string | null; completed_at: string | null; created_at: string }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
    loadLoginHistory();
    loadSuggestions();
  }, []);

  async function loadUsers() {
    setLoading(true);
    try {
      const data = await adminFetch('list_users', {});
      setUsers(data.users || []);
    } catch {
      // fallback to direct query
      const { data } = await supabase
        .from('users')
        .select('id, email, name, role, is_active, created_at')
        .order('created_at', { ascending: true });
      setUsers(data || []);
    }
    setLoading(false);
  }

  async function loadLoginHistory() {
    setHistoryLoading(true);
    const { data } = await supabase
      .from('login_history')
      .select('user_id, logged_in_at, user:users!user_id(name, email)')
      .order('logged_in_at', { ascending: false })
      .limit(500);
    if (data) {
      setLoginHistory(data.map((d: any) => {
        const u = Array.isArray(d.user) ? d.user[0] : d.user;
        return { user_id: d.user_id, user_name: u?.name ?? 'Unknown', user_email: u?.email ?? '', logged_in_at: d.logged_in_at };
      }));
    }
    setHistoryLoading(false);
  }

  async function loadSuggestions() {
    setSuggestionsLoading(true);
    const { data } = await supabase.from('suggestions').select('*').order('created_at', { ascending: false });
    setSuggestions(data ?? []);
    setSuggestionsLoading(false);
  }

  async function toggleSuggestion(id: string, currentStatus: string) {
    setTogglingId(id);
    const newStatus = currentStatus === 'open' ? 'complete' : 'open';
    await supabase.from('suggestions').update({
      status: newStatus,
      completed_at: newStatus === 'complete' ? new Date().toISOString() : null,
    }).eq('id', id);
    setSuggestions((prev) =>
      prev.map((s) => s.id === id ? { ...s, status: newStatus, completed_at: newStatus === 'complete' ? new Date().toISOString() : null } : s)
    );
    setTogglingId(null);
  }

  async function handleCreate() {
    if (!createName.trim()) { setCreateError('Name is required'); return; }
    if (!createEmail.trim()) { setCreateError('Email is required'); return; }
    if (createPassword.length < 6) { setCreateError('Password must be at least 6 characters'); return; }

    setCreateSaving(true);
    setCreateError('');
    try {
      await adminFetch('create_user', {
        email: createEmail.trim().toLowerCase(),
        password: createPassword,
        name: createName.trim(),
        role: createRole,
      });
      setCreateSuccess(true);
      loadUsers();
      setTimeout(() => {
        setShowCreate(false);
        setCreateSuccess(false);
        setCreateName('');
        setCreateEmail('');
        setCreatePassword('');
        setCreateRole('coordinator');
      }, 2000);
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create user');
    }
    setCreateSaving(false);
  }

  async function handleReset() {
    if (!resetUserId) return;
    if (resetPassword.length < 6) { setResetError('Password must be at least 6 characters'); return; }

    setResetSaving(true);
    setResetError('');
    try {
      await adminFetch('reset_password', {
        user_id: resetUserId,
        new_password: resetPassword,
      });
      setResetSuccess(true);
      setTimeout(() => {
        setResetUserId(null);
        setResetSuccess(false);
        setResetPassword('');
        setResetUserName('');
      }, 2000);
    } catch (err: unknown) {
      setResetError(err instanceof Error ? err.message : 'Failed to reset password');
    }
    setResetSaving(false);
  }

  async function handleChangeRole(userId: string, newRole: 'admin' | 'coordinator') {
    setChangingRoleId(userId);
    try {
      await adminFetch('change_role', { user_id: userId, new_role: newRole });
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: newRole } : u));
    } catch {
      // silently fail — role didn't change
    }
    setChangingRoleId(null);
  }

  function copyPassword(password: string, userId: string) {
    navigator.clipboard.writeText(password);
    setCopiedId(userId);
    setTimeout(() => setCopiedId(null), 2000);
  }

  if (!isAdmin) {
    return (
      <div className="max-w-3xl mx-auto text-center py-16">
        <Shield className="w-12 h-12 text-muted/20 mx-auto mb-3" />
        <p className="text-muted">Admin access required</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-heading font-bold text-night">Manage Users</h1>
          <p className="text-sm text-muted mt-0.5">Create accounts and reset passwords</p>
        </div>
        <button
          onClick={() => { setShowCreate(true); setCreateError(''); setCreateSuccess(false); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-hover text-white font-semibold text-sm rounded-xl shadow-[0_2px_8px_rgba(110,168,50,0.25)] transition-all"
        >
          <UserPlus className="w-4 h-4" />
          Create User
        </button>
      </div>

      {/* User List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-night/5 p-4 animate-pulse">
              <div className="skeleton h-4 w-40 mb-2" />
              <div className="skeleton h-3 w-56" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {users.map((u) => (
            <div key={u.id} className="bg-white rounded-xl border border-night/5 p-4 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-night text-sm truncate">{u.name}</p>
                  {u.email === 'shauna@alohaanimaloutreach.org' ? (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-primary/10 text-primary">
                      super admin
                    </span>
                  ) : u.id === user?.id ? (
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${
                      u.role === 'admin' ? 'bg-primary/10 text-primary' : 'bg-sand text-muted'
                    }`}>
                      {u.role} (you)
                    </span>
                  ) : (
                    <select
                      value={u.role}
                      onChange={(e) => handleChangeRole(u.id, e.target.value as 'admin' | 'coordinator')}
                      disabled={changingRoleId === u.id}
                      className={`text-xs font-semibold px-2 py-1 rounded-md border-0 cursor-pointer transition-all ${
                        u.role === 'admin' ? 'bg-primary/10 text-primary' : 'bg-sand text-muted'
                      } ${changingRoleId === u.id ? 'opacity-50' : ''}`}
                    >
                      <option value="coordinator">coordinator</option>
                      <option value="admin">admin</option>
                    </select>
                  )}
                </div>
                <p className="text-sm text-muted truncate">{u.email}</p>
              </div>
              <button
                onClick={() => {
                  setResetUserId(u.id);
                  setResetUserName(u.name);
                  setResetPassword('');
                  setResetError('');
                  setResetSuccess(false);
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-sand hover:bg-night/8 text-sm font-medium text-night transition-all shrink-0"
              >
                <KeyRound className="w-3.5 h-3.5" />
                Reset Password
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Login History */}
      <div className="mt-8">
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="flex items-center gap-2 text-sm font-semibold text-night mb-3"
        >
          <Clock className="w-4 h-4 text-muted" />
          Login History
          {showHistory ? <ChevronUp className="w-4 h-4 text-muted" /> : <ChevronDown className="w-4 h-4 text-muted" />}
        </button>
        {showHistory && (
          historyLoading ? (
            <div className="bg-white rounded-xl border border-night/5 p-6 text-center">
              <Loader2 className="w-5 h-5 animate-spin text-muted mx-auto" />
            </div>
          ) : loginHistory.length === 0 ? (
            <div className="bg-white rounded-xl border border-night/5 p-6 text-center">
              <p className="text-sm text-muted">No login history recorded yet. History will appear after the next sign-in.</p>
            </div>
          ) : (() => {
            // Group by user
            const grouped = new Map<string, { name: string; email: string; logins: string[] }>();
            loginHistory.forEach((entry) => {
              if (!grouped.has(entry.user_id)) {
                grouped.set(entry.user_id, { name: entry.user_name, email: entry.user_email, logins: [] });
              }
              grouped.get(entry.user_id)!.logins.push(entry.logged_in_at);
            });

            const formatDt = (dt: string) => {
              const d = new Date(dt);
              return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
            };

            return (
              <div className="space-y-2">
                {[...grouped.entries()].map(([userId, { name, email, logins }]) => (
                  <div key={userId} className="bg-white rounded-xl border border-night/5 overflow-hidden">
                    <button
                      onClick={() => setExpandedUser(expandedUser === userId ? null : userId)}
                      className="w-full px-4 py-3 flex items-center justify-between hover:bg-sand/30 transition-colors"
                    >
                      <div className="text-left">
                        <p className="text-sm font-medium text-night">{name}</p>
                        <p className="text-xs text-muted">{email}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right">
                          <p className="text-xs text-muted">Last login</p>
                          <p className="text-sm text-night whitespace-nowrap">{formatDt(logins[0])}</p>
                        </div>
                        <span className="text-xs font-medium text-muted bg-sand rounded-md px-1.5 py-0.5">{logins.length}</span>
                        {logins.length > 1 && (expandedUser === userId ? <ChevronUp className="w-3.5 h-3.5 text-muted" /> : <ChevronDown className="w-3.5 h-3.5 text-muted" />)}
                      </div>
                    </button>
                    {expandedUser === userId && logins.length > 1 && (
                      <div className="border-t border-night/5 px-4 py-2 bg-sand/20">
                        <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">All logins</p>
                        <div className="space-y-1">
                          {logins.map((dt, i) => (
                            <p key={i} className="text-sm text-muted">{formatDt(dt)}</p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            );
          })()
        )}
      </div>

      {/* Suggestions */}
      <div className="mt-8">
        <button
          onClick={() => setShowSuggestions(!showSuggestions)}
          className="flex items-center gap-2 text-sm font-semibold text-night mb-3"
        >
          <MessageSquarePlus className="w-4 h-4 text-muted" />
          Suggestions
          {suggestions.filter((s) => s.status === 'open').length > 0 && (
            <span className="text-xs font-medium text-white bg-primary rounded-full px-1.5 py-0.5 leading-none">
              {suggestions.filter((s) => s.status === 'open').length}
            </span>
          )}
          {showSuggestions ? <ChevronUp className="w-4 h-4 text-muted" /> : <ChevronDown className="w-4 h-4 text-muted" />}
        </button>
        {showSuggestions && (
          suggestionsLoading ? (
            <div className="bg-white rounded-xl border border-night/5 p-6 text-center">
              <Loader2 className="w-5 h-5 animate-spin text-muted mx-auto" />
            </div>
          ) : suggestions.length === 0 ? (
            <div className="bg-white rounded-xl border border-night/5 p-6 text-center">
              <p className="text-sm text-muted">No suggestions yet. Users can submit from the Guide page.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {[...suggestions].sort((a, b) => {
                if (a.status !== b.status) return a.status === 'open' ? -1 : 1;
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
              }).map((s) => {
                const isComplete = s.status === 'complete';
                return (
                  <div key={s.id} className={`bg-white rounded-xl border border-night/5 p-3 flex items-start gap-3 ${isComplete ? 'opacity-50' : ''}`}>
                    <button
                      onClick={() => toggleSuggestion(s.id, s.status)}
                      disabled={togglingId === s.id}
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                        isComplete ? 'border-primary bg-primary' : 'border-night/15 hover:border-primary/50'
                      }`}
                    >
                      {togglingId === s.id ? (
                        <Loader2 className="w-3 h-3 text-muted animate-spin" />
                      ) : isComplete ? (
                        <Check className="w-3 h-3 text-white" strokeWidth={3} />
                      ) : null}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${isComplete ? 'text-muted line-through' : 'text-night'}`}>{s.message}</p>
                      <p className="text-xs text-muted mt-0.5">
                        {formatDateTime(s.created_at)}
                        {s.submitted_by_name && ` — ${s.submitted_by_name}`}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>

      {/* Create User Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Create user">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-night/5">
              <h2 className="font-heading font-bold text-night text-base flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-primary" />
                Create User
              </h2>
              <button onClick={() => setShowCreate(false)} className="p-2.5 rounded-lg text-muted hover:text-night hover:bg-sand transition-all" aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted mb-1">Name</label>
                <input
                  type="text"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="First name"
                  className="w-full px-3 py-2.5 bg-sand/50 border border-night/8 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted mb-1">Email</label>
                <input
                  type="email"
                  value={createEmail}
                  onChange={(e) => setCreateEmail(e.target.value)}
                  placeholder="name@email.com"
                  className="w-full px-3 py-2.5 bg-sand/50 border border-night/8 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted mb-1">Temporary Password</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={createPassword}
                    onChange={(e) => setCreatePassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="flex-1 px-3 py-2.5 bg-sand/50 border border-night/8 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <button
                    onClick={() => copyPassword(createPassword, 'create')}
                    className="px-3 py-2.5 rounded-xl bg-sand hover:bg-night/8 transition-all"
                    title="Copy password"
                  >
                    {copiedId === 'create' ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4 text-muted" />}
                  </button>
                </div>
                <p className="text-xs text-muted mt-1">Share this with the user so they can log in and change it</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted mb-1">Role</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCreateRole('coordinator')}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      createRole === 'coordinator'
                        ? 'bg-primary/10 text-primary border-2 border-primary/30'
                        : 'bg-sand text-muted border-2 border-transparent'
                    }`}
                  >
                    Coordinator
                  </button>
                  <button
                    onClick={() => setCreateRole('admin')}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      createRole === 'admin'
                        ? 'bg-primary/10 text-primary border-2 border-primary/30'
                        : 'bg-sand text-muted border-2 border-transparent'
                    }`}
                  >
                    Admin
                  </button>
                </div>
              </div>
              {createError && (
                <div className="bg-ember/10 border border-ember/20 text-ember text-xs rounded-xl px-3 py-2" role="alert">{createError}</div>
              )}
              {createSuccess && (
                <div className="bg-primary/10 border border-primary/20 text-primary text-sm font-medium rounded-xl px-3 py-2 text-center" role="status">
                  User created!
                </div>
              )}
              <button
                onClick={handleCreate}
                disabled={createSaving || createSuccess}
                className="w-full py-3 bg-primary hover:bg-primary-hover text-white font-semibold text-sm rounded-xl shadow-[0_2px_8px_rgba(110,168,50,0.25)] disabled:opacity-30 transition-all flex items-center justify-center gap-2"
              >
                {createSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                {createSaving ? 'Creating...' : 'Create User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetUserId && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Reset password">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-night/5">
              <h2 className="font-heading font-bold text-night text-base flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-primary" />
                Reset Password
              </h2>
              <button onClick={() => setResetUserId(null)} className="p-2.5 rounded-lg text-muted hover:text-night hover:bg-sand transition-all" aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-muted">
                Set a new temporary password for <span className="font-semibold text-night">{resetUserName}</span>
              </p>
              <div>
                <label className="block text-sm font-medium text-muted mb-1">New Password</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="flex-1 px-3 py-2.5 bg-sand/50 border border-night/8 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    autoFocus
                  />
                  <button
                    onClick={() => copyPassword(resetPassword, resetUserId!)}
                    className="px-3 py-2.5 rounded-xl bg-sand hover:bg-night/8 transition-all"
                    title="Copy password"
                  >
                    {copiedId === resetUserId ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4 text-muted" />}
                  </button>
                </div>
                <p className="text-xs text-muted mt-1">Share this with the user so they can log in and change it</p>
              </div>
              {resetError && (
                <div className="bg-ember/10 border border-ember/20 text-ember text-xs rounded-xl px-3 py-2" role="alert">{resetError}</div>
              )}
              {resetSuccess && (
                <div className="bg-primary/10 border border-primary/20 text-primary text-sm font-medium rounded-xl px-3 py-2 text-center" role="status">
                  Password reset!
                </div>
              )}
              <button
                onClick={handleReset}
                disabled={resetSaving || resetSuccess}
                className="w-full py-3 bg-primary hover:bg-primary-hover text-white font-semibold text-sm rounded-xl shadow-[0_2px_8px_rgba(110,168,50,0.25)] disabled:opacity-30 transition-all flex items-center justify-center gap-2"
              >
                {resetSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {resetSaving ? 'Resetting...' : 'Reset Password'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
