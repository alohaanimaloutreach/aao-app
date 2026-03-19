import { useEffect, useState, useMemo, lazy, Suspense } from 'react';
import { supabase } from '../../lib/supabase';
import { formatDate } from '../../lib/format';
import { MapPin, Loader2 } from 'lucide-react';

interface LocationPin {
  id: string;
  type: 'home' | 'owner' | 'outreach' | 'note';
  label: string;
  detail: string | null;
  date: string | null;
  lat: number;
  lng: number;
}

interface Props {
  animalId: string;
  primaryLocationId: string | null;
  ownerId: string | null;
}

// Lazy-loaded inner map to avoid Leaflet SSR/bundler issues
const MapInner = lazy(() => import('./DogLocationMapInner'));

export default function DogLocationMap({ animalId, primaryLocationId, ownerId }: Props) {
  const [pins, setPins] = useState<LocationPin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadLocations();
  }, [animalId]);

  async function loadLocations() {
    setLoading(true);
    setError(null);
    try {
      const allPins: LocationPin[] = [];

      // 1. Primary location
      if (primaryLocationId) {
        const { data: loc } = await supabase
          .from('locations')
          .select('id, name, latitude, longitude')
          .eq('id', primaryLocationId)
          .single();
        if (loc?.latitude && loc?.longitude) {
          allPins.push({
            id: `home-${loc.id}`,
            type: 'home',
            label: 'Primary Location',
            detail: loc.name,
            date: null,
            lat: Number(loc.latitude),
            lng: Number(loc.longitude),
          });
        }
      }

      // 2. Owner location
      if (ownerId) {
        const { data: owner } = await supabase
          .from('owners')
          .select('id, name, primary_location_id, precise_lat, precise_lng, location:locations!primary_location_id(id, name, latitude, longitude)')
          .eq('id', ownerId)
          .single();
        if (owner) {
          const loc = Array.isArray(owner.location) ? owner.location[0] : owner.location;
          const lat = owner.precise_lat ?? loc?.latitude;
          const lng = owner.precise_lng ?? loc?.longitude;
          if (lat && lng) {
            allPins.push({
              id: `owner-${owner.id}`,
              type: 'owner',
              label: 'Owner Location',
              detail: owner.name + (loc?.name ? ` — ${loc.name}` : ''),
              date: null,
              lat: Number(lat),
              lng: Number(lng),
            });
          }
        }
      }

      // 3. Care events at outreach locations
      const { data: careEvents } = await supabase
        .from('care_events')
        .select('id, event_date, care_types, outreach_event_id, location_id, outreach_event:outreach_events(location_id, location:locations(id, name, latitude, longitude)), direct_location:locations!location_id(id, name, latitude, longitude)')
        .eq('animal_id', animalId)
        .order('event_date', { ascending: false });

      const seenLocDates = new Set<string>();
      (careEvents ?? []).forEach((ce: any) => {
        const outreach = Array.isArray(ce.outreach_event) ? ce.outreach_event[0] : ce.outreach_event;
        const loc = outreach?.location
          ? (Array.isArray(outreach.location) ? outreach.location[0] : outreach.location)
          : (Array.isArray(ce.direct_location) ? ce.direct_location[0] : ce.direct_location);

        if (!loc?.latitude || !loc?.longitude) return;
        const key = `${loc.id}-${ce.event_date}`;
        if (seenLocDates.has(key)) return;
        seenLocDates.add(key);

        const types = (ce.care_types ?? []).map((t: string) => t.replace(/_/g, ' ')).join(', ');
        allPins.push({
          id: `care-${ce.id}`,
          type: 'outreach',
          label: loc.name,
          detail: types || 'Seen at outreach',
          date: ce.event_date,
          lat: Number(loc.latitude),
          lng: Number(loc.longitude),
        });
      });

      // 4. Field notes with locations
      const { data: notes } = await supabase
        .from('field_notes')
        .select('id, content, created_at, location:locations!location_id(id, name, latitude, longitude)')
        .eq('animal_id', animalId)
        .not('location_id', 'is', null)
        .order('created_at', { ascending: false });

      (notes ?? []).forEach((fn: any) => {
        const loc = Array.isArray(fn.location) ? fn.location[0] : fn.location;
        if (!loc?.latitude || !loc?.longitude) return;
        allPins.push({
          id: `note-${fn.id}`,
          type: 'note',
          label: loc.name,
          detail: fn.content?.length > 60 ? fn.content.slice(0, 60) + '...' : fn.content,
          date: fn.created_at,
          lat: Number(loc.latitude),
          lng: Number(loc.longitude),
        });
      });

      setPins(allPins);
    } catch (err: any) {
      setError(err.message ?? 'Failed to load location data');
    }
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-night/5 p-8 flex items-center justify-center gap-2 text-muted text-sm">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading map...
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl border border-night/5 p-8 text-center">
        <MapPin className="w-8 h-8 text-muted/40 mx-auto mb-2" />
        <p className="text-sm text-ember">{error}</p>
      </div>
    );
  }

  if (pins.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-night/5 p-8 text-center">
        <MapPin className="w-8 h-8 text-muted/40 mx-auto mb-2" />
        <p className="text-sm text-muted">No location data available</p>
        <p className="text-xs text-muted/60 mt-1">GPS coordinates are needed on the animal's location, owner, or outreach events to show the map.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-night/5 overflow-hidden">
      <div className="px-5 pt-4 pb-2">
        <h2 className="font-heading font-bold text-night text-sm">Sighting Map</h2>
      </div>
      <div className="h-64 md:h-80">
        <Suspense fallback={
          <div className="h-full flex items-center justify-center text-muted text-sm gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading map...
          </div>
        }>
          <MapInner pins={pins} />
        </Suspense>
      </div>
      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 px-5 py-2.5 border-t border-night/5 text-xs text-muted">
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#6EA832]" /> Home</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#E8A317]" /> Owner</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#3B82F6]" /> Outreach</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#F97316]" /> Field Note</span>
      </div>
    </div>
  );
}
