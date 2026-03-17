import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  Edit3,
  MapPin,
  Phone,
  Home,
  PawPrint,
  Flag,
  StickyNote,
  Navigation,
  ExternalLink,
  Check,
  X,
  Loader2,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatDate } from '../lib/format';
import StatusBadge from '../components/shared/StatusBadge';
import FlagResolver from '../components/admin/FlagResolver';
import ArchiveActions from '../components/admin/ArchiveActions';

interface OwnerDetail {
  id: string;
  name: string;
  phone_primary: string | null;
  phone_secondary: string | null;
  address: string | null;
  precise_lat: number | null;
  precise_lng: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  archived: boolean;
  primary_location: { id: string; name: string } | null;
}

interface LinkedAnimal {
  id: string;
  aao_id: string;
  name: string | null;
  animal_type: string;
  food_bag_size: string | null;
  urgent_medical: boolean;
  deceased: boolean;
  current_status: string | null;
}

interface OwnerFlag {
  id: string;
  reason: string | null;
  resolved: boolean;
  created_at: string;
}

interface OwnerNote {
  id: string;
  content: string;
  is_flagged: boolean;
  created_at: string;
  created_by_name: string | null;
}

export default function PersonProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [owner, setOwner] = useState<OwnerDetail | null>(null);
  const [animals, setAnimals] = useState<LinkedAnimal[]>([]);
  const [flags, setFlags] = useState<OwnerFlag[]>([]);
  const [notes, setNotes] = useState<OwnerNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'animals' | 'details' | 'notes'>('animals');
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<Record<string, any>>({});
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');

  useEffect(() => {
    if (id) loadOwner(id);
  }, [id]);

  async function loadOwner(ownerId: string) {
    setLoading(true);

    const [ownerRes, animalRes, sitRes, flagRes, noteRes] = await Promise.all([
      supabase
        .from('owners')
        .select('*, primary_location:locations(id, name)')
        .eq('id', ownerId)
        .single(),
      supabase
        .from('animals')
        .select('id, aao_id, name, animal_type, food_bag_size, urgent_medical, deceased')
        .eq('owner_id', ownerId)
        .eq('archived', false)
        .order('name'),
      supabase
        .from('situations')
        .select('animal_id, status')
        .eq('is_active', true),
      supabase
        .from('flags')
        .select('*')
        .eq('table_name', 'owners')
        .eq('record_id', ownerId)
        .order('created_at', { ascending: false }),
      supabase
        .from('field_notes')
        .select('id, content, is_flagged, created_at, users:created_by(name)')
        .eq('owner_id', ownerId)
        .order('created_at', { ascending: false }),
    ]);

    if (ownerRes.data) setOwner(ownerRes.data as unknown as OwnerDetail);

    // Map situations to animals
    const sitMap: Record<string, string> = {};
    (sitRes.data ?? []).forEach((s: any) => {
      sitMap[s.animal_id] = s.status;
    });

    const linkedAnimals: LinkedAnimal[] = (animalRes.data ?? []).map((a: any) => ({
      ...a,
      current_status: sitMap[a.id] ?? null,
    }));
    setAnimals(linkedAnimals);

    if (flagRes.data) setFlags(flagRes.data);

    const mappedNotes: OwnerNote[] = (noteRes.data ?? []).map((n: any) => ({
      id: n.id,
      content: n.content,
      is_flagged: n.is_flagged,
      created_at: n.created_at,
      created_by_name: n.users?.name ?? null,
    }));
    setNotes(mappedNotes);

    setLoading(false);
  }

  function openEdit() {
    if (!owner) return;
    setEditData({
      name: owner.name,
      phone_primary: owner.phone_primary ?? '',
      phone_secondary: owner.phone_secondary ?? '',
      address: owner.address ?? '',
      notes: owner.notes ?? '',
    });
    setEditError('');
    setEditing(true);
  }

  async function saveEdit() {
    if (!owner) return;
    setEditSaving(true);
    setEditError('');
    const { error } = await supabase.from('owners').update({
      name: editData.name || owner.name,
      phone_primary: editData.phone_primary || null,
      phone_secondary: editData.phone_secondary || null,
      address: editData.address || null,
      notes: editData.notes || null,
    }).eq('id', owner.id);
    setEditSaving(false);
    if (error) { setEditError(error.message); return; }
    setEditing(false);
    loadOwner(owner.id);
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="skeleton h-6 w-20 mb-4" />
        <div className="bg-white rounded-2xl border border-night/5 p-6">
          <div className="flex gap-4">
            <div className="skeleton w-16 h-16 rounded-xl" />
            <div className="space-y-2 flex-1">
              <div className="skeleton h-6 w-40" />
              <div className="skeleton h-4 w-28" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!owner) {
    return (
      <div className="max-w-3xl mx-auto text-center py-16">
        <User className="w-12 h-12 text-muted/20 mx-auto mb-3" />
        <p className="text-muted">Person not found</p>
        <Link to="/people" className="text-primary text-sm font-medium mt-2 inline-block">Back to people</Link>
      </div>
    );
  }

  const unresolvedFlags = flags.filter((f) => !f.resolved);

  return (
    <div className="max-w-3xl mx-auto">
      {/* Back nav */}
      <button
        onClick={() => navigate('/people')}
        className="flex items-center gap-1.5 text-sm text-muted hover:text-night mb-4 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        People
      </button>

      {/* Header card */}
      <div className="bg-white rounded-2xl border border-night/5 p-5 mb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-gold/15 flex items-center justify-center shrink-0">
              <User className="w-7 h-7 text-night/50" strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-heading font-bold text-night">{owner.name}</h1>
              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                {owner.primary_location && (
                  <Link
                    to={`/locations/${owner.primary_location.id}`}
                    className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-primary transition-colors bg-sand rounded-full px-2.5 py-1"
                  >
                    <MapPin className="w-3 h-3" />
                    {owner.primary_location.name}
                  </Link>
                )}
                <span className="inline-flex items-center gap-1.5 text-xs text-primary font-medium bg-primary/8 rounded-full px-2.5 py-1">
                  <PawPrint className="w-3 h-3" />
                  {animals.length} animal{animals.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>

          <button onClick={openEdit} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary font-medium transition-all text-sm" aria-label="Edit person">
            <Edit3 className="w-4 h-4" strokeWidth={2} />
            <span>Edit</span>
          </button>
        </div>

        {/* Contact info */}
        <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-night/5">
          {owner.phone_primary && (
            <a
              href={`tel:${owner.phone_primary}`}
              className="inline-flex items-center gap-1.5 text-sm text-night hover:text-primary transition-colors bg-sand rounded-xl px-3 py-2"
            >
              <Phone className="w-3.5 h-3.5 text-muted" strokeWidth={1.75} />
              {owner.phone_primary}
            </a>
          )}
          {owner.phone_secondary && (
            <a
              href={`tel:${owner.phone_secondary}`}
              className="inline-flex items-center gap-1.5 text-sm text-night hover:text-primary transition-colors bg-sand rounded-xl px-3 py-2"
            >
              <Phone className="w-3.5 h-3.5 text-muted" strokeWidth={1.75} />
              {owner.phone_secondary}
            </a>
          )}
          {owner.address && (
            <span className="inline-flex items-center gap-1.5 text-sm text-night bg-sand rounded-xl px-3 py-2">
              <Home className="w-3.5 h-3.5 text-muted" strokeWidth={1.75} />
              {owner.address}
            </span>
          )}
        </div>

        {/* Pin drop location */}
        {owner.precise_lat && owner.precise_lng && (
          <div className="mt-3 bg-sand/70 rounded-xl p-3 flex items-center gap-2">
            <Navigation className="w-4 h-4 text-primary" strokeWidth={1.75} />
            <span className="text-xs text-muted">
              Pin location: {owner.precise_lat.toFixed(5)}, {owner.precise_lng.toFixed(5)}
            </span>
          </div>
        )}

        {/* Flags */}
        {flags.length > 0 && (
          <div className="mt-3">
            <FlagResolver flags={flags} onUpdate={() => id && loadOwner(id)} />
          </div>
        )}
      </div>

      {/* Archive actions (admin only) */}
      <ArchiveActions
        tableName="owners"
        recordId={owner.id}
        isArchived={owner.archived}
        recordLabel={owner.name}
        onUpdate={() => navigate('/people')}
      />

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label="Edit person">
          <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[85vh] flex flex-col shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-night/5 shrink-0">
              <h2 className="font-heading font-bold text-night text-base">Edit Person</h2>
              <button onClick={() => setEditing(false)} className="p-2 rounded-lg text-muted hover:text-night hover:bg-sand transition-all" aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div>
                <label className="block text-xs text-muted font-medium mb-1">Name</label>
                <input type="text" value={editData.name} onChange={(e) => setEditData({ ...editData, name: e.target.value })} className="w-full px-3 py-2.5 bg-sand/50 border border-night/8 rounded-xl text-sm text-night focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="block text-xs text-muted font-medium mb-1">Phone (primary)</label>
                <input type="tel" value={editData.phone_primary} onChange={(e) => setEditData({ ...editData, phone_primary: e.target.value })} className="w-full px-3 py-2.5 bg-sand/50 border border-night/8 rounded-xl text-sm text-night focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="block text-xs text-muted font-medium mb-1">Phone (secondary)</label>
                <input type="tel" value={editData.phone_secondary} onChange={(e) => setEditData({ ...editData, phone_secondary: e.target.value })} className="w-full px-3 py-2.5 bg-sand/50 border border-night/8 rounded-xl text-sm text-night focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="block text-xs text-muted font-medium mb-1">Address</label>
                <input type="text" value={editData.address} onChange={(e) => setEditData({ ...editData, address: e.target.value })} className="w-full px-3 py-2.5 bg-sand/50 border border-night/8 rounded-xl text-sm text-night focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="block text-xs text-muted font-medium mb-1">Notes</label>
                <textarea value={editData.notes} onChange={(e) => setEditData({ ...editData, notes: e.target.value })} rows={4} className="w-full px-3 py-2.5 bg-sand/50 border border-night/8 rounded-xl text-sm text-night focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
              </div>
            </div>
            <div className="p-5 border-t border-night/5 shrink-0 space-y-2">
              {editError && (
                <div className="bg-ember/10 border border-ember/20 text-ember text-xs rounded-xl px-3 py-2" role="alert">{editError}</div>
              )}
              <button onClick={saveEdit} disabled={editSaving} className="w-full py-3 bg-primary hover:bg-primary-hover text-white font-semibold text-sm rounded-xl shadow-[0_2px_8px_rgba(110,168,50,0.25)] disabled:opacity-30 transition-all flex items-center justify-center gap-2">
                {editSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {editSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-white rounded-xl border border-night/5 p-1 mb-4">
        {(['animals', 'details', 'notes'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all capitalize ${
              activeTab === tab ? 'bg-primary text-white shadow-sm' : 'text-muted hover:text-night'
            }`}
          >
            {tab === 'animals' ? `Animals (${animals.length})` : tab === 'notes' ? `Notes (${notes.length})` : 'Details'}
          </button>
        ))}
      </div>

      <div className="page-enter">
        {activeTab === 'animals' && <AnimalsTab animals={animals} />}
        {activeTab === 'details' && <DetailsTab owner={owner} />}
        {activeTab === 'notes' && <NotesTab notes={notes} />}
      </div>
    </div>
  );
}

function AnimalsTab({ animals }: { animals: LinkedAnimal[] }) {
  if (animals.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-night/5 p-12 text-center">
        <PawPrint className="w-8 h-8 text-muted/20 mx-auto mb-2" />
        <p className="text-sm text-muted">No animals linked to this person</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {animals.map((a) => (
        <Link
          key={a.id}
          to={`/animals/${a.id}`}
          className="bg-white rounded-2xl border border-night/5 p-4 flex items-center gap-3 card-hover block"
        >
          <div className="w-10 h-10 rounded-xl bg-primary/8 flex items-center justify-center shrink-0">
            <PawPrint className="w-5 h-5 text-primary" strokeWidth={1.5} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-heading font-bold text-sm text-night truncate">
                {a.name ?? 'Unnamed'}
              </span>
              <span className="text-[10px] text-muted font-mono">{a.aao_id}</span>
              {a.urgent_medical && (
                <span className="text-[10px] font-bold text-ember bg-ember/10 px-1.5 py-0.5 rounded-full">Urgent</span>
              )}
              {a.deceased && (
                <span className="text-[10px] font-bold text-muted bg-night/8 px-1.5 py-0.5 rounded-full">Deceased</span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              {a.current_status && <StatusBadge status={a.current_status} />}
              {a.food_bag_size && (
                <span className="text-[10px] text-muted">{a.food_bag_size} bag</span>
              )}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

function DetailsTab({ owner }: { owner: OwnerDetail }) {
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-night/5 p-5">
        <h3 className="font-heading font-bold text-night text-sm mb-3">Notes</h3>
        {owner.notes ? (
          <p className="text-sm text-night leading-relaxed">{owner.notes}</p>
        ) : (
          <p className="text-sm text-muted">No notes</p>
        )}
      </div>

      {/* Pin drop map placeholder */}
      <div className="bg-white rounded-2xl border border-night/5 p-5">
        <h3 className="font-heading font-bold text-night text-sm mb-3">Location</h3>
        {owner.precise_lat && owner.precise_lng ? (
          <div className="rounded-xl overflow-hidden border border-night/5">
            <iframe
              title="Person location"
              width="100%"
              height="180"
              style={{ border: 0, display: 'block' }}
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${owner.precise_lng - 0.005},${owner.precise_lat - 0.003},${owner.precise_lng + 0.005},${owner.precise_lat + 0.003}&layer=mapnik&marker=${owner.precise_lat},${owner.precise_lng}`}
              loading="lazy"
            />
            <div className="flex items-center justify-between px-3 py-1.5 bg-sand/50">
              <span className="text-[10px] text-muted">
                {owner.precise_lat.toFixed(5)}, {owner.precise_lng.toFixed(5)}
              </span>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${owner.precise_lat},${owner.precise_lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[11px] text-primary hover:underline"
              >
                Directions <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        ) : (
          <div className="bg-sand rounded-xl h-48 flex items-center justify-center">
            <div className="text-center">
              <MapPin className="w-8 h-8 text-muted/20 mx-auto mb-1" />
              <p className="text-xs text-muted">No precise location set</p>
            </div>
          </div>
        )}
      </div>

      <div className="text-[11px] text-muted/50 flex gap-4 pt-2">
        <span>Created {formatDate(owner.created_at)}</span>
        <span>Updated {formatDate(owner.updated_at)}</span>
      </div>
    </div>
  );
}

function NotesTab({ notes }: { notes: OwnerNote[] }) {
  if (notes.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-night/5 p-12 text-center">
        <StickyNote className="w-8 h-8 text-muted/20 mx-auto mb-2" />
        <p className="text-sm text-muted">No field notes linked to this person</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {notes.map((n) => (
        <div
          key={n.id}
          className={`bg-white rounded-2xl border p-4 ${
            n.is_flagged ? 'border-gold/30 bg-gold/4' : 'border-night/5'
          }`}
        >
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="flex items-center gap-1.5">
              {n.is_flagged && <Flag className="w-3 h-3 text-gold" />}
              <span className="text-[11px] text-muted">{formatDate(n.created_at)}</span>
            </div>
            {n.created_by_name && (
              <span className="text-[10px] text-muted/60">{n.created_by_name}</span>
            )}
          </div>
          <p className="text-sm text-night leading-relaxed">{n.content}</p>
        </div>
      ))}
    </div>
  );
}
