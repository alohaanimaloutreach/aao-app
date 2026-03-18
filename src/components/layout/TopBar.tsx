import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

import GlobalSearch from './GlobalSearch';

export default function TopBar() {
  const { profile } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);

  // Cmd+K / Ctrl+K shortcut
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-30 backdrop-blur-md px-4 md:px-6 safe-top bg-white/90 border-b border-night/5" role="banner">
        <div className="flex items-center justify-between h-14">
          {/* Mobile title */}
          <Link to="/" className="md:hidden flex items-center gap-2">
            <img src="/logo.png" alt="AAO" className="w-7 h-7 rounded-lg" />
            <h1 className="font-heading font-bold text-night text-[13px]">Aloha Animal Outreach</h1>
          </Link>

          {/* Desktop search bar trigger */}
          <button
            onClick={() => setSearchOpen(true)}
            className="hidden md:flex items-center gap-2 flex-1 max-w-sm ml-2 px-3 py-1.5 bg-sand/60 border border-night/5 rounded-lg text-sm text-muted hover:border-night/15 hover:bg-sand transition-all"
          >
            <Search className="w-3.5 h-3.5" />
            <span className="flex-1 text-left">Search...</span>
            <kbd className="text-xs font-mono bg-white border border-night/10 rounded px-1.5 py-0.5">⌘K</kbd>
          </button>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Mobile search button */}
            <button
              onClick={() => setSearchOpen(true)}
              className="md:hidden p-2.5 text-muted hover:text-night hover:bg-sand rounded-lg transition-all"
              aria-label="Search"
            >
              <Search className="w-5 h-5" strokeWidth={1.75} />
            </button>

            {/* Avatar — desktop */}
            {profile && (
              <div className="hidden md:flex items-center gap-2 ml-1 pl-3 border-l border-night/5">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary-hover flex items-center justify-center text-white text-sm font-bold shadow-sm">
                  {profile.name.charAt(0)}
                </div>
                <div className="hidden lg:block">
                  <p className="text-sm font-medium text-night leading-tight">{profile.name.split(' ')[0]}</p>
                  <p className="text-xs text-muted capitalize leading-tight">{profile.role}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
