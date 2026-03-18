import { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  PawPrint,
  Edit3,
  AlertTriangle,
  Scissors,
  MapPin,
  User,
  Phone,
  Calendar,
  Weight,
  Ruler,
  Tag,
  Heart,
  Stethoscope,
  StickyNote,
  Camera,
  Flag,
  ChevronDown,
  ChevronUp,
  X,
  Check,
  Loader2,
  Upload,
  Search,
  Plus,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatDate, daysSince } from '../lib/format';
import { useAuth } from '../contexts/AuthContext';
import {
  SITUATION_CONFIG,
  ANIMAL_TYPE_CONFIG,
  FIXED_STATUS_LABELS,
  SIZE_LABELS,
  HAVENT_SEEN_DAYS,
} from '../lib/constants';
import StatusBadge from '../components/shared/StatusBadge';
import DogTimeline from '../components/animals/DogTimeline';
import DogLocationMap from '../components/animals/DogLocationMap';
import FlagResolver from '../components/admin/FlagResolver';
import ArchiveActions from '../components/admin/ArchiveActions';

interface AnimalDetail {
  id: string;
  aao_id: string;
  animal_type: string;
  name: string | null;
  breed: string | null;
  color: string | null;
  sex: string;
  age_estimate: number | null;
  birthdate: string | null;
  weight_lbs: number | null;
  size_category: string;
  food_bag_size: string | null;
  microchip_primary: string | null;
  microchip_secondary: string | null;
  fixed_status: string;
  date_fixed: string | null;
  interested_in_fixing: string | null;
  urgent_medical: boolean;
  general_notes: string | null;
  medical_notes: string | null;
  deceased: boolean;
  deceased_date: string | null;
  deceased_notes: string | null;
  archived: boolean;
  created_at: string;
  updated_at: string;
  owner: { id: string; name: string; phone_primary: string | null } | null;
  primary_location: { id: string; name: string } | null;
  transfer_rescue: { name: string } | null;
}

interface Situation {
  id: string;
  status: string;
  is_active: boolean;
  started_at: string;
  ended_at: string | null;
  notes: string | null;
}

interface Photo {
  id: string;
  storage_path: string | null;
  is_profile: boolean;
  caption: string | null;
  taken_at: string | null;
}

interface FlagRecord {
  id: string;
  reason: string | null;
  resolved: boolean;
  resolved_at: string | null;
  resolution_note: string | null;
  created_at: string;
}

export default function AnimalProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const highlightId = searchParams.get('highlight');
  const { isAdmin, user } = useAuth();

  const [animal, setAnimal] = useState<AnimalDetail | null>(null);
  const [situations, setSituations] = useState<Situation[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [flags, setFlags] = useState<FlagRecord[]>([]);
  const [lastSeen, setLastSeen] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'timeline' | 'map' | 'details' | 'photos'>('timeline');
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null);
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [fosterPrompt, setFosterPrompt] = useState(false);
  const [fosterName, setFosterName] = useState('');
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<Record<string, any>>({});
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const quickPhotoRef = useRef<HTMLInputElement>(null);
  const [editLocationSearch, setEditLocationSearch] = useState('');
  const [editLocationResults, setEditLocationResults] = useState<{ id: string; name: string; address: string | null }[]>([]);
  const [showEditLocationPicker, setShowEditLocationPicker] = useState(false);
  const [showCreateLocation, setShowCreateLocation] = useState(false);
  const [newLocName, setNewLocName] = useState('');
  const [newLocAddress, setNewLocAddress] = useState('');
  const [creatingLocation, setCreatingLocation] = useState(false);

  useEffect(() => {
    if (id) loadAnimal(id);
  }, [id]);

  async function loadAnimal(animalId: string) {
    setLoading(true);

    const [animalRes, sitRes, photoRes, flagRes, lastSeenRes] = await Promise.all([
      supabase
        .from('animals')
        .select('*, owner:owners(id, name, phone_primary), primary_location:locations(id, name), transfer_rescue:transfer_rescues(name)')
        .eq('id', animalId)
        .single(),
      supabase
        .from('situations')
        .select('*')
        .eq('animal_id', animalId)
        .order('started_at', { ascending: false }),
      supabase
        .from('photos')
        .select('*')
        .eq('animal_id', animalId)
        .order('is_profile', { ascending: false })
        .order('created_at', { ascending: false }),
      supabase
        .from('flags')
        .select('*')
        .eq('table_name', 'animals')
        .eq('record_id', animalId)
        .order('created_at', { ascending: false }),
      supabase
        .from('care_events')
        .select('event_date')
        .eq('animal_id', animalId)
        .order('event_date', { ascending: false })
        .limit(1),
    ]);

    if (animalRes.data) setAnimal(animalRes.data as unknown as AnimalDetail);
    if (sitRes.data) setSituations(sitRes.data);
    if (photoRes.data) setPhotos(photoRes.data);
    if (flagRes.data) setFlags(flagRes.data);

    // Last seen = most recent of care_event date or photo upload date
    const careDate = lastSeenRes.data?.[0]?.event_date ?? null;
    const photoDate = photoRes.data?.length
      ? photoRes.data.reduce((latest: string | null, p: any) => {
          const d = p.taken_at ?? p.created_at;
          if (!d) return latest;
          return !latest || d > latest ? d : latest;
        }, null as string | null)
      : null;
    const bestDate = [careDate, photoDate].filter(Boolean).sort().pop() ?? null;
    setLastSeen(bestDate);

    setLoading(false);
  }

  function openEdit() {
    if (!animal) return;
    setEditData({
      name: animal.name ?? '',
      breed: animal.breed ?? '',
      color: animal.color ?? '',
      sex: animal.sex,
      age_estimate: animal.age_estimate ?? '',
      weight_lbs: animal.weight_lbs ?? '',
      size_category: animal.size_category,
      food_bag_size: animal.food_bag_size ?? '',
      microchip_primary: animal.microchip_primary ?? '',
      fixed_status: animal.fixed_status,
      urgent_medical: animal.urgent_medical,
      general_notes: animal.general_notes ?? '',
      medical_notes: animal.medical_notes ?? '',
      primary_location_id: animal.primary_location?.id ?? '',
      primary_location_name: animal.primary_location?.name ?? '',
    });
    setEditError('');
    setPhotoFile(null);
    setPhotoPreview(null);
    setShowEditLocationPicker(false);
    setEditLocationSearch('');
    setEditing(true);
  }

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

  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  async function uploadPhoto(animalId: string) {
    if (!photoFile) return;
    setUploadingPhoto(true);
    const ext = photoFile.name.split('.').pop() ?? 'jpg';
    const path = `animals/${animalId}/${Date.now()}.${ext}`;
    const { error: uploadErr } = await supabase.storage
      .from('photos')
      .upload(path, photoFile, { upsert: false });
    if (uploadErr) {
      setEditError(`Photo upload failed: ${uploadErr.message}`);
      setUploadingPhoto(false);
      return;
    }
    const { data: urlData } = supabase.storage.from('photos').getPublicUrl(path);
    await supabase.from('photos').insert({
      animal_id: animalId,
      storage_path: urlData.publicUrl,
      is_profile: photos.length === 0,
      created_by: user?.id,
    });
    setUploadingPhoto(false);
  }

  async function handleQuickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !animal) return;
    setUploadingPhoto(true);
    const ext = file.name.split('.').pop() ?? 'jpg';
    const path = `animals/${animal.id}/${Date.now()}.${ext}`;
    const { error: uploadErr } = await supabase.storage
      .from('photos')
      .upload(path, file, { upsert: false });
    if (uploadErr) {
      setUploadingPhoto(false);
      return;
    }
    const { data: urlData } = supabase.storage.from('photos').getPublicUrl(path);
    await supabase.from('photos').insert({
      animal_id: animal.id,
      storage_path: urlData.publicUrl,
      is_profile: photos.length === 0,
      created_by: user?.id,
    });
    setUploadingPhoto(false);
    // Reset input so same file can be re-selected
    e.target.value = '';
    // Reload to show new photo
    loadAnimal(animal.id);
  }

  async function saveEdit() {
    if (!animal) return;
    setEditSaving(true);
    setEditError('');

    // Upload photo if selected
    if (photoFile) {
      await uploadPhoto(animal.id);
      if (editError) { setEditSaving(false); return; }
    }

    const { error } = await supabase.from('animals').update({
      name: editData.name || null,
      breed: editData.breed || null,
      color: editData.color || null,
      sex: editData.sex,
      age_estimate: editData.age_estimate ? Number(editData.age_estimate) : null,
      weight_lbs: editData.weight_lbs ? Number(editData.weight_lbs) : null,
      size_category: editData.size_category,
      food_bag_size: editData.food_bag_size || null,
      microchip_primary: editData.microchip_primary || null,
      fixed_status: editData.fixed_status,
      urgent_medical: editData.urgent_medical,
      general_notes: editData.general_notes || null,
      medical_notes: editData.medical_notes || null,
      primary_location_id: editData.primary_location_id || null,
    }).eq('id', animal.id);
    setEditSaving(false);
    if (error) {
      setEditError(error.message);
      return;
    }
    setEditing(false);
    loadAnimal(animal.id);
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="skeleton h-48 w-full rounded-2xl mb-4" />
        <div className="skeleton h-6 w-48 mb-2" />
        <div className="skeleton h-4 w-32" />
      </div>
    );
  }

  if (!animal) {
    return (
      <div className="max-w-3xl mx-auto text-center py-16">
        <PawPrint className="w-12 h-12 text-muted/20 mx-auto mb-3" />
        <p className="text-muted">Animal not found</p>
        <Link to="/animals" className="text-primary text-sm font-medium mt-2 inline-block">
          Back to animals
        </Link>
      </div>
    );
  }

  const activeSituation = situations.find((s) => s.is_active);
  const typeConfig = ANIMAL_TYPE_CONFIG[animal.animal_type] ?? ANIMAL_TYPE_CONFIG.other;
  const lastSeenDays = daysSince(lastSeen);
  const haventSeen = lastSeenDays > HAVENT_SEEN_DAYS && lastSeenDays !== Infinity && !animal.deceased;
  const profilePhoto = photos.find((p) => p.is_profile);
  const unresolvedFlags = flags.filter((f) => !f.resolved);

  return (
    <div className="max-w-3xl mx-auto">
      {/* Back nav */}
      <button
        onClick={() => navigate('/animals')}
        className="flex items-center gap-1.5 text-sm text-muted hover:text-night mb-4 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Animals
      </button>

      {/* Hero section */}
      <div className="bg-white rounded-2xl border border-night/5 overflow-hidden mb-4">
        {/* Photo header */}
        <div className="relative h-48 md:h-56 bg-sand">
          {profilePhoto?.storage_path ? (
            <button
              onClick={() => setLightboxPhoto(profilePhoto.storage_path)}
              className="w-full h-full cursor-zoom-in"
            >
              <img
                src={profilePhoto.storage_path}
                alt={animal.name ?? 'Animal'}
                className="w-full h-full object-cover"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            </button>
          ) : null}
          {!profilePhoto?.storage_path && (
            <div className="w-full h-full flex items-center justify-center">
              <PawPrint className="w-16 h-16 text-muted/15" strokeWidth={1} />
            </div>
          )}

          {/* Badges overlay */}
          <div className="absolute top-3 left-3 flex gap-2">
            {animal.urgent_medical && (
              <span className="bg-ember text-white text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
                <AlertTriangle className="w-3.5 h-3.5" />
                Urgent Medical
              </span>
            )}
            {animal.deceased && (
              <span className="bg-night/70 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-sm">
                Deceased
              </span>
            )}
          </div>

          {haventSeen && (
            <span className="absolute bottom-3 left-3 bg-gold/90 text-night text-xs font-bold px-2.5 py-1 rounded-full shadow-sm">
              Not seen in {lastSeenDays} days
            </span>
          )}
        </div>

        {/* Animal header info */}
        <div className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <h1 className="text-xl md:text-2xl font-heading font-bold text-night">
                  {animal.name ?? 'Unnamed'}
                </h1>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${typeConfig.bg} ${typeConfig.text}`}>
                  {typeConfig.label}
                </span>
              </div>
              <p className="text-sm text-muted font-mono">{animal.aao_id}</p>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => quickPhotoRef.current?.click()}
                disabled={uploadingPhoto}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary font-medium transition-all text-sm"
                aria-label="Add photo"
              >
                {uploadingPhoto ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Camera className="w-4 h-4" strokeWidth={2} />
                )}
                <span>{uploadingPhoto ? 'Uploading...' : 'Add Photo'}</span>
              </button>
              <input
                ref={quickPhotoRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleQuickPhoto}
                className="hidden"
              />
              <button onClick={openEdit} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary font-medium transition-all text-sm" aria-label="Edit animal">
                <Edit3 className="w-4 h-4" strokeWidth={2} />
                <span>Edit</span>
              </button>
            </div>
          </div>

          {/* Key info */}
          <div className="flex flex-wrap items-center gap-2 mt-3">
            {/* Status — tappable to change */}
            <button
              onClick={() => setShowStatusPicker(true)}
              className="inline-flex items-center gap-1.5 text-xs bg-sand hover:bg-night/8 rounded-full px-2.5 py-1 transition-colors"
            >
              {activeSituation ? (
                <StatusBadge status={activeSituation.status} size="sm" />
              ) : (
                <span className="text-muted">Set status</span>
              )}
              <ChevronDown className="w-3 h-3 text-muted" />
            </button>

            {animal.owner && (
              <Link
                to={`/people/${animal.owner.id}`}
                className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-primary transition-colors bg-sand rounded-full px-2.5 py-1"
              >
                <User className="w-3 h-3" />
                {animal.owner.name}
              </Link>
            )}
            {animal.primary_location && (
              <Link
                to={`/locations/${animal.primary_location.id}`}
                className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-primary transition-colors bg-sand rounded-full px-2.5 py-1"
              >
                <MapPin className="w-3 h-3" />
                {animal.primary_location.name}
              </Link>
            )}
            {lastSeen && (
              <span className="inline-flex items-center gap-1.5 text-xs text-muted bg-sand rounded-full px-2.5 py-1">
                <Calendar className="w-3 h-3" />
                Last seen {formatDate(lastSeen)}
              </span>
            )}
          </div>

          {/* Quick toggles */}
          <div className="flex flex-wrap gap-2 mt-3">
            <button
              onClick={async () => {
                const newVal = !animal.urgent_medical;
                await supabase.from('animals').update({ urgent_medical: newVal }).eq('id', animal.id);
                if (id) loadAnimal(id);
              }}
              className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${
                animal.urgent_medical
                  ? 'bg-ember/10 border-ember/30 text-ember'
                  : 'bg-white border-night/10 text-muted hover:border-ember/30 hover:text-ember'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Urgent Medical
              {animal.urgent_medical ? ' ON' : ''}
            </button>
            <button
              onClick={async () => {
                const newVal = animal.interested_in_fixing === 'interested' ? null : 'interested';
                await supabase.from('animals').update({ interested_in_fixing: newVal }).eq('id', animal.id);
                if (id) loadAnimal(id);
              }}
              className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${
                animal.interested_in_fixing === 'interested'
                  ? 'bg-primary/10 border-primary/30 text-primary'
                  : 'bg-white border-night/10 text-muted hover:border-primary/30 hover:text-primary'
              }`}
            >
              <Scissors className="w-3.5 h-3.5" />
              Ready for S/N
              {animal.interested_in_fixing === 'interested' ? ' ON' : ''}
            </button>
          </div>

        </div>
      </div>

      {/* Archive actions (admin only) */}
      <ArchiveActions
        tableName="animals"
        recordId={animal.id}
        isArchived={animal.archived}
        recordLabel={animal.name ?? animal.aao_id}
        onUpdate={() => navigate('/animals')}
      />

      {/* Tab navigation */}
      <div className="flex gap-1 bg-white rounded-xl border border-night/5 p-1 mb-4">
        {(['timeline', 'map', 'details', 'photos'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all capitalize ${
              activeTab === tab
                ? 'bg-primary text-white shadow-sm'
                : 'text-muted hover:text-night'
            }`}
          >
            {tab === 'photos' ? `Photos (${photos.length})` : tab === 'timeline' ? 'Timeline' : tab === 'map' ? 'Map' : 'Details'}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="page-enter">
        {activeTab === 'timeline' && (
          <>
          {/* Flags — above activity feed */}
          {flags.length > 0 && (
            <div className="mb-4">
              <FlagResolver
                flags={flags}
                tableName="animals"
                recordId={animal.id}
                onUpdate={() => id && loadAnimal(id)}
                onEditField={(field) => {
                  openEdit();
                }}
              />
            </div>
          )}

          <div className="bg-white rounded-2xl border border-night/5 p-5">
            <h2 className="font-heading font-bold text-night mb-4">Dog Timeline</h2>
            <DogTimeline animalId={animal.id} highlightId={highlightId} />
          </div>
          </>
        )}

        {activeTab === 'map' && (
          <DogLocationMap
            animalId={animal.id}
            primaryLocationId={animal.primary_location?.id ?? null}
            ownerId={animal.owner?.id ?? null}
          />
        )}

        {activeTab === 'details' && (
          <DetailsTab animal={animal} situations={situations} />
        )}

        {activeTab === 'photos' && (
          <PhotosTab photos={photos} onPhotoClick={setLightboxPhoto} />
        )}
      </div>

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label="Edit animal">
          <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[85vh] flex flex-col shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-night/5 shrink-0">
              <h2 className="font-heading font-bold text-night text-base">Edit Animal</h2>
              <button onClick={() => setEditing(false)} className="p-2.5 rounded-lg text-muted hover:text-night hover:bg-sand transition-all" aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <EditField label="Name" value={editData.name} onChange={(v) => setEditData({ ...editData, name: v })} />
              <EditField label="Breed" value={editData.breed} onChange={(v) => setEditData({ ...editData, breed: v })} />
              <EditField label="Color" value={editData.color} onChange={(v) => setEditData({ ...editData, color: v })} />
              <div className="grid grid-cols-2 gap-3">
                <EditSelect label="Sex" value={editData.sex} onChange={(v) => setEditData({ ...editData, sex: v })} options={[['male', 'Male'], ['female', 'Female'], ['unknown', 'Unknown']]} />
                <EditSelect label="Size" value={editData.size_category} onChange={(v) => setEditData({ ...editData, size_category: v })} options={[['small', 'Small'], ['medium', 'Medium'], ['large', 'Large'], ['xlarge', 'XL'], ['unknown', 'Unknown']]} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <EditField label="Age estimate (years)" value={editData.age_estimate} onChange={(v) => setEditData({ ...editData, age_estimate: v })} type="number" />
                <EditField label="Weight (lbs)" value={editData.weight_lbs} onChange={(v) => setEditData({ ...editData, weight_lbs: v })} type="number" />
              </div>
              <EditField label="Food bag size" value={editData.food_bag_size} onChange={(v) => setEditData({ ...editData, food_bag_size: v })} placeholder="e.g. 6lb, 15lb" />
              <EditField label="Microchip #" value={editData.microchip_primary} onChange={(v) => setEditData({ ...editData, microchip_primary: v })} />
              <EditSelect label="Fixed status" value={editData.fixed_status} onChange={(v) => setEditData({ ...editData, fixed_status: v })} options={[['fixed', 'Fixed'], ['not_fixed', 'Not Fixed'], ['unknown', 'Unknown']]} />
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={editData.urgent_medical} onChange={(e) => setEditData({ ...editData, urgent_medical: e.target.checked })} className="w-4 h-4 rounded border-night/20 text-ember focus:ring-ember/30" />
                <span className="text-sm text-night font-medium">Urgent medical</span>
              </label>
              <EditField label="General notes" value={editData.general_notes} onChange={(v) => setEditData({ ...editData, general_notes: v })} multiline />
              <EditField label="Medical notes" value={editData.medical_notes} onChange={(v) => setEditData({ ...editData, medical_notes: v })} multiline />

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

              {/* Photo upload */}
              <div>
                <label className="block text-sm font-medium text-muted mb-1">Add Photo</label>
                {photoPreview ? (
                  <div className="relative">
                    <img src={photoPreview} alt="Preview" className="w-full h-40 object-cover rounded-xl" />
                    <button
                      type="button"
                      onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
                      className="absolute top-2 right-2 p-1 bg-night/60 hover:bg-night/80 text-white rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center justify-center gap-2 w-full py-4 border-2 border-dashed border-night/15 rounded-xl text-sm text-muted hover:border-primary/30 hover:text-primary cursor-pointer transition-colors">
                    <Upload className="w-4 h-4" />
                    <span>Choose a photo</span>
                    <input type="file" accept="image/*" onChange={handlePhotoSelect} className="hidden" />
                  </label>
                )}
              </div>
            </div>
            <div className="p-5 border-t border-night/5 shrink-0 space-y-2">
              {editError && (
                <div className="bg-ember/10 border border-ember/20 text-ember text-xs rounded-xl px-3 py-2" role="alert">{editError}</div>
              )}
              <button onClick={saveEdit} disabled={editSaving} className="w-full py-3 bg-primary hover:bg-primary-hover text-white font-semibold text-sm rounded-xl shadow-[0_2px_8px_rgba(110,168,50,0.25)] disabled:opacity-30 transition-all flex items-center justify-center gap-2">
                {editSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {editSaving ? (uploadingPhoto ? 'Uploading photo...' : 'Saving...') : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Photo lightbox */}
      {/* Status picker modal */}
      {showStatusPicker && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label="Change status">
          <div className="bg-white w-full sm:max-w-sm sm:rounded-2xl rounded-t-2xl shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-night/5">
              <h2 className="font-heading font-bold text-night text-base">Change Status</h2>
              <button onClick={() => { setShowStatusPicker(false); setFosterPrompt(false); setFosterName(''); }} className="p-2.5 rounded-lg text-muted hover:text-night hover:bg-sand transition-all" aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="py-2 max-h-[60vh] overflow-y-auto">
              {fosterPrompt ? (
                <div className="px-5 py-3">
                  <p className="text-sm font-medium text-night mb-2">Who is fostering this animal?</p>
                  <div className="space-y-1.5 mb-3">
                    {['FAF', 'K9 Kokua', 'Poi Dogs', 'HHS', 'Paws'].map((org) => (
                      <button
                        key={org}
                        onClick={() => setFosterName(org)}
                        className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                          fosterName === org ? 'bg-primary/10 text-primary ring-2 ring-primary/30' : 'bg-sand/60 text-night hover:bg-sand'
                        }`}
                      >
                        {org}
                      </button>
                    ))}
                    <button
                      onClick={() => setFosterName(fosterName && !['FAF', 'K9 Kokua', 'Poi Dogs', 'HHS', 'Paws'].includes(fosterName) ? fosterName : '')}
                      className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                        fosterName && !['FAF', 'K9 Kokua', 'Poi Dogs', 'HHS', 'Paws'].includes(fosterName) ? 'bg-primary/10 text-primary ring-2 ring-primary/30' : 'bg-sand/60 text-night hover:bg-sand'
                      }`}
                    >
                      Other
                    </button>
                    {fosterName !== '' && !['FAF', 'K9 Kokua', 'Poi Dogs', 'HHS', 'Paws'].includes(fosterName) && (
                      <input
                        type="text"
                        value={fosterName}
                        onChange={(e) => setFosterName(e.target.value)}
                        placeholder="Enter name"
                        className="w-full border border-night/10 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none mt-1"
                        autoFocus
                      />
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setFosterPrompt(false); setFosterName(''); }}
                      className="flex-1 py-2.5 bg-sand text-night text-sm font-medium rounded-xl hover:bg-night/8 transition-all"
                    >
                      Back
                    </button>
                    <button
                      onClick={async () => {
                        if (!fosterName.trim()) return;
                        if (activeSituation) {
                          await supabase.from('situations').update({ is_active: false, ended_at: new Date().toISOString() }).eq('id', activeSituation.id);
                        }
                        await supabase.from('situations').insert({
                          animal_id: animal.id,
                          status: 'in_foster',
                          is_active: true,
                          started_at: new Date().toISOString(),
                          notes: `Foster: ${fosterName.trim()}`,
                        });
                        setShowStatusPicker(false);
                        setFosterPrompt(false);
                        setFosterName('');
                        if (id) loadAnimal(id);
                      }}
                      disabled={!fosterName.trim()}
                      className="flex-1 py-2.5 bg-primary hover:bg-primary-hover text-white text-sm font-semibold rounded-xl transition-all disabled:opacity-50"
                    >
                      Confirm
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {Object.entries(SITUATION_CONFIG).map(([key, cfg]) => (
                    <button
                      key={key}
                      onClick={async () => {
                        if (activeSituation?.status === key) {
                          setShowStatusPicker(false);
                          return;
                        }
                        if (key === 'in_foster') {
                          setFosterPrompt(true);
                          return;
                        }
                        if (activeSituation) {
                          await supabase.from('situations').update({ is_active: false, ended_at: new Date().toISOString() }).eq('id', activeSituation.id);
                        }
                        await supabase.from('situations').insert({
                          animal_id: animal.id,
                          status: key,
                          is_active: true,
                          started_at: new Date().toISOString(),
                        });
                        setShowStatusPicker(false);
                        if (id) loadAnimal(id);
                      }}
                      className={`w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-sand/60 transition-colors ${
                        activeSituation?.status === key ? 'bg-sand/40' : ''
                      }`}
                    >
                      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${cfg.dot}`} />
                      <span className="text-sm font-medium text-night flex-1">{cfg.label}</span>
                      {activeSituation?.status === key && <Check className="w-4 h-4 text-primary shrink-0" />}
                    </button>
                  ))}
                  {activeSituation && (
                    <>
                      <div className="border-t border-night/5 my-1" />
                      <button
                        onClick={async () => {
                          await supabase.from('situations').update({ is_active: false, ended_at: new Date().toISOString() }).eq('id', activeSituation.id);
                          setShowStatusPicker(false);
                          if (id) loadAnimal(id);
                        }}
                        className="w-full flex items-center gap-3 px-5 py-3 text-left text-muted hover:bg-sand/60 transition-colors"
                      >
                        <X className="w-3.5 h-3.5 shrink-0" />
                        <span className="text-sm font-medium">Clear status</span>
                      </button>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {lightboxPhoto && (
        <div
          className="fixed inset-0 bg-night/90 z-50 flex items-center justify-center p-4"
          onClick={() => setLightboxPhoto(null)}
        >
          <button className="absolute top-4 right-4 text-white/60 hover:text-white">
            <X className="w-6 h-6" />
          </button>
          <img
            src={lightboxPhoto}
            alt="Full size"
            className="max-w-full max-h-full rounded-lg object-contain"
          />
        </div>
      )}
    </div>
  );
}

function DetailsTab({ animal, situations }: { animal: AnimalDetail; situations: Situation[] }) {
  const [showHistory, setShowHistory] = useState(false);

  return (
    <div className="space-y-4">
      {/* Basic info */}
      <DetailSection title="About">
        <DetailRow icon={Tag} label="Breed" value={animal.breed} />
        <DetailRow icon={Tag} label="Color" value={animal.color} />
        <DetailRow icon={User} label="Sex" value={animal.sex === 'unknown' ? 'Unknown' : animal.sex === 'male' ? 'Male' : 'Female'} />
        <DetailRow icon={Ruler} label="Size" value={SIZE_LABELS[animal.size_category]} />
        <DetailRow icon={Weight} label="Weight" value={animal.weight_lbs ? `${animal.weight_lbs} lbs` : null} />
        <DetailRow icon={Calendar} label="Age estimate" value={animal.age_estimate ? `~${animal.age_estimate} years` : null} />
        <DetailRow icon={Calendar} label="Birthdate" value={animal.birthdate ? formatDate(animal.birthdate) : null} />
      </DetailSection>

      {/* Medical */}
      <DetailSection title="Medical">
        <DetailRow icon={Heart} label="Fixed status" value={FIXED_STATUS_LABELS[animal.fixed_status]} />
        {animal.date_fixed && <DetailRow icon={Scissors} label="Date fixed" value={formatDate(animal.date_fixed)} />}
        {animal.interested_in_fixing && (
          <DetailRow label="Interested in fixing" value={animal.interested_in_fixing.replace(/_/g, ' ')} />
        )}
        <DetailRow icon={Tag} label="Microchip" value={animal.microchip_primary} />
        {animal.microchip_secondary && <DetailRow label="Secondary ID" value={animal.microchip_secondary} />}
        {animal.medical_notes && <DetailRow icon={Stethoscope} label="Medical notes" value={animal.medical_notes} />}
      </DetailSection>

      {/* Notes */}
      {animal.general_notes && (
        <DetailSection title="Notes">
          <p className="text-sm text-night leading-relaxed">{animal.general_notes}</p>
        </DetailSection>
      )}

      {/* Owner + Location */}
      <DetailSection title="Connections">
        {animal.owner && (
          <div className="flex items-center gap-3 py-2">
            <div className="w-8 h-8 rounded-full bg-gold/15 flex items-center justify-center">
              <User className="w-4 h-4 text-night" strokeWidth={1.5} />
            </div>
            <div>
              <Link to={`/people/${animal.owner.id}`} className="text-sm font-medium text-night hover:text-primary transition-colors">
                {animal.owner.name}
              </Link>
              {animal.owner.phone_primary && (
                <p className="text-sm text-muted flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  {animal.owner.phone_primary}
                </p>
              )}
            </div>
          </div>
        )}
        {animal.primary_location && (
          <div className="flex items-center gap-3 py-2">
            <div className="w-8 h-8 rounded-full bg-ember/10 flex items-center justify-center">
              <MapPin className="w-4 h-4 text-ember" strokeWidth={1.5} />
            </div>
            <Link to={`/locations/${animal.primary_location.id}`} className="text-sm font-medium text-night hover:text-primary transition-colors">
              {animal.primary_location.name}
            </Link>
          </div>
        )}
        {animal.transfer_rescue && (
          <DetailRow label="Transfer rescue" value={animal.transfer_rescue.name} />
        )}
      </DetailSection>

      {/* Deceased info */}
      {animal.deceased && (
        <DetailSection title="Deceased">
          <DetailRow label="Date" value={animal.deceased_date ? formatDate(animal.deceased_date) : 'Unknown'} />
          {animal.deceased_notes && <DetailRow label="Notes" value={animal.deceased_notes} />}
        </DetailSection>
      )}

      {/* Situation history */}
      <DetailSection title="Situation History">
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="flex items-center gap-1 text-sm text-primary font-medium mb-2"
        >
          {showHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          {situations.length} situation record{situations.length !== 1 ? 's' : ''}
        </button>
        {showHistory && (
          <div className="space-y-2">
            {situations.map((s) => (
              <div
                key={s.id}
                className={`p-3 rounded-xl border ${s.is_active ? 'border-primary/20 bg-primary/4' : 'border-night/5 bg-sand/40'}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <StatusBadge status={s.status} />
                  {s.is_active && (
                    <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                      Current
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted">
                  {formatDate(s.started_at)}
                  {s.ended_at ? ` to ${formatDate(s.ended_at)}` : ' to present'}
                </p>
                {s.notes && <p className="text-sm text-muted mt-1">{s.notes}</p>}
              </div>
            ))}
          </div>
        )}
      </DetailSection>

      {/* Meta */}
      <div className="text-sm text-muted flex gap-4 pt-2">
        <span>Created {formatDate(animal.created_at)}</span>
        <span>Updated {formatDate(animal.updated_at)}</span>
      </div>
    </div>
  );
}

function PhotosTab({
  photos,
  onPhotoClick,
}: {
  photos: Photo[];
  onPhotoClick: (url: string) => void;
}) {
  if (photos.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-night/5 p-12 text-center">
        <Camera className="w-8 h-8 text-muted/20 mx-auto mb-2" />
        <p className="text-sm text-muted">No photos yet</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
      {photos.map((p) => (
        <button
          key={p.id}
          onClick={() => p.storage_path && onPhotoClick(p.storage_path)}
          className="relative aspect-square bg-sand rounded-xl overflow-hidden group"
        >
          {p.storage_path ? (
            <img
              src={p.storage_path}
              alt={p.caption ?? 'Photo'}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }}
            />
          ) : null}
          <div className={`w-full h-full flex items-center justify-center ${p.storage_path ? 'hidden' : ''}`}>
            <Camera className="w-8 h-8 text-muted/20" />
          </div>
          {p.is_profile && (
            <span className="absolute top-2 left-2 bg-white/80 text-xs font-semibold text-night px-1.5 py-0.5 rounded-md">
              Profile
            </span>
          )}
          {p.caption && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-night/60 to-transparent p-2 pt-6">
              <p className="text-xs text-white truncate">{p.caption}</p>
            </div>
          )}
        </button>
      ))}
    </div>
  );
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-night/5 p-5">
      <h3 className="font-heading font-bold text-night text-sm mb-3">{title}</h3>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon?: any;
  label: string;
  value: string | null | undefined;
}) {
  if (!value) return null;

  return (
    <div className="flex items-start gap-2 py-1.5">
      {Icon && <Icon className="w-3.5 h-3.5 text-muted mt-0.5 shrink-0" strokeWidth={1.5} />}
      <span className="text-sm text-muted min-w-[80px] shrink-0">{label}</span>
      <span className="text-sm text-night">{value}</span>
    </div>
  );
}

function EditField({ label, value, onChange, type = 'text', placeholder, multiline }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string; multiline?: boolean;
}) {
  const cls = 'w-full px-3 py-2.5 bg-sand/50 border border-night/8 rounded-xl text-sm text-night focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted/40';
  return (
    <div>
      <label className="block text-sm text-muted font-medium mb-1">{label}</label>
      {multiline ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3} className={`${cls} resize-none`} placeholder={placeholder} />
      ) : (
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className={cls} placeholder={placeholder} />
      )}
    </div>
  );
}

function EditSelect({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: string[][];
}) {
  return (
    <div>
      <label className="block text-sm text-muted font-medium mb-1">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full px-3 py-2.5 bg-sand/50 border border-night/8 rounded-xl text-sm text-night focus:outline-none focus:ring-2 focus:ring-primary/30">
        {options.map(([val, lbl]) => (
          <option key={val} value={val}>{lbl}</option>
        ))}
      </select>
    </div>
  );
}
