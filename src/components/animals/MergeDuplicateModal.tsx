import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Search, Loader2, AlertTriangle, ArrowRight, Check, PawPrint, Stethoscope, StickyNote, Camera } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { FIXED_STATUS_LABELS, SIZE_LABELS } from '../../lib/constants';

interface MergeAnimal {
  id: string;
  aao_id: string;
  name: string | null;
  breed: string | null;
  sex: string;
  size_category: string;
  fixed_status: string;
  owner: { name: string } | null;
  primary_location: { name: string } | null;
  profile_photo_url: string | null;
}

interface MergeAnimalCounts {
  care_events: number;
  field_notes: number;
  photos: number;
}

interface Props {
  animal: MergeAnimal & MergeAnimalCounts;
  onClose: () => void;
  onMerged: () => void;
  /** Pre-selected duplicate ID (from duplicate badge on list page) */
  preselectedId?: string;
}

type Step = 'search' | 'compare' | 'confirm';

export default function MergeDuplicateModal({ animal, onClose, onMerged, preselectedId }: Props) {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>('search');
  const [query, setQuery] = useState(animal.name ?? '');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<(MergeAnimal & { aao_id: string })[]>([]);
  const [duplicate, setDuplicate] = useState<(MergeAnimal & MergeAnimalCounts) | null>(null);
  const [merging, setMerging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [survivingCounts, setSurvivingCounts] = useState({ care_events: animal.care_events, field_notes: animal.field_notes, photos: animal.photos });
  const [hasSearched, setHasSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Load surviving animal's counts on mount
  useEffect(() => {
    async function loadCounts() {
      const [ceRes, fnRes, phRes] = await Promise.all([
        supabase.from('care_events').select('id', { count: 'exact', head: true }).eq('animal_id', animal.id),
        supabase.from('field_notes').select('id', { count: 'exact', head: true }).eq('animal_id', animal.id),
        supabase.from('photos').select('id', { count: 'exact', head: true }).eq('animal_id', animal.id),
      ]);
      setSurvivingCounts({
        care_events: ceRes.count ?? 0,
        field_notes: fnRes.count ?? 0,
        photos: phRes.count ?? 0,
      });
    }
    loadCounts();
  }, [animal.id]);

  // Pre-select duplicate if provided
  useEffect(() => {
    if (preselectedId) {
      selectDuplicate(preselectedId);
    }
  }, [preselectedId]);

  const runSearch = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) {
      setResults([]);
      return;
    }
    setSearching(true);
    setError(null);

    const { data, error: err } = await supabase
      .from('animals')
      .select('id, aao_id, name, breed, sex, size_category, fixed_status, owner:owners(name), primary_location:locations(name)')
      .neq('id', animal.id)
      .eq('archived', false)
      .or(`name.ilike.%${trimmed}%,aao_id.ilike.%${trimmed}%`)
      .order('name')
      .limit(20);

    setSearching(false);
    setHasSearched(true);
    if (err) {
      setError(err.message);
      return;
    }

    const ids = (data ?? []).map((a: any) => a.id);
    let photoMap: Record<string, string> = {};
    if (ids.length > 0) {
      const { data: photos } = await supabase
        .from('photos')
        .select('animal_id, storage_path')
        .in('animal_id', ids)
        .eq('is_profile', true);
      (photos ?? []).forEach((p: any) => {
        if (p.animal_id && p.storage_path) photoMap[p.animal_id] = p.storage_path;
      });
    }

    setResults((data ?? []).map((a: any) => ({
      ...a,
      owner: a.owner ?? null,
      primary_location: a.primary_location ?? null,
      profile_photo_url: photoMap[a.id] ?? null,
    })));
  }, [animal.id]);

  // Run search immediately on mount if animal has a name, then debounce on changes
  useEffect(() => {
    if (preselectedId) return; // skip search if pre-selecting
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      return;
    }
    clearTimeout(debounceRef.current);
    // Immediate on first mount, debounced after
    if (!hasSearched) {
      runSearch(trimmed);
    } else {
      debounceRef.current = setTimeout(() => runSearch(trimmed), 300);
    }
    return () => clearTimeout(debounceRef.current);
  }, [query, preselectedId]);

  async function selectDuplicate(id: string) {
    setError(null);
    // Fetch full details + counts
    const [animalRes, ceRes, fnRes, phRes] = await Promise.all([
      supabase
        .from('animals')
        .select('id, aao_id, name, breed, sex, size_category, fixed_status, owner:owners(name), primary_location:locations(name)')
        .eq('id', id)
        .single(),
      supabase.from('care_events').select('id', { count: 'exact', head: true }).eq('animal_id', id),
      supabase.from('field_notes').select('id', { count: 'exact', head: true }).eq('animal_id', id),
      supabase.from('photos').select('id', { count: 'exact', head: true }).eq('animal_id', id),
    ]);

    if (animalRes.error || !animalRes.data) {
      setError('Could not load animal details');
      return;
    }

    // Get profile photo
    const { data: profilePhoto } = await supabase
      .from('photos')
      .select('storage_path')
      .eq('animal_id', id)
      .eq('is_profile', true)
      .limit(1)
      .maybeSingle();

    const d = animalRes.data as any;
    setDuplicate({
      id: d.id,
      aao_id: d.aao_id,
      name: d.name,
      breed: d.breed,
      sex: d.sex,
      size_category: d.size_category,
      fixed_status: d.fixed_status,
      owner: d.owner ?? null,
      primary_location: d.primary_location ?? null,
      profile_photo_url: profilePhoto?.storage_path ?? null,
      care_events: ceRes.count ?? 0,
      field_notes: fnRes.count ?? 0,
      photos: phRes.count ?? 0,
    });
    setStep('compare');
  }

  async function executeMerge() {
    if (!duplicate || !user) return;
    setMerging(true);
    setError(null);

    try {
      // 1. Move care_events
      const { error: e1 } = await supabase
        .from('care_events')
        .update({ animal_id: animal.id })
        .eq('animal_id', duplicate.id);
      if (e1) throw e1;

      // 2. Move field_notes
      const { error: e2 } = await supabase
        .from('field_notes')
        .update({ animal_id: animal.id })
        .eq('animal_id', duplicate.id);
      if (e2) throw e2;

      // 3. Move photos
      const { error: e3 } = await supabase
        .from('photos')
        .update({ animal_id: animal.id })
        .eq('animal_id', duplicate.id);
      if (e3) throw e3;

      // 4. Move situations — deactivate duplicate's active situation first
      // (unique index: only one active situation per animal)
      const { error: e4a } = await supabase
        .from('situations')
        .update({ is_active: false })
        .eq('animal_id', duplicate.id)
        .eq('is_active', true);
      if (e4a) throw e4a;

      const { error: e4b } = await supabase
        .from('situations')
        .update({ animal_id: animal.id })
        .eq('animal_id', duplicate.id);
      if (e4b) throw e4b;

      // 5. Archive the duplicate
      const { error: e5 } = await supabase
        .from('animals')
        .update({
          archived: true,
          archived_at: new Date().toISOString(),
          archived_by: user.id,
        })
        .eq('id', duplicate.id);
      if (e5) throw e5;

      // 6. Add merge field note to surviving record
      const { error: e6 } = await supabase
        .from('field_notes')
        .insert({
          animal_id: animal.id,
          note: `Merged with duplicate record ${duplicate.aao_id} — all care history, notes, and photos combined`,
          created_by: user.id,
        });
      if (e6) throw e6;

      // 7. Log to activity_log
      await supabase.from('activity_log').insert({
        user_id: user.id,
        action: 'merge',
        table_name: 'animals',
        record_id: animal.id,
        changes: {
          merged_duplicate_id: duplicate.id,
          merged_duplicate_aao_id: duplicate.aao_id,
          surviving_aao_id: animal.aao_id,
          items_transferred: {
            care_events: duplicate.care_events,
            field_notes: duplicate.field_notes,
            photos: duplicate.photos,
          },
        },
      });

      setMerging(false);
      onMerged();
    } catch (err: any) {
      setMerging(false);
      setError(err.message ?? 'Merge failed');
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label="Merge duplicate">
      <div className="bg-white w-full sm:max-w-2xl sm:rounded-2xl rounded-t-2xl max-h-[90vh] flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-night/5 shrink-0">
          <h2 className="font-heading font-bold text-night text-base">
            {step === 'search' ? 'Find Duplicate Record' : step === 'compare' ? 'Compare Records' : 'Confirm Merge'}
          </h2>
          <button onClick={onClose} className="p-2.5 rounded-lg text-muted hover:text-night hover:bg-sand transition-all" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* Step 1: Search */}
          {step === 'search' && (
            <div className="space-y-4">
              <p className="text-sm text-muted">
                Search for the duplicate record to merge into <strong>{animal.name ?? 'Unnamed'}</strong> ({animal.aao_id}).
              </p>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted/50" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Name or AAO ID..."
                  className="w-full pl-9 pr-9 py-2.5 bg-sand/50 border border-night/8 rounded-xl text-sm text-night focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted/40"
                  autoFocus
                />
                {searching && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted animate-spin" />
                )}
              </div>

              {/* Results */}
              {results.length > 0 && (
                <div className="space-y-1.5 mt-2">
                  <p className="text-xs font-medium text-muted uppercase tracking-wide">{results.length} result{results.length !== 1 ? 's' : ''}</p>
                  {results.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => selectDuplicate(r.id)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl border border-night/8 hover:border-primary/30 hover:bg-primary/3 transition-all text-left"
                    >
                      <div className="w-10 h-10 rounded-lg bg-sand flex items-center justify-center shrink-0 overflow-hidden">
                        {r.profile_photo_url ? (
                          <img src={r.profile_photo_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <PawPrint className="w-5 h-5 text-muted/40" strokeWidth={1} />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-night truncate">{r.name ?? 'Unnamed'}</p>
                        <p className="text-xs text-muted font-mono">{r.aao_id}</p>
                      </div>
                      <div className="text-right shrink-0">
                        {r.owner && <p className="text-xs text-muted truncate max-w-[120px]">{r.owner.name}</p>}
                        {r.primary_location && <p className="text-xs text-muted truncate max-w-[120px]">{r.primary_location.name}</p>}
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted/40 shrink-0" />
                    </button>
                  ))}
                </div>
              )}

              {results.length === 0 && hasSearched && !searching && (
                <p className="text-sm text-muted text-center py-4">No matching animals found</p>
              )}
            </div>
          )}

          {/* Step 2: Side-by-side comparison */}
          {step === 'compare' && duplicate && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {/* Surviving record (left) */}
                <div className="rounded-xl border-2 border-primary/30 bg-primary/3 p-3">
                  <div className="flex items-center gap-1.5 mb-3">
                    <Check className="w-4 h-4 text-primary" />
                    <span className="text-xs font-bold text-primary uppercase tracking-wide">Keeping</span>
                  </div>
                  <RecordCard record={animal} counts={survivingCounts} />
                </div>

                {/* Duplicate record (right) */}
                <div className="rounded-xl border-2 border-ember/30 bg-ember/3 p-3">
                  <div className="flex items-center gap-1.5 mb-3">
                    <AlertTriangle className="w-4 h-4 text-ember" />
                    <span className="text-xs font-bold text-ember uppercase tracking-wide">Archiving</span>
                  </div>
                  <RecordCard record={duplicate} counts={{ care_events: duplicate.care_events, field_notes: duplicate.field_notes, photos: duplicate.photos }} />
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-gold/10 border border-gold/20">
                <AlertTriangle className="w-4 h-4 text-yellow-700 shrink-0 mt-0.5" />
                <p className="text-sm text-yellow-800">
                  All data from the right record will be merged into the left record. The right record will be archived.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => { setStep('search'); setDuplicate(null); }}
                  className="px-4 py-2.5 rounded-xl border border-night/10 text-sm font-medium text-muted hover:text-night hover:bg-sand transition-all"
                >
                  Back
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-night/5 shrink-0 space-y-3">
          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          {step === 'compare' && duplicate && !showConfirm && (
            <button
              onClick={() => setShowConfirm(true)}
              className="w-full py-3 bg-ember hover:bg-ember/90 text-white font-semibold text-sm rounded-xl shadow-sm transition-all flex items-center justify-center gap-2"
            >
              Merge Records
            </button>
          )}

          {showConfirm && duplicate && (
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-ember/8 border border-ember/20">
                <p className="text-sm text-night font-medium">
                  This will merge <span className="font-mono font-bold">{duplicate.aao_id}</span> into <span className="font-mono font-bold">{animal.aao_id}</span> and archive the duplicate. This action logs to the activity feed and cannot be automatically undone.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowConfirm(false)}
                  disabled={merging}
                  className="flex-1 py-3 rounded-xl border border-night/10 text-sm font-medium text-muted hover:text-night hover:bg-sand transition-all disabled:opacity-30"
                >
                  Cancel
                </button>
                <button
                  onClick={executeMerge}
                  disabled={merging}
                  className="flex-1 py-3 bg-ember hover:bg-ember/90 text-white font-semibold text-sm rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {merging ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {merging ? 'Merging...' : 'Confirm Merge'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RecordCard({ record, counts }: { record: MergeAnimal; counts: MergeAnimalCounts }) {
  return (
    <div className="space-y-2.5">
      {/* Photo + Name */}
      <div className="flex items-center gap-2.5">
        <div className="w-12 h-12 rounded-lg bg-sand flex items-center justify-center shrink-0 overflow-hidden">
          {record.profile_photo_url ? (
            <img src={record.profile_photo_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <PawPrint className="w-6 h-6 text-muted/40" strokeWidth={1} />
          )}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-night truncate">{record.name ?? 'Unnamed'}</p>
          <p className="text-xs text-muted font-mono">{record.aao_id}</p>
        </div>
      </div>

      {/* Details */}
      <div className="space-y-1 text-xs text-muted">
        {record.breed && <p><span className="font-medium text-night">Breed:</span> {record.breed}</p>}
        <p><span className="font-medium text-night">Sex:</span> {record.sex}</p>
        <p><span className="font-medium text-night">Fixed:</span> {FIXED_STATUS_LABELS[record.fixed_status] ?? record.fixed_status}</p>
        {record.owner && <p><span className="font-medium text-night">Owner:</span> {record.owner.name}</p>}
        {record.primary_location && <p><span className="font-medium text-night">Location:</span> {record.primary_location.name}</p>}
      </div>

      {/* Counts */}
      <div className="flex gap-2 pt-1.5 border-t border-night/5">
        <span className="flex items-center gap-1 text-xs text-muted">
          <Stethoscope className="w-3 h-3" /> {counts.care_events}
        </span>
        <span className="flex items-center gap-1 text-xs text-muted">
          <StickyNote className="w-3 h-3" /> {counts.field_notes}
        </span>
        <span className="flex items-center gap-1 text-xs text-muted">
          <Camera className="w-3 h-3" /> {counts.photos}
        </span>
      </div>
    </div>
  );
}
