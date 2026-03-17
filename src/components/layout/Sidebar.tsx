import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  LayoutDashboard,
  PawPrint,
  Users,
  MapPin,
  CalendarHeart,
  BarChart3,
  LogOut,
  FlaskConical,
} from 'lucide-react';
import { useTestMode } from '../../lib/testMode';

const NAV_ITEMS = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/animals', icon: PawPrint, label: 'Animals' },
  { to: '/people', icon: Users, label: 'People' },
  { to: '/locations', icon: MapPin, label: 'Locations' },
  { to: '/outreach', icon: CalendarHeart, label: 'Outreach' },
];

export default function Sidebar() {
  const { isAdmin, signOut, profile } = useAuth();
  const { testMode, setTestMode } = useTestMode();

  return (
    <aside className={`group hidden md:flex flex-col w-16 hover:w-56 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] text-white h-screen fixed left-0 top-0 z-40 overflow-hidden ${
      testMode
        ? 'bg-amber-900 shadow-[4px_0_24px_rgba(245,158,11,0.3)]'
        : 'bg-night shadow-[4px_0_24px_rgba(28,23,8,0.15)]'
    }`} role="navigation" aria-label="Sidebar navigation">
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-white/8 shrink-0">
        <img src="/logo.png" alt="AAO" className="w-8 h-8 rounded-lg shrink-0" />
        <span className="ml-3 font-heading font-bold text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          AAO Command Center
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 space-y-0.5 px-2">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex items-center h-11 px-3 rounded-lg transition-all duration-150 ${
                isActive
                  ? 'bg-primary text-white shadow-[0_2px_8px_rgba(110,168,50,0.3)]'
                  : 'text-white/50 hover:text-white hover:bg-white/8'
              }`
            }
          >
            <item.icon className="w-5 h-5 shrink-0" strokeWidth={1.75} />
            <span className="ml-3 text-sm font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              {item.label}
            </span>
          </NavLink>
        ))}

        {isAdmin && (
          <NavLink
            to="/reports"
            className={({ isActive }) =>
              `flex items-center h-11 px-3 rounded-lg transition-all duration-150 ${
                isActive
                  ? 'bg-primary text-white shadow-[0_2px_8px_rgba(110,168,50,0.3)]'
                  : 'text-white/50 hover:text-white hover:bg-white/8'
              }`
            }
          >
            <BarChart3 className="w-5 h-5 shrink-0" strokeWidth={1.75} />
            <span className="ml-3 text-sm font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              Reports
            </span>
          </NavLink>
        )}
      </nav>

      {/* Test Mode & User & Sign Out */}
      <div className="border-t border-white/8 p-2 space-y-0.5">
        <button
          onClick={() => setTestMode(!testMode)}
          role="switch"
          aria-checked={testMode}
          aria-label={testMode ? 'End test mode' : 'Start test mode'}
          className={`flex items-center h-11 px-3 rounded-lg transition-all duration-150 w-full ${
            testMode ? 'bg-amber-500/20 text-amber-400' : 'text-white/40 hover:text-white hover:bg-white/8'
          }`}
        >
          <FlaskConical className="w-5 h-5 shrink-0" strokeWidth={1.75} />
          <span className="ml-3 text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center gap-2">
            {testMode ? 'End Test Mode' : 'Start Test Mode'}
            {/* Switch track */}
            <span className={`relative inline-flex w-8 h-[18px] rounded-full transition-colors ${
              testMode ? 'bg-amber-500' : 'bg-white/20'
            }`}>
              <span className={`absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white shadow-sm transition-transform ${
                testMode ? 'translate-x-[16px]' : 'translate-x-[2px]'
              }`} />
            </span>
          </span>
        </button>
        {profile && (
          <div className="flex items-center h-11 px-3 text-white/40">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-primary-hover flex items-center justify-center text-[11px] font-bold shrink-0 shadow-sm">
              {profile.name.charAt(0)}
            </div>
            <div className="ml-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 overflow-hidden">
              <p className="text-xs font-medium text-white/70 whitespace-nowrap truncate">{profile.name}</p>
              <p className="text-[10px] text-white/30 whitespace-nowrap truncate capitalize">{profile.role}</p>
            </div>
          </div>
        )}
        <button
          onClick={signOut}
          className="flex items-center h-11 px-3 rounded-lg text-white/40 hover:text-white hover:bg-white/8 transition-all duration-150 w-full"
        >
          <LogOut className="w-5 h-5 shrink-0" strokeWidth={1.75} />
          <span className="ml-3 text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            Sign out
          </span>
        </button>
      </div>
    </aside>
  );
}
