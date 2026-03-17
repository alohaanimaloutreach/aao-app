import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Pencil, FlaskConical, X } from 'lucide-react';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import TopBar from './TopBar';
import FieldNotesDrawer from './FieldNotesDrawer';
import { useTestMode } from '../../lib/testMode';

export default function AppLayout() {
  const [notesOpen, setNotesOpen] = useState(false);
  const location = useLocation();
  const { testMode, setTestMode } = useTestMode();

  return (
    <div className={`min-h-screen bg-sand ${testMode ? 'test-mode-frame' : ''}`}>
      {/* Skip to content for keyboard users */}
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>

      <Sidebar />

      {/* Main content area */}
      <div className="md:ml-16 min-h-screen flex flex-col">
        <TopBar />

        {testMode && (
          <div className="test-mode-banner bg-amber-400 text-amber-900 px-4 py-2 flex items-center justify-between text-xs font-bold tracking-wide">
            <div className="flex items-center gap-2">
              <FlaskConical className="w-4 h-4" />
              TEST MODE — Data created now is tagged for easy cleanup
            </div>
            <button onClick={() => setTestMode(false)} className="p-1 hover:bg-amber-500/30 rounded" aria-label="Exit test mode">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <main
          id="main-content"
          role="main"
          className="flex-1 p-4 md:p-6 pb-24 md:pb-6"
        >
          <div key={location.pathname} className="page-enter">
            <Outlet />
          </div>
        </main>
      </div>

      <BottomNav />

      {/* Add Note FAB — only on Notes page */}
      {location.pathname === '/notes' && (
        <button
          onClick={() => setNotesOpen(true)}
          className="fixed bottom-20 md:bottom-6 right-4 md:right-6 h-12 bg-primary hover:bg-primary-hover text-white rounded-2xl shadow-[0_4px_16px_rgba(110,168,50,0.35)] hover:shadow-[0_6px_20px_rgba(110,168,50,0.45)] flex items-center justify-center gap-2 px-5 transition-all duration-200 z-30 hover:scale-105 active:scale-95"
          aria-label="Add new note"
        >
          <Pencil className="w-4 h-4" strokeWidth={2} />
          <span className="text-sm font-semibold">Add Note</span>
        </button>
      )}

      <FieldNotesDrawer open={notesOpen} onClose={() => setNotesOpen(false)} />
    </div>
  );
}
