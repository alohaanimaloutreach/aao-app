import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { PawPrint } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useTestMode } from '../lib/testMode';
import AnimalCard, { type AnimalCardData } from '../components/animals/AnimalCard';
import AnimalFilters, { type AnimalFilterState, DEFAULT_FILTERS } from '../components/animals/AnimalFilters';
import EmptyState from '../components/shared/EmptyState';

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
  const { isAdmin, session } = useAuth();
  const { testMode } = useTestMode();
  const [animals, setAnimals] = useState<RawAnimal[]>([]);
  const [situations, setSituations] = useState<Record<string, { status: string }>>({});
  const [lastSeenMap, setLastSeenMap] = useState<Record<string, string>>({});
  const [profilePhotos, setProfilePhotos] = useState<Record<string, string>>({});
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);
  const [filters, setFilters] = useState<AnimalFilterState>(DEFAULT_FILTERS);
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
        .select('id, name')
        .eq('archived', false)
        .order('name'),
      supabase
        .from('photos')
        .select('animal_id, storage_path')
        .eq('is_profile', true)
        .not('animal_id', 'is', null),
    ]);

    if (animalRes.data) setAnimals(animalRes.data as unknown as RawAnimal[]);

    // Build situation map
    const sitMap: Record<string, { status: string }> = {};
    (sitRes.data ?? []).forEach((s: any) => {
      sitMap[s.animal_id] = { status: s.status };
    });
    setSituations(sitMap);

    // Build last seen map (most recent care event per animal)
    const lsMap: Record<string, string> = {};
    (lastSeenRes.data ?? []).forEach((ce: any) => {
      if (!lsMap[ce.animal_id]) {
        lsMap[ce.animal_id] = ce.event_date;
      }
    });
    setLastSeenMap(lsMap);

    // Build profile photo map
    const ppMap: Record<string, string> = {};
    (photoRes.data ?? []).forEach((p: any) => {
      if (p.animal_id && p.storage_path) {
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
            <p className="text-center text-xs text-muted/50 py-4">
              Showing all {filtered.length} animals
            </p>
          )}
        </>
      )}
    </div>
  );
}
