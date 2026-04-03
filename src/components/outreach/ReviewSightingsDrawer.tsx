import { useState, useEffect } from 'react';
import { X, PawPrint, MapPin, Users, Clock, Check, Plus, Loader2, ArrowRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { formatRelative } from '../../lib/format';

interface SightingEntry {
  id: string;
  animal_id: string | null;
  animal_name: string | null;
  owner_id: string | null;
  sex: string | null;
  size_category: string | null;
  color: string | null;
  coat_length: string | null;
  identifying_marks: string | null;
  animal_count: number;
  care_given: string[];
  microchip_number: string | null;
  vaccine_lot_number: string | null;
  preventative_product: string | null;
  notes: string | null;
  reviewed: boolean;
  owner: { name: string } | null;
}

interface AnimalCandidate {
  id: string;
  name: string | null;
  aao_id: string;
  sex: string | null;
  size_category: string | null;
  color: string | null;
  last_seen: string | null;
  owner: { name: string } | null;
  matchType: 'chip' | 'owner' | 'description';
  matchLabel: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  eventId: string;
  eventLocationId: string;
  eventDate: string;
  onUpdated: () => void;
}

const CARE_DISPLAY: Record<string, string> = {
  food: 'Food',
  preventative: 'Preventative',
  vaccine: 'Vaccine',
  microchip: 'Microchip',
  wellness: 'Wellness',
  other: 'Other',
};

export default function ReviewSightingsDrawer({ open, onClose, eventId, eventLocationId, eventDate, onUpdated }: Props) {
  const { user } = useAuth();
  const [entries, setEntries] = useState<SightingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [candidates, setCandidates] = useState<AnimalCandidate[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [showNamePrompt, setShowNamePrompt] = useState(false);

  useEffect(() => {
    if (open && eventId) loadEntries();
  }, [open, eventId]);

  useEffect(() => {
    if (entries.length > 0 && currentIndex < entries.length) {
      findMatches(entries[currentIndex]);
    }
  }, [currentIndex, entries]);

  async function loadEntries() {
    setLoading(true);
    const { data } = await supabase
      .from('sighting_entries')
      .select('id, animal_id, animal_name, owner_id, sex, size_category, color, coat_length, identifying_marks, animal_count, care_given, microchip_number, vaccine_lot_number, preventative_product, notes, reviewed, owner:owners(name)')
      .eq('outreach_event_id', eventId)
      .is('animal_id', null)
      .eq('reviewed', false)
      .order('created_at', { ascending: true });

    const mapped = (data ?? []).map((e: any) => ({
      ...e,
      owner: Array.isArray(e.owner) ? e.owner[0] ?? null : e.owner,
    }));
    setEntries(mapped);
    setCurrentIndex(0);
    setLoading(false);
  }

  async function findMatches(entry: SightingEntry) {
    setLoadingMatches(true);
    setCandidates([]);
    const matches: AnimalCandidate[] = [];

    // 1. Microchip match
    if (entry.microchip_number) {
      const { data } = await supabase
        .from('animals')
        .select('id, name, aao_id, sex, size_category, color, last_seen, owner:owners(name)')
        .eq('archived', false)
        .eq('microchip_primary', entry.microchip_number)
        .limit(5);
      (data ?? []).forEach((a: any) => {
        matches.push({
          ...a,
          owner: Array.isArray(a.owner) ? a.owner[0] ?? null : a.owner,
          matchType: 'chip',
          matchLabel: 'Chip match — high confidence',
        });
      });
    }

    // 2. Owner match
    if (entry.owner_id && matches.length === 0) {
      const { data } = await supabase
        .from('animals')
        .select('id, name, aao_id, sex, size_category, color, last_seen, owner:owners(name)')
        .eq('archived', false)
        .eq('owner_id', entry.owner_id)
        .limit(10);
      (data ?? []).forEach((a: any) => {
        if (!matches.some((m) => m.id === a.id)) {
          matches.push({
            ...a,
            owner: Array.isArray(a.owner) ? a.owner[0] ?? null : a.owner,
            matchType: 'owner',
            matchLabel: 'Same owner',
          });
        }
      });
    }

    // 3. Location + description match
    if (eventLocationId && matches.length === 0) {
      const { data } = await supabase
        .from('animals')
        .select('id, name, aao_id, sex, size_category, color, last_seen, owner:owners(name)')
        .eq('archived', false)
        .eq('primary_location_id', eventLocationId)
        .limit(30);

      (data ?? []).forEach((a: any) => {
        if (matches.some((m) => m.id === a.id)) return;
        let score = 0;
        if (entry.color && a.color && entry.color.toLowerCase() === a.color.toLowerCase()) score++;
        if (entry.size_category && a.size_category && entry.size_category === a.size_category) score++;
        if (entry.sex && a.sex && entry.sex === a.sex) score++;
        if (score >= 2) {
          matches.push({
            ...a,
            owner: Array.isArray(a.owner) ? a.owner[0] ?? null : a.owner,
            matchType: 'description',
            matchLabel: 'Possible match — similar description',
          });
        }
      });
    }

    setCandidates(matches);
    setLoadingMatches(false);
  }

  async function linkAnimal(entryId: string, animalId: string, careGiven: string[]) {
    if (!user) return;
    setProcessing(true);

    // Update sighting entry
    await supabase.from('sighting_entries').update({
      animal_id: animalId,
      reviewed: true,
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
    }).eq('id', entryId);

    // Create care_event if care was given
    if (careGiven.length > 0) {
      const careTypes: string[] = [];
      if (careGiven.includes('food')) careTypes.push('food');
      if (careGiven.includes('vaccine')) careTypes.push('vaccine_dapp');
      if (careGiven.includes('preventative')) careTypes.push('preventative_oral');
      if (careGiven.includes('microchip')) careTypes.push('microchip');
      if (careGiven.includes('wellness')) careTypes.push('seen');
      if (careTypes.length === 0) careTypes.push('seen');

      await supabase.from('care_events').insert({
        outreach_event_id: eventId,
        animal_id: animalId,
        event_date: eventDate,
        care_types: careTypes,
        created_by: user.id,
      });
    }

    setProcessing(false);
    moveToNext();
  }

  async function createNewProfile(entryId: string, entry: SightingEntry, name: string) {
    if (!user || !name.trim()) return;
    setProcessing(true);

    // Create animal profile
    const { data: newAnimal } = await supabase
      .from('animals')
      .insert({
        name: name.trim(),
        animal_type: 'dog',
        sex: entry.sex || 'unknown',
        size_category: entry.size_category || 'medium',
        color: entry.color || null,
        owner_id: entry.owner_id || null,
        primary_location_id: eventLocationId,
        general_notes: entry.identifying_marks || null,
        created_by: user.id,
      })
      .select('id')
      .single();

    if (newAnimal) {
      // Link sighting and create care_event
      await linkAnimal(entryId, newAnimal.id, entry.care_given);
    } else {
      setProcessing(false);
      moveToNext();
    }
  }

  async function markReviewed(entryId: string) {
    if (!user) return;
    setProcessing(true);
    await supabase.from('sighting_entries').update({
      reviewed: true,
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
    }).eq('id', entryId);
    setProcessing(false);
    moveToNext();
  }

  function moveToNext() {
    setShowNamePrompt(false);
    setNewProfileName('');
    setCandidates([]);
    const remaining = entries.filter((_, i) => i !== currentIndex);
    setEntries(remaining);
    if (remaining.length === 0) {
      onUpdated();
    } else {
      setCurrentIndex(0);
    }
  }

  if (!open) return null;

  const current = entries[currentIndex];

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-night/5 shrink-0 bg-sand/30">
        <div>
          <h2 className="font-heading font-bold text-night text-base">Review Sightings</h2>
          <p className="text-xs text-muted">{entries.length} remaining</p>
        </div>
        <button onClick={onClose} className="p-2 rounded-lg text-muted hover:text-night hover:bg-sand transition-all" aria-label="Close">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-20">
            <Check className="w-10 h-10 text-primary mx-auto mb-3" />
            <p className="text-lg font-heading font-bold text-night">All reviewed</p>
            <p className="text-sm text-muted mt-1">Every sighting has been reviewed</p>
            <button onClick={onClose} className="mt-4 px-6 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary-hover transition-all">
              Done
            </button>
          </div>
        ) : current ? (
          <div className="max-w-lg mx-auto space-y-4">
            {/* Sighting card */}
            <div className="bg-sand/30 rounded-2xl border border-night/5 p-4">
              <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Sighting Details</p>

              <div className="grid grid-cols-2 gap-2 text-sm">
                {current.color && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted text-xs">Color:</span>
                    <span className="font-medium text-night capitalize">{current.color}</span>
                  </div>
                )}
                {current.size_category && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted text-xs">Size:</span>
                    <span className="font-medium text-night capitalize">{current.size_category}</span>
                  </div>
                )}
                {current.sex && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted text-xs">Sex:</span>
                    <span className="font-medium text-night capitalize">{current.sex}</span>
                  </div>
                )}
                {current.coat_length && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted text-xs">Coat:</span>
                    <span className="font-medium text-night capitalize">{current.coat_length}</span>
                  </div>
                )}
              </div>

              {current.identifying_marks && (
                <p className="text-sm text-night mt-2 italic">"{current.identifying_marks}"</p>
              )}

              {current.owner?.name && (
                <div className="flex items-center gap-1.5 mt-2 text-sm">
                  <Users className="w-3.5 h-3.5 text-muted" />
                  <span className="text-night">{current.owner.name}</span>
                </div>
              )}

              {current.care_given.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {current.care_given.map((c) => (
                    <span key={c} className="text-xs bg-primary/8 text-primary font-medium rounded-full px-2 py-0.5">
                      {CARE_DISPLAY[c] ?? c}
                    </span>
                  ))}
                </div>
              )}

              {current.notes && (
                <p className="text-xs text-muted mt-2">{current.notes}</p>
              )}
            </div>

            {/* Potential matches */}
            {loadingMatches ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
                <span className="text-sm text-muted ml-2">Finding matches...</span>
              </div>
            ) : candidates.length > 0 ? (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-muted uppercase tracking-wider">Potential Matches</p>
                {candidates.map((c) => (
                  <div key={c.id} className="bg-white rounded-xl border border-night/5 p-3 shadow-sm">
                    {/* Match confidence label */}
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className={`text-xs font-medium ${
                        c.matchType === 'chip' ? 'text-blue-600' : c.matchType === 'owner' ? 'text-amber-600' : 'text-muted'
                      }`}>
                        {c.matchType === 'chip' ? '🔵' : c.matchType === 'owner' ? '🟡' : '⚪'} {c.matchLabel}
                      </span>
                    </div>

                    {/* Side-by-side comparison */}
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="text-xs space-y-1">
                        <p className="font-semibold text-muted uppercase tracking-wider text-[10px]">Sighting</p>
                        {current.color && <p className="text-night capitalize">{current.color}</p>}
                        {current.size_category && <p className="text-night capitalize">{current.size_category}</p>}
                        {current.sex && <p className="text-night capitalize">{current.sex}</p>}
                      </div>
                      <div className="text-xs space-y-1">
                        <p className="font-semibold text-muted uppercase tracking-wider text-[10px]">Profile</p>
                        <p className="text-night font-medium">{c.name ?? c.aao_id}</p>
                        {c.owner?.name && <p className="text-muted">{c.owner.name}</p>}
                        {c.last_seen && <p className="text-muted">Last seen {formatRelative(c.last_seen)}</p>}
                        <p className="text-muted font-mono">{c.aao_id}</p>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => linkAnimal(current.id, c.id, current.care_given)}
                        disabled={processing}
                        className="flex-1 py-2 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary-hover disabled:opacity-50 transition-all"
                      >
                        Link — same animal
                      </button>
                      <button
                        onClick={() => setCandidates((prev) => prev.filter((p) => p.id !== c.id))}
                        className="px-3 py-2 text-xs text-muted hover:text-night bg-sand rounded-lg transition-colors"
                      >
                        Not a match
                      </button>
                    </div>
                  </div>
                ))}

                {/* Create new after dismissing some matches */}
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (current.animal_name) {
                        createNewProfile(current.id, current, current.animal_name);
                      } else {
                        setShowNamePrompt(true);
                      }
                    }}
                    disabled={processing}
                    className="flex-1 py-2.5 bg-sand border border-night/8 text-night text-sm font-medium rounded-xl hover:bg-night/5 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" /> Create new profile
                  </button>
                </div>
              </div>
            ) : (
              /* No matches found */
              <div className="space-y-3">
                <p className="text-xs font-semibold text-muted uppercase tracking-wider">No Matches Found</p>

                {showNamePrompt ? (
                  <div className="bg-sand/30 rounded-xl p-3 space-y-2.5">
                    <p className="text-sm text-night">Enter a name or temp ID (e.g. "Brown #2"):</p>
                    <input
                      type="text"
                      value={newProfileName}
                      onChange={(e) => setNewProfileName(e.target.value)}
                      placeholder="Name for this animal..."
                      className="w-full px-3 py-2.5 bg-white border border-night/8 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted/40"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => createNewProfile(current.id, current, newProfileName)}
                        disabled={!newProfileName.trim() || processing}
                        className="flex-1 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl disabled:opacity-30 transition-all"
                      >
                        {processing ? 'Creating...' : 'Create Profile'}
                      </button>
                      <button
                        onClick={() => { setShowNamePrompt(false); setNewProfileName(''); }}
                        className="px-4 py-2.5 text-sm text-muted hover:text-night transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        if (current.animal_name) {
                          createNewProfile(current.id, current, current.animal_name);
                        } else {
                          setShowNamePrompt(true);
                        }
                      }}
                      disabled={processing}
                      className="flex-1 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl disabled:opacity-50 transition-all flex items-center justify-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" /> Create new profile
                    </button>
                    <button
                      onClick={() => markReviewed(current.id)}
                      disabled={processing}
                      className="flex-1 py-2.5 bg-sand border border-night/8 text-night text-sm font-medium rounded-xl hover:bg-night/5 disabled:opacity-50 transition-all"
                    >
                      Mark as reviewed — stray/untracked
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
