import { useState, useEffect, useRef } from 'react';
import { X, Pencil, Flag, Check, Search, PawPrint, User, MapPin } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface Props {
  open: boolean;
  onClose: () => void;
}

interface LinkOption {
  id: string;
  label: string;
  sub?: string;
}

export default function FieldNotesDrawer({ open, onClose }: Props) {
  const { user } = useAuth();
  const [note, setNote] = useState('');
  const [flagged, setFlagged] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef<number | null>(null);

  // Linked records
  const [animalId, setAnimalId] = useState<string | null>(null);
  const [animalLabel, setAnimalLabel] = useState('');
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [ownerLabel, setOwnerLabel] = useState('');
  const [locationId, setLocationId] = useState<string | null>(null);
  const [locationLabel, setLocationLabel] = useState('');

  // Search state
  const [linking, setLinking] = useState<'animal' | 'owner' | 'location' | null>(null);
  const [linkSearch, setLinkSearch] = useState('');
  const [linkResults, setLinkResults] = useState<LinkOption[]>([]);

  useEffect(() => {
    if (open) {
      const scrollY = window.scrollY;
      document.body.classList.add('drawer-open');
      document.body.style.top = `-${scrollY}px`;
      setTimeout(() => textareaRef.current?.focus(), 250);
      return () => {
        document.body.classList.remove('drawer-open');
        document.body.style.top = '';
        window.scrollTo(0, scrollY);
      };
    } else {
      document.body.classList.remove('drawer-open');
      document.body.style.top = '';
    }
  }, [open]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && open) {
        if (linking) setLinking(null);
        else onClose();
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose, linking]);

  // Swipe down to close
  useEffect(() => {
    const el = drawerRef.current;
    if (!open || !el) return;
    function onTouchStart(e: TouchEvent) {
      touchStartY.current = e.touches[0].clientY;
    }
    function onTouchEnd(e: TouchEvent) {
      if (touchStartY.current === null) return;
      const delta = e.changedTouches[0].clientY - touchStartY.current;
      touchStartY.current = null;
      if (delta > 80) onClose();
    }
    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [open, onClose]);

  // Search for linkable records
  useEffect(() => {
    if (!linking || !linkSearch.trim()) {
      setLinkResults([]);
      return;
    }
    const q = linkSearch.trim();
    const timer = setTimeout(async () => {
      if (linking === 'animal') {
        const { data } = await supabase.from('animals').select('id, name, aao_id').or(`name.ilike.%${q}%,aao_id.ilike.%${q}%`).eq('archived', false).limit(10);
        setLinkResults((data ?? []).map((a: any) => ({ id: a.id, label: a.name ?? a.aao_id ?? 'Unnamed', sub: a.aao_id })));
      } else if (linking === 'owner') {
        const { data } = await supabase.from('owners').select('id, name').ilike('name', `%${q}%`).eq('archived', false).limit(10);
        setLinkResults((data ?? []).map((o: any) => ({ id: o.id, label: o.name })));
      } else {
        const { data } = await supabase.from('locations').select('id, name').ilike('name', `%${q}%`).eq('archived', false).limit(10);
        setLinkResults((data ?? []).map((l: any) => ({ id: l.id, label: l.name })));
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [linking, linkSearch]);

  function selectLink(opt: LinkOption) {
    if (linking === 'animal') { setAnimalId(opt.id); setAnimalLabel(opt.label); }
    else if (linking === 'owner') { setOwnerId(opt.id); setOwnerLabel(opt.label); }
    else if (linking === 'location') { setLocationId(opt.id); setLocationLabel(opt.label); }
    setLinking(null);
    setLinkSearch('');
  }

  async function handleSave() {
    if (!note.trim() || !user) return;
    setSaving(true);
    setSaveError('');
    const { error } = await supabase.from('field_notes').insert({
      note: note.trim(),
      flagged,
      animal_id: animalId,
      owner_id: ownerId,
      location_id: locationId,
      created_by: user.id,
    });
    setSaving(false);
    if (error) {
      setSaveError(`Could not save note: ${error.message}`);
      return;
    }
    setSaved(true);
    setTimeout(() => {
      setNote(''); setFlagged(false); setSaved(false); setSaveError('');
      setAnimalId(null); setAnimalLabel(''); setOwnerId(null); setOwnerLabel(''); setLocationId(null); setLocationLabel('');
      onClose();
    }, 800);
  }

  return (
    <>
      {open && <div className="fixed inset-0 drawer-backdrop z-50" onClick={onClose} />}

      <div
        ref={drawerRef}
        role="dialog"
        aria-label="Field notes"
        aria-modal="true"
        className={`fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-[-8px_0_30px_rgba(28,23,8,0.12)] z-50 transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex flex-col h-full">
          {/* Mobile handle bar */}
          <div className="md:hidden pt-2.5 pb-1 flex flex-col items-center shrink-0">
            <div className="w-10 h-1 bg-night/20 rounded-full" />
            <span className="text-xs text-muted mt-1">Swipe down to close</span>
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 h-14 border-b border-night/5 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 bg-primary/10 rounded-lg flex items-center justify-center">
                <Pencil className="w-3.5 h-3.5 text-primary" strokeWidth={2} />
              </div>
              <h2 className="font-heading font-bold text-night text-base">New Note</h2>
            </div>
            <button onClick={onClose} className="p-3 -mr-1 rounded-xl text-muted hover:text-night hover:bg-sand transition-all" aria-label="Close field notes">
              <X className="w-5 h-5" strokeWidth={1.75} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 p-5 overflow-y-auto">
            {/* Link search overlay */}
            {linking && (
              <div className="mb-4 bg-sand rounded-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-night capitalize">Link to {linking}</span>
                  <button onClick={() => { setLinking(null); setLinkSearch(''); }} className="text-xs text-muted hover:text-night">Cancel</button>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted" />
                  <input
                    type="text"
                    value={linkSearch}
                    onChange={(e) => setLinkSearch(e.target.value)}
                    placeholder={`Search ${linking}s...`}
                    autoFocus
                    className="w-full pl-9 pr-3 py-2 bg-white border border-night/8 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                {linkResults.length > 0 && (
                  <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                    {linkResults.map((r) => (
                      <button key={r.id} onClick={() => selectLink(r)} className="w-full text-left p-2 rounded-lg hover:bg-white text-sm text-night transition-colors">
                        {r.label}{r.sub && <span className="text-xs text-muted ml-2 font-mono">{r.sub}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <textarea
              ref={textareaRef}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What did you observe? Note anything important..."
              className="w-full h-40 p-4 bg-sand/70 border border-night/5 rounded-xl text-sm leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/20 placeholder:text-muted transition-all"
            />

            {/* Linked records */}
            <div className="flex flex-wrap gap-2 mt-3">
              {animalId ? (
                <span className="inline-flex items-center gap-1.5 bg-primary/10 text-primary text-xs font-medium px-2.5 py-1 rounded-full">
                  <PawPrint className="w-3 h-3" />{animalLabel}
                  <button onClick={() => { setAnimalId(null); setAnimalLabel(''); }} aria-label="Remove animal link"><X className="w-3 h-3" /></button>
                </span>
              ) : (
                <button onClick={() => setLinking('animal')} className="inline-flex items-center gap-1 text-xs text-muted hover:text-night bg-sand rounded-full px-2.5 py-1 transition-colors">
                  <PawPrint className="w-3 h-3" />Link animal
                </button>
              )}
              {ownerId ? (
                <span className="inline-flex items-center gap-1.5 bg-gold/15 text-night text-xs font-medium px-2.5 py-1 rounded-full">
                  <User className="w-3 h-3" />{ownerLabel}
                  <button onClick={() => { setOwnerId(null); setOwnerLabel(''); }} aria-label="Remove person link"><X className="w-3 h-3" /></button>
                </span>
              ) : (
                <button onClick={() => setLinking('owner')} className="inline-flex items-center gap-1 text-xs text-muted hover:text-night bg-sand rounded-full px-2.5 py-1 transition-colors">
                  <User className="w-3 h-3" />Link person
                </button>
              )}
              {locationId ? (
                <span className="inline-flex items-center gap-1.5 bg-ember/10 text-ember text-xs font-medium px-2.5 py-1 rounded-full">
                  <MapPin className="w-3 h-3" />{locationLabel}
                  <button onClick={() => { setLocationId(null); setLocationLabel(''); }} aria-label="Remove location link"><X className="w-3 h-3" /></button>
                </span>
              ) : (
                <button onClick={() => setLinking('location')} className="inline-flex items-center gap-1 text-xs text-muted hover:text-night bg-sand rounded-full px-2.5 py-1 transition-colors">
                  <MapPin className="w-3 h-3" />Link location
                </button>
              )}
            </div>

            {/* Flag toggle */}
            <button
              onClick={() => setFlagged(!flagged)}
              className={`mt-3 flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                flagged
                  ? 'bg-gold/15 text-night border border-gold/50'
                  : 'bg-sand/70 text-muted border border-night/5 hover:border-night/10'
              }`}
            >
              <Flag className={`w-4 h-4 ${flagged ? 'text-gold fill-gold/20' : ''}`} strokeWidth={1.75} />
              {flagged ? 'Flagged for review' : 'Flag for coordinator review'}
            </button>
          </div>

          {/* Footer */}
          <div className="p-5 border-t border-night/5 shrink-0">
            {saveError && (
              <div className="bg-ember/10 border border-ember/20 text-ember text-xs rounded-xl px-3 py-2 mb-3" role="alert" aria-live="assertive">
                {saveError}
              </div>
            )}
            <button
              onClick={handleSave}
              disabled={!note.trim() || saving}
              className={`w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 ${
                saved
                  ? 'bg-primary text-white'
                  : 'bg-primary hover:bg-primary-hover text-white disabled:opacity-30 shadow-[0_2px_8px_rgba(110,168,50,0.25)]'
              }`}
            >
              {saved ? (<><Check className="w-4 h-4" strokeWidth={2.5} />Saved</>) : saving ? 'Saving...' : 'Save note'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
