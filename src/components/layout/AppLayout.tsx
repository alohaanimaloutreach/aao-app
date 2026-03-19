import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Pencil } from 'lucide-react';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import TopBar from './TopBar';
import FieldNotesDrawer from './FieldNotesDrawer';

const isTestEnv = import.meta.env.VITE_SUPABASE_URL?.includes('ybswvwbqweywhfjgdwro');

export default function AppLayout() {
  const [notesOpen, setNotesOpen] = useState(false);
  const location = useLocation();

  // Override theme colors for test environment
  useEffect(() => {
    if (isTestEnv) {
      document.documentElement.style.setProperty('--color-primary', '#d97706');
      document.documentElement.style.setProperty('--color-primary-hover', '#b45309');
    }
  }, []);
  return (
    <div className={`min-h-screen ${isTestEnv ? 'bg-amber-50/60' : 'bg-sand'}`}>
      {/* Skip to content for keyboard users */}
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>

      <Sidebar />

      {/* Main content area */}
      <div className="md:ml-16 min-h-screen flex flex-col">
        {isTestEnv && (
          <div className="bg-amber-500 text-white text-center text-base font-bold py-2 px-4">
            ⚠ PRACTICE APP — This is NOT the real app. You can tap anything here without worry.
          </div>
        )}
        <TopBar />

        <main
          id="main-content"
          role="main"
          className="flex-1 p-4 md:p-6 pb-24 md:pb-6"
        >
          <div key={location.pathname} className="page-enter">
            <Outlet />
          </div>
        </main>

        <footer className="text-center pb-20 md:pb-4 pt-4 text-xs text-muted/50">
          Made with <span className="inline-block animate-heartbeat">💗</span> by Shauna
        </footer>
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
