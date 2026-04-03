import { useEffect, useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  MapPin,
  Edit3,
  PawPrint,
  Users,
  Calendar,
  Navigation,
  Flag,
  StickyNote,
  CalendarHeart,
  ExternalLink,
  Check,
  X,
  Loader2,
  Search,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatDate, formatRelative, looksLikeCoordinates } from '../lib/format';
import { LOCATION_STATUS_CONFIG } from '../lib/constants';
import { useAuth } from '../contexts/AuthContext';
import StatusBadge from '../components/shared/StatusBadge';
import FlagResolver from '../components/admin/FlagResolver';
import Pagination from '../components/shared/Pagination';
import MapIframe from '../components/shared/MapIframe';

interface LocationDetail {
  id: string;
  name: string;
  alternate_name: string | null;
  address: string | null;
  precise_location: string | null;
  latitude: number | null;
  longitude: number | null;
  status: string;
  notes: string | null;
  date_added: string;
  created_at: string;
  updated_at: string;
  archived: boolean;
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

interface LinkedOwner {
  id: string;
  name: string;
  phone_primary: string | null;
  animal_count: number;
}

interface OutreachEvent {
  id: string;
  event_date: string;
  event_type: string;
  notes: string | null;
  volunteer_count: number;
}

interface LocNote {
  id: string;
  note: string;
  flagged: boolean;
  created_at: string;
  created_by_name: string | null;
}

export default function LocationProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const [location, setLocation] = useState<LocationDetail | null>(null);
  const [animals, setAnimals] = useState<LinkedAnimal[]>([]);
  const [owners, setOwners] = useState<LinkedOwner[]>([]);
  const [events, setEvents] = useState<OutreachEvent[]>([]);
  const [notes, setNotes] = useState<LocNote[]>([]);
  const [flags, setFlags] = useState<{ id: string; reason: string | null; resolved: boolean }[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'animals' | 'people' | 'outreach' | 'notes'>('animals');
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<Record<string, any>>({});
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState('');

  useEffect(() => {
    if (id) loadLocation(id);
  }, [id]);

  useEffect(() => {
    if (location) {
      document.title = `${location.name} | AAO Command Center`;
    }
    return () => { document.title = 'AAO Command Center'; };
  }, [location]);

  async function loadLocation(locId: string) {
    setLoading(true);

    const [locRes, animalRes, sitRes, ownerRes, animalByOwnerRes, eventRes, volRes, noteRes, flagRes] = await Promise.all([
      supabase.from('locations').select('*').eq('id', locId).single(),
      supabase.from('animals').select('id, aao_id, name, animal_type, food_bag_size, urgent_medical, deceased').eq('primary_location_id', locId).eq('archived', false).order('name'),
      supabase.from('situations').select('animal_id, status').eq('is_active', true),
      supabase.from('owners').select('id, name, phone_primary').eq('primary_location_id', locId).eq('archived', false).order('name'),
      supabase.from('animals').select('owner_id').eq('archived', false).not('owner_id', 'is', null),
      supabase.from('outreach_events').select('id, event_date, event_type, notes').eq('location_id', locId).order('event_date', { ascending: false }),
      supabase.from('outreach_event_volunteers').select('outreach_event_id'),
      supabase.from('field_notes').select('id, note, flagged, created_at, users:created_by(name)').eq('location_id', locId).order('created_at', { ascending: false }),
      supabase.from('flags').select('id, reason, resolved').eq('table_name', 'locations').eq('record_id', locId),
    ]);

    if (locRes.data) setLocation(locRes.data as LocationDetail);

    // Map situations
    const sitMap: Record<string, string> = {};
    (sitRes.data ?? []).forEach((s: any) => { sitMap[s.animal_id] = s.status; });

    setAnimals((animalRes.data ?? []).map((a: any) => ({ ...a, current_status: sitMap[a.id] ?? null })));

    // Count animals per owner for display
    const ownerAnimalCounts: Record<string, number> = {};
    (animalByOwnerRes.data ?? []).forEach((a: any) => {
      if (a.owner_id) ownerAnimalCounts[a.owner_id] = (ownerAnimalCounts[a.owner_id] ?? 0) + 1;
    });
    setOwners((ownerRes.data ?? []).map((o: any) => ({ ...o, animal_count: ownerAnimalCounts[o.id] ?? 0 })));

    // Count volunteers per event
    const volCounts: Record<string, number> = {};
    (volRes.data ?? []).forEach((v: any) => {
      volCounts[v.outreach_event_id] = (volCounts[v.outreach_event_id] ?? 0) + 1;
    });
    setEvents((eventRes.data ?? []).map((e: any) => ({ ...e, volunteer_count: volCounts[e.id] ?? 0 })));

    setNotes((noteRes.data ?? []).map((n: any) => ({
      id: n.id, note: n.note, flagged: n.flagged, created_at: n.created_at,
      created_by_name: n.users?.name ?? null,
    })));

    if (flagRes.data) setFlags(flagRes.data);
    setLoading(false);
  }

  function openEdit() {
    if (!location) return;
    setEditData({
      name: location.name,
      address: location.address ?? '',
      status: location.status,
      notes: location.notes ?? '',
      latitude: location.latitude ?? '',
      longitude: location.longitude ?? '',
    });
    setGeoError('');
    setEditError('');
    setEditing(true);
  }

  async function saveEdit() {
    if (!location) return;
    setEditSaving(true);
    setEditError('');
    const { error } = await supabase.from('locations').update({
      name: editData.name || location.name,
      address: editData.address || null,
      status: editData.status,
      notes: editData.notes || null,
      latitude: editData.latitude ? Number(editData.latitude) : null,
      longitude: editData.longitude ? Number(editData.longitude) : null,
    }).eq('id', location.id);
    setEditSaving(false);
    if (error) { setEditError(error.message); return; }
    setEditing(false);
    loadLocation(location.id);
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="skeleton h-6 w-20 mb-4" />
        <div className="bg-white rounded-2xl border border-night/5 p-6">
          <div className="flex gap-4">
            <div className="skeleton w-14 h-14 rounded-xl" />
            <div className="space-y-2 flex-1">
              <div className="skeleton h-6 w-48" />
              <div className="skeleton h-4 w-32" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!location) {
    return (
      <div className="max-w-3xl mx-auto text-center py-16">
        <MapPin className="w-12 h-12 text-muted/20 mx-auto mb-3" />
        <p className="text-muted">Location not found</p>
        <Link to="/locations" className="text-primary text-sm font-medium mt-2 inline-block">Back to locations</Link>
      </div>
    );
  }

  const statusConfig = LOCATION_STATUS_CONFIG[location.status] ?? LOCATION_STATUS_CONFIG.unknown;
  const unresolvedFlags = flags.filter((f) => !f.resolved);

  return (
    <div className="max-w-3xl mx-auto">
      <button onClick={() => navigate('/locations')} className="flex items-center gap-1.5 text-sm text-muted hover:text-night mb-4 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Locations
      </button>

      {/* Header card */}
      <div className="bg-white rounded-2xl border border-night/5 p-5 mb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-ember/10 flex items-center justify-center shrink-0">
              <MapPin className="w-7 h-7 text-ember" strokeWidth={1.5} />
            </div>
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <h1 className="text-xl md:text-2xl font-heading font-bold text-night">{location.name}</h1>
                <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full ${statusConfig.bg} ${statusConfig.text}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot}`} />
                  {statusConfig.label}
                </span>
              </div>
              {location.alternate_name && <p className="text-sm text-muted">Also known as: {location.alternate_name}</p>}
              {location.address && !looksLikeCoordinates(location.address) && <p className="text-sm text-muted">{location.address}</p>}
              {location.precise_location && !looksLikeCoordinates(location.precise_location) && <p className="text-sm text-muted/70 mt-0.5">{location.precise_location}</p>}
            </div>
          </div>
          <button onClick={openEdit} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary font-medium transition-all text-sm" aria-label="Edit location">
            <Edit3 className="w-4 h-4" strokeWidth={2} />
            <span>Edit</span>
          </button>
        </div>

        {/* Stats */}
        <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-night/5">
          <span className="inline-flex items-center gap-1.5 text-xs text-primary font-medium bg-primary/8 rounded-full px-2.5 py-1">
            <PawPrint className="w-3 h-3" />
            {animals.length} animal{animals.length !== 1 ? 's' : ''}
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs text-night font-medium bg-gold/12 rounded-full px-2.5 py-1">
            <Users className="w-3 h-3" />
            {owners.length} {owners.length === 1 ? 'person' : 'people'}
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs text-muted bg-sand rounded-full px-2.5 py-1">
            <CalendarHeart className="w-3 h-3" />
            {events.length} outreach event{events.length !== 1 ? 's' : ''}
          </span>
          {location.latitude && location.longitude && (
            <span className="inline-flex items-center gap-1 text-xs text-muted">
              <Navigation className="w-3 h-3" />
              {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
            </span>
          )}
        </div>

        {/* GPS map */}
        {location.latitude && location.longitude && (
          <div className="mt-3 rounded-xl overflow-hidden border border-night/5">
            <MapIframe
              title="Location map"
              height={150}
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${location.longitude - 0.005},${location.latitude - 0.003},${location.longitude + 0.005},${location.latitude + 0.003}&layer=mapnik&marker=${location.latitude},${location.longitude}`}
            />
            <div className="flex items-center justify-end px-3 py-1.5 bg-sand/50">
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                Directions <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        )}

        {/* Flags */}
        {flags.length > 0 && (
          <div className="mt-3">
            <FlagResolver
              flags={flags}
              tableName="locations"
              recordId={location.id}
              onUpdate={() => id && loadLocation(id)}
            />
          </div>
        )}
      </div>


      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label="Edit location">
          <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[85vh] flex flex-col shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-night/5 shrink-0">
              <h2 className="font-heading font-bold text-night text-base">Edit Location</h2>
              <button onClick={() => setEditing(false)} className="p-2.5 rounded-lg text-muted hover:text-night hover:bg-sand transition-all" aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div>
                <label className="block text-xs text-muted font-medium mb-1">Name</label>
                <input type="text" value={editData.name} onChange={(e) => setEditData({ ...editData, name: e.target.value })} className="w-full px-3 py-2.5 bg-sand/50 border border-night/8 rounded-xl text-sm text-night focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="block text-xs text-muted font-medium mb-1">Address</label>
                <input type="text" value={editData.address} onChange={(e) => setEditData({ ...editData, address: e.target.value })} className="w-full px-3 py-2.5 bg-sand/50 border border-night/8 rounded-xl text-sm text-night focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="block text-xs text-muted font-medium mb-1">Status</label>
                <select value={editData.status} onChange={(e) => setEditData({ ...editData, status: e.target.value })} className="w-full px-3 py-2.5 bg-sand/50 border border-night/8 rounded-xl text-sm text-night focus:outline-none focus:ring-2 focus:ring-primary/30">
                  <option value="active">Active</option>
                  <option value="cleared">Cleared</option>
                  <option value="unknown">Unknown</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-muted font-medium mb-1">Notes</label>
                <textarea value={editData.notes} onChange={(e) => setEditData({ ...editData, notes: e.target.value })} rows={4} className="w-full px-3 py-2.5 bg-sand/50 border border-night/8 rounded-xl text-sm text-night focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
              </div>

              {/* GPS Coordinates */}
              <div>
                <label className="block text-xs text-muted font-medium mb-1">GPS Coordinates</label>
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
                              latitude: pos.coords.latitude.toFixed(6),
                              longitude: pos.coords.longitude.toFixed(6),
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
                    value={editData.latitude}
                    onChange={(e) => setEditData({ ...editData, latitude: e.target.value })}
                    placeholder="Latitude"
                    className="w-full px-3 py-2.5 bg-sand/50 border border-night/8 rounded-xl text-sm text-night focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted/40"
                  />
                  <input
                    type="number"
                    step="any"
                    value={editData.longitude}
                    onChange={(e) => setEditData({ ...editData, longitude: e.target.value })}
                    placeholder="Longitude"
                    className="w-full px-3 py-2.5 bg-sand/50 border border-night/8 rounded-xl text-sm text-night focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted/40"
                  />
                </div>
                <p className="text-xs text-muted mt-1">Tap 'Use My Location' while at the site to set GPS automatically.</p>
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
        {(['animals', 'people', 'outreach', 'notes'] as const).map((tab) => {
          const counts = { animals: animals.length, people: owners.length, outreach: events.length, notes: notes.length };
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 text-xs sm:text-sm font-medium rounded-lg transition-all capitalize ${
                activeTab === tab ? 'bg-primary text-white shadow-sm' : 'text-muted hover:text-night'
              }`}
            >
              {tab} ({counts[tab]})
            </button>
          );
        })}
      </div>

      <div className="page-enter">
        {activeTab === 'animals' && <AnimalsTab animals={animals} />}
        {activeTab === 'people' && <PeopleTab owners={owners} />}
        {activeTab === 'outreach' && <OutreachTab events={events} />}
        {activeTab === 'notes' && <NotesTab notes={notes} />}
      </div>

      {/* Notes + meta */}
      {location.notes && (
        <div className="bg-white rounded-2xl border border-night/5 p-5 mt-4">
          <h3 className="font-heading font-bold text-night text-sm mb-2">Location Notes</h3>
          <p className="text-sm text-night leading-relaxed">{location.notes}</p>
        </div>
      )}

      <div className="text-sm text-muted flex gap-4 pt-4">
        <span>Added {formatDate(location.date_added)}</span>
        <span>Updated {formatDate(location.updated_at)}</span>
      </div>
    </div>
  );
}

function AnimalsTab({ animals }: { animals: LinkedAnimal[] }) {
  const [expanded, setExpanded] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);

  // Type breakdown for summary
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    animals.forEach((a) => { counts[a.animal_type] = (counts[a.animal_type] ?? 0) + 1; });
    return counts;
  }, [animals]);

  const types = useMemo(() => Object.keys(typeCounts).sort(), [typeCounts]);

  const urgentCount = animals.filter((a) => a.urgent_medical).length;

  const filtered = useMemo(() => {
    return animals.filter((a) => {
      if (typeFilter !== 'all' && a.animal_type !== typeFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !(a.name?.toLowerCase().includes(q)) &&
          !a.aao_id.toLowerCase().includes(q) &&
          !(a.food_bag_size?.toLowerCase().includes(q))
        ) return false;
      }
      return true;
    });
  }, [animals, search, typeFilter]);

  const paginated = filtered.slice(page * pageSize, (page + 1) * pageSize);

  if (animals.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-night/5 p-12 text-center">
        <PawPrint className="w-8 h-8 text-muted/20 mx-auto mb-2" />
        <p className="text-sm text-muted">No animals at this location</p>
      </div>
    );
  }

  // Summary strip
  const summaryParts = Object.entries(typeCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([type, count]) => `${count} ${type}${count !== 1 ? 's' : ''}`);

  return (
    <div>
      {/* Summary strip */}
      <div className="bg-white rounded-2xl border border-night/5 p-4 mb-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <PawPrint className="w-4 h-4 text-primary" strokeWidth={1.75} />
              <span className="text-sm font-bold text-night">{animals.length} Animals</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {summaryParts.map((part) => (
                <span key={part} className="text-xs bg-sand text-muted rounded-full px-2.5 py-0.5 font-medium capitalize">{part}</span>
              ))}
              {urgentCount > 0 && (
                <span className="text-xs font-bold text-ember bg-ember/10 rounded-full px-2.5 py-0.5">{urgentCount} urgent</span>
              )}
            </div>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-all shrink-0"
          >
            {expanded ? 'Hide' : 'Show All'}
          </button>
        </div>
      </div>

      {/* Expanded list */}
      {expanded && (
        <>
          {/* Search + filter bar */}
          <div className="flex items-center gap-2 mb-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                placeholder="Search by name or ID..."
                className="w-full pl-9 pr-3 py-2.5 bg-white border border-night/8 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted/40"
              />
            </div>
            {types.length > 1 && (
              <select
                value={typeFilter}
                onChange={(e) => { setTypeFilter(e.target.value); setPage(0); }}
                className="px-3 py-2.5 bg-white border border-night/8 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 capitalize"
              >
                <option value="all">All types</option>
                {types.map((t) => (
                  <option key={t} value={t} className="capitalize">{t}</option>
                ))}
              </select>
            )}
          </div>

          {filtered.length === 0 ? (
            <div className="bg-white rounded-2xl border border-night/5 p-12 text-center">
              <PawPrint className="w-8 h-8 text-muted/20 mx-auto mb-2" />
              <p className="text-sm text-muted">No animals match your search</p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {paginated.map((a) => (
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
                        <span className="font-heading font-bold text-sm text-night truncate">{a.name ?? a.aao_id ?? 'Unnamed'}</span>
                        <span className="text-xs text-muted font-mono">{a.aao_id}</span>
                        {a.urgent_medical && (
                          <span className="text-xs font-bold text-ember bg-ember/10 px-1.5 py-0.5 rounded-full">Urgent</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {a.current_status && <StatusBadge status={a.current_status} />}
                        {a.food_bag_size && <span className="text-xs text-muted">{a.food_bag_size} bag</span>}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {filtered.length > pageSize && (
                <Pagination
                  page={page}
                  pageSize={pageSize}
                  totalItems={filtered.length}
                  onPageChange={setPage}
                  onPageSizeChange={setPageSize}
                />
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

function PeopleTab({ owners }: { owners: LinkedOwner[] }) {
  const [expanded, setExpanded] = useState(false);
  const [search, setSearch] = useState('');

  const totalAnimals = owners.reduce((sum, o) => sum + o.animal_count, 0);

  const filtered = useMemo(() => {
    if (!search) return owners;
    const q = search.toLowerCase();
    return owners.filter((o) =>
      o.name.toLowerCase().includes(q) ||
      o.phone_primary?.toLowerCase().includes(q)
    );
  }, [owners, search]);

  if (owners.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-night/5 p-12 text-center">
        <Users className="w-8 h-8 text-muted/20 mx-auto mb-2" />
        <p className="text-sm text-muted">No people at this location</p>
      </div>
    );
  }

  return (
    <div>
      {/* Summary strip */}
      <div className="bg-white rounded-2xl border border-night/5 p-4 mb-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-night/50" strokeWidth={1.75} />
              <span className="text-sm font-bold text-night">{owners.length} People</span>
            </div>
            <span className="text-xs bg-sand text-muted rounded-full px-2.5 py-0.5 font-medium">
              {totalAnimals} total animal{totalAnimals !== 1 ? 's' : ''}
            </span>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-all shrink-0"
          >
            {expanded ? 'Hide' : 'Show All'}
          </button>
        </div>
      </div>

      {expanded && (
        <>
          {owners.length > 10 && (
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or phone..."
                className="w-full pl-9 pr-3 py-2.5 bg-white border border-night/8 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted/40"
              />
            </div>
          )}
          <div className="space-y-2">
            {filtered.map((o) => (
              <Link
                key={o.id}
                to={`/people/${o.id}`}
                className="bg-white rounded-2xl border border-night/5 p-4 flex items-center gap-3 card-hover block"
              >
                <div className="w-10 h-10 rounded-xl bg-gold/15 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5 text-night/50" strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-heading font-bold text-sm text-night truncate block">{o.name}</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-primary font-medium">{o.animal_count} animal{o.animal_count !== 1 ? 's' : ''}</span>
                    {o.phone_primary && <span className="text-sm text-muted">{o.phone_primary}</span>}
                  </div>
                </div>
              </Link>
            ))}
            {filtered.length === 0 && (
              <div className="bg-white rounded-2xl border border-night/5 p-8 text-center">
                <p className="text-sm text-muted">No people match your search</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function OutreachTab({ events }: { events: OutreachEvent[] }) {
  if (events.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-night/5 p-12 text-center">
        <CalendarHeart className="w-8 h-8 text-muted/20 mx-auto mb-2" />
        <p className="text-sm text-muted">No outreach events at this location yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {events.map((e) => (
        <div key={e.id} className="bg-white rounded-2xl border border-night/5 p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-primary/8 flex items-center justify-center shrink-0">
                <CalendarHeart className="w-4 h-4 text-primary" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-sm font-medium text-night capitalize">
                  {e.event_type.replace(/_/g, ' ')}
                </p>
                <p className="text-sm text-muted">{formatDate(e.event_date)}</p>
              </div>
            </div>
            {e.volunteer_count > 0 && (
              <span className="text-xs text-muted bg-sand px-2 py-0.5 rounded-full">
                {e.volunteer_count} volunteer{e.volunteer_count !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          {e.notes && <p className="text-sm text-muted mt-2 ml-11">{e.notes}</p>}
        </div>
      ))}
    </div>
  );
}

function NotesTab({ notes }: { notes: LocNote[] }) {
  if (notes.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-night/5 p-12 text-center">
        <StickyNote className="w-8 h-8 text-muted/20 mx-auto mb-2" />
        <p className="text-sm text-muted">No field notes for this location</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {notes.map((n) => (
        <div key={n.id} className={`bg-white rounded-2xl border p-4 ${n.flagged ? 'border-gold/30 bg-gold/4' : 'border-night/5'}`}>
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="flex items-center gap-1.5">
              {n.flagged && <Flag className="w-3 h-3 text-gold" />}
              <span className="text-sm text-muted">{formatDate(n.created_at)}</span>
            </div>
            {n.created_by_name && <span className="text-sm text-muted">{n.created_by_name}</span>}
          </div>
          <p className="text-sm text-night leading-relaxed">{n.note}</p>
        </div>
      ))}
    </div>
  );
}
