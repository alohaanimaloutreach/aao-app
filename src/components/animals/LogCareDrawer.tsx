import { useState } from 'react';
import {
  X,
  Package,
  Syringe,
  Pill,
  Scissors,
  Stethoscope,
  Heart,
  Check,
  Loader2,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import ScanInput from '../shared/ScanInput';

interface Props {
  open: boolean;
  onClose: () => void;
  animalId: string;
  animalName: string | null;
  ownerId: string | null;
  locationId: string | null;
  foodBagSize: string | null;
  onSaved: () => void;
}

export default function LogCareDrawer({ open, onClose, animalId, animalName, ownerId, locationId, foodBagSize, onSaved }: Props) {
  const { user } = useAuth();
  const [food, setFood] = useState(false);
  const [vaccines, setVaccines] = useState(false);
  const [preventatives, setPreventatives] = useState(false);
  const [nailTrim, setNailTrim] = useState(false);
  const [medical, setMedical] = useState(false);
  const [spayNeuter, setSpayNeuter] = useState(false);
  const [healthNotes, setHealthNotes] = useState('');
  const [otherNotes, setOtherNotes] = useState('');
  const [vaccineLotDapp, setVaccineLotDapp] = useState('');
  const [vaccineLotParvo, setVaccineLotParvo] = useState('');
  const [preventativeProduct, setPreventativeProduct] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Pacific/Honolulu' });

  function reset() {
    setFood(false);
    setVaccines(false);
    setPreventatives(false);
    setNailTrim(false);
    setMedical(false);
    setSpayNeuter(false);
    setHealthNotes('');
    setOtherNotes('');
    setVaccineLotDapp('');
    setVaccineLotParvo('');
    setPreventativeProduct('');
    setError('');
    setSaved(false);
  }

  async function handleSave() {
    if (!user) return;
    const careTypes: string[] = [];
    if (food) careTypes.push('food');
    if (vaccines) careTypes.push('vaccine_dapp');
    if (preventatives) careTypes.push('preventative_oral');
    if (nailTrim) careTypes.push('nail_trim');
    if (medical) careTypes.push('medical');
    if (spayNeuter) careTypes.push('spay_neuter');

    if (careTypes.length === 0) {
      setError('Select at least one service');
      return;
    }

    setSaving(true);
    setError('');

    const { error: insertErr } = await supabase.from('care_events').insert({
      animal_id: animalId,
      owner_id: ownerId,
      location_id: locationId,
      event_date: today,
      care_types: careTypes,
      food_bags: food ? 1 : 0,
      food_lbs: food && foodBagSize ? parseInt(foodBagSize) : food ? 6 : 0,
      health_notes: healthNotes.trim() || null,
      other_notes: otherNotes.trim() || null,
      vaccine_lot_dapp: vaccineLotDapp.trim() || null,
      vaccine_lot_parvo: vaccineLotParvo.trim() || null,
      preventative_product: preventativeProduct.trim() || null,
      created_by: user.id,
    });

    setSaving(false);

    if (insertErr) {
      setError(`Save failed: ${insertErr.message}`);
      return;
    }

    setSaved(true);
    onSaved();
    setTimeout(() => {
      reset();
      onClose();
    }, 1500);
  }

  if (!open) return null;

  const anySelected = food || vaccines || preventatives || nailTrim || medical || spayNeuter;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label="Log care">
      <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[85vh] flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-night/5 shrink-0">
          <h2 className="font-heading font-bold text-night text-base">Log Care — {animalName ?? 'Animal'}</h2>
          <button onClick={() => { reset(); onClose(); }} className="p-1 rounded-lg hover:bg-sand transition-colors" aria-label="Close">
            <X className="w-5 h-5 text-muted" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Service toggles */}
          <div>
            <p className="text-sm font-semibold text-night mb-2">Services provided</p>
            <div className="grid grid-cols-3 gap-2">
              <ServiceTag active={food} icon={Package} label="Food" onClick={() => setFood(!food)} />
              <ServiceTag active={vaccines} icon={Syringe} label="Vaccines" onClick={() => setVaccines(!vaccines)} />
              <ServiceTag active={preventatives} icon={Pill} label="Preventatives" onClick={() => setPreventatives(!preventatives)} />
              <ServiceTag active={nailTrim} icon={Scissors} label="Nail Trim" onClick={() => setNailTrim(!nailTrim)} />
              <ServiceTag active={medical} icon={Stethoscope} label="Medical" onClick={() => setMedical(!medical)} color="amber" />
              <ServiceTag active={spayNeuter} icon={Heart} label="Spay/Neuter" onClick={() => setSpayNeuter(!spayNeuter)} />
            </div>
          </div>

          {/* Conditional detail fields */}
          {vaccines && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted uppercase tracking-wide">Vaccine Details</p>
              <ScanInput
                value={vaccineLotDapp}
                onChange={setVaccineLotDapp}
                placeholder="DAPP lot number"
                ocr
                attach
                fieldLabel="DAPP lot number"
                animalId={animalId}
              />
              <ScanInput
                value={vaccineLotParvo}
                onChange={setVaccineLotParvo}
                placeholder="Parvo lot number"
                ocr
                attach
                fieldLabel="Parvo lot number"
                animalId={animalId}
              />
            </div>
          )}

          {preventatives && (
            <div>
              <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-1">Preventative Details</p>
              <ScanInput
                value={preventativeProduct}
                onChange={setPreventativeProduct}
                placeholder="Product name / dosage"
                ocr
                attach
                fieldLabel="Product name"
                animalId={animalId}
              />
            </div>
          )}

          {medical && (
            <div>
              <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-1">Medical Notes</p>
              <textarea
                value={healthNotes}
                onChange={(e) => setHealthNotes(e.target.value)}
                placeholder="Describe the medical care provided..."
                rows={2}
                className="w-full px-3 py-2 bg-white border border-night/8 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted/40 resize-none"
              />
            </div>
          )}

          {/* General notes — always available */}
          <div>
            <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-1">Notes (optional)</p>
            <textarea
              value={otherNotes}
              onChange={(e) => setOtherNotes(e.target.value)}
              placeholder="Any additional notes..."
              rows={2}
              className="w-full px-3 py-2 bg-white border border-night/8 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted/40 resize-none"
            />
          </div>

          {/* Feedback */}
          {error && (
            <div className="bg-ember/10 border border-ember/20 text-ember text-sm rounded-xl px-3 py-2" role="alert">
              {error}
            </div>
          )}
          {saved && (
            <div className="bg-primary/10 border border-primary/20 text-primary text-sm font-medium rounded-xl px-3 py-2 text-center" role="status">
              Care logged!
            </div>
          )}
        </div>

        {/* Footer */}
        {!saved && (
          <div className="px-5 py-4 border-t border-night/5 shrink-0">
            <button
              onClick={handleSave}
              disabled={saving || !anySelected}
              className="w-full py-3 bg-primary hover:bg-primary-hover text-white font-semibold rounded-xl shadow-[0_2px_8px_rgba(110,168,50,0.25)] disabled:opacity-30 transition-all text-sm flex items-center justify-center gap-2"
            >
              {saving ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
              ) : (
                <><Check className="w-4 h-4" strokeWidth={2.5} /> Log Care</>
              )}
            </button>
          </div>
        )}
      </div>
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
      className={`flex items-center justify-center gap-1 px-1.5 py-2.5 rounded-xl text-xs font-medium border transition-all ${
        active ? activeClass : 'bg-white border-night/8 text-muted'
      }`}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <span className="truncate">{label}</span>
    </button>
  );
}
