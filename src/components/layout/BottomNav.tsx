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
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useTestMode } from '../../lib/testMode';

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
  const { testMode } = useTestMode();
  const location = useLocation();
  const [hasActiveQueue, setHasActiveQueue] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

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

  const isMoreActive = ['/locations', '/notes', '/flags', '/reports'].some(
    (p) => location.pathname.startsWith(p)
  );

  const allMoreItems = isAdmin
    ? [...MORE_ITEMS, { to: '/reports', icon: BarChart3, label: 'Reports', color: 'text-muted' }]
    : MORE_ITEMS;

  return (
    <nav
      className={`md:hidden fixed bottom-0 left-0 right-0 backdrop-blur-md z-40 safe-bottom ${
        testMode
          ? 'bg-amber-50/95 border-t-2 border-amber-400'
          : 'bg-white/95 border-t border-night/5'
      }`}
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
                  : 'text-muted/60 active:text-muted'
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
                <span className={`text-[10px] mt-0.5 ${isActive ? 'font-semibold' : 'font-medium'}`}>
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
              isMoreActive ? 'text-primary' : 'text-muted/60 active:text-muted'
            }`}
          >
            <div className={`p-1.5 rounded-lg transition-colors ${isMoreActive ? 'bg-primary/10' : ''}`}>
              <MoreHorizontal className="w-5 h-5" strokeWidth={isMoreActive ? 2 : 1.5} />
            </div>
            <span className={`text-[10px] mt-0.5 ${isMoreActive ? 'font-semibold' : 'font-medium'}`}>
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
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
