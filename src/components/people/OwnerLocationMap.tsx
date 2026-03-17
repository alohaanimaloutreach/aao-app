import { useEffect, useState, lazy, Suspense } from 'react';
import { supabase } from '../../lib/supabase';
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
  ownerId: string;
  primaryLocationId: string | null;
  preciseLat: number | null;
  preciseLng: number | null;
  animalIds: string[];
}

const MapInner = lazy(() => import('../animals/DogLocationMapInner'));

export default function OwnerLocationMap({ ownerId, primaryLocationId, preciseLat, preciseLng, animalIds }: Props) {
  const [pins, setPins] = useState<LocationPin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLocations();
  }, [ownerId]);

  async function loadLocations() {
    setLoading(true);
    const allPins: LocationPin[] = [];

    // 1. Owner's location (precise or from primary_location)
    if (preciseLat && preciseLng) {
      allPins.push({
        id: `owner-precise`,
        type: 'owner',
        label: 'Owner Location',
        detail: 'Precise pin',
        date: null,
        lat: Number(preciseLat),
        lng: Number(preciseLng),
      });
    } else if (primaryLocationId) {
      const { data: loc } = await supabase
        .from('locations')
        .select('id, name, latitude, longitude')
        .eq('id', primaryLocationId)
        .single();
      if (loc?.latitude && loc?.longitude) {
        allPins.push({
          id: `owner-loc`,
          type: 'owner',
          label: 'Owner Location',
          detail: loc.name,
          date: null,
          lat: Number(loc.latitude),
          lng: Number(loc.longitude),
        });
      }
    }

    // 2. Animals' primary locations
    if (animalIds.length > 0) {
      const { data: animals } = await supabase
        .from('animals')
        .select('id, name, aao_id, primary_location_id, location:locations!primary_location_id(id, name, latitude, longitude)')
        .in('id', animalIds);

      const seenLocs = new Set<string>();
      (animals ?? []).forEach((a: any) => {
        const loc = Array.isArray(a.location) ? a.location[0] : a.location;
        if (!loc?.latitude || !loc?.longitude) return;
        if (seenLocs.has(loc.id)) return;
        seenLocs.add(loc.id);
        allPins.push({
          id: `animal-loc-${a.id}`,
          type: 'home',
          label: a.name ?? a.aao_id,
          detail: loc.name,
          date: null,
          lat: Number(loc.latitude),
          lng: Number(loc.longitude),
        });
      });

      // 3. Outreach events where their animals were seen
      const { data: careEvents } = await supabase
        .from('care_events')
        .select('id, animal_id, event_date, care_types, outreach_event:outreach_events(location_id, location:locations(id, name, latitude, longitude))')
        .in('animal_id', animalIds)
        .not('outreach_event_id', 'is', null)
        .order('event_date', { ascending: false });

      const seenLocDates = new Set<string>();
      (careEvents ?? []).forEach((ce: any) => {
        const outreach = Array.isArray(ce.outreach_event) ? ce.outreach_event[0] : ce.outreach_event;
        const loc = outreach?.location
          ? (Array.isArray(outreach.location) ? outreach.location[0] : outreach.location)
          : null;
        if (!loc?.latitude || !loc?.longitude) return;
        const key = `${loc.id}-${ce.event_date}`;
        if (seenLocDates.has(key)) return;
        seenLocDates.add(key);

        const types = (ce.care_types ?? []).map((t: string) => t.replace(/_/g, ' ')).join(', ');
        allPins.push({
          id: `care-${ce.id}`,
          type: 'outreach',
          label: loc.name,
          detail: types || 'Outreach visit',
          date: ce.event_date,
          lat: Number(loc.latitude),
          lng: Number(loc.longitude),
        });
      });
    }

    // 4. Field notes with locations
    const { data: notes } = await supabase
      .from('field_notes')
      .select('id, content, created_at, location:locations!location_id(id, name, latitude, longitude)')
      .eq('owner_id', ownerId)
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

  if (pins.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-night/5 p-8 text-center">
        <MapPin className="w-8 h-8 text-muted/40 mx-auto mb-2" />
        <p className="text-sm text-muted">No location data available</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-night/5 overflow-hidden">
      <div className="px-5 pt-4 pb-2">
        <h2 className="font-heading font-bold text-night text-sm">Location Map</h2>
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
      <div className="flex flex-wrap gap-x-4 gap-y-1 px-5 py-2.5 border-t border-night/5 text-xs text-muted">
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#E8A317]" /> Owner</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#6EA832]" /> Animal Home</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#3B82F6]" /> Outreach</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#F97316]" /> Field Note</span>
      </div>
    </div>
  );
}
