import { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock,
  Loader2,
  Package,
  PawPrint,
  Pill,
  Scissors,
  Sparkles,
  Stethoscope,
  Syringe,
  Trash2,
  UserCircle,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import ScanInput from '../shared/ScanInput';
import { trackVolunteer } from '../../lib/trackVolunteer';

interface Props {
  eventId: string;
  eventLocationId: string;
  eventDate: string;
}

interface QueueEntry {
  id: string;
  owner_id: string;
  queue_position: number;
  status: string;
  checked_in_at: string;
  staged_care: StagedAnimal[];
  owner: { name: string; phone_primary: string | null } | null;
}

interface StagedAnimal {
  animal_id: string;
  animal_name: string;
  aao_id: string;
  food_bag_size: string | null;
  services: string[];
  food_bags: number;
  vaccine_lot_dapp: string;
  vaccine_lot_parvo: string;
  vaccine_expiry: string;
  preventative_product: string;
  preventative_dosage: string;
  health_notes: string;
  other_notes: string;
}

const VET_SERVICES = [
  { value: 'vaccine_dapp', label: 'DAPP Vaccine', icon: Syringe },
  { value: 'vaccine_parvo', label: 'Parvo Vaccine', icon: Syringe },
  { value: 'preventative_oral', label: 'Preventative (Oral)', icon: Pill },
  { value: 'preventative_topical', label: 'Preventative (Topical)', icon: Pill },
  { value: 'spay_neuter', label: 'Spay/Neuter', icon: Scissors },
  { value: 'medical', label: 'Medical/Vet', icon: Stethoscope },
  { value: 'grooming', label: 'Grooming/Bath', icon: Sparkles },
  { value: 'nail_trim', label: 'Nail Trim', icon: Scissors },
];

export default function VetQueue({ eventId, eventLocationId, eventDate }: Props) {
  const { user } = useAuth();
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<QueueEntry | null>(null);
  const [editCare, setEditCare] = useState<StagedAnimal[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [removeConfirm, setRemoveConfirm] = useState<string | null>(null);

  async function loadQueue() {
    const { data } = await supabase
      .from('checkin_queue')
      .select('id, owner_id, queue_position, status, checked_in_at, staged_care, owner:owners(name, phone_primary)')
      .eq('outreach_event_id', eventId)
      .in('status', ['waiting', 'in_progress'])
      .order('queue_position');
    setQueue((data ?? []).map((d: any) => ({
      ...d,
      owner: Array.isArray(d.owner) ? d.owner[0] ?? null : d.owner,
    })) as QueueEntry[]);
    setLoading(false);
  }

  useEffect(() => {
    loadQueue();

    // Realtime subscription
    const channel = supabase
      .channel(`queue-${eventId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'checkin_queue',
        filter: `outreach_event_id=eq.${eventId}`,
      }, () => {
        loadQueue();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [eventId]);

  function openEntry(entry: QueueEntry) {
    setSelected(entry);
    setEditCare(JSON.parse(JSON.stringify(entry.staged_care)));
    // Mark as in_progress
    if (entry.status === 'waiting') {
      supabase.from('checkin_queue').update({ status: 'in_progress' }).eq('id', entry.id).then();
    }
  }

  function toggleService(animalIdx: number, service: string) {
    setEditCare((prev) => {
      const next = [...prev];
      const animal = { ...next[animalIdx] };
      animal.services = animal.services.includes(service)
        ? animal.services.filter((s) => s !== service)
        : [...animal.services, service];
      next[animalIdx] = animal;
      return next;
    });
  }

  function updateField(animalIdx: number, field: keyof StagedAnimal, value: string) {
    setEditCare((prev) => {
      const next = [...prev];
      next[animalIdx] = { ...next[animalIdx], [field]: value };
      return next;
    });
  }

  async function completeEntry() {
    if (!user || !selected) return;
    setSubmitting(true);

    // Write care_events for each animal
    const careInserts = editCare.map((animal) => ({
      outreach_event_id: eventId,
      animal_id: animal.animal_id,
      owner_id: selected.owner_id,
      location_id: eventLocationId,
      event_date: eventDate,
      care_types: animal.services.length > 0 ? animal.services : ['seen'],
      food_bags: animal.services.includes('food') ? animal.food_bags || 1 : null,
      food_lbs: animal.services.includes('food') ? (animal.food_bag_size ? parseInt(animal.food_bag_size) : 6) : null,
      vaccine_lot_dapp: animal.vaccine_lot_dapp || null,
      vaccine_lot_parvo: animal.vaccine_lot_parvo || null,
      vaccine_expiry: animal.vaccine_expiry || null,
      preventative_product: animal.preventative_product || null,
      preventative_dosage: animal.preventative_dosage || null,
      health_notes: animal.health_notes || null,
      other_notes: animal.other_notes || null,
      created_by: user.id,
    }));

    if (careInserts.length > 0) {
      await supabase.from('care_events').insert(careInserts);
    }

    await trackVolunteer(eventId, user.id);

    // Mark queue entry as complete
    await supabase.from('checkin_queue').update({
      status: 'complete',
      completed_by: user.id,
      completed_at: new Date().toISOString(),
      staged_care: editCare,
    }).eq('id', selected.id);

    setSubmitting(false);
    setSelected(null);
    loadQueue();
  }

  async function removeFromLine(entryId: string) {
    await supabase.from('checkin_queue').delete().eq('id', entryId);
    if (selected?.id === entryId) setSelected(null);
    setRemoveConfirm(null);
    loadQueue();
  }

  function minutesAgo(dateStr: string): number {
    return Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  }

  // ─── DETAIL VIEW ──────────────────────────────────────
  if (selected) {
    return (
      <div className="space-y-4">
        <button onClick={() => setSelected(null)} className="flex items-center gap-1 text-sm text-muted hover:text-night">
          <ArrowLeft className="w-4 h-4" /> Back to queue
        </button>

        <div>
          <h3 className="text-lg font-heading font-bold text-night">{selected.owner?.name ?? 'Unknown Owner'}</h3>
          {selected.owner?.phone_primary && (
            <p className="text-xs text-muted">{selected.owner.phone_primary}</p>
          )}
        </div>

        {/* Per-animal service editing */}
        <div className="space-y-4">
          {editCare.map((animal, idx) => (
            <div key={animal.animal_id} className="bg-white rounded-xl border border-night/5 p-3 space-y-3">
              <div className="flex items-center gap-2">
                <PawPrint className="w-4 h-4 text-primary" strokeWidth={1.5} />
                <span className="text-sm font-medium text-night">{animal.animal_name}</span>
                <span className="text-xs text-muted font-mono">{animal.aao_id}</span>
                {animal.food_bag_size && (
                  <span className="text-xs text-muted bg-sand px-1.5 py-0.5 rounded-md ml-auto">{animal.food_bag_size}</span>
                )}
              </div>

              {/* Service toggles */}
              <div className="flex flex-wrap gap-1.5">
                {/* Food toggle */}
                <button
                  onClick={() => toggleService(idx, 'food')}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    animal.services.includes('food') ? 'bg-primary/10 text-primary' : 'bg-night/5 text-muted'
                  }`}
                >
                  <Package className="w-3 h-3" /> Food
                </button>
                {/* Vet services */}
                {VET_SERVICES.map((svc) => (
                  <button
                    key={svc.value}
                    onClick={() => toggleService(idx, svc.value)}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      animal.services.includes(svc.value) ? 'bg-primary/10 text-primary' : 'bg-night/5 text-muted'
                    }`}
                  >
                    <svc.icon className="w-3 h-3" /> {svc.label}
                  </button>
                ))}
              </div>

              {/* Conditional detail fields */}
              {(animal.services.includes('vaccine_dapp') || animal.services.includes('vaccine_parvo')) && (
                <div className="grid grid-cols-1 gap-2">
                  {animal.services.includes('vaccine_dapp') && (
                    <ScanInput
                      label="DAPP lot #"
                      value={animal.vaccine_lot_dapp}
                      onChange={(v) => updateField(idx, 'vaccine_lot_dapp', v)}
                      ocr
                      attach
                      fieldLabel="DAPP lot number"
                      animalId={animal.animal_id}
                      labelClassName="block text-xs text-muted font-medium mb-0.5"
                      inputClassName="flex-1 min-w-0 px-2.5 py-2 bg-sand/50 border border-night/5 rounded-lg text-xs text-night focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted/40"
                    />
                  )}
                  {animal.services.includes('vaccine_parvo') && (
                    <ScanInput
                      label="Parvo lot #"
                      value={animal.vaccine_lot_parvo}
                      onChange={(v) => updateField(idx, 'vaccine_lot_parvo', v)}
                      ocr
                      attach
                      fieldLabel="Parvo lot number"
                      animalId={animal.animal_id}
                      labelClassName="block text-xs text-muted font-medium mb-0.5"
                      inputClassName="flex-1 min-w-0 px-2.5 py-2 bg-sand/50 border border-night/5 rounded-lg text-xs text-night focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted/40"
                    />
                  )}
                </div>
              )}
              {(animal.services.includes('preventative_oral') || animal.services.includes('preventative_topical')) && (
                <div className="grid grid-cols-1 gap-2">
                  <ScanInput
                    label="Product"
                    value={animal.preventative_product}
                    onChange={(v) => updateField(idx, 'preventative_product', v)}
                    placeholder="e.g. NexGard Plus"
                    ocr
                    fieldLabel="Product name"
                    animalId={animal.animal_id}
                    labelClassName="block text-xs text-muted font-medium mb-0.5"
                    inputClassName="flex-1 min-w-0 px-2.5 py-2 bg-sand/50 border border-night/5 rounded-lg text-xs text-night focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted/40"
                  />
                  <FieldInput label="Dosage" value={animal.preventative_dosage} onChange={(v) => updateField(idx, 'preventative_dosage', v)} />
                </div>
              )}
              {animal.services.includes('medical') && (
                <FieldInput label="Health notes" value={animal.health_notes} onChange={(v) => updateField(idx, 'health_notes', v)} multiline />
              )}
              {animal.services.some((s) => ['grooming', 'nail_trim', 'spay_neuter', 'other'].includes(s)) && (
                <FieldInput label="Notes" value={animal.other_notes} onChange={(v) => updateField(idx, 'other_notes', v)} />
              )}
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="space-y-2 pt-2">
          <button
            onClick={completeEntry}
            disabled={submitting}
            className="w-full py-3 bg-primary hover:bg-primary-hover text-white font-semibold rounded-xl shadow-[0_2px_8px_rgba(110,168,50,0.25)] disabled:opacity-30 transition-all text-sm flex items-center justify-center gap-2"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {submitting ? 'Saving...' : 'Complete'}
          </button>
          <button
            onClick={() => setRemoveConfirm(selected.id)}
            className="w-full py-2.5 text-sm text-ember font-medium hover:bg-ember/5 rounded-xl transition-colors flex items-center justify-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" /> Remove from Line
          </button>
        </div>
      </div>
    );
  }

  // ─── LIST VIEW ────────────────────────────────────────
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-heading font-bold text-night">Waiting for Services</h3>

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      ) : queue.length === 0 ? (
        <div className="text-center py-10">
          <Clock className="w-10 h-10 text-muted/20 mx-auto mb-3" />
          <p className="text-sm text-muted">No one waiting</p>
          <p className="text-xs text-muted mt-1">People needing services will appear here after check-in</p>
        </div>
      ) : (
        <div className="space-y-2">
          {queue.map((entry, i) => {
            const mins = minutesAgo(entry.checked_in_at);
            const animalCount = entry.staged_care.length;
            const serviceList = [...new Set(entry.staged_care.flatMap((a) => a.services.filter((s) => s !== 'food' && s !== 'seen')))];
            return (
              <div
                key={entry.id}
                className="bg-white rounded-xl border border-amber-200 p-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-amber-600">{i + 1}</span>
                  </div>
                  <button
                    onClick={() => openEntry(entry)}
                    className="flex-1 min-w-0 text-left"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-night truncate">{entry.owner?.name ?? 'Unknown'}</span>
                      {entry.status === 'in_progress' && (
                        <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">In Progress</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted flex items-center gap-1">
                        <PawPrint className="w-3 h-3" />
                        {animalCount} animal{animalCount !== 1 ? 's' : ''}
                      </span>
                      <span className="text-xs text-muted flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {mins < 1 ? 'Just now' : `${mins}m`}
                      </span>
                    </div>
                    {serviceList.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {serviceList.map((s) => (
                          <span key={s} className="text-xs bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-md font-medium capitalize">
                            {s.replace(/_/g, ' ')}
                          </span>
                        ))}
                      </div>
                    )}
                  </button>
                  <button
                    onClick={() => setRemoveConfirm(entry.id)}
                    className="p-2 text-muted hover:text-ember transition-colors shrink-0"
                    aria-label="Remove from line"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Remove confirmation dialog */}
      {removeConfirm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Remove confirmation">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-xl">
            <h3 className="text-lg font-heading font-bold text-night mb-2">Remove from line?</h3>
            <p className="text-sm text-muted mb-5">
              This will permanently remove this person from the queue. This cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setRemoveConfirm(null)}
                className="flex-1 py-2.5 bg-sand text-night text-sm font-medium rounded-xl hover:bg-night/8 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => removeFromLine(removeConfirm)}
                className="flex-1 py-2.5 bg-ember hover:bg-ember/90 text-white text-sm font-semibold rounded-xl transition-all"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FieldInput({
  label,
  value,
  onChange,
  placeholder,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
}) {
  const cls = 'w-full px-2.5 py-2 bg-sand/50 border border-night/5 rounded-lg text-xs text-night focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted/40';
  return (
    <div>
      <label className="block text-xs text-muted font-medium mb-0.5">{label}</label>
      {multiline ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={2} className={`${cls} resize-none`} placeholder={placeholder} />
      ) : (
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className={cls} placeholder={placeholder} />
      )}
    </div>
  );
}
