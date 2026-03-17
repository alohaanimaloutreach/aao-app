import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, PawPrint, User, MapPin, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Props {
  open: boolean;
  onClose: () => void;
}

interface AnimalResult { id: string; aao_id: string; name: string | null; animal_type: string; owner_name: string | null; }
interface OwnerResult { id: string; name: string; phone_primary: string | null; location_name: string | null; }
interface LocationResult { id: string; name: string; address: string | null; status: string; }

export default function GlobalSearch({ open, onClose }: Props) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [animals, setAnimals] = useState<AnimalResult[]>([]);
  const [owners, setOwners] = useState<OwnerResult[]>([]);
  const [locations, setLocations] = useState<LocationResult[]>([]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery('');
      setAnimals([]);
      setOwners([]);
      setLocations([]);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Keyboard shortcut to close
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && open) onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  // Debounced search
  useEffect(() => {
    if (query.trim().length < 2) {
      setAnimals([]);
      setOwners([]);
      setLocations([]);
      return;
    }
    const timeout = setTimeout(() => runSearch(query.trim()), 250);
    return () => clearTimeout(timeout);
  }, [query]);

  async function runSearch(q: string) {
    setLoading(true);
    const term = `%${q}%`;

    const [animalRes, ownerRes, locationRes] = await Promise.all([
      supabase
        .from('animals')
        .select('id, aao_id, name, animal_type, owner:owners(name)')
        .eq('archived', false)
        .eq('deceased', false)
        .or(`name.ilike.${term},aao_id.ilike.${term}`)
        .order('name')
        .limit(8),
      supabase
        .from('owners')
        .select('id, name, phone_primary, primary_location:locations(name)')
        .eq('archived', false)
        .or(`name.ilike.${term},phone_primary.ilike.${term}`)
        .order('name')
        .limit(8),
      supabase
        .from('locations')
        .select('id, name, address, status')
        .eq('archived', false)
        .or(`name.ilike.${term},address.ilike.${term}`)
        .order('name')
        .limit(6),
    ]);

    setAnimals((animalRes.data ?? []).map((a: any) => ({
      id: a.id,
      aao_id: a.aao_id,
      name: a.name,
      animal_type: a.animal_type,
      owner_name: Array.isArray(a.owner) ? a.owner[0]?.name ?? null : a.owner?.name ?? null,
    })));

    setOwners((ownerRes.data ?? []).map((o: any) => ({
      id: o.id,
      name: o.name,
      phone_primary: o.phone_primary,
      location_name: Array.isArray(o.primary_location) ? o.primary_location[0]?.name ?? null : o.primary_location?.name ?? null,
    })));

    setLocations(locationRes.data ?? []);
    setLoading(false);
  }

  function go(path: string) {
    onClose();
    navigate(path);
  }

  const hasResults = animals.length > 0 || owners.length > 0 || locations.length > 0;
  const searched = query.trim().length >= 2;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-label="Search">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Search panel */}
      <div className="relative max-w-lg w-full mx-auto mt-[10vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[75vh] mx-4 sm:mx-auto">
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-night/5">
          <Search className="w-5 h-5 text-muted shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search animals, people, locations..."
            className="flex-1 text-sm text-night bg-transparent outline-none placeholder:text-muted/40"
          />
          {loading && <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0" />}
          <button onClick={onClose} className="p-1 text-muted hover:text-night transition-colors shrink-0" aria-label="Close search">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto" aria-live="polite">
          {!searched && (
            <div className="text-center py-10 px-4">
              <Search className="w-8 h-8 text-muted/20 mx-auto mb-2" />
              <p className="text-sm text-muted">Type at least 2 characters to search</p>
            </div>
          )}

          {searched && !loading && !hasResults && (
            <div className="text-center py-10 px-4">
              <p className="text-sm text-muted">No results for "{query}"</p>
            </div>
          )}

          {/* Animals */}
          {animals.length > 0 && (
            <div>
              <div className="px-4 py-2 bg-sand/50">
                <p className="text-[11px] font-semibold text-muted uppercase tracking-wide">Animals ({animals.length})</p>
              </div>
              {animals.map((a) => (
                <button
                  key={a.id}
                  onClick={() => go(`/animals/${a.id}`)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-sand/50 text-left transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <PawPrint className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-night block truncate">{a.name ?? 'Unnamed'}</span>
                    <span className="text-[11px] text-muted">
                      {a.aao_id} · {a.animal_type}
                      {a.owner_name && ` · ${a.owner_name}`}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* People */}
          {owners.length > 0 && (
            <div>
              <div className="px-4 py-2 bg-sand/50">
                <p className="text-[11px] font-semibold text-muted uppercase tracking-wide">People ({owners.length})</p>
              </div>
              {owners.map((o) => (
                <button
                  key={o.id}
                  onClick={() => go(`/people/${o.id}`)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-sand/50 text-left transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-gold/15 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-gold" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-night block truncate">{o.name}</span>
                    <span className="text-[11px] text-muted">
                      {o.phone_primary ?? 'No phone'}
                      {o.location_name && ` · ${o.location_name}`}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Locations */}
          {locations.length > 0 && (
            <div>
              <div className="px-4 py-2 bg-sand/50">
                <p className="text-[11px] font-semibold text-muted uppercase tracking-wide">Locations ({locations.length})</p>
              </div>
              {locations.map((l) => (
                <button
                  key={l.id}
                  onClick={() => go(`/locations/${l.id}`)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-sand/50 text-left transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-ember/10 flex items-center justify-center shrink-0">
                    <MapPin className="w-4 h-4 text-ember" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-night block truncate">{l.name}</span>
                    {l.address && <span className="text-[11px] text-muted">{l.address}</span>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2 border-t border-night/5 bg-sand/30">
          <p className="text-[10px] text-muted text-center">Press Esc to close</p>
        </div>
      </div>
    </div>
  );
}
