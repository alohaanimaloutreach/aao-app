import { useEffect, useState, useMemo } from 'react';
import { Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import PersonCard, { type PersonCardData } from '../components/people/PersonCard';
import PeopleFilters, { type PeopleFilterState, DEFAULT_PEOPLE_FILTERS } from '../components/people/PeopleFilters';
import EmptyState from '../components/shared/EmptyState';

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
  const { isAdmin, session } = useAuth();
  const [owners, setOwners] = useState<RawOwner[]>([]);
  const [animalCounts, setAnimalCounts] = useState<Record<string, number>>({});
  const [lastContactMap, setLastContactMap] = useState<Record<string, string>>({});
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);
  const [filters, setFilters] = useState<PeopleFilterState>(DEFAULT_PEOPLE_FILTERS);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);

  useEffect(() => {
    if (session) loadData();
  }, [session]);

  async function loadData() {
    setLoading(true);

    const [ownerRes, animalRes, careRes, locRes] = await Promise.all([
      supabase
        .from('owners')
        .select('id, name, phone_primary, phone_secondary, address, primary_location_id, archived, primary_location:locations(name)')
        .order('name'),
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
        .select('id, name')
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

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-heading text-night tracking-tight">People</h1>
          <p className="text-muted mt-0.5">Owners and community contacts</p>
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
    </div>
  );
}
