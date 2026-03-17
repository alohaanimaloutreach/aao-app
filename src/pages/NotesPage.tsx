import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { StickyNote, Search, SlidersHorizontal, X, Flag, PawPrint, User, MapPin } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { formatDate, formatDateTime } from '../lib/format';
import EmptyState from '../components/shared/EmptyState';

interface NoteRow {
  id: string;
  note: string;
  flagged: boolean;
  flag_reason: string | null;
  animal_id: string | null;
  owner_id: string | null;
  location_id: string | null;
  created_at: string;
  created_by: string | null;
  author_name: string | null;
  animal_name: string | null;
  animal_aao_id: string | null;
  owner_name: string | null;
  location_name: string | null;
}

interface Filters {
  search: string;
  flaggedOnly: boolean;
  authorId: string;
}

export default function NotesPage() {
  const { session } = useAuth();
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [authors, setAuthors] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>({ search: '', flaggedOnly: false, authorId: '' });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (session) loadNotes();
  }, [session]);

  async function loadNotes() {
    setLoading(true);
    const { data } = await supabase
      .from('field_notes')
      .select('id, note, flagged, flag_reason, animal_id, owner_id, location_id, created_at, created_by, author:users!created_by(name), animal:animals(name, aao_id), owner:owners(name), location:locations(name)')
      .order('created_at', { ascending: false });

    const rows: NoteRow[] = (data ?? []).map((n: any) => ({
      id: n.id,
      note: n.note,
      flagged: n.flagged,
      flag_reason: n.flag_reason,
      animal_id: n.animal_id,
      owner_id: n.owner_id,
      location_id: n.location_id,
      created_at: n.created_at,
      created_by: n.created_by,
      author_name: n.author?.name ?? null,
      animal_name: n.animal?.name ?? null,
      animal_aao_id: n.animal?.aao_id ?? null,
      owner_name: n.owner?.name ?? null,
      location_name: n.location?.name ?? null,
    }));
    setNotes(rows);

    // Build unique authors
    const authorMap = new Map<string, string>();
    rows.forEach((n) => {
      if (n.created_by && n.author_name) authorMap.set(n.created_by, n.author_name);
    });
    setAuthors(Array.from(authorMap.entries()).map(([id, name]) => ({ id, name })));

    setLoading(false);
  }

  const filtered = useMemo(() => {
    return notes.filter((n) => {
      if (filters.flaggedOnly && !n.flagged) return false;
      if (filters.authorId && n.created_by !== filters.authorId) return false;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const fields = [n.note, n.animal_name, n.animal_aao_id, n.owner_name, n.location_name, n.author_name];
        if (!fields.some((f) => f?.toLowerCase().includes(q))) return false;
      }
      return true;
    });
  }, [notes, filters]);

  const activeFilterCount = [filters.flaggedOnly, filters.authorId].filter(Boolean).length;

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-heading text-night tracking-tight">Field Notes</h1>
          <p className="text-muted mt-0.5">All notes from the field</p>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="space-y-3 mb-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted/50" strokeWidth={2} />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              placeholder="Search notes, animals, people, locations..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-night/8 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted/40 transition-all"
            />
            {filters.search && (
              <button onClick={() => setFilters({ ...filters, search: '' })} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted/40 hover:text-night">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${
              showFilters || activeFilterCount > 0 ? 'bg-primary/8 border-primary/20 text-primary' : 'bg-white border-night/8 text-muted hover:text-night'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" strokeWidth={1.75} />
            {activeFilterCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">{activeFilterCount}</span>
            )}
          </button>
        </div>

        {showFilters && (
          <div className="bg-white rounded-2xl border border-night/5 p-4 flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-night cursor-pointer">
              <input type="checkbox" checked={filters.flaggedOnly} onChange={(e) => setFilters({ ...filters, flaggedOnly: e.target.checked })} className="w-4 h-4 rounded accent-gold" />
              Flagged only
            </label>
            <select
              value={filters.authorId}
              onChange={(e) => setFilters({ ...filters, authorId: e.target.value })}
              className="px-3 py-2 bg-sand/60 border border-night/5 rounded-lg text-sm text-night focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">All authors</option>
              {authors.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            {activeFilterCount > 0 && (
              <button onClick={() => setFilters({ search: filters.search, flaggedOnly: false, authorId: '' })} className="text-sm text-primary font-medium">Clear</button>
            )}
          </div>
        )}

        <p className="text-xs text-muted">{filtered.length} note{filtered.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Notes list */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-night/5 p-4 space-y-2">
              <div className="skeleton h-3 w-24" />
              <div className="skeleton h-4 w-full" />
              <div className="skeleton h-4 w-3/4" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={StickyNote} title="No notes found" description={filters.search || filters.flaggedOnly ? 'Try adjusting your filters' : 'Notes will appear here as they are created'} />
      ) : (
        <div className="space-y-2">
          {filtered.map((n) => (
            <div
              key={n.id}
              className={`bg-white rounded-2xl border p-4 ${n.flagged ? 'border-gold/30 bg-gold/3' : 'border-night/5'}`}
            >
              {/* Header */}
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  {n.flagged && <Flag className="w-3.5 h-3.5 text-gold fill-gold/20" />}
                  <span className="text-sm text-muted">{formatDateTime(n.created_at)}</span>
                </div>
                {n.author_name && <span className="text-sm text-muted">{n.author_name}</span>}
              </div>

              {/* Note text */}
              <p className="text-sm text-night leading-relaxed">{n.note}</p>

              {/* Linked records */}
              {(n.animal_id || n.owner_id || n.location_id) && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {n.animal_id && (
                    <Link to={`/animals/${n.animal_id}`} className="inline-flex items-center gap-1 bg-primary/8 text-primary text-xs font-medium px-2 py-0.5 rounded-full hover:bg-primary/15 transition-colors">
                      <PawPrint className="w-3 h-3" />
                      {n.animal_name ?? n.animal_aao_id ?? 'Animal'}
                    </Link>
                  )}
                  {n.owner_id && (
                    <Link to={`/people/${n.owner_id}`} className="inline-flex items-center gap-1 bg-gold/12 text-night text-xs font-medium px-2 py-0.5 rounded-full hover:bg-gold/20 transition-colors">
                      <User className="w-3 h-3" />
                      {n.owner_name ?? 'Person'}
                    </Link>
                  )}
                  {n.location_id && (
                    <Link to={`/locations/${n.location_id}`} className="inline-flex items-center gap-1 bg-ember/8 text-ember text-xs font-medium px-2 py-0.5 rounded-full hover:bg-ember/15 transition-colors">
                      <MapPin className="w-3 h-3" />
                      {n.location_name ?? 'Location'}
                    </Link>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
