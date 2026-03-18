import { useEffect, useState, useRef } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  PawPrint,
  Users,
  CalendarHeart,
  MoreHorizontal,
  MapPin,
  StickyNote,
  Flag,
  BarChart3,
  UserCog,
  KeyRound,
  X,
  Check,
  Loader2,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';


const TABS = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/animals', icon: PawPrint, label: 'Animals' },
  { to: '/people', icon: Users, label: 'People' },
  { to: '/outreach', icon: CalendarHeart, label: 'Outreach' },
];

const MORE_ITEMS = [
  { to: '/locations', icon: MapPin, label: 'Locations', color: 'text-ember' },
  { to: '/notes', icon: StickyNote, label: 'Notes', color: 'text-sky-600' },
  { to: '/flags', icon: Flag, label: 'Flags', color: 'text-gold' },
];

export default function BottomNav() {
  const { isAdmin } = useAuth();

  const location = useLocation();
  const [hasActiveQueue, setHasActiveQueue] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState(false);

  async function handleChangePassword() {
    if (newPassword.length < 6) { setPwError('Password must be at least 6 characters'); return; }
    if (newPassword !== confirmPassword) { setPwError('Passwords do not match'); return; }
    setPwSaving(true);
    setPwError('');
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPwSaving(false);
    if (error) { setPwError(error.message); return; }
    setPwSuccess(true);
    setTimeout(() => { setShowPassword(false); setPwSuccess(false); setNewPassword(''); setConfirmPassword(''); }, 1500);
  }

  useEffect(() => {
    checkActiveQueue();
    const interval = setInterval(checkActiveQueue, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close more menu on route change
  useEffect(() => {
    setMoreOpen(false);
  }, [location.pathname]);

  // Close more menu on outside click
  useEffect(() => {
    if (!moreOpen) return;
    function handleClick(e: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [moreOpen]);

  async function checkActiveQueue() {
    const { data: activeEvent } = await supabase
      .from('outreach_events')
      .select('id')
      .eq('status', 'active')
      .limit(1)
      .single();
    if (!activeEvent) { setHasActiveQueue(false); return; }
    const { count } = await supabase
      .from('checkin_queue')
      .select('id', { count: 'exact', head: true })
      .eq('outreach_event_id', activeEvent.id)
      .in('status', ['waiting', 'in_progress']);
    setHasActiveQueue((count ?? 0) > 0);
  }

  const isMoreActive = ['/locations', '/notes', '/flags', '/reports', '/admin'].some(
    (p) => location.pathname.startsWith(p)
  );

  const allMoreItems = isAdmin
    ? [...MORE_ITEMS, { to: '/reports', icon: BarChart3, label: 'Reports', color: 'text-muted' }, { to: '/admin/users', icon: UserCog, label: 'Users', color: 'text-primary' }]
    : MORE_ITEMS;

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 backdrop-blur-md z-40 safe-bottom bg-white/95 border-t border-night/5"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="flex items-center justify-around h-16 px-1">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.to === '/'}
            aria-label={tab.label}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center flex-1 h-full min-h-[48px] rounded-lg transition-all duration-150 ${
                isActive
                  ? 'text-primary'
                  : 'text-muted active:text-night'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className={`relative p-1.5 rounded-lg transition-colors ${isActive ? 'bg-primary/10' : ''}`}>
                  <tab.icon className="w-5 h-5" strokeWidth={isActive ? 2 : 1.5} />
                  {tab.to === '/outreach' && hasActiveQueue && (
                    <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-amber-500 rounded-full border-2 border-white" />
                  )}
                </div>
                <span className={`text-xs mt-0.5 ${isActive ? 'font-semibold' : 'font-medium'}`}>
                  {tab.label}
                </span>
              </>
            )}
          </NavLink>
        ))}

        {/* More menu */}
        <div className="relative flex-1" ref={moreRef}>
          <button
            onClick={() => setMoreOpen(!moreOpen)}
            aria-label="More pages"
            aria-expanded={moreOpen}
            className={`flex flex-col items-center justify-center w-full h-full min-h-[48px] rounded-lg transition-all duration-150 ${
              isMoreActive ? 'text-primary' : 'text-muted active:text-night'
            }`}
          >
            <div className={`p-1.5 rounded-lg transition-colors ${isMoreActive ? 'bg-primary/10' : ''}`}>
              <MoreHorizontal className="w-5 h-5" strokeWidth={isMoreActive ? 2 : 1.5} />
            </div>
            <span className={`text-xs mt-0.5 ${isMoreActive ? 'font-semibold' : 'font-medium'}`}>
              More
            </span>
          </button>

          {moreOpen && (
            <div className="absolute bottom-full right-0 mb-2 w-48 bg-white rounded-xl shadow-xl border border-night/8 overflow-hidden">
              {allMoreItems.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${
                    location.pathname.startsWith(item.to)
                      ? 'bg-primary/8 text-primary'
                      : 'text-night hover:bg-sand'
                  }`}
                >
                  <item.icon className={`w-4 h-4 ${location.pathname.startsWith(item.to) ? 'text-primary' : item.color}`} strokeWidth={1.75} />
                  {item.label}
                </Link>
              ))}
              <div className="border-t border-night/5" />
              <button
                onClick={() => { setMoreOpen(false); setShowPassword(true); setPwError(''); setPwSuccess(false); setNewPassword(''); setConfirmPassword(''); }}
                className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-night hover:bg-sand transition-colors w-full"
              >
                <KeyRound className="w-4 h-4 text-muted" strokeWidth={1.75} />
                Change Password
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Change Password Modal */}
      {showPassword && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Change password">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-night/5">
              <h2 className="font-heading font-bold text-night text-base">Change Password</h2>
              <button onClick={() => setShowPassword(false)} className="p-2.5 rounded-lg text-muted hover:text-night hover:bg-sand transition-all" aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted mb-1">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full px-3 py-2.5 bg-sand/50 border border-night/8 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full px-3 py-2.5 bg-sand/50 border border-night/8 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  onKeyDown={(e) => e.key === 'Enter' && handleChangePassword()}
                />
              </div>
              {pwError && (
                <div className="bg-ember/10 border border-ember/20 text-ember text-xs rounded-xl px-3 py-2" role="alert">{pwError}</div>
              )}
              {pwSuccess && (
                <div className="bg-primary/10 border border-primary/20 text-primary text-sm font-medium rounded-xl px-3 py-2 text-center" role="status">Password changed!</div>
              )}
              <button
                onClick={handleChangePassword}
                disabled={pwSaving || pwSuccess}
                className="w-full py-3 bg-primary hover:bg-primary-hover text-white font-semibold text-sm rounded-xl shadow-[0_2px_8px_rgba(110,168,50,0.25)] disabled:opacity-30 transition-all flex items-center justify-center gap-2"
              >
                {pwSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {pwSaving ? 'Saving...' : 'Update Password'}
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
