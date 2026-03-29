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
  Search,
  Crosshair,
  Trash2,
  Plus,
  MessageSquare,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { formatDate, formatPhone, isValidPhone } from '../lib/format';
import StatusBadge from '../components/shared/StatusBadge';
import FlagResolver from '../components/admin/FlagResolver';
import MapIframe from '../components/shared/MapIframe';
import OwnerLocationMap from '../components/people/OwnerLocationMap';

interface OwnerDetail {
  id: string;
  name: string;
  nickname: string | null;
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
  note: string;
  flagged: boolean;
  created_at: string;
  created_by_name: string | null;
}

export default function PersonProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [owner, setOwner] = useState<OwnerDetail | null>(null);
  const [animals, setAnimals] = useState<LinkedAnimal[]>([]);
  const [flags, setFlags] = useState<OwnerFlag[]>([]);
  const [notes, setNotes] = useState<OwnerNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'animals' | 'map' | 'details' | 'notes'>('animals');
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<Record<string, any>>({});
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const [showEditLocationPicker, setShowEditLocationPicker] = useState(false);
  const [editLocationSearch, setEditLocationSearch] = useState('');
  const [editLocationResults, setEditLocationResults] = useState<{ id: string; name: string; address: string | null }[]>([]);
  const [showCreateLocation, setShowCreateLocation] = useState(false);
  const [newLocName, setNewLocName] = useState('');
  const [newLocAddress, setNewLocAddress] = useState('');
  const [creatingLocation, setCreatingLocation] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteText, setDeleteText] = useState('');
  const [deleteProcessing, setDeleteProcessing] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [transferSearch, setTransferSearch] = useState('');
  const [transferResults, setTransferResults] = useState<{ id: string; name: string }[]>([]);
  const [transferTo, setTransferTo] = useState<{ id: string; name: string } | 'unlink' | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState('');

  useEffect(() => {
    if (id) loadOwner(id);
  }, [id]);

  useEffect(() => {
    if (owner) {
      document.title = `${owner.name} | AAO Command Center`;
    }
    return () => { document.title = 'AAO Command Center'; };
  }, [owner]);

  // Location search for edit modal
  useEffect(() => {
    if (!showEditLocationPicker || editLocationSearch.trim().length < 2) {
      setEditLocationResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      const { data } = await supabase
        .from('locations')
        .select('id, name, address')
        .eq('archived', false)
        .ilike('name', `%${editLocationSearch.trim()}%`)
        .order('name')
        .limit(10);
      setEditLocationResults(data ?? []);
    }, 300);
    return () => clearTimeout(timeout);
  }, [editLocationSearch, showEditLocationPicker]);

  async function handleCreateLocation() {
    if (!newLocName.trim()) return;
    setCreatingLocation(true);
    const { data, error } = await supabase
      .from('locations')
      .insert({ name: newLocName.trim(), address: newLocAddress.trim() || null })
      .select('id, name')
      .single();
    setCreatingLocation(false);
    if (error) { setEditError(`Failed to create location: ${error.message}`); return; }
    setEditData((prev: any) => ({ ...prev, primary_location_id: data.id, primary_location_name: data.name }));
    setShowCreateLocation(false);
    setShowEditLocationPicker(false);
    setEditLocationSearch('');
    setNewLocName('');
    setNewLocAddress('');
  }

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
        .select('id, note, flagged, created_at, users:created_by(name)')
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
      note: n.note,
      flagged: n.flagged,
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
      nickname: owner.nickname ?? '',
      phone_primary: owner.phone_primary ?? '',
      phone_secondary: owner.phone_secondary ?? '',
      address: owner.address ?? '',
      notes: owner.notes ?? '',
      primary_location_id: owner.primary_location?.id ?? '',
      primary_location_name: owner.primary_location?.name ?? '',
      precise_lat: owner.precise_lat ?? '',
      precise_lng: owner.precise_lng ?? '',
    });
    setEditError('');
    setShowEditLocationPicker(false);
    setEditLocationSearch('');
    setEditing(true);
  }

  async function saveEdit() {
    if (!owner) return;
    setEditSaving(true);
    setEditError('');
    const { error } = await supabase.from('owners').update({
      name: editData.name || owner.name,
      nickname: editData.nickname || null,
      phone_primary: editData.phone_primary || null,
      phone_secondary: editData.phone_secondary || null,
      address: editData.address || null,
      notes: editData.notes || null,
      primary_location_id: editData.primary_location_id || null,
      precise_lat: editData.precise_lat ? Number(editData.precise_lat) : null,
      precise_lng: editData.precise_lng ? Number(editData.precise_lng) : null,
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
              <h1 className="text-xl md:text-2xl font-heading font-bold text-night">
                {owner.name}{owner.nickname && <span className="text-muted font-normal"> ({owner.nickname})</span>}
              </h1>
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

          <div className="flex items-center gap-2">
            <button onClick={openEdit} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary font-medium transition-all text-sm" aria-label="Edit person">
              <Edit3 className="w-4 h-4" strokeWidth={2} />
              <span>Edit</span>
            </button>
            {isAdmin && (
              <button
                onClick={() => { setShowDeleteConfirm(true); setDeleteText(''); setDeleteError(null); }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-ember/8 hover:bg-ember/15 text-ember font-medium transition-all text-sm"
                aria-label="Delete person"
              >
                <Trash2 className="w-4 h-4" strokeWidth={2} />
                <span>Delete</span>
              </button>
            )}
          </div>
        </div>

        {/* Contact info */}
        <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-night/5">
          {owner.phone_primary && (
            <div className="inline-flex items-center gap-1 bg-sand rounded-xl px-3 py-2">
              <a
                href={`tel:${owner.phone_primary.replace(/\D/g, '')}`}
                className="inline-flex items-center gap-1.5 text-sm text-primary font-medium hover:underline transition-colors"
              >
                <Phone className="w-3.5 h-3.5" strokeWidth={1.75} />
                {formatPhone(owner.phone_primary)}
              </a>
              <a
                href={`sms:${owner.phone_primary.replace(/\D/g, '')}`}
                className="p-1 ml-1 rounded-lg text-muted hover:text-primary hover:bg-primary/10 transition-colors"
                aria-label="Send text message"
              >
                <MessageSquare className="w-4 h-4" strokeWidth={1.75} />
              </a>
            </div>
          )}
          {owner.phone_secondary && (
            <div className="inline-flex items-center gap-1 bg-sand rounded-xl px-3 py-2">
              <a
                href={`tel:${owner.phone_secondary.replace(/\D/g, '')}`}
                className="inline-flex items-center gap-1.5 text-sm text-primary font-medium hover:underline transition-colors"
              >
                <Phone className="w-3.5 h-3.5" strokeWidth={1.75} />
                {formatPhone(owner.phone_secondary)}
              </a>
              <a
                href={`sms:${owner.phone_secondary.replace(/\D/g, '')}`}
                className="p-1 ml-1 rounded-lg text-muted hover:text-primary hover:bg-primary/10 transition-colors"
                aria-label="Send text message"
              >
                <MessageSquare className="w-4 h-4" strokeWidth={1.75} />
              </a>
            </div>
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
            <span className="text-sm text-muted">
              Pin location: {owner.precise_lat.toFixed(5)}, {owner.precise_lng.toFixed(5)}
            </span>
          </div>
        )}

        {/* Flags */}
        {flags.length > 0 && (
          <div className="mt-3">
            <FlagResolver
              flags={flags}
              tableName="owners"
              recordId={owner.id}
              onUpdate={() => id && loadOwner(id)}
              onEditField={() => openEdit()}
            />
          </div>
        )}
      </div>


      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true">
          <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[85vh] flex flex-col shadow-xl">
            <div className="p-5 space-y-4 overflow-y-auto">
              <h3 className="font-heading font-bold text-ember text-base">Permanently delete {owner.name}?</h3>

              {/* Animal transfer section */}
              {animals.length > 0 && (
                <div className="bg-sand/50 rounded-xl p-4 space-y-3">
                  <p className="text-sm font-medium text-night">This person has {animals.length} animal{animals.length !== 1 ? 's' : ''}. What should happen to them?</p>
                  <div className="space-y-2">
                    <button
                      onClick={() => setTransferTo('unlink')}
                      className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all border ${transferTo === 'unlink' ? 'border-primary bg-primary/8 text-night font-medium' : 'border-night/8 bg-white text-muted hover:border-night/20'}`}
                    >
                      Remove owner from animals (leave unlinked)
                    </button>
                    <div>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted" />
                        <input
                          type="text"
                          value={transferSearch}
                          onChange={async (e) => {
                            setTransferSearch(e.target.value);
                            if (e.target.value.length >= 2) {
                              const { data } = await supabase.from('owners').select('id, name').neq('id', owner.id).ilike('name', `%${e.target.value}%`).limit(5);
                              setTransferResults(data ?? []);
                            } else {
                              setTransferResults([]);
                            }
                          }}
                          placeholder="Search for another person to transfer to..."
                          className="w-full pl-9 pr-4 py-2.5 bg-white border border-night/8 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted/40"
                        />
                      </div>
                      {transferResults.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => { setTransferTo(p); setTransferSearch(p.name); setTransferResults([]); }}
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-primary/5 rounded-lg transition-colors ${transferTo && transferTo !== 'unlink' && (transferTo as any).id === p.id ? 'bg-primary/8 font-medium text-night' : 'text-muted'}`}
                        >
                          {p.name}
                        </button>
                      ))}
                      {transferTo && transferTo !== 'unlink' && (
                        <p className="text-xs text-primary mt-1 px-1">Animals will be transferred to {(transferTo as { name: string }).name}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <p className="text-sm text-muted">This action cannot be undone.</p>
              <div>
                <label className="block text-xs text-muted font-medium mb-1">Type DELETE to confirm</label>
                <input
                  type="text"
                  value={deleteText}
                  onChange={(e) => setDeleteText(e.target.value)}
                  placeholder="DELETE"
                  className="w-full px-3 py-2.5 bg-sand/50 border border-ember/20 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ember/30"
                />
              </div>
              {deleteError && (
                <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{deleteError}</p>
              )}
              <div className="flex gap-2">
                <button onClick={() => { setShowDeleteConfirm(false); setTransferTo(null); setTransferSearch(''); }} className="flex-1 py-2.5 text-sm font-medium text-muted bg-sand rounded-xl hover:bg-muted/15 transition-all">Cancel</button>
                <button
                  disabled={deleteText !== 'DELETE' || deleteProcessing || (animals.length > 0 && !transferTo)}
                  onClick={async () => {
                    setDeleteProcessing(true);
                    setDeleteError(null);
                    // Transfer or unlink animals first
                    if (animals.length > 0 && transferTo) {
                      const newOwnerId = transferTo === 'unlink' ? null : (transferTo as { id: string }).id;
                      const { error: transferErr } = await supabase.from('animals').update({ owner_id: newOwnerId }).eq('owner_id', owner.id);
                      if (transferErr) {
                        setDeleteProcessing(false);
                        setDeleteError(transferErr.message);
                        return;
                      }
                    }
                    const { error } = await supabase.from('owners').delete().eq('id', owner.id);
                    setDeleteProcessing(false);
                    if (error) {
                      console.error('Delete person error:', error);
                      setDeleteError(error.message);
                      return;
                    }
                    setShowDeleteConfirm(false);
                    navigate('/people');
                  }}
                  className="flex-1 py-2.5 text-sm font-semibold text-white bg-ember hover:bg-ember/90 rounded-xl transition-all disabled:opacity-30"
                >
                  {deleteProcessing ? 'Deleting...' : 'Delete Forever'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label="Edit person">
          <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[85vh] flex flex-col shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-night/5 shrink-0">
              <h2 className="font-heading font-bold text-night text-base">Edit Person</h2>
              <button onClick={() => setEditing(false)} className="p-2.5 rounded-lg text-muted hover:text-night hover:bg-sand transition-all" aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div>
                <label className="block text-sm text-muted font-medium mb-1">Name</label>
                <input type="text" value={editData.name} onChange={(e) => setEditData({ ...editData, name: e.target.value })} className="w-full px-3 py-2.5 bg-sand/50 border border-night/8 rounded-xl text-sm text-night focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="block text-sm text-muted font-medium mb-1">Nickname</label>
                <input type="text" value={editData.nickname} onChange={(e) => setEditData({ ...editData, nickname: e.target.value })} placeholder="e.g. Angie" className="w-full px-3 py-2.5 bg-sand/50 border border-night/8 rounded-xl text-sm text-night focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted/40" />
              </div>
              <div>
                <label className="block text-sm text-muted font-medium mb-1">Phone (primary)</label>
                <input type="tel" value={editData.phone_primary} onChange={(e) => setEditData({ ...editData, phone_primary: formatPhone(e.target.value) })} placeholder="(808) 555-1234" className={`w-full px-3 py-2.5 bg-sand/50 border rounded-xl text-sm text-night focus:outline-none focus:ring-2 focus:ring-primary/30 ${editData.phone_primary && !isValidPhone(editData.phone_primary) ? 'border-ember/40' : 'border-night/8'}`} />
                {editData.phone_primary && !isValidPhone(editData.phone_primary) && (
                  <p className="text-xs text-ember mt-1">Enter a 10-digit phone number</p>
                )}
              </div>
              <div>
                <label className="block text-sm text-muted font-medium mb-1">Phone (secondary)</label>
                <input type="tel" value={editData.phone_secondary} onChange={(e) => setEditData({ ...editData, phone_secondary: formatPhone(e.target.value) })} placeholder="(808) 555-1234" className={`w-full px-3 py-2.5 bg-sand/50 border rounded-xl text-sm text-night focus:outline-none focus:ring-2 focus:ring-primary/30 ${editData.phone_secondary && !isValidPhone(editData.phone_secondary) ? 'border-ember/40' : 'border-night/8'}`} />
                {editData.phone_secondary && !isValidPhone(editData.phone_secondary) && (
                  <p className="text-xs text-ember mt-1">Enter a 10-digit phone number</p>
                )}
              </div>
              <div>
                <label className="block text-sm text-muted font-medium mb-1">Address</label>
                <input type="text" value={editData.address} onChange={(e) => setEditData({ ...editData, address: e.target.value })} className="w-full px-3 py-2.5 bg-sand/50 border border-night/8 rounded-xl text-sm text-night focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="block text-sm text-muted font-medium mb-1">Notes</label>
                <textarea value={editData.notes} onChange={(e) => setEditData({ ...editData, notes: e.target.value })} rows={4} className="w-full px-3 py-2.5 bg-sand/50 border border-night/8 rounded-xl text-sm text-night focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-muted mb-1">Location</label>
                {!showEditLocationPicker ? (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 px-3 py-2.5 bg-sand/50 border border-night/8 rounded-xl text-sm text-night">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-muted shrink-0" />
                        <span className="truncate">{editData.primary_location_name || 'No location set'}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowEditLocationPicker(true)}
                      className="px-3 py-2.5 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/15 rounded-xl transition-colors whitespace-nowrap"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted" />
                      <input
                        type="text"
                        value={editLocationSearch}
                        onChange={(e) => setEditLocationSearch(e.target.value)}
                        placeholder="Search locations..."
                        className="w-full pl-9 pr-4 py-2.5 bg-white border border-night/8 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted/40"
                        autoFocus
                      />
                    </div>
                    {editLocationResults.map((loc) => (
                      <button
                        key={loc.id}
                        type="button"
                        onClick={() => {
                          setEditData({ ...editData, primary_location_id: loc.id, primary_location_name: loc.name });
                          setShowEditLocationPicker(false);
                          setShowCreateLocation(false);
                          setEditLocationSearch('');
                        }}
                        className="w-full flex items-center gap-2 p-2.5 rounded-xl border border-night/5 bg-white text-left text-sm hover:bg-sand/50 transition-colors"
                      >
                        <MapPin className="w-4 h-4 text-muted shrink-0" />
                        <div className="flex-1 min-w-0">
                          <span className="font-medium text-night block truncate">{loc.name}</span>
                          {loc.address && <span className="text-xs text-muted truncate block">{loc.address}</span>}
                        </div>
                      </button>
                    ))}
                    {!showCreateLocation ? (
                      <button
                        type="button"
                        onClick={() => { setShowCreateLocation(true); setNewLocName(editLocationSearch); }}
                        className="w-full flex items-center gap-2 p-2.5 rounded-xl border border-dashed border-primary/30 bg-primary/5 text-left text-sm hover:bg-primary/10 transition-colors text-primary font-medium"
                      >
                        <Plus className="w-4 h-4 shrink-0" />
                        Create new location
                      </button>
                    ) : (
                      <div className="p-3 rounded-xl border border-primary/20 bg-primary/5 space-y-2">
                        <p className="text-xs font-medium text-night">New Location</p>
                        <input
                          type="text"
                          value={newLocName}
                          onChange={(e) => setNewLocName(e.target.value)}
                          placeholder="Location name *"
                          className="w-full px-3 py-2 bg-white border border-night/8 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted/40"
                          autoFocus
                        />
                        <input
                          type="text"
                          value={newLocAddress}
                          onChange={(e) => setNewLocAddress(e.target.value)}
                          placeholder="Address (optional)"
                          className="w-full px-3 py-2 bg-white border border-night/8 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted/40"
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={handleCreateLocation}
                            disabled={!newLocName.trim() || creatingLocation}
                            className="flex-1 py-2 bg-primary text-white text-xs font-semibold rounded-lg disabled:opacity-30 transition-all flex items-center justify-center gap-1.5"
                          >
                            {creatingLocation ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                            {creatingLocation ? 'Creating...' : 'Create & Select'}
                          </button>
                          <button
                            type="button"
                            onClick={() => { setShowCreateLocation(false); setNewLocName(''); setNewLocAddress(''); }}
                            className="px-3 py-2 text-xs text-muted hover:text-night font-medium transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => { setShowEditLocationPicker(false); setShowCreateLocation(false); setEditLocationSearch(''); setNewLocName(''); setNewLocAddress(''); }}
                      className="w-full py-2 text-xs text-muted hover:text-night font-medium transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              {/* Precise pin location */}
              <div>
                <label className="block text-sm font-medium text-muted mb-1">Precise Pin Location</label>
                {editData.precise_lat && editData.precise_lng ? (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 px-3 py-2.5 bg-sand/50 border border-night/8 rounded-xl text-sm text-night">
                      <div className="flex items-center gap-1.5">
                        <Crosshair className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span>{Number(editData.precise_lat).toFixed(5)}, {Number(editData.precise_lng).toFixed(5)}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditData({ ...editData, precise_lat: '', precise_lng: '' })}
                      className="px-3 py-2.5 text-xs font-medium text-ember bg-ember/10 hover:bg-ember/15 rounded-xl transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    {navigator.geolocation && (
                      <div className="mb-2">
                        <button
                          type="button"
                          disabled={geoLoading}
                          onClick={() => {
                            setGeoLoading(true);
                            setGeoError('');
                            navigator.geolocation.getCurrentPosition(
                              (pos) => {
                                setEditData((prev: any) => ({
                                  ...prev,
                                  precise_lat: pos.coords.latitude.toFixed(6),
                                  precise_lng: pos.coords.longitude.toFixed(6),
                                }));
                                setGeoLoading(false);
                              },
                              () => {
                                setGeoError('Could not get location — check browser permissions');
                                setGeoLoading(false);
                              },
                              { enableHighAccuracy: true, timeout: 10000 }
                            );
                          }}
                          className="inline-flex items-center gap-1.5 bg-primary/10 text-primary rounded-xl px-3 py-2 text-sm font-medium hover:bg-primary/15 transition-colors disabled:opacity-50"
                        >
                          <Navigation className="w-3.5 h-3.5" strokeWidth={2} />
                          {geoLoading ? 'Getting location...' : 'Use My Location'}
                        </button>
                        {geoError && (
                          <p className="text-xs text-ember mt-1">{geoError}</p>
                        )}
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        step="any"
                        value={editData.precise_lat}
                        onChange={(e) => setEditData({ ...editData, precise_lat: e.target.value })}
                        placeholder="Latitude"
                        className="w-full px-3 py-2.5 bg-sand/50 border border-night/8 rounded-xl text-sm text-night focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted/40"
                      />
                      <input
                        type="number"
                        step="any"
                        value={editData.precise_lng}
                        onChange={(e) => setEditData({ ...editData, precise_lng: e.target.value })}
                        placeholder="Longitude"
                        className="w-full px-3 py-2.5 bg-sand/50 border border-night/8 rounded-xl text-sm text-night focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted/40"
                      />
                    </div>
                  </>
                )}
                <p className="text-xs text-muted mt-1">Tap 'Use My Location' while standing near the person to set their precise spot.</p>
              </div>
            </div>
            <div className="p-5 border-t border-night/5 shrink-0 space-y-2">
              {editError && (
                <div className="bg-ember/10 border border-ember/20 text-ember text-xs rounded-xl px-3 py-2" role="alert">{editError}</div>
              )}
              <button onClick={saveEdit} disabled={editSaving || !isValidPhone(editData.phone_primary || '') || !isValidPhone(editData.phone_secondary || '')} className="w-full py-3 bg-primary hover:bg-primary-hover text-white font-semibold text-sm rounded-xl shadow-[0_2px_8px_rgba(110,168,50,0.25)] disabled:opacity-30 transition-all flex items-center justify-center gap-2">
                {editSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {editSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-white rounded-xl border border-night/5 p-1 mb-4">
        {(['animals', 'map', 'details', 'notes'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all capitalize ${
              activeTab === tab ? 'bg-primary text-white shadow-sm' : 'text-muted hover:text-night'
            }`}
          >
            {tab === 'animals' ? `Animals (${animals.length})` : tab === 'notes' ? `Notes (${notes.length})` : tab === 'map' ? 'Map' : 'Details'}
          </button>
        ))}
      </div>

      <div className="page-enter">
        {activeTab === 'animals' && <AnimalsTab animals={animals} />}
        {activeTab === 'map' && (
          <OwnerLocationMap
            ownerId={owner.id}
            primaryLocationId={owner.primary_location?.id ?? null}
            preciseLat={owner.precise_lat}
            preciseLng={owner.precise_lng}
            animalIds={animals.map((a) => a.id)}
          />
        )}
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
              <span className="text-xs text-muted font-mono">{a.aao_id}</span>
              {a.urgent_medical && (
                <span className="text-xs font-bold text-ember bg-ember/10 px-1.5 py-0.5 rounded-full">Urgent</span>
              )}
              {a.deceased && (
                <span className="text-xs font-bold text-muted bg-night/8 px-1.5 py-0.5 rounded-full">Deceased</span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              {a.current_status && <StatusBadge status={a.current_status} />}
              {a.food_bag_size && (
                <span className="text-xs text-muted">{a.food_bag_size} bag</span>
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
            <MapIframe
              title="Person location"
              height={180}
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${owner.precise_lng - 0.005},${owner.precise_lat - 0.003},${owner.precise_lng + 0.005},${owner.precise_lat + 0.003}&layer=mapnik&marker=${owner.precise_lat},${owner.precise_lng}`}
            />
            <div className="flex items-center justify-between px-3 py-1.5 bg-sand/50">
              <span className="text-sm text-muted">
                {owner.precise_lat.toFixed(5)}, {owner.precise_lng.toFixed(5)}
              </span>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${owner.precise_lat},${owner.precise_lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                Directions <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        ) : (
          <div className="bg-sand rounded-xl h-48 flex items-center justify-center">
            <div className="text-center">
              <MapPin className="w-8 h-8 text-muted/20 mx-auto mb-1" />
              <p className="text-sm text-muted">No precise location set</p>
            </div>
          </div>
        )}
      </div>

      <div className="text-sm text-muted flex gap-4 pt-2">
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
            n.flagged ? 'border-gold/30 bg-gold/4' : 'border-night/5'
          }`}
        >
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="flex items-center gap-1.5">
              {n.flagged && <Flag className="w-3 h-3 text-gold" />}
              <span className="text-sm text-muted">{formatDate(n.created_at)}</span>
            </div>
            {n.created_by_name && (
              <span className="text-sm text-muted">{n.created_by_name}</span>
            )}
          </div>
          <p className="text-sm text-night leading-relaxed">{n.note}</p>
        </div>
      ))}
    </div>
  );
}
