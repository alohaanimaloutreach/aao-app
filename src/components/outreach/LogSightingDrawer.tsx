import { useState, useEffect, useRef } from 'react';
import {
  X, Search, UserPlus, ChevronDown, ChevronUp,
  Camera, Package, Pill, Syringe, Stethoscope,
  Heart, Loader2, Check, WifiOff, MapPin,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { queueSighting } from '../../lib/offlineQueue';
import { formatRelative } from '../../lib/format';

interface Props {
  open: boolean;
  onClose: () => void;
  eventId: string;
  eventLocationId: string;
  eventDate: string;
  onSaved: () => void;
}

interface OwnerResult {
  id: string;
  name: string;
  phone_primary: string | null;
  primary_location: { name: string } | null;
}

interface AnimalMatch {
  id: string;
  name: string;
  aao_id: string;
  owner: { name: string } | null;
  last_seen?: string | null;
}

const COLORS = ['Black', 'Brown', 'Tan', 'White', 'Brindle', 'Grey', 'Mixed'];
const SIZES = [
  { value: 'small', label: 'S' },
  { value: 'medium', label: 'M' },
  { value: 'large', label: 'L' },
  { value: 'xlarge', label: 'XL' },
];

type CareType = 'food' | 'preventative' | 'vaccine' | 'microchip' | 'wellness' | 'other';

export default function LogSightingDrawer({ open, onClose, eventId, eventLocationId, eventDate, onSaved }: Props) {
  const { user } = useAuth();

  // Owner
  const [ownerQuery, setOwnerQuery] = useState('');
  const [ownerResults, setOwnerResults] = useState<OwnerResult[]>([]);
  const [ownerSearching, setOwnerSearching] = useState(false);
  const [selectedOwner, setSelectedOwner] = useState<OwnerResult | null>(null);
  const [showAddOwner, setShowAddOwner] = useState(false);
  const [newOwnerName, setNewOwnerName] = useState('');
  const [newOwnerPhone, setNewOwnerPhone] = useState('');

  // Animal description
  const [sex, setSex] = useState('');
  const [size, setSize] = useState('');
  const [color, setColor] = useState('');
  const [coat, setCoat] = useState('');
  const [animalName, setAnimalName] = useState('');
  const [identifyingMarks, setIdentifyingMarks] = useState('');

  // Multiple
  const [multiple, setMultiple] = useState(false);
  const [animalCount, setAnimalCount] = useState(1);

  // Care
  const [careGiven, setCareGiven] = useState<Set<CareType>>(new Set());
  const [preventativeProduct, setPreventativeProduct] = useState('');
  const [preventativeSize, setPreventativeSize] = useState('');
  const [vaccineLot, setVaccineLot] = useState('');
  const [microchipNumber, setMicrochipNumber] = useState('');
  const [otherCareNotes, setOtherCareNotes] = useState('');

  // Notes
  const [notes, setNotes] = useState('');

  // Duplicate detection
  const [nameSuggestion, setNameSuggestion] = useState<AnimalMatch | null>(null);
  const [selectedAnimalId, setSelectedAnimalId] = useState<string | null>(null);
  const [nameSuggestionDismissed, setNameSuggestionDismissed] = useState(false);

  // Submit state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [savedOffline, setSavedOffline] = useState(false);
  const [showMatchConfirm, setShowMatchConfirm] = useState(false);
  const [matchedAnimal, setMatchedAnimal] = useState<AnimalMatch | null>(null);

  // Owner search debounce
  useEffect(() => {
    if (ownerQuery.trim().length < 2) { setOwnerResults([]); return; }
    const timeout = setTimeout(async () => {
      setOwnerSearching(true);
      const { data } = await supabase
        .from('owners')
        .select('id, name, phone_primary, primary_location:locations(name)')
        .eq('archived', false)
        .ilike('name', `%${ownerQuery.trim()}%`)
        .order('name')
        .limit(10);
      setOwnerResults((data ?? []).map((o: any) => ({
        ...o,
        primary_location: Array.isArray(o.primary_location) ? o.primary_location[0] ?? null : o.primary_location,
      })));
      setOwnerSearching(false);
    }, 300);
    return () => clearTimeout(timeout);
  }, [ownerQuery]);

  // Duplicate detection: debounced search on animal name
  useEffect(() => {
    if (nameSuggestionDismissed || selectedAnimalId) return;
    if (animalName.trim().length < 2) { setNameSuggestion(null); return; }
    const timer = setTimeout(async () => {
      const query = supabase
        .from('animals')
        .select('id, name, aao_id, last_seen, owner:owners(name)')
        .eq('archived', false)
        .ilike('name', animalName.trim());

      // Narrow by owner or location
      if (selectedOwner) {
        query.eq('owner_id', selectedOwner.id);
      } else {
        query.eq('primary_location_id', eventLocationId);
      }

      const { data } = await query.limit(3);
      const matches = (data ?? []).map((m: any) => ({
        ...m,
        owner: Array.isArray(m.owner) ? m.owner[0] ?? null : m.owner,
      }));
      setNameSuggestion(matches.length > 0 ? matches[0] : null);
    }, 300);
    return () => clearTimeout(timer);
  }, [animalName, selectedOwner, eventLocationId, nameSuggestionDismissed, selectedAnimalId]);

  function toggleCare(type: CareType) {
    setCareGiven((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }

  // Validation
  const needsName = careGiven.has('vaccine') || careGiven.has('microchip');
  const nameError = needsName && !animalName.trim();

  function resetForm() {
    setOwnerQuery(''); setOwnerResults([]); setSelectedOwner(null);
    setShowAddOwner(false); setNewOwnerName(''); setNewOwnerPhone('');
    setSex(''); setSize(''); setColor(''); setCoat('');
    setAnimalName(''); setIdentifyingMarks('');
    setMultiple(false); setAnimalCount(1);
    setCareGiven(new Set()); setPreventativeProduct(''); setPreventativeSize('');
    setVaccineLot(''); setMicrochipNumber(''); setOtherCareNotes('');
    setNotes(''); setError(''); setSavedOffline(false);
    setShowMatchConfirm(false); setMatchedAnimal(null);
    setNameSuggestion(null); setSelectedAnimalId(null); setNameSuggestionDismissed(false);
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  async function handleAddOwner() {
    if (!newOwnerName.trim() || !user) return;
    setSubmitting(true);
    const { data } = await supabase
      .from('owners')
      .insert({
        name: newOwnerName.trim(),
        phone_primary: newOwnerPhone.trim() || null,
        primary_location_id: eventLocationId,
        created_by: user.id,
      })
      .select('id, name, phone_primary')
      .single();
    setSubmitting(false);
    if (data) {
      setSelectedOwner({ ...data, primary_location: null });
      setShowAddOwner(false);
      setNewOwnerName('');
      setNewOwnerPhone('');
      setOwnerQuery('');
    }
  }

  async function handleSubmit(useExistingAnimal?: string) {
    if (nameError) return;
    if (!user) return;
    setSubmitting(true);
    setError('');

    // Get GPS if available
    let lat: number | null = null;
    let lng: number | null = null;
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
      });
      lat = pos.coords.latitude;
      lng = pos.coords.longitude;
    } catch { /* GPS optional */ }

    const hasName = animalName.trim().length > 0;
    const forceNew = useExistingAnimal === '__new__';
    let animalId: string | null = (useExistingAnimal && !forceNew) ? useExistingAnimal : selectedAnimalId;

    // If named: check for matches or create a new profile
    // Skip match search if user already accepted a suggestion via duplicate detection
    if (hasName && !animalId && !multiple) {
      if (!forceNew) {
        // Search for existing animal with same name + owner
        const matchQuery = supabase
          .from('animals')
          .select('id, name, aao_id, owner:owners(name)')
          .eq('archived', false)
          .ilike('name', animalName.trim());

        if (selectedOwner) {
          matchQuery.eq('owner_id', selectedOwner.id);
        }

        const { data: matches } = await matchQuery.limit(5);
        const matchList = (matches ?? []).map((m: any) => ({
          ...m,
          owner: Array.isArray(m.owner) ? m.owner[0] ?? null : m.owner,
        }));

        if (matchList.length > 0 && !showMatchConfirm) {
          setMatchedAnimal(matchList[0]);
          setShowMatchConfirm(true);
          setSubmitting(false);
          return;
        }
      }

      // Create new animal profile
      const { data: newAnimal } = await supabase
        .from('animals')
        .insert({
          name: animalName.trim(),
          animal_type: 'dog',
          sex: sex || 'unknown',
          size_category: size || 'medium',
          color: color || null,
          owner_id: selectedOwner?.id ?? null,
          primary_location_id: eventLocationId,
          general_notes: identifyingMarks.trim() || null,
          created_by: user.id,
        })
        .select('id')
        .single();
      if (newAnimal) animalId = newAnimal.id;
    }

    // If named animal exists, also log a care_event for the profile
    if (animalId && hasName) {
      const careTypes: string[] = [];
      if (careGiven.has('food')) careTypes.push('food');
      if (careGiven.has('vaccine')) careTypes.push('vaccine_dapp');
      if (careGiven.has('preventative')) careTypes.push('preventative_oral');
      if (careGiven.has('microchip')) careTypes.push('microchip');
      if (careGiven.has('wellness')) careTypes.push('seen');
      if (careTypes.length === 0) careTypes.push('seen');

      await supabase.from('care_events').insert({
        outreach_event_id: eventId,
        animal_id: animalId,
        owner_id: selectedOwner?.id ?? null,
        location_id: eventLocationId,
        event_date: eventDate,
        care_types: careTypes,
        food_bags: careGiven.has('food') ? 1 : 0,
        vaccine_lot_dapp: vaccineLot || null,
        preventative_product: preventativeProduct || null,
        health_notes: identifyingMarks.trim() || null,
        other_notes: notes.trim() || null,
        created_by: user.id,
      });
    }

    // Always create sighting_entry for event tracking
    const sightingData: Record<string, any> = {
      outreach_event_id: eventId,
      owner_id: selectedOwner?.id ?? null,
      animal_id: animalId,
      animal_name: hasName ? animalName.trim() : null,
      sex: sex || null,
      size_category: size || null,
      color: color || null,
      coat_length: coat || null,
      identifying_marks: identifyingMarks.trim() || null,
      animal_count: multiple ? animalCount : 1,
      care_given: [...careGiven],
      preventative_product: preventativeProduct || null,
      preventative_size: preventativeSize || null,
      vaccine_lot_number: vaccineLot || null,
      microchip_number: microchipNumber || null,
      other_care_notes: otherCareNotes || null,
      notes: notes.trim() || null,
      precise_lat: lat,
      precise_lng: lng,
      created_by: user.id,
    };

    const { error: insertErr } = await supabase.from('sighting_entries').insert(sightingData);

    if (insertErr) {
      // Check if it's a network error
      if (insertErr.message?.includes('fetch') || insertErr.message?.includes('network') || !navigator.onLine) {
        await queueSighting(sightingData);
        setSavedOffline(true);
        setSubmitting(false);
        setTimeout(() => { handleClose(); onSaved(); }, 2000);
        return;
      }
      setError(insertErr.message);
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
    handleClose();
    onSaved();
  }

  if (!open) return null;

  // Match confirmation dialog
  if (showMatchConfirm && matchedAnimal) {
    return (
      <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true">
        <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-xl max-h-[90vh] p-5">
          <h3 className="font-heading font-bold text-night text-base mb-3">Existing animal found</h3>
          <p className="text-sm text-night mb-4">
            Is this <span className="font-bold">{matchedAnimal.name}</span>
            {matchedAnimal.owner?.name && <> — {matchedAnimal.owner.name}'s dog</>}?
            <span className="text-muted text-xs ml-1">({matchedAnimal.aao_id})</span>
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => { setShowMatchConfirm(false); handleSubmit(matchedAnimal.id); }}
              className="flex-1 py-2.5 bg-primary hover:bg-primary-hover text-white text-sm font-semibold rounded-xl transition-all"
            >
              Yes, log to this animal
            </button>
            <button
              onClick={() => { setShowMatchConfirm(false); setMatchedAnimal(null); handleSubmit('__new__'); }}
              className="flex-1 py-2.5 bg-sand text-night text-sm font-medium rounded-xl hover:bg-night/8 transition-all"
            >
              No, create new
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label="Log sighting">
      <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-night/5 shrink-0">
          <h2 className="font-heading font-bold text-night text-base">Log Sighting</h2>
          <button onClick={handleClose} className="p-2 rounded-lg text-muted hover:text-night hover:bg-sand transition-all" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">

          {/* Offline banner */}
          {savedOffline && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-xl px-3 py-2.5">
              <WifiOff className="w-4 h-4 shrink-0" />
              Saved locally — will sync when signal returns
            </div>
          )}

          {/* SECTION 1: Owner */}
          <div>
            <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Owner (optional)</p>
            {selectedOwner ? (
              <div className="flex items-center justify-between bg-primary/5 border border-primary/15 rounded-xl px-3 py-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-primary">{selectedOwner.name.charAt(0).toUpperCase()}</span>
                  </div>
                  <span className="text-sm font-medium text-night truncate">{selectedOwner.name}</span>
                </div>
                <button onClick={() => setSelectedOwner(null)} className="text-xs text-muted hover:text-night">Change</button>
              </div>
            ) : showAddOwner ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={newOwnerName}
                  onChange={(e) => setNewOwnerName(e.target.value)}
                  placeholder="Owner name *"
                  className="w-full px-3 py-2.5 bg-white border border-night/8 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted/40"
                  autoFocus
                />
                <input
                  type="tel"
                  value={newOwnerPhone}
                  onChange={(e) => setNewOwnerPhone(e.target.value)}
                  placeholder="Phone (optional)"
                  className="w-full px-3 py-2.5 bg-white border border-night/8 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted/40"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleAddOwner}
                    disabled={!newOwnerName.trim() || submitting}
                    className="flex-1 py-2 bg-primary text-white text-sm font-semibold rounded-xl disabled:opacity-30 transition-all"
                  >
                    Add Owner
                  </button>
                  <button
                    onClick={() => { setShowAddOwner(false); setNewOwnerName(''); setNewOwnerPhone(''); }}
                    className="px-4 py-2 text-sm text-muted hover:text-night transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted/50" />
                  <input
                    type="text"
                    value={ownerQuery}
                    onChange={(e) => setOwnerQuery(e.target.value)}
                    placeholder="Search owner name..."
                    className="w-full pl-9 pr-4 py-2.5 bg-white border border-night/8 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted/40"
                  />
                </div>
                {ownerSearching && <p className="text-xs text-muted text-center">Searching...</p>}
                {ownerResults.length > 0 && (
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {ownerResults.map((o) => (
                      <button
                        key={o.id}
                        onClick={() => { setSelectedOwner(o); setOwnerQuery(''); setOwnerResults([]); }}
                        className="w-full flex items-center gap-2 p-2 rounded-lg border border-night/5 bg-white hover:bg-sand/50 text-left text-sm transition-colors"
                      >
                        <span className="font-medium text-night truncate">{o.name}</span>
                        {o.primary_location?.name && (
                          <span className="text-xs text-muted truncate">{o.primary_location.name}</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
                <button
                  onClick={() => { setShowAddOwner(true); setNewOwnerName(ownerQuery.trim()); }}
                  className="flex items-center gap-1 text-xs text-primary font-medium hover:underline"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Add new owner
                </button>
              </div>
            )}
          </div>

          {/* SECTION 2: Animal Description */}
          <div>
            <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Animal Description</p>

            {/* Sex */}
            <div className="mb-3">
              <label className="block text-xs text-muted mb-1">Sex</label>
              <div className="flex gap-1.5">
                {[{ v: 'male', l: 'Male' }, { v: 'female', l: 'Female' }, { v: 'unknown', l: 'Unknown' }].map((s) => (
                  <button
                    key={s.v}
                    onClick={() => setSex(sex === s.v ? '' : s.v)}
                    className={`flex-1 py-2 rounded-lg border text-xs font-medium transition-all ${
                      sex === s.v ? 'border-primary bg-primary/8 text-primary' : 'border-night/8 bg-white text-night'
                    }`}
                  >
                    {s.l}
                  </button>
                ))}
              </div>
            </div>

            {/* Size */}
            <div className="mb-3">
              <label className="block text-xs text-muted mb-1">Size</label>
              <div className="flex gap-1.5">
                {SIZES.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => setSize(size === s.value ? '' : s.value)}
                    className={`flex-1 py-2 rounded-lg border text-xs font-medium transition-all ${
                      size === s.value ? 'border-primary bg-primary/8 text-primary' : 'border-night/8 bg-white text-night'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Color */}
            <div className="mb-3">
              <label className="block text-xs text-muted mb-1">Color</label>
              <div className="flex flex-wrap gap-1.5">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(color === c.toLowerCase() ? '' : c.toLowerCase())}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                      color === c.toLowerCase() ? 'border-primary bg-primary/8 text-primary' : 'border-night/8 bg-white text-night'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Coat */}
            <div className="mb-3">
              <label className="block text-xs text-muted mb-1">Coat</label>
              <div className="flex gap-1.5">
                {[{ v: 'short', l: 'Short' }, { v: 'long', l: 'Long' }].map((c) => (
                  <button
                    key={c.v}
                    onClick={() => setCoat(coat === c.v ? '' : c.v)}
                    className={`flex-1 py-2 rounded-lg border text-xs font-medium transition-all ${
                      coat === c.v ? 'border-primary bg-primary/8 text-primary' : 'border-night/8 bg-white text-night'
                    }`}
                  >
                    {c.l}
                  </button>
                ))}
              </div>
            </div>

            {/* Name */}
            <div className="mb-3">
              <label className="block text-xs text-muted mb-1">Name (optional)</label>
              <input
                type="text"
                value={animalName}
                onChange={(e) => setAnimalName(e.target.value)}
                placeholder="Leave blank for unnamed sighting"
                className="w-full px-3 py-2.5 bg-white border border-night/8 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted/40"
              />
              {selectedAnimalId && nameSuggestion && (
                <div className="mt-1.5 bg-primary/5 border border-primary/15 rounded-lg px-3 py-2 flex items-center justify-between">
                  <p className="text-xs text-primary font-medium">
                    Logging to {nameSuggestion.name}'s existing record
                  </p>
                  <button
                    onClick={() => { setSelectedAnimalId(null); setNameSuggestion(null); setNameSuggestionDismissed(true); }}
                    className="text-xs text-muted hover:text-night ml-2"
                  >
                    Undo
                  </button>
                </div>
              )}
              {!selectedAnimalId && nameSuggestion && !nameSuggestionDismissed && (
                <div className="mt-1.5 bg-amber-50 border border-amber-200/50 rounded-lg px-3 py-2.5">
                  <p className="text-xs text-amber-800">
                    We have a <span className="font-bold">{nameSuggestion.name}</span> at this location
                    {nameSuggestion.owner?.name && <> — {nameSuggestion.owner.name}</>}
                    {nameSuggestion.last_seen && <>, last seen {formatRelative(nameSuggestion.last_seen)}</>}.
                    Same dog?
                  </p>
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => setSelectedAnimalId(nameSuggestion.id)}
                      className="flex-1 py-1.5 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary-hover transition-all"
                    >
                      Yes, log to their record
                    </button>
                    <button
                      onClick={() => { setNameSuggestion(null); setNameSuggestionDismissed(true); }}
                      className="flex-1 py-1.5 bg-white border border-night/8 text-night text-xs font-medium rounded-lg hover:bg-sand transition-all"
                    >
                      No, different dog
                    </button>
                  </div>
                </div>
              )}
              {animalName.trim() && !selectedAnimalId && (
                <p className="text-xs text-primary mt-1">A profile will be created for this animal</p>
              )}
            </div>

            {/* Identifying marks */}
            <div>
              <label className="block text-xs text-muted mb-1">Identifying marks</label>
              <input
                type="text"
                value={identifyingMarks}
                onChange={(e) => setIdentifyingMarks(e.target.value)}
                placeholder="e.g. sore on left ear, limping, blue collar"
                className="w-full px-3 py-2.5 bg-white border border-night/8 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted/40"
              />
            </div>
          </div>

          {/* SECTION 3: How Many */}
          <div>
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-muted uppercase tracking-wider">How Many</p>
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-xs text-muted">Multiple animals</span>
                <button
                  onClick={() => { setMultiple(!multiple); if (!multiple) setAnimalCount(2); else setAnimalCount(1); }}
                  className={`relative w-9 h-5 rounded-full transition-colors ${multiple ? 'bg-primary' : 'bg-night/15'}`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${multiple ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </button>
              </label>
            </div>
            {multiple && (
              <div className="mt-2 flex items-center gap-3">
                <label className="text-sm text-muted">Count:</label>
                <input
                  type="number"
                  min={2}
                  max={50}
                  value={animalCount}
                  onChange={(e) => setAnimalCount(Math.max(2, parseInt(e.target.value) || 2))}
                  className="w-20 px-3 py-2 bg-white border border-night/8 rounded-xl text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            )}
          </div>

          {/* SECTION 4: Care Given */}
          <div>
            <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Care Given</p>
            <div className="space-y-2">
              {/* Food */}
              <CareCheckbox
                checked={careGiven.has('food')}
                onChange={() => toggleCare('food')}
                icon={Package}
                label="Food"
              />

              {/* Preventative */}
              <CareCheckbox
                checked={careGiven.has('preventative')}
                onChange={() => toggleCare('preventative')}
                icon={Pill}
                label="Oral/Topical Preventative"
              />
              {careGiven.has('preventative') && (
                <div className="ml-8 space-y-2">
                  <input
                    type="text"
                    value={preventativeProduct}
                    onChange={(e) => setPreventativeProduct(e.target.value)}
                    placeholder="Product name"
                    className="w-full px-3 py-2 bg-white border border-night/8 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted/40"
                  />
                  <div className="flex gap-1.5">
                    {['Small', 'Medium', 'Large', 'XL'].map((s) => (
                      <button
                        key={s}
                        onClick={() => setPreventativeSize(preventativeSize === s.toLowerCase() ? '' : s.toLowerCase())}
                        className={`flex-1 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                          preventativeSize === s.toLowerCase() ? 'border-primary bg-primary/8 text-primary' : 'border-night/8 bg-white text-night'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Vaccine */}
              <CareCheckbox
                checked={careGiven.has('vaccine')}
                onChange={() => toggleCare('vaccine')}
                icon={Syringe}
                label="Injectable Vaccine"
              />
              {careGiven.has('vaccine') && (
                <div className="ml-8 space-y-2">
                  {nameError && (
                    <p className="text-xs text-ember bg-ember/8 rounded-lg px-2.5 py-1.5">
                      A name is required when recording a vaccine — use a temporary name like "Brown #2" if needed
                    </p>
                  )}
                  <div className="relative">
                    <input
                      type="text"
                      value={vaccineLot}
                      onChange={(e) => setVaccineLot(e.target.value)}
                      placeholder="Lot number"
                      className="w-full px-3 py-2 pr-10 bg-white border border-night/8 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted/40"
                    />
                    <Camera className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted/40" />
                  </div>
                </div>
              )}

              {/* Microchip */}
              <CareCheckbox
                checked={careGiven.has('microchip')}
                onChange={() => toggleCare('microchip')}
                icon={Syringe}
                label="Microchip"
              />
              {careGiven.has('microchip') && (
                <div className="ml-8 space-y-2">
                  {nameError && (
                    <p className="text-xs text-ember bg-ember/8 rounded-lg px-2.5 py-1.5">
                      A name is required when recording a microchip — use a temporary name like "Brown #2" if needed
                    </p>
                  )}
                  <div className="relative">
                    <input
                      type="text"
                      value={microchipNumber}
                      onChange={(e) => setMicrochipNumber(e.target.value)}
                      placeholder="Microchip number"
                      className="w-full px-3 py-2 pr-10 bg-white border border-night/8 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted/40"
                    />
                    <Camera className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted/40" />
                  </div>
                </div>
              )}

              {/* Wellness */}
              <CareCheckbox
                checked={careGiven.has('wellness')}
                onChange={() => toggleCare('wellness')}
                icon={Stethoscope}
                label="Wellness Check"
              />

              {/* Other */}
              <CareCheckbox
                checked={careGiven.has('other')}
                onChange={() => toggleCare('other')}
                icon={Heart}
                label="Other"
              />
              {careGiven.has('other') && (
                <div className="ml-8">
                  <input
                    type="text"
                    value={otherCareNotes}
                    onChange={(e) => setOtherCareNotes(e.target.value)}
                    placeholder="Describe other care..."
                    className="w-full px-3 py-2 bg-white border border-night/8 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted/40"
                  />
                </div>
              )}
            </div>
          </div>

          {/* SECTION 5: Notes */}
          <div>
            <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Notes</p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any other observations..."
              rows={2}
              className="w-full px-3 py-2.5 bg-white border border-night/8 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted/40 resize-none"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="bg-ember/10 border border-ember/20 text-ember text-sm rounded-xl px-3 py-2" role="alert">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-night/5 shrink-0">
          <button
            onClick={() => handleSubmit()}
            disabled={submitting || nameError || savedOffline}
            className="w-full py-3 bg-primary hover:bg-primary-hover text-white font-semibold rounded-xl shadow-[0_2px_8px_rgba(110,168,50,0.25)] disabled:opacity-30 transition-all text-sm flex items-center justify-center gap-2"
          >
            {submitting ? (
              <><Loader2 className="w-4 h-4 animate-spin" />Saving...</>
            ) : savedOffline ? (
              <><Check className="w-4 h-4" />Saved</>
            ) : (
              'Log Sighting'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function CareCheckbox({ checked, onChange, icon: Icon, label }: { checked: boolean; onChange: () => void; icon: any; label: string }) {
  return (
    <button
      onClick={onChange}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left text-sm transition-all ${
        checked ? 'border-primary/20 bg-primary/5 text-night' : 'border-night/8 bg-white text-night'
      }`}
    >
      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
        checked ? 'border-primary bg-primary' : 'border-night/15'
      }`}>
        {checked && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
      </div>
      <Icon className={`w-4 h-4 shrink-0 ${checked ? 'text-primary' : 'text-muted'}`} strokeWidth={1.75} />
      <span className="font-medium">{label}</span>
    </button>
  );
}
