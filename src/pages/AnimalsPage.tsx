import { useEffect, useState, useMemo, useRef, useCallback, lazy, Suspense } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { PawPrint, List, Map, Loader2, Plus, X, Check, MapPin } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useTestMode } from '../lib/testMode';
import { isTestMode } from '../lib/testMode';
import { daysSince } from '../lib/format';
import AnimalCard, { type AnimalCardData } from '../components/animals/AnimalCard';
import AnimalFilters, { type AnimalFilterState, DEFAULT_FILTERS } from '../components/animals/AnimalFilters';
import EmptyState from '../components/shared/EmptyState';

const MapInner = lazy(() => import('../components/animals/DogLocationMapInner'));

interface RawAnimal {
  id: string;
  aao_id: string;
  name: string | null;
  animal_type: string;
  breed: string | null;
  sex: string;
  size_category: string;
  food_bag_size: string | null;
  urgent_medical: boolean;
  deceased: boolean;
  fixed_status: string;
  archived: boolean;
  owner_id: string | null;
  primary_location_id: string | null;
  microchip_primary: string | null;
  updated_at: string;
  owner: { name: string } | null;
  primary_location: { name: string } | null;
}

const BATCH_SIZE = 40;

export default function AnimalsPage() {
  const { isAdmin, session, user } = useAuth();
  const { testMode } = useTestMode();
  const [searchParams, setSearchParams] = useSearchParams();
  const [animals, setAnimals] = useState<RawAnimal[]>([]);
  const [situations, setSituations] = useState<Record<string, { status: string }>>({});
  const [lastSeenMap, setLastSeenMap] = useState<Record<string, string>>({});
  const [profilePhotos, setProfilePhotos] = useState<Record<string, string>>({});
  const [locations, setLocations] = useState<{ id: string; name: string; latitude: number | null; longitude: number | null }[]>([]);
  const [view, setView] = useState<'list' | 'map'>('list');
  const [showAddAnimal, setShowAddAnimal] = useState(false);
  const [newAnimalName, setNewAnimalName] = useState('');
  const [newAnimalType, setNewAnimalType] = useState('dog');
  const [newAnimalSex, setNewAnimalSex] = useState('unknown');
  const [newAnimalSize, setNewAnimalSize] = useState('unknown');
  const [addSubmitting, setAddSubmitting] = useState(false);
  const navigate = useNavigate();
  const [filters, setFilters] = useState<AnimalFilterState>(() => {
    const initial = { ...DEFAULT_FILTERS };
    if (searchParams.get('urgent') === '1') initial.urgentOnly = true;
    if (searchParams.get('notSeen')) initial.notSeenDays = Number(searchParams.get('notSeen')) || 60;
    if (searchParams.get('status')) initial.situationStatus = searchParams.get('status')!;
    return initial;
  });
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (session) loadData();
  }, [session, testMode]);

  async function loadData() {
    setLoading(true);

    let animalsQuery = supabase
      .from('animals')
      .select('id, aao_id, name, animal_type, breed, sex, size_category, food_bag_size, urgent_medical, deceased, fixed_status, archived, owner_id, primary_location_id, microchip_primary, updated_at, is_test, owner:owners(name), primary_location:locations(name)')
      .order('updated_at', { ascending: false });
    if (!testMode) animalsQuery = animalsQuery.eq('is_test', false);

    const [animalRes, sitRes, lastSeenRes, locRes, photoRes] = await Promise.all([
      animalsQuery,
      supabase
        .from('situations')
        .select('animal_id, status')
        .eq('is_active', true),
      supabase
        .from('care_events')
        .select('animal_id, event_date')
        .order('event_date', { ascending: false }),
      supabase
        .from('locations')
        .select('id, name, latitude, longitude')
        .eq('archived', false)
        .order('name'),
      supabase
        .from('photos')
        .select('animal_id, storage_path, is_profile, taken_at, created_at')
        .not('animal_id', 'is', null),
    ]);

    if (animalRes.data) setAnimals(animalRes.data as unknown as RawAnimal[]);

    // Build situation map
    const sitMap: Record<string, { status: string }> = {};
    (sitRes.data ?? []).forEach((s: any) => {
      sitMap[s.animal_id] = { status: s.status };
    });
    setSituations(sitMap);

    // Build last seen map (most recent care event OR photo date per animal)
    const lsMap: Record<string, string> = {};
    (lastSeenRes.data ?? []).forEach((ce: any) => {
      if (!lsMap[ce.animal_id]) {
        lsMap[ce.animal_id] = ce.event_date;
      }
    });
    // Also consider photo dates (taken_at or created_at) for last seen
    (photoRes.data ?? []).forEach((p: any) => {
      if (!p.animal_id) return;
      const photoDate = p.taken_at ?? p.created_at;
      if (photoDate && (!lsMap[p.animal_id] || photoDate > lsMap[p.animal_id])) {
        lsMap[p.animal_id] = photoDate;
      }
    });
    setLastSeenMap(lsMap);

    // Build profile photo map
    const ppMap: Record<string, string> = {};
    (photoRes.data ?? []).forEach((p: any) => {
      if (p.animal_id && p.storage_path && p.is_profile) {
        ppMap[p.animal_id] = p.storage_path;
      }
    });
    setProfilePhotos(ppMap);

    if (locRes.data) setLocations(locRes.data);
    setLoading(false);
  }

  // Apply filters + search
  const filtered = useMemo(() => {
    return animals.filter((a) => {
      // Archived
      if (!filters.showArchived && a.archived) return false;
      if (!isAdmin && a.archived) return false;

      // Type
      if (filters.animalType && a.animal_type !== filters.animalType) return false;

      // Situation status
      if (filters.situationStatus) {
        const sit = situations[a.id];
        if (!sit || sit.status !== filters.situationStatus) return false;
      }

      // Location
      if (filters.locationId && a.primary_location_id !== filters.locationId) return false;

      // Fixed
      if (filters.fixedStatus && a.fixed_status !== filters.fixedStatus) return false;

      // Photo filter
      if (filters.photoFilter === 'has_photo' && !profilePhotos[a.id]) return false;
      if (filters.photoFilter === 'no_photo' && profilePhotos[a.id]) return false;

      // Urgent
      if (filters.urgentOnly && !a.urgent_medical) return false;

      // Not seen in X days
      if (filters.notSeenDays > 0) {
        const days = daysSince(lastSeenMap[a.id]);
        if (days <= filters.notSeenDays || a.deceased) return false;
      }

      // Search
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const matchFields = [
          a.name,
          a.aao_id,
          a.microchip_primary,
          a.owner?.name,
          a.breed,
        ];
        if (!matchFields.some((f) => f?.toLowerCase().includes(q))) return false;
      }

      return true;
    });
  }, [animals, situations, profilePhotos, filters, isAdmin]);

  // Reset visible count when filters change
  useEffect(() => {
    setVisibleCount(BATCH_SIZE);
  }, [filters]);

  // Infinite scroll with IntersectionObserver
  const loadMore = useCallback(() => {
    setVisibleCount((prev) => Math.min(prev + BATCH_SIZE, filtered.length));
  }, [filtered.length]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  const visible = filtered.slice(0, visibleCount);

  // Build location coordinate lookup
  const locCoords = useMemo(() => {
    const map: Record<string, { lat: number; lng: number }> = {};
    locations.forEach((l) => {
      if (l.latitude && l.longitude) map[l.id] = { lat: Number(l.latitude), lng: Number(l.longitude) };
    });
    return map;
  }, [locations]);

  // Map pins for animals with location coordinates
  const mapPins = useMemo(() => {
    return filtered
      .filter((a) => a.primary_location_id && locCoords[a.primary_location_id])
      .map((a) => ({
        id: a.id,
        type: 'home' as const,
        label: a.name ?? a.aao_id,
        detail: a.primary_location?.name ?? null,
        date: null,
        lat: locCoords[a.primary_location_id!].lat,
        lng: locCoords[a.primary_location_id!].lng,
      }));
  }, [filtered, locCoords]);

  async function handleAddAnimal() {
    if (!newAnimalName.trim() || !user) return;
    setAddSubmitting(true);
    const { data, error } = await supabase
      .from('animals')
      .insert({
        name: newAnimalName.trim(),
        animal_type: newAnimalType,
        sex: newAnimalSex,
        size_category: newAnimalSize,
        fixed_status: 'unknown',
        is_test: isTestMode(),
      })
      .select('id')
      .single();
    setAddSubmitting(false);
    if (error) return;
    setShowAddAnimal(false);
    setNewAnimalName('');
    setNewAnimalType('dog');
    setNewAnimalSex('unknown');
    setNewAnimalSize('unknown');
    if (data) navigate(`/animals/${data.id}`);
  }

  // Map to card data
  const cardData: AnimalCardData[] = visible.map((a) => ({
    id: a.id,
    aao_id: a.aao_id,
    name: a.name,
    animal_type: a.animal_type,
    breed: a.breed,
    sex: a.sex,
    size_category: a.size_category,
    food_bag_size: a.food_bag_size,
    urgent_medical: a.urgent_medical,
    deceased: a.deceased,
    owner: a.owner,
    primary_location: a.primary_location,
    current_situation: situations[a.id] ?? null,
    last_seen: lastSeenMap[a.id] ?? null,
    profile_photo_url: profilePhotos[a.id] ?? null,
  }));

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-heading text-night tracking-tight">Animals</h1>
          <p className="text-muted mt-0.5">Animal registry and profiles</p>
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

      <AnimalFilters
        filters={filters}
        onChange={(f) => setFilters(f)}
        locations={locations}
        resultCount={filtered.length}
      />

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 mt-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-night/5 overflow-hidden">
              <div className="skeleton h-36" />
              <div className="p-3.5 space-y-2">
                <div className="skeleton h-4 w-24" />
                <div className="skeleton h-3 w-16" />
                <div className="skeleton h-5 w-28" />
              </div>
            </div>
          ))}
        </div>
      ) : view === 'map' ? (
        mapPins.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              icon={MapPin}
              title="No animals with locations on map"
              description="Animals need a location with coordinates to appear on the map"
              iconColor="text-primary"
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
              {mapPins.length} animal{mapPins.length !== 1 ? 's' : ''} shown
            </div>
          </div>
        )
      ) : cardData.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            icon={PawPrint}
            title="No animals found"
            description={filters.search ? 'Try a different search or adjust your filters' : 'No animals match the current filters'}
            iconColor="text-primary"
          />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 mt-4">
            {cardData.map((animal) => (
              <AnimalCard key={animal.id} animal={animal} />
            ))}
          </div>

          {/* Infinite scroll sentinel */}
          {visibleCount < filtered.length && (
            <div ref={sentinelRef} className="flex justify-center py-6">
              <div className="flex items-center gap-2 text-sm text-muted">
                <div className="w-4 h-4 border-2 border-muted/30 border-t-primary rounded-full animate-spin" />
                Loading more...
              </div>
            </div>
          )}

          {visibleCount >= filtered.length && filtered.length > BATCH_SIZE && (
            <p className="text-center text-xs text-muted py-4">
              Showing all {filtered.length} animals
            </p>
          )}
        </>
      )}

      {/* Add Animal FAB */}
      <button
        onClick={() => setShowAddAnimal(true)}
        className="fixed bottom-20 md:bottom-6 right-4 md:right-6 h-12 bg-primary hover:bg-primary-hover text-white rounded-2xl shadow-[0_4px_16px_rgba(110,168,50,0.35)] hover:shadow-[0_6px_20px_rgba(110,168,50,0.45)] flex items-center justify-center gap-2 px-5 transition-all duration-200 z-30 hover:scale-105 active:scale-95"
        aria-label="Add new animal"
      >
        <Plus className="w-4 h-4" strokeWidth={2} />
        <span className="text-sm font-semibold">Add Animal</span>
      </button>

      {/* Add Animal modal */}
      {showAddAnimal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label="Add animal">
          <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[85vh] flex flex-col shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-night/5 shrink-0">
              <h2 className="font-heading font-bold text-night text-base">Add Animal</h2>
              <button onClick={() => setShowAddAnimal(false)} className="p-2 rounded-lg text-muted hover:text-night hover:bg-sand transition-all" aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted mb-1">Name *</label>
                <input
                  type="text"
                  value={newAnimalName}
                  onChange={(e) => setNewAnimalName(e.target.value)}
                  placeholder="Animal name"
                  className="w-full px-3 py-2.5 bg-sand/50 border border-night/8 rounded-xl text-sm text-night focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted/40"
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-muted mb-1">Type</label>
                  <select value={newAnimalType} onChange={(e) => setNewAnimalType(e.target.value)} className="w-full px-3 py-2.5 bg-sand/50 border border-night/8 rounded-xl text-sm text-night focus:outline-none focus:ring-2 focus:ring-primary/30">
                    <option value="dog">Dog</option>
                    <option value="cat">Cat</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted mb-1">Sex</label>
                  <select value={newAnimalSex} onChange={(e) => setNewAnimalSex(e.target.value)} className="w-full px-3 py-2.5 bg-sand/50 border border-night/8 rounded-xl text-sm text-night focus:outline-none focus:ring-2 focus:ring-primary/30">
                    <option value="unknown">Unknown</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted mb-1">Size</label>
                <select value={newAnimalSize} onChange={(e) => setNewAnimalSize(e.target.value)} className="w-full px-3 py-2.5 bg-sand/50 border border-night/8 rounded-xl text-sm text-night focus:outline-none focus:ring-2 focus:ring-primary/30">
                  <option value="unknown">Unknown</option>
                  <option value="small">Small</option>
                  <option value="medium">Medium</option>
                  <option value="large">Large</option>
                  <option value="xlarge">XL</option>
                </select>
              </div>
            </div>
            <div className="p-5 border-t border-night/5 shrink-0">
              <button
                onClick={handleAddAnimal}
                disabled={!newAnimalName.trim() || addSubmitting}
                className="w-full py-3 bg-primary hover:bg-primary-hover text-white font-semibold text-sm rounded-xl shadow-[0_2px_8px_rgba(110,168,50,0.25)] disabled:opacity-30 transition-all flex items-center justify-center gap-2"
              >
                {addSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {addSubmitting ? 'Creating...' : 'Create Animal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
