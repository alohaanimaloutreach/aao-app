import { useEffect, useState, useMemo, lazy, Suspense } from 'react';
import { MapPin, List, Map, Loader2 } from 'lucide-react';
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
}

export default function LocationsPage() {
  const { isAdmin, session } = useAuth();
  const [locations, setLocations] = useState<RawLocation[]>([]);
  const [animalCounts, setAnimalCounts] = useState<Record<string, number>>({});
  const [ownerCounts, setOwnerCounts] = useState<Record<string, number>>({});
  const [lastVisitedMap, setLastVisitedMap] = useState<Record<string, string>>({});
  const [filters, setFilters] = useState<LocationFilterState>(DEFAULT_LOCATION_FILTERS);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'map'>('list');

  useEffect(() => {
    if (session) loadData();
  }, [session]);

  async function loadData() {
    setLoading(true);

    const [locRes, animalRes, ownerRes, outreachRes] = await Promise.all([
      supabase
        .from('locations')
        .select('id, name, address, precise_location, status, latitude, longitude, archived')
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
        const fields = [l.name, l.address, l.precise_location];
        if (!fields.some((f) => f?.toLowerCase().includes(q))) return false;
      }
      return true;
    });
  }, [locations, filters, isAdmin]);

  const cardData: LocationCardData[] = filtered.map((l) => ({
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
  }));

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
            <div className="px-5 py-2.5 border-t border-night/5 text-[11px] text-muted">
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
          {cardData.map((loc) => (
            <LocationCard key={loc.id} location={loc} />
          ))}
        </div>
      )}
    </div>
  );
}
