import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Loader2,
  MapPin,
  Calendar,
  CheckCircle2,
  Eye,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { formatDate } from '../lib/format';

import CheckInDesk from '../components/outreach/CheckInDesk';
import VetQueue from '../components/outreach/VetQueue';
import CompletedList from '../components/outreach/CompletedList';
import LogSightingDrawer from '../components/outreach/LogSightingDrawer';

interface EventInfo {
  id: string;
  event_type: string;
  event_date: string;
  status: string;
  location: { id: string; name: string } | null;
}

export default function ActiveEventPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const { session } = useAuth();

  const navigate = useNavigate();
  const [event, setEvent] = useState<EventInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const initialTab = searchParams.get('tab') === 'queue' ? 'queue' : searchParams.get('tab') === 'complete' ? 'complete' : 'checkin';
  const [tab, setTab] = useState<'checkin' | 'queue' | 'complete'>(initialTab);
  const [queueCount, setQueueCount] = useState(0);
  const [completeCount, setCompleteCount] = useState(0);
  const [endingEvent, setEndingEvent] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [showSighting, setShowSighting] = useState(false);

  useEffect(() => {
    if (session && id) loadEvent();
  }, [session, id]);

  async function loadEvent() {
    const { data } = await supabase
      .from('outreach_events')
      .select('id, event_type, event_date, status, location:locations(id, name)')
      .eq('id', id!)
      .single();
    if (data) {
      const d = data as any;
      setEvent({ ...d, location: Array.isArray(d.location) ? d.location[0] ?? null : d.location });
    } else {
      setEvent(null);
    }
    setLoading(false);
    if (data) loadCounts();
  }

  async function loadCounts() {
    const [waitingRes, completeRes] = await Promise.all([
      supabase.from('checkin_queue').select('id', { count: 'exact', head: true }).eq('outreach_event_id', id!).in('status', ['waiting', 'in_progress']),
      supabase.from('checkin_queue').select('id', { count: 'exact', head: true }).eq('outreach_event_id', id!).eq('status', 'complete'),
    ]);
    setQueueCount(waitingRes.count ?? 0);
    setCompleteCount(completeRes.count ?? 0);
  }

  async function confirmEndEvent() {
    setEndingEvent(true);

    const [{ data: care }, { data: sightings }] = await Promise.all([
      supabase.from('care_events').select('food_bags, food_lbs, care_types, animal_id').eq('outreach_event_id', id!),
      supabase.from('sighting_entries').select('animal_count, care_given').eq('outreach_event_id', id!),
    ]);

    const rows = care ?? [];
    const sRows = sightings ?? [];
    const totalBags = rows.reduce((sum, c) => sum + ((c as any).food_bags ?? 0), 0);
    const totalLbs = rows.reduce((sum, c) => sum + ((c as any).food_lbs ?? 0), 0);
    const uniqueAnimals = new Set(rows.map((c: any) => c.animal_id).filter(Boolean));
    const sightingAnimalCount = sRows.reduce((sum, s: any) => sum + (s.animal_count ?? 1), 0);
    let vaxCount = 0, mcCount = 0, prevCount = 0, snCount = 0, groomCount = 0, nailCount = 0;
    rows.forEach((c: any) => {
      const types: string[] = c.care_types ?? [];
      if (types.some(t => ['vaccine_dapp', 'vaccine_dapp_l', 'vaccine_parvo'].includes(t))) vaxCount++;
      if (types.includes('microchip')) mcCount++;
      if (types.some(t => ['preventative_oral', 'preventative_topical'].includes(t))) prevCount++;
      if (types.includes('spay_neuter')) snCount++;
      if (types.includes('grooming')) groomCount++;
      if (types.includes('nail_trim')) nailCount++;
    });
    // Add sighting counts
    sRows.forEach((s: any) => {
      const cg: string[] = s.care_given ?? [];
      if (cg.includes('vaccine')) vaxCount += (s.animal_count ?? 1);
      if (cg.includes('microchip')) mcCount += (s.animal_count ?? 1);
      if (cg.includes('preventative')) prevCount += (s.animal_count ?? 1);
    });

    await supabase.from('outreach_events').update({
      status: 'completed',
      total_bags: totalBags || null,
      total_food_lbs: totalLbs || null,
      animals_seen: (uniqueAnimals.size + sightingAnimalCount) || null,
      vaccinations_given: vaxCount || null,
      microchips_given: mcCount || null,
      preventatives_given: prevCount || null,
      spay_neuter_count: snCount || null,
      grooming_count: groomCount || null,
      nail_trim_count: nailCount || null,
    }).eq('id', id!);

    // Auto-timeline: for each owner seen in sightings, create care_events
    // for their animals that don't already have one for this event
    const { data: ownerSightings } = await supabase
      .from('sighting_entries')
      .select('owner_id')
      .eq('outreach_event_id', id!)
      .not('owner_id', 'is', null);

    const ownerIds = [...new Set((ownerSightings ?? []).map((s: any) => s.owner_id))];
    if (ownerIds.length > 0 && session?.user) {
      const { data: existingCare } = await supabase
        .from('care_events')
        .select('animal_id')
        .eq('outreach_event_id', id!);
      const coveredAnimals = new Set((existingCare ?? []).map((c: any) => c.animal_id));

      for (const ownerId of ownerIds) {
        const { data: ownerAnimals } = await supabase
          .from('animals')
          .select('id')
          .eq('owner_id', ownerId)
          .eq('archived', false);
        const uncovered = (ownerAnimals ?? []).filter((a: any) => !coveredAnimals.has(a.id));
        if (uncovered.length > 0) {
          await supabase.from('care_events').insert(
            uncovered.map((a: any) => ({
              outreach_event_id: id!,
              animal_id: a.id,
              owner_id: ownerId,
              event_date: event!.event_date,
              care_types: ['food'],
              other_notes: 'Auto-recorded: owner attended this outreach',
              created_by: session.user.id,
            }))
          );
        }
      }
    }

    setEndingEvent(false);
    setShowEndConfirm(false);
    navigate(`/outreach/summary/${id}`);
  }

  function onCheckedIn() {
    loadCounts();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="text-center py-20">
        <p className="text-muted">Event not found</p>
        <Link to="/outreach" className="text-primary text-sm mt-2 inline-block hover:underline">Back to Outreach</Link>
      </div>
    );
  }

  return (
    <div>
      {/* Event header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <Link to="/outreach" className="flex items-center gap-1 text-xs text-muted hover:text-night mb-1">
            <ArrowLeft className="w-3 h-3" /> Outreach
          </Link>
          <h1 className="text-xl font-heading font-bold text-night">Active Event</h1>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            {event.location?.name && (
              <span className="inline-flex items-center gap-1 text-sm text-muted">
                <MapPin className="w-3 h-3" /> {event.location.name}
              </span>
            )}
            <span className="inline-flex items-center gap-1 text-sm text-muted">
              <Calendar className="w-3 h-3" /> {formatDate(event.event_date)}
            </span>
          </div>
        </div>
        <button
          onClick={() => setShowEndConfirm(true)}
          className="px-3 py-2 bg-ember hover:bg-ember/90 rounded-xl text-xs font-semibold text-white transition-all flex items-center gap-1.5 shrink-0"
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          End Event
        </button>
      </div>

      {/* Log Sighting button */}
      <button
        onClick={() => setShowSighting(true)}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 mb-4 rounded-xl bg-primary/10 border border-primary/20 text-primary font-semibold text-sm hover:bg-primary/15 transition-all"
      >
        <Eye className="w-4 h-4" strokeWidth={2} />
        Log Sighting
      </button>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl p-1 mb-4 bg-night/5">
        <button
          onClick={() => setTab('checkin')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
            tab === 'checkin' ? 'bg-white text-night shadow-sm' : 'text-muted'
          }`}
        >
          Check In
        </button>
        <button
          onClick={() => setTab('queue')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${
            tab === 'queue' ? 'bg-white text-night shadow-sm' : 'text-muted'
          }`}
        >
          Queue
          {queueCount > 0 && (
            <span className="text-xs font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">{queueCount}</span>
          )}
        </button>
        <button
          onClick={() => setTab('complete')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${
            tab === 'complete' ? 'bg-white text-night shadow-sm' : 'text-muted'
          }`}
        >
          Complete
          {completeCount > 0 && (
            <span className="text-xs font-bold bg-primary/15 text-primary px-1.5 py-0.5 rounded-full">{completeCount}</span>
          )}
        </button>
      </div>

      {/* Tab content */}
      {tab === 'checkin' ? (
        <CheckInDesk
          eventId={event.id}
          eventLocationId={event.location?.id ?? ''}
          eventDate={event.event_date}
          onCheckedIn={onCheckedIn}
        />
      ) : tab === 'queue' ? (
        <VetQueue
          eventId={event.id}
          eventLocationId={event.location?.id ?? ''}
          eventDate={event.event_date}
        />
      ) : (
        <CompletedList eventId={event.id} />
      )}

      {/* Log Sighting Drawer */}
      <LogSightingDrawer
        open={showSighting}
        onClose={() => setShowSighting(false)}
        eventId={event.id}
        eventLocationId={event.location?.id ?? ''}
        eventDate={event.event_date}
        onSaved={() => loadCounts()}
      />

      {/* End Event Confirmation */}
      {showEndConfirm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="End event confirmation">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-xl">
            <h3 className="text-lg font-heading font-bold text-night mb-2">End this event?</h3>
            <p className="text-sm text-muted mb-5">
              Are you sure you want to end this event? This will finalize the event summary and close the check-in desk and outreach queue. Make sure all services have been logged before ending.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowEndConfirm(false)}
                className="flex-1 py-2.5 bg-sand text-night text-sm font-medium rounded-xl hover:bg-night/8 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={confirmEndEvent}
                disabled={endingEvent}
                className="flex-1 py-2.5 bg-ember hover:bg-ember/90 text-white text-sm font-semibold rounded-xl transition-all disabled:opacity-50"
              >
                {endingEvent ? 'Ending...' : 'End Event'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
