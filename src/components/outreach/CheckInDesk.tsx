import { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  ArrowLeft,
  Check,
  UserPlus,
  PawPrint,
  Package,
  Syringe,
  Pill,
  Scissors,
  Stethoscope,
  Heart,
  X,
  MapPin,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

import { trackVolunteer } from '../../lib/trackVolunteer';

interface Props {
  eventId: string;
  eventLocationId: string;
  eventDate: string;
  onCheckedIn: () => void;
}

interface OwnerResult {
  id: string;
  name: string;
  phone_primary: string | null;
  primary_location: { name: string } | null;
}

interface AnimalRow {
  id: string;
  aao_id: string;
  name: string | null;
  animal_type: string;
  size_category: string;
  food_bag_size: string | null;
  sex: string;
}

interface CheckedAnimal {
  id: string;
  aao_id: string;
  name: string | null;
  food_bag_size: string | null;
  food: boolean;
  vaccines: boolean;
  preventatives: boolean;
  nailTrim: boolean;
  needsMedical: boolean;
  medicalNotes: string;
  needsSN: boolean;
}

type Step = 'search' | 'add-owner' | 'animals' | 'add-animal';

export default function CheckInDesk({ eventId, eventLocationId, eventDate, onCheckedIn }: Props) {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>('search');

  // Search state
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<OwnerResult[]>([]);
  const [searching, setSearching] = useState(false);

  // Selected owner
  const [owner, setOwner] = useState<OwnerResult | null>(null);

  // Animals
  const [ownerAnimals, setOwnerAnimals] = useState<AnimalRow[]>([]);
  const [checked, setChecked] = useState<CheckedAnimal[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Feedback
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Quick add owner form
  const [newOwnerName, setNewOwnerName] = useState('');
  const [newOwnerPhone, setNewOwnerPhone] = useState('');
  const [newOwnerLocationId, setNewOwnerLocationId] = useState(eventLocationId);
  const [locationSearch, setLocationSearch] = useState('');
  const [locationResults, setLocationResults] = useState<{ id: string; name: string; address: string | null }[]>([]);
  const [locationSearching, setLocationSearching] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [eventLocationName, setEventLocationName] = useState('');

  // Quick add animal form
  const [newAnimalName, setNewAnimalName] = useState('');
  const [newAnimalType, setNewAnimalType] = useState<'dog' | 'cat'>('dog');
  const [newAnimalSize, setNewAnimalSize] = useState('medium');
  const [newAnimalSex, setNewAnimalSex] = useState('unknown');
  const [newAnimalFixed, setNewAnimalFixed] = useState('unknown');
  const [newAnimalNotes, setNewAnimalNotes] = useState('');

  // Load event location name
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('locations')
        .select('name')
        .eq('id', eventLocationId)
        .single();
      if (data) setEventLocationName(data.name);
    })();
  }, [eventLocationId]);

  // Search locations
  async function searchLocations(q: string) {
    if (q.trim().length < 2) { setLocationResults([]); return; }
    setLocationSearching(true);
    const { data } = await supabase
      .from('locations')
      .select('id, name, address')
      .eq('archived', false)
      .ilike('name', `%${q.trim()}%`)
      .order('name')
      .limit(10);
    setLocationResults(data ?? []);
    setLocationSearching(false);
  }

  useEffect(() => {
    if (!showLocationPicker) return;
    const timeout = setTimeout(() => searchLocations(locationSearch), 300);
    return () => clearTimeout(timeout);
  }, [locationSearch, showLocationPicker]);

  // Search owners
  async function searchOwners(q: string) {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    const term = `%${q.trim()}%`;
    const { data } = await supabase
      .from('owners')
      .select('id, name, phone_primary, primary_location:locations(name)')
      .eq('archived', false)
      .or(`name.ilike.${term},phone_primary.ilike.${term}`)
      .order('name')
      .limit(20);
    setResults((data ?? []).map((o: any) => ({
      ...o,
      primary_location: Array.isArray(o.primary_location) ? o.primary_location[0] ?? null : o.primary_location,
    })));
    setSearching(false);
  }

  // Debounced search
  useEffect(() => {
    if (step !== 'search') return;
    const timeout = setTimeout(() => searchOwners(query), 300);
    return () => clearTimeout(timeout);
  }, [query, step]);

  // Load owner's animals
  async function selectOwner(o: OwnerResult) {
    setOwner(o);
    const { data } = await supabase
      .from('animals')
      .select('id, aao_id, name, animal_type, size_category, food_bag_size, sex')
      .eq('owner_id', o.id)
      .eq('archived', false)
      .eq('deceased', false)
      .order('name');
    setOwnerAnimals(data ?? []);
    // Auto-check all animals with food
    setChecked(
      (data ?? []).map((a) => ({
        id: a.id,
        aao_id: a.aao_id,
        name: a.name,
        food_bag_size: a.food_bag_size,
        food: true,
        vaccines: false,
        preventatives: false,
        nailTrim: false,
        needsMedical: false,
        medicalNotes: '',
        needsSN: false,
      }))
    );
    setStep('animals');
  }

  // Quick add owner
  async function handleAddOwner() {
    if (!newOwnerName.trim() || !user) return;
    setSubmitting(true);
    const { data } = await supabase
      .from('owners')
      .insert({
        name: newOwnerName.trim(),
        phone_primary: newOwnerPhone.trim() || null,
        primary_location_id: newOwnerLocationId,
        created_by: user.id,
      })
      .select('id, name, phone_primary')
      .single();
    setSubmitting(false);
    if (data) {
      const newOwner: OwnerResult = { ...data, primary_location: null };
      selectOwner(newOwner);
      setNewOwnerName('');
      setNewOwnerPhone('');
      setNewOwnerLocationId(eventLocationId);
      setShowLocationPicker(false);
      setLocationSearch('');
    }
  }

  // Quick add animal
  async function handleAddAnimal() {
    if (!newAnimalName.trim() || !owner || !user) return;
    setSubmitting(true);
    const noteParts = [newAnimalNotes.trim()].filter(Boolean);
    const { data } = await supabase
      .from('animals')
      .insert({
        name: newAnimalName.trim(),
        animal_type: newAnimalType,
        size_category: newAnimalSize,
        sex: newAnimalSex,
        fixed_status: newAnimalFixed,
        owner_id: owner.id,
        primary_location_id: eventLocationId,
        general_notes: noteParts.length > 0 ? noteParts.join(' ') : null,
        created_by: user.id,
      })
      .select('id, aao_id, name, animal_type, size_category, food_bag_size, sex')
      .single();
    setSubmitting(false);
    if (data) {
      setOwnerAnimals((prev) => [...prev, data]);
      setChecked((prev) => [
        ...prev,
        { id: data.id, aao_id: data.aao_id, name: data.name, food_bag_size: data.food_bag_size, food: true, vaccines: false, preventatives: false, nailTrim: false, needsMedical: false, medicalNotes: '', needsSN: false },
      ]);
      setNewAnimalName('');
      setNewAnimalType('dog');
      setNewAnimalSize('medium');
      setNewAnimalSex('unknown');
      setNewAnimalFixed('unknown');
      setNewAnimalNotes('');
      setStep('animals');
    }
  }

  // Toggle animal checked
  function toggleAnimal(animalId: string) {
    const existing = checked.find((c) => c.id === animalId);
    if (existing) {
      setChecked(checked.filter((c) => c.id !== animalId));
    } else {
      const animal = ownerAnimals.find((a) => a.id === animalId);
      if (animal) {
        setChecked([...checked, {
          id: animal.id,
          aao_id: animal.aao_id,
          name: animal.name,
          food_bag_size: animal.food_bag_size,
          food: true,
          vaccines: false,
          preventatives: false,
          nailTrim: false,
          needsMedical: false,
          medicalNotes: '',
          needsSN: false,
        }]);
      }
    }
  }

  function updateAnimal(animalId: string, updates: Partial<CheckedAnimal>) {
    setChecked(checked.map((c) => c.id === animalId ? { ...c, ...updates } : c));
  }

  // Complete food-only check-in — writes care_events AND adds to queue as complete
  async function completeFoodOnly() {
    if (!user || !owner || checked.length === 0) return;
    setSubmitting(true);

    const foodAnimals = checked.filter((a) => a.food);
    const careInserts = foodAnimals.map((a) => ({
      outreach_event_id: eventId,
      animal_id: a.id,
      owner_id: owner.id,
      location_id: eventLocationId,
      event_date: eventDate,
      care_types: ['food'],
      food_bags: 1,
      food_lbs: a.food_bag_size ? parseInt(a.food_bag_size) : 6,
      created_by: user.id,
    }));

    // Also log "seen" for animals not getting food
    const seenAnimals = checked.filter((a) => !a.food);
    const seenInserts = seenAnimals.map((a) => ({
      outreach_event_id: eventId,
      animal_id: a.id,
      owner_id: owner.id,
      location_id: eventLocationId,
      event_date: eventDate,
      care_types: ['seen'],
      created_by: user.id,
    }));

    const allInserts = [...careInserts, ...seenInserts];
    if (allInserts.length > 0) {
      const { error: insertErr } = await supabase.from('care_events').insert(allInserts);
      if (insertErr) {
        console.error('care_events insert failed:', insertErr);
        setError(`Check-in failed: ${insertErr.message}`);
        setSubmitting(false);
        return;
      }
    }

    // Add to queue as complete so it shows in the event log
    const { count } = await supabase
      .from('checkin_queue')
      .select('*', { count: 'exact', head: true })
      .eq('outreach_event_id', eventId);

    const stagedCare = checked.map((a) => ({
      animal_id: a.id,
      animal_name: a.name ?? 'Unnamed',
      aao_id: a.aao_id,
      food_bag_size: a.food_bag_size,
      services: a.food ? ['food'] : ['seen'],
      food_bags: a.food ? 1 : 0,
      vaccine_lot_dapp: '',
      vaccine_lot_parvo: '',
      vaccine_expiry: '',
      preventative_product: '',
      preventative_dosage: '',
      health_notes: '',
      other_notes: '',
    }));

    await supabase.from('checkin_queue').insert({
      outreach_event_id: eventId,
      owner_id: owner.id,
      queue_position: (count ?? 0) + 1,
      status: 'complete',
      checked_in_by: user.id,
      completed_by: user.id,
      completed_at: new Date().toISOString(),
      staged_care: stagedCare,
    });

    await trackVolunteer(eventId, user.id);
    setSubmitting(false);
    setSuccessMsg('Check-in complete!');
    setTimeout(() => { setSuccessMsg(''); resetFlow(); }, 2500);
    onCheckedIn();
  }

  // Send to vet queue
  async function sendToQueue() {
    if (!user || !owner || checked.length === 0) return;
    setSubmitting(true);

    // Get next queue position
    const { count } = await supabase
      .from('checkin_queue')
      .select('*', { count: 'exact', head: true })
      .eq('outreach_event_id', eventId);

    const stagedCare = checked.map((a) => {
      const services: string[] = [];
      if (a.food) services.push('food');
      if (a.vaccines) services.push('vaccines');
      if (a.preventatives) services.push('preventatives');
      if (a.nailTrim) services.push('nail_trim');
      if (a.needsMedical) services.push('medical');
      if (a.needsSN) services.push('spay_neuter');
      return {
        animal_id: a.id,
        animal_name: a.name ?? 'Unnamed',
        aao_id: a.aao_id,
        food_bag_size: a.food_bag_size,
        services,
        food_bags: a.food ? 1 : 0,
        vaccine_lot_dapp: '',
        vaccine_lot_parvo: '',
        vaccine_expiry: '',
        preventative_product: '',
        preventative_dosage: '',
        health_notes: a.medicalNotes,
        other_notes: '',
      };
    });

    const { error: queueErr } = await supabase.from('checkin_queue').insert({
      outreach_event_id: eventId,
      owner_id: owner.id,
      queue_position: (count ?? 0) + 1,
      status: 'waiting',
      checked_in_by: user.id,
      staged_care: stagedCare,
    });

    if (queueErr) {
      console.error('checkin_queue insert failed:', queueErr);
      setError(`Queue failed: ${queueErr.message}`);
      setSubmitting(false);
      return;
    }

    await trackVolunteer(eventId, user.id);
    setSubmitting(false);
    setSuccessMsg('Sent to outreach queue!');
    setTimeout(() => { setSuccessMsg(''); resetFlow(); }, 2500);
    onCheckedIn();
  }

  function resetFlow() {
    setStep('search');
    setQuery('');
    setResults([]);
    setOwner(null);
    setOwnerAnimals([]);
    setChecked([]);
    setError('');
    setSuccessMsg('');
  }

  const anyNeedsQueue = checked.some((a) => a.vaccines || a.preventatives || a.nailTrim || a.needsMedical || a.needsSN);

  // ─── RENDER ─────────────────────────────────────────

  if (step === 'add-owner') {
    return (
      <div className="space-y-4">
        <button onClick={() => setStep('search')} className="flex items-center gap-1 text-sm text-muted hover:text-night">
          <ArrowLeft className="w-4 h-4" /> Back to search
        </button>
        <h3 className="text-lg font-heading font-bold text-night">New Owner</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-muted mb-1">Name *</label>
            <input
              type="text"
              value={newOwnerName}
              onChange={(e) => setNewOwnerName(e.target.value)}
              placeholder="Owner name"
              className="w-full px-3 py-2.5 bg-white border border-night/8 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted mb-1">Phone</label>
            <input
              type="tel"
              value={newOwnerPhone}
              onChange={(e) => setNewOwnerPhone(e.target.value)}
              placeholder="Phone number"
              className="w-full px-3 py-2.5 bg-white border border-night/8 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          {/* Location picker */}
          <div>
            <label className="block text-sm font-medium text-muted mb-1">Location</label>
            {!showLocationPicker ? (
              <div className="flex items-center gap-2">
                <div className="flex-1 px-3 py-2.5 bg-sand/50 border border-night/8 rounded-xl text-sm text-night">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-muted shrink-0" />
                    <span className="truncate">{newOwnerLocationId === eventLocationId ? (eventLocationName || 'Event location') : 'Selected location'}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowLocationPicker(true)}
                  className="px-3 py-2.5 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/15 rounded-xl transition-colors whitespace-nowrap"
                >
                  Change
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted/50" />
                  <input
                    type="text"
                    value={locationSearch}
                    onChange={(e) => setLocationSearch(e.target.value)}
                    placeholder="Search locations..."
                    className="w-full pl-9 pr-4 py-2.5 bg-white border border-night/8 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted/40"
                    autoFocus
                  />
                </div>
                {/* Event location shortcut */}
                <button
                  type="button"
                  onClick={() => { setNewOwnerLocationId(eventLocationId); setShowLocationPicker(false); setLocationSearch(''); }}
                  className="w-full flex items-center gap-2 p-2.5 rounded-xl border border-primary/20 bg-primary/5 text-left text-sm hover:bg-primary/10 transition-colors"
                >
                  <MapPin className="w-4 h-4 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-night block truncate">{eventLocationName || 'Event location'}</span>
                    <span className="text-xs text-primary">Current event location</span>
                  </div>
                </button>
                {locationSearching && <p className="text-xs text-muted text-center py-1">Searching...</p>}
                {locationResults.filter(l => l.id !== eventLocationId).map((loc) => (
                  <button
                    key={loc.id}
                    type="button"
                    onClick={() => { setNewOwnerLocationId(loc.id); setShowLocationPicker(false); setLocationSearch(''); }}
                    className="w-full flex items-center gap-2 p-2.5 rounded-xl border border-night/5 bg-white text-left text-sm hover:bg-sand/50 transition-colors"
                  >
                    <MapPin className="w-4 h-4 text-muted shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-night block truncate">{loc.name}</span>
                      {loc.address && <span className="text-xs text-muted truncate block">{loc.address}</span>}
                    </div>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => { setShowLocationPicker(false); setLocationSearch(''); }}
                  className="w-full py-2 text-xs text-muted hover:text-night font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
          <button
            onClick={handleAddOwner}
            disabled={!newOwnerName.trim() || submitting}
            className="w-full py-3 bg-primary hover:bg-primary-hover text-white font-semibold rounded-xl shadow-[0_2px_8px_rgba(110,168,50,0.25)] disabled:opacity-30 transition-all text-sm"
          >
            {submitting ? 'Saving...' : 'Add Owner'}
          </button>
        </div>
      </div>
    );
  }

  if (step === 'add-animal') {
    return (
      <div className="space-y-4">
        <button onClick={() => setStep('animals')} className="flex items-center gap-1 text-sm text-muted hover:text-night">
          <ArrowLeft className="w-4 h-4" /> Back to animals
        </button>
        <h3 className="text-lg font-heading font-bold text-night">New Animal</h3>
        <p className="text-xs text-muted">Adding for {owner?.name}</p>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-muted mb-1">Name *</label>
            <input
              type="text"
              value={newAnimalName}
              onChange={(e) => setNewAnimalName(e.target.value)}
              placeholder="Animal name"
              className="w-full px-3 py-2.5 bg-white border border-night/8 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-muted mb-1">Type</label>
              <div className="flex gap-2">
                {(['dog', 'cat'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setNewAnimalType(t)}
                    className={`flex-1 py-2 rounded-lg border text-xs font-medium transition-all ${
                      newAnimalType === t ? 'border-primary bg-primary/8 text-primary' : 'border-night/8 bg-white text-night'
                    }`}
                  >
                    {t === 'dog' ? 'Dog' : 'Cat'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted mb-1">Sex</label>
              <select
                value={newAnimalSex}
                onChange={(e) => setNewAnimalSex(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-night/8 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="unknown">Unknown</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-muted mb-1">Size</label>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { value: 'small', label: 'S' },
                { value: 'medium', label: 'M' },
                { value: 'large', label: 'L' },
                { value: 'xlarge', label: 'XL' },
              ].map((s) => (
                <button
                  key={s.value}
                  onClick={() => setNewAnimalSize(s.value)}
                  className={`py-2 rounded-lg border text-xs font-medium transition-all ${
                    newAnimalSize === s.value ? 'border-primary bg-primary/8 text-primary' : 'border-night/8 bg-white text-night'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-muted mb-1">Fixed?</label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { value: 'unknown', label: 'Unknown' },
                { value: 'yes', label: 'Yes' },
                { value: 'no', label: 'No' },
              ].map((f) => (
                <button
                  key={f.value}
                  onClick={() => setNewAnimalFixed(f.value)}
                  className={`py-2 rounded-lg border text-xs font-medium transition-all ${
                    newAnimalFixed === f.value ? 'border-primary bg-primary/8 text-primary' : 'border-night/8 bg-white text-night'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-muted mb-1">Notes</label>
            <textarea
              value={newAnimalNotes}
              onChange={(e) => setNewAnimalNotes(e.target.value)}
              placeholder="Any notes about this animal..."
              rows={2}
              className="w-full px-3 py-2 bg-white border border-night/8 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted/40 resize-none"
            />
          </div>
          <button
            onClick={handleAddAnimal}
            disabled={!newAnimalName.trim() || submitting}
            className="w-full py-3 bg-primary hover:bg-primary-hover text-white font-semibold rounded-xl shadow-[0_2px_8px_rgba(110,168,50,0.25)] disabled:opacity-30 transition-all text-sm"
          >
            {submitting ? 'Saving...' : 'Add Animal'}
          </button>
        </div>
      </div>
    );
  }

  if (step === 'animals' && owner) {
    return (
      <div className="space-y-4">
        <button onClick={resetFlow} className="flex items-center gap-1 text-sm text-muted hover:text-night">
          <ArrowLeft className="w-4 h-4" /> Back to search
        </button>

        <div>
          <h3 className="text-lg font-heading font-bold text-night">{owner.name}</h3>
          {owner.phone_primary && <p className="text-xs text-muted">{owner.phone_primary}</p>}
        </div>

        {/* Animal list */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-night">Animals ({checked.length} selected)</p>
            <button
              onClick={() => setStep('add-animal')}
              className="flex items-center gap-1 text-xs text-primary font-medium hover:underline"
            >
              <Plus className="w-3.5 h-3.5" /> Add new
            </button>
          </div>

          {ownerAnimals.length === 0 ? (
            <div className="text-center py-6 bg-white rounded-xl border border-night/5">
              <PawPrint className="w-8 h-8 text-muted/50 mx-auto mb-2" />
              <p className="text-sm text-muted">No animals found for this owner</p>
              <button
                onClick={() => setStep('add-animal')}
                className="text-xs text-primary font-medium mt-2 hover:underline"
              >
                Add their first animal
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {ownerAnimals.map((animal) => {
                const c = checked.find((ch) => ch.id === animal.id);
                const isChecked = !!c;
                return (
                  <div key={animal.id} className={`rounded-xl border p-3 transition-all ${isChecked ? 'border-primary/20 bg-primary/4' : 'border-night/5 bg-white'}`}>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => toggleAnimal(animal.id)}
                        className={`w-6 h-6 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                          isChecked ? 'border-primary bg-primary' : 'border-night/15'
                        }`}
                      >
                        {isChecked && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-night">{animal.name ?? 'Unnamed'}</span>
                        <span className="text-xs text-muted ml-2 font-mono">{animal.aao_id}</span>
                      </div>
                      {animal.food_bag_size && (
                        <span className="text-xs text-muted bg-sand px-1.5 py-0.5 rounded-md">{animal.food_bag_size}</span>
                      )}
                    </div>

                    {isChecked && (
                      <div className="mt-2 ml-9 space-y-2">
                        <div className="grid grid-cols-3 gap-2">
                          <ServiceTag active={c.food} icon={Package} label="Food" onClick={() => updateAnimal(animal.id, { food: !c.food })} />
                          <ServiceTag active={c.vaccines} icon={Syringe} label="Vaccines" onClick={() => updateAnimal(animal.id, { vaccines: !c.vaccines })} />
                          <ServiceTag active={c.preventatives} icon={Pill} label="Preventatives" onClick={() => updateAnimal(animal.id, { preventatives: !c.preventatives })} />
                          <ServiceTag active={c.nailTrim} icon={Scissors} label="Nail Trim" onClick={() => updateAnimal(animal.id, { nailTrim: !c.nailTrim })} />
                          <ServiceTag active={c.needsMedical} icon={Stethoscope} label="Medical" onClick={() => updateAnimal(animal.id, { needsMedical: !c.needsMedical })} color="amber" />
                          <ServiceTag active={c.needsSN} icon={Heart} label="Spay/Neuter" onClick={() => updateAnimal(animal.id, { needsSN: !c.needsSN })} />
                        </div>
                        {c.needsMedical && (
                          <textarea
                            value={c.medicalNotes}
                            onChange={(e) => updateAnimal(animal.id, { medicalNotes: e.target.value })}
                            placeholder="Medical notes (what does this animal need?)"
                            rows={2}
                            className="w-full px-3 py-2 bg-white border border-night/8 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted/40 resize-none"
                          />
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Feedback */}
        <div aria-live="polite" aria-atomic="true">
          {error && (
            <div className="bg-ember/10 border border-ember/20 text-ember text-sm rounded-xl px-3 py-2" role="alert">
              {error}
            </div>
          )}
          {successMsg && (
            <div className="bg-primary/10 border border-primary/20 text-primary text-sm font-medium rounded-xl px-3 py-2 text-center" role="status">
              {successMsg}
            </div>
          )}
        </div>

        {/* Action buttons */}
        {checked.length > 0 && !successMsg && (
          <div className="space-y-2 pt-2">
            {anyNeedsQueue ? (
              <button
                onClick={() => { setError(''); sendToQueue(); }}
                disabled={submitting}
                className="w-full py-3 bg-primary hover:bg-primary-hover text-white font-semibold rounded-xl shadow-[0_2px_8px_rgba(110,168,50,0.25)] disabled:opacity-30 transition-all text-sm"
              >
                {submitting ? 'Saving...' : 'Send to Outreach Queue'}
              </button>
            ) : (
              <button
                onClick={() => { setError(''); completeFoodOnly(); }}
                disabled={submitting}
                className="w-full py-3 bg-primary hover:bg-primary-hover text-white font-semibold rounded-xl shadow-[0_2px_8px_rgba(110,168,50,0.25)] disabled:opacity-30 transition-all text-sm"
              >
                {submitting ? 'Saving...' : 'Complete Check-In'}
              </button>
            )}
            <button
              onClick={resetFlow}
              className="w-full py-2.5 text-sm text-muted hover:text-night font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    );
  }

  // Default: search step
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-heading font-bold text-night">Check In</h3>
      <p className="text-sm text-muted">Search for an owner by name or phone number</p>

      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted/50" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search owner name or phone..."
          className="w-full pl-10 pr-4 py-3 bg-white border border-night/8 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted/40"
          autoFocus
        />
      </div>

      {/* Results */}
      {searching && <p className="text-xs text-muted text-center py-2">Searching...</p>}

      {!searching && query.trim().length >= 2 && results.length === 0 && (
        <div className="text-center py-4">
          <p className="text-sm text-muted mb-3">No owners found for "{query}"</p>
          <button
            onClick={() => { setNewOwnerName(query.trim()); setStep('add-owner'); }}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary/10 text-primary text-sm font-medium rounded-lg hover:bg-primary/15 transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            Add new owner
          </button>
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-1.5">
          {results.map((o) => (
            <button
              key={o.id}
              onClick={() => selectOwner(o)}
              className="w-full flex items-center gap-3 p-3 rounded-xl border border-night/5 bg-white hover:bg-sand/50 text-left transition-all"
            >
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-primary">{o.name.charAt(0).toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-night block truncate">{o.name}</span>
                <span className="text-xs text-muted">
                  {o.phone_primary ?? 'No phone'}
                  {o.primary_location?.name && ` · ${o.primary_location.name}`}
                </span>
              </div>
            </button>
          ))}
          <button
            onClick={() => { setNewOwnerName(query.trim()); setStep('add-owner'); }}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 text-xs text-primary font-medium hover:underline"
          >
            <Plus className="w-3.5 h-3.5" />
            Add new owner instead
          </button>
        </div>
      )}

      {query.trim().length < 2 && (
        <div className="text-center py-8">
          <Search className="w-10 h-10 text-muted/20 mx-auto mb-3" />
          <p className="text-sm text-muted">Type at least 2 characters to search</p>
          <button
            onClick={() => setStep('add-owner')}
            className="inline-flex items-center gap-1.5 mt-4 text-xs text-primary font-medium hover:underline"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Or add a new owner
          </button>
        </div>
      )}
    </div>
  );
}

function ServiceTag({ active, icon: Icon, label, onClick, color }: { active: boolean; icon: any; label: string; onClick: () => void; color?: 'amber' }) {
  const activeClass = color === 'amber'
    ? 'bg-amber-50 text-amber-700 border-amber-200'
    : 'bg-primary/10 text-primary border-primary/20';
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-xl text-xs font-medium border transition-all ${
        active ? activeClass : 'bg-white border-night/8 text-muted'
      }`}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </button>
  );
}
