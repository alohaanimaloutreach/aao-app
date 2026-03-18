import { useEffect, useState, useMemo, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, List, Map, Loader2, Plus, X, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import LocationCard, { type LocationCardData } from '../components/locations/LocationCard';
import LocationFilters, { type LocationFilterState, DEFAULT_LOCATION_FILTERS } from '../components/locations/LocationFilters';
import EmptyState from '../components/shared/EmptyState';

const MapInner = lazy(() => import('../components/animals/DogLocationMapInner'));

interface RawLocation {
  id: string;
  name: string;
  address: string | null;
  precise_location: string | null;
  status: string;
  latitude: number | null;
  longitude: number | null;
  archived: boolean;
  archived_at: string | null;
}

export default function LocationsPage() {
  const { isAdmin, session, user } = useAuth();
  const [locations, setLocations] = useState<RawLocation[]>([]);
  const [animalCounts, setAnimalCounts] = useState<Record<string, number>>({});
  const [ownerCounts, setOwnerCounts] = useState<Record<string, number>>({});
  const [lastVisitedMap, setLastVisitedMap] = useState<Record<string, string>>({});
  const [filters, setFilters] = useState<LocationFilterState>(DEFAULT_LOCATION_FILTERS);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'map'>('list');
  const [showAddLocation, setShowAddLocation] = useState(false);
  const [newLocName, setNewLocName] = useState('');
  const [newLocAddress, setNewLocAddress] = useState('');
  const [addSubmitting, setAddSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (session) loadData();
  }, [session]);

  async function loadData() {
    setLoading(true);

    const [locRes, animalRes, ownerRes, outreachRes] = await Promise.all([
      supabase
        .from('locations')
        .select('id, name, address, precise_location, status, latitude, longitude, archived, archived_at')
        .order('name'),
      supabase
        .from('animals')
        .select('primary_location_id')
        .eq('archived', false)
        .not('primary_location_id', 'is', null),
      supabase
        .from('owners')
        .select('primary_location_id')
        .eq('archived', false)
        .not('primary_location_id', 'is', null),
      supabase
        .from('outreach_events')
        .select('location_id, event_date')
        .not('location_id', 'is', null)
        .order('event_date', { ascending: false }),
    ]);

    if (locRes.data) setLocations(locRes.data);

    const aCounts: Record<string, number> = {};
    (animalRes.data ?? []).forEach((a: any) => {
      if (a.primary_location_id) aCounts[a.primary_location_id] = (aCounts[a.primary_location_id] ?? 0) + 1;
    });
    setAnimalCounts(aCounts);

    const oCounts: Record<string, number> = {};
    (ownerRes.data ?? []).forEach((o: any) => {
      if (o.primary_location_id) oCounts[o.primary_location_id] = (oCounts[o.primary_location_id] ?? 0) + 1;
    });
    setOwnerCounts(oCounts);

    const lvMap: Record<string, string> = {};
    (outreachRes.data ?? []).forEach((e: any) => {
      if (e.location_id && !lvMap[e.location_id]) {
        lvMap[e.location_id] = e.event_date;
      }
    });
    setLastVisitedMap(lvMap);

    setLoading(false);
  }

  const filtered = useMemo(() => {
    return locations.filter((l) => {
      if (!filters.showArchived && l.archived) return false;
      if (!isAdmin && l.archived) return false;
      if (filters.status && l.status !== filters.status) return false;

      if (filters.search) {
        const q = filters.search.toLowerCase();
        const statusLabel = l.status === 'active' ? 'Active' : l.status === 'cleared' ? 'Cleared' : l.status === 'unknown' ? 'Unknown' : l.status;
        const fields = [l.name, l.address, l.precise_location, statusLabel];
        if (!fields.some((f) => f?.toLowerCase().includes(q))) return false;
      }
      return true;
    });
  }, [locations, filters, isAdmin]);

  // Split active vs archived
  const activeFiltered = filtered.filter((l) => !l.archived);
  const archivedFiltered = filtered.filter((l) => l.archived);

  const archivedByMonth = useMemo(() => {
    const groups: Record<string, RawLocation[]> = {};
    archivedFiltered.forEach((l) => {
      const date = l.archived_at ? new Date(l.archived_at) : null;
      const key = date
        ? `${date.toLocaleString('default', { month: 'long' })} ${date.getFullYear()}`
        : 'Unknown date';
      if (!groups[key]) groups[key] = [];
      groups[key].push(l);
    });
    return Object.entries(groups).sort((a, b) => {
      const dateA = a[1][0]?.archived_at ?? '';
      const dateB = b[1][0]?.archived_at ?? '';
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });
  }, [archivedFiltered]);

  const cardData: LocationCardData[] = activeFiltered.map((l) => ({
    id: l.id,
    name: l.name,
    address: l.address,
    precise_location: l.precise_location,
    status: l.status,
    latitude: l.latitude,
    longitude: l.longitude,
    animal_count: animalCounts[l.id] ?? 0,
    owner_count: ownerCounts[l.id] ?? 0,
    last_visited: lastVisitedMap[l.id] ?? null,
  })).sort((a, b) => (b.animal_count + b.owner_count) - (a.animal_count + a.owner_count));

  const mapPins = useMemo(() => {
    return filtered
      .filter((l) => l.latitude && l.longitude)
      .map((l) => ({
        id: l.id,
        type: 'home' as const,
        label: l.name,
        detail: l.address || l.precise_location || null,
        date: null,
        lat: Number(l.latitude),
        lng: Number(l.longitude),
      }));
  }, [filtered]);

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-heading text-night tracking-tight">Locations</h1>
          <p className="text-muted mt-0.5">Outreach sites and service areas</p>
        </div>
        <div className="flex gap-1 bg-white rounded-xl border border-night/5 p-1">
          <button
            onClick={() => setView('list')}
            className={`p-2 rounded-lg transition-all ${view === 'list' ? 'bg-primary text-white shadow-sm' : 'text-muted hover:text-night'}`}
            aria-label="List view"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            onClick={() => setView('map')}
            className={`p-2 rounded-lg transition-all ${view === 'map' ? 'bg-primary text-white shadow-sm' : 'text-muted hover:text-night'}`}
            aria-label="Map view"
          >
            <Map className="w-4 h-4" />
          </button>
        </div>
      </div>

      <LocationFilters
        filters={filters}
        onChange={setFilters}
        resultCount={filtered.length}
      />

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-night/5 p-4">
              <div className="flex gap-3">
                <div className="skeleton w-11 h-11 rounded-xl shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-4 w-36" />
                  <div className="skeleton h-3 w-48" />
                  <div className="flex gap-2">
                    <div className="skeleton h-5 w-12" />
                    <div className="skeleton h-5 w-12" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : view === 'map' ? (
        mapPins.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              icon={MapPin}
              title="No locations with coordinates"
              description="Locations need latitude/longitude to appear on the map"
              iconColor="text-ember"
            />
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-night/5 overflow-hidden mt-4">
            <div className="h-[28rem] md:h-[36rem]">
              <Suspense fallback={
                <div className="h-full flex items-center justify-center text-muted text-sm gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading map...
                </div>
              }>
                <MapInner pins={mapPins} />
              </Suspense>
            </div>
            <div className="px-5 py-2.5 border-t border-night/5 text-xs text-muted">
              {mapPins.length} location{mapPins.length !== 1 ? 's' : ''} shown
            </div>
          </div>
        )
      ) : cardData.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            icon={MapPin}
            title="No locations found"
            description={filters.search ? 'Try a different search' : 'No locations match the current filters'}
            iconColor="text-ember"
          />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
            {cardData.map((loc) => (
              <LocationCard key={loc.id} location={loc} />
            ))}
          </div>

          {/* Archived section */}
          {filters.showArchived && archivedByMonth.length > 0 && (
            <div className="mt-8">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-px flex-1 bg-night/8" />
                <span className="text-sm font-semibold text-muted px-2">Archived ({archivedFiltered.length})</span>
                <div className="h-px flex-1 bg-night/8" />
              </div>
              {archivedByMonth.map(([month, items]) => (
                <div key={month} className="mb-4">
                  <p className="text-xs font-medium text-muted mb-2 uppercase tracking-wide">{month}</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 opacity-60">
                    {items.map((l) => (
                      <LocationCard key={l.id} location={{
                        id: l.id,
                        name: l.name,
                        address: l.address,
                        precise_location: l.precise_location,
                        status: l.status,
                        latitude: l.latitude,
                        longitude: l.longitude,
                        animal_count: animalCounts[l.id] ?? 0,
                        owner_count: ownerCounts[l.id] ?? 0,
                        last_visited: lastVisitedMap[l.id] ?? null,
                      }} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Add Location FAB */}
      <button
        onClick={() => setShowAddLocation(true)}
        className="fixed bottom-20 md:bottom-6 right-4 md:right-6 h-12 bg-primary hover:bg-primary-hover text-white rounded-2xl shadow-[0_4px_16px_rgba(110,168,50,0.35)] hover:shadow-[0_6px_20px_rgba(110,168,50,0.45)] flex items-center justify-center gap-2 px-5 transition-all duration-200 z-30 hover:scale-105 active:scale-95"
        aria-label="Add new location"
      >
        <Plus className="w-4 h-4" strokeWidth={2} />
        <span className="text-sm font-semibold">Add Location</span>
      </button>

      {/* Add Location modal */}
      {showAddLocation && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label="Add location">
          <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[85vh] flex flex-col shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-night/5 shrink-0">
              <h2 className="font-heading font-bold text-night text-base">Add Location</h2>
              <button onClick={() => setShowAddLocation(false)} className="p-2.5 rounded-lg text-muted hover:text-night hover:bg-sand transition-all" aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted mb-1">Name *</label>
                <input
                  type="text"
                  value={newLocName}
                  onChange={(e) => setNewLocName(e.target.value)}
                  placeholder="Location name"
                  className="w-full px-3 py-2.5 bg-sand/50 border border-night/8 rounded-xl text-sm text-night focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted/40"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted mb-1">Address</label>
                <input
                  type="text"
                  value={newLocAddress}
                  onChange={(e) => setNewLocAddress(e.target.value)}
                  placeholder="Street address (optional)"
                  className="w-full px-3 py-2.5 bg-sand/50 border border-night/8 rounded-xl text-sm text-night focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted/40"
                />
              </div>
            </div>
            <div className="p-5 border-t border-night/5 shrink-0">
              <button
                onClick={async () => {
                  if (!newLocName.trim() || !user) return;
                  setAddSubmitting(true);
                  const { data, error } = await supabase
                    .from('locations')
                    .insert({ name: newLocName.trim(), address: newLocAddress.trim() || null })
                    .select('id')
                    .single();
                  setAddSubmitting(false);
                  if (error) return;
                  setShowAddLocation(false);
                  setNewLocName('');
                  setNewLocAddress('');
                  if (data) navigate(`/locations/${data.id}`);
                }}
                disabled={!newLocName.trim() || addSubmitting}
                className="w-full py-3 bg-primary hover:bg-primary-hover text-white font-semibold text-sm rounded-xl shadow-[0_2px_8px_rgba(110,168,50,0.25)] disabled:opacity-30 transition-all flex items-center justify-center gap-2"
              >
                {addSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {addSubmitting ? 'Creating...' : 'Create Location'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
