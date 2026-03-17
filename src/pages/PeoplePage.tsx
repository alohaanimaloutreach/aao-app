import { useEffect, useState, useMemo, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, List, Map, Loader2, Plus, X, Check, MapPin } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useTestMode, isTestMode } from '../lib/testMode';
import PersonCard, { type PersonCardData } from '../components/people/PersonCard';
import PeopleFilters, { type PeopleFilterState, DEFAULT_PEOPLE_FILTERS } from '../components/people/PeopleFilters';
import EmptyState from '../components/shared/EmptyState';

const MapInner = lazy(() => import('../components/animals/DogLocationMapInner'));

interface RawOwner {
  id: string;
  name: string;
  phone_primary: string | null;
  phone_secondary: string | null;
  address: string | null;
  primary_location_id: string | null;
  archived: boolean;
  primary_location: { name: string } | null;
}

const PAGE_SIZE = 50;

export default function PeoplePage() {
  const { isAdmin, session, user } = useAuth();
  const { testMode } = useTestMode();
  const [owners, setOwners] = useState<RawOwner[]>([]);
  const [animalCounts, setAnimalCounts] = useState<Record<string, number>>({});
  const [lastContactMap, setLastContactMap] = useState<Record<string, string>>({});
  const [locations, setLocations] = useState<{ id: string; name: string; latitude: number | null; longitude: number | null }[]>([]);
  const [filters, setFilters] = useState<PeopleFilterState>(DEFAULT_PEOPLE_FILTERS);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [view, setView] = useState<'list' | 'map'>('list');
  const [showAddPerson, setShowAddPerson] = useState(false);
  const [newPersonName, setNewPersonName] = useState('');
  const [newPersonPhone, setNewPersonPhone] = useState('');
  const [addSubmitting, setAddSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (session) loadData();
  }, [session, testMode]);

  async function loadData() {
    setLoading(true);

    let ownersQuery = supabase
      .from('owners')
      .select('id, name, phone_primary, phone_secondary, address, primary_location_id, archived, primary_location:locations(name)')
      .order('name');
    if (!testMode) ownersQuery = ownersQuery.eq('is_test', false);

    const [ownerRes, animalRes, careRes, locRes] = await Promise.all([
      ownersQuery,
      supabase
        .from('animals')
        .select('owner_id')
        .eq('archived', false)
        .not('owner_id', 'is', null),
      supabase
        .from('care_events')
        .select('owner_id, event_date')
        .not('owner_id', 'is', null)
        .order('event_date', { ascending: false }),
      supabase
        .from('locations')
        .select('id, name, latitude, longitude')
        .eq('archived', false)
        .order('name'),
    ]);

    if (ownerRes.data) setOwners(ownerRes.data as unknown as RawOwner[]);

    // Count animals per owner
    const counts: Record<string, number> = {};
    (animalRes.data ?? []).forEach((a: any) => {
      if (a.owner_id) counts[a.owner_id] = (counts[a.owner_id] ?? 0) + 1;
    });
    setAnimalCounts(counts);

    // Last contact per owner (most recent care event)
    const lcMap: Record<string, string> = {};
    (careRes.data ?? []).forEach((ce: any) => {
      if (ce.owner_id && !lcMap[ce.owner_id]) {
        lcMap[ce.owner_id] = ce.event_date;
      }
    });
    setLastContactMap(lcMap);

    if (locRes.data) setLocations(locRes.data);
    setLoading(false);
  }

  const filtered = useMemo(() => {
    return owners.filter((o) => {
      if (!filters.showArchived && o.archived) return false;
      if (!isAdmin && o.archived) return false;

      if (filters.locationId && o.primary_location_id !== filters.locationId) return false;

      if (filters.hasAnimals === 'yes' && !(animalCounts[o.id] > 0)) return false;
      if (filters.hasAnimals === 'no' && (animalCounts[o.id] ?? 0) > 0) return false;

      if (filters.search) {
        const q = filters.search.toLowerCase();
        const fields = [o.name, o.phone_primary, o.phone_secondary, o.address, o.primary_location?.name];
        if (!fields.some((f) => f?.toLowerCase().includes(q))) return false;
      }

      return true;
    });
  }, [owners, animalCounts, filters, isAdmin]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const cardData: PersonCardData[] = paginated.map((o) => ({
    id: o.id,
    name: o.name,
    phone_primary: o.phone_primary,
    primary_location: o.primary_location,
    animal_count: animalCounts[o.id] ?? 0,
    last_contact: lastContactMap[o.id] ?? null,
  }));

  // Build location coordinate lookup
  const locCoords = useMemo(() => {
    const map: Record<string, { lat: number; lng: number }> = {};
    locations.forEach((l) => {
      if (l.latitude && l.longitude) map[l.id] = { lat: Number(l.latitude), lng: Number(l.longitude) };
    });
    return map;
  }, [locations]);

  // Map pins for people with location coordinates
  const mapPins = useMemo(() => {
    return filtered
      .filter((o) => o.primary_location_id && locCoords[o.primary_location_id])
      .map((o) => ({
        id: o.id,
        type: 'owner' as const,
        label: o.name,
        detail: o.primary_location?.name ?? null,
        date: null,
        lat: locCoords[o.primary_location_id!].lat,
        lng: locCoords[o.primary_location_id!].lng,
      }));
  }, [filtered, locCoords]);

  async function handleAddPerson() {
    if (!newPersonName.trim() || !user) return;
    setAddSubmitting(true);
    const { data, error } = await supabase
      .from('owners')
      .insert({
        name: newPersonName.trim(),
        phone_primary: newPersonPhone.trim() || null,
        is_test: isTestMode(),
      })
      .select('id')
      .single();
    setAddSubmitting(false);
    if (error) return;
    setShowAddPerson(false);
    setNewPersonName('');
    setNewPersonPhone('');
    if (data) navigate(`/people/${data.id}`);
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-heading text-night tracking-tight">People</h1>
          <p className="text-muted mt-0.5">Owners and community contacts</p>
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

      <PeopleFilters
        filters={filters}
        onChange={(f) => { setFilters(f); setPage(0); }}
        locations={locations}
        resultCount={filtered.length}
      />

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-night/5 p-4">
              <div className="flex gap-3">
                <div className="skeleton w-11 h-11 rounded-xl shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-4 w-32" />
                  <div className="skeleton h-3 w-24" />
                  <div className="skeleton h-5 w-20" />
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
              title="No people with locations on map"
              description="People need a location with coordinates to appear on the map"
              iconColor="text-night"
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
              {mapPins.length} {mapPins.length !== 1 ? 'people' : 'person'} shown
            </div>
          </div>
        )
      ) : cardData.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            icon={Users}
            title="No people found"
            description={filters.search ? 'Try a different search or adjust your filters' : 'No people match the current filters'}
            iconColor="text-night"
          />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
            {cardData.map((person) => (
              <PersonCard key={person.id} person={person} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="px-3 py-1.5 text-sm rounded-lg bg-white border border-night/8 text-muted hover:text-night disabled:opacity-30 transition-all"
              >
                Previous
              </button>
              <span className="text-sm text-muted px-2">{page + 1} of {totalPages}</span>
              <button
                onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                disabled={page >= totalPages - 1}
                className="px-3 py-1.5 text-sm rounded-lg bg-white border border-night/8 text-muted hover:text-night disabled:opacity-30 transition-all"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* Add Person FAB */}
      <button
        onClick={() => setShowAddPerson(true)}
        className="fixed bottom-20 md:bottom-6 right-4 md:right-6 h-12 bg-primary hover:bg-primary-hover text-white rounded-2xl shadow-[0_4px_16px_rgba(110,168,50,0.35)] hover:shadow-[0_6px_20px_rgba(110,168,50,0.45)] flex items-center justify-center gap-2 px-5 transition-all duration-200 z-30 hover:scale-105 active:scale-95"
        aria-label="Add new person"
      >
        <Plus className="w-4 h-4" strokeWidth={2} />
        <span className="text-sm font-semibold">Add Person</span>
      </button>

      {/* Add Person modal */}
      {showAddPerson && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label="Add person">
          <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[85vh] flex flex-col shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-night/5 shrink-0">
              <h2 className="font-heading font-bold text-night text-base">Add Person</h2>
              <button onClick={() => setShowAddPerson(false)} className="p-2 rounded-lg text-muted hover:text-night hover:bg-sand transition-all" aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted mb-1">Name *</label>
                <input
                  type="text"
                  value={newPersonName}
                  onChange={(e) => setNewPersonName(e.target.value)}
                  placeholder="Full name"
                  className="w-full px-3 py-2.5 bg-sand/50 border border-night/8 rounded-xl text-sm text-night focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted/40"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted mb-1">Phone</label>
                <input
                  type="tel"
                  value={newPersonPhone}
                  onChange={(e) => setNewPersonPhone(e.target.value)}
                  placeholder="Phone number"
                  className="w-full px-3 py-2.5 bg-sand/50 border border-night/8 rounded-xl text-sm text-night focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted/40"
                />
              </div>
            </div>
            <div className="p-5 border-t border-night/5 shrink-0">
              <button
                onClick={handleAddPerson}
                disabled={!newPersonName.trim() || addSubmitting}
                className="w-full py-3 bg-primary hover:bg-primary-hover text-white font-semibold text-sm rounded-xl shadow-[0_2px_8px_rgba(110,168,50,0.25)] disabled:opacity-30 transition-all flex items-center justify-center gap-2"
              >
                {addSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {addSubmitting ? 'Creating...' : 'Create Person'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
