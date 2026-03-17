import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { CalendarHeart, Plus, MapPin, Users, PawPrint, Package, Play } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useTestMode } from '../lib/testMode';
import { formatDate } from '../lib/format';
import EmptyState from '../components/shared/EmptyState';
import EventSetup from '../components/outreach/EventSetup';

interface OutreachEventRow {
  id: string;
  event_type: string;
  event_date: string;
  status: string;
  notes: string | null;
  total_food_lbs: number | null;
  total_bags: number | null;
  location: { name: string } | null;
  volunteer_count: number;
  animal_count: number;
}

export default function OutreachPage() {
  const { session } = useAuth();
  const { testMode } = useTestMode();
  const navigate = useNavigate();
  const [events, setEvents] = useState<OutreachEventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSetup, setShowSetup] = useState(false);

  useEffect(() => {
    if (session) loadEvents();
  }, [session, testMode]);

  async function loadEvents() {
    setLoading(true);

    let eventsQuery = supabase
      .from('outreach_events')
      .select('id, event_type, event_date, status, notes, total_food_lbs, total_bags, location:locations(name)')
      .order('event_date', { ascending: false });
    if (!testMode) eventsQuery = eventsQuery.eq('is_test', false);

    const [eventRes, volRes, careRes] = await Promise.all([
      eventsQuery,
      supabase.from('outreach_event_volunteers').select('outreach_event_id'),
      supabase.from('care_events').select('outreach_event_id, animal_id').not('outreach_event_id', 'is', null),
    ]);

    const volCounts: Record<string, number> = {};
    (volRes.data ?? []).forEach((v: any) => {
      volCounts[v.outreach_event_id] = (volCounts[v.outreach_event_id] ?? 0) + 1;
    });

    const animalSets: Record<string, Set<string>> = {};
    (careRes.data ?? []).forEach((c: any) => {
      if (c.outreach_event_id && c.animal_id) {
        if (!animalSets[c.outreach_event_id]) animalSets[c.outreach_event_id] = new Set();
        animalSets[c.outreach_event_id].add(c.animal_id);
      }
    });

    const rows: OutreachEventRow[] = (eventRes.data ?? []).map((e: any) => ({
      ...e,
      volunteer_count: volCounts[e.id] ?? 0,
      animal_count: animalSets[e.id]?.size ?? 0,
    }));

    setEvents(rows);
    setLoading(false);
  }

  function handleEventCreated(eventId: string) {
    setShowSetup(false);
    navigate(`/outreach/event/${eventId}`);
  }

  const activeEvents = events.filter((e) => e.status === 'active');
  const pastEvents = events.filter((e) => e.status !== 'active');

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-heading text-night tracking-tight">Outreach</h1>
          <p className="text-muted mt-0.5">Check-in desk and event management</p>
        </div>
        <button
          onClick={() => setShowSetup(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-hover text-white text-sm font-semibold rounded-xl shadow-[0_2px_8px_rgba(110,168,50,0.25)] hover:shadow-[0_4px_12px_rgba(110,168,50,0.35)] transition-all"
        >
          <Plus className="w-4 h-4" strokeWidth={2.5} />
          Start Event
        </button>
      </div>

      {/* Active events */}
      {activeEvents.length > 0 && (
        <div className="mb-6">
          <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-2">Active</p>
          <div className="space-y-2">
            {activeEvents.map((e) => (
              <Link
                key={e.id}
                to={`/outreach/event/${e.id}`}
                className="block bg-primary/5 rounded-2xl border-2 border-primary/20 p-4 hover:border-primary/30 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                    <Play className="w-5 h-5 text-primary" fill="currentColor" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-heading font-bold text-sm text-night">
                      {e.event_type.replace(/_/g, ' ')} (active)
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      {e.location?.name && (
                        <span className="inline-flex items-center gap-1 text-xs text-muted">
                          <MapPin className="w-3 h-3" /> {e.location.name}
                        </span>
                      )}
                      <span className="text-xs text-muted">{formatDate(e.event_date)}</span>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-primary">Resume</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Past events */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-night/5 p-4">
              <div className="flex gap-3">
                <div className="skeleton w-11 h-11 rounded-xl shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-4 w-40" />
                  <div className="skeleton h-3 w-28" />
                  <div className="flex gap-2">
                    <div className="skeleton h-5 w-16" />
                    <div className="skeleton h-5 w-16" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : pastEvents.length === 0 && activeEvents.length === 0 ? (
        <EmptyState
          icon={CalendarHeart}
          title="No outreach events yet"
          description="Tap Start Event to begin your first outreach"
          iconColor="text-primary"
        />
      ) : (
        <>
          {pastEvents.length > 0 && (
            <div>
              {activeEvents.length > 0 && (
                <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Past Events</p>
              )}
              <div className="space-y-3">
                {pastEvents.map((e) => (
                  <Link
                    key={e.id}
                    to={`/outreach/summary/${e.id}`}
                    className="block bg-white rounded-2xl border border-night/5 p-4 card-hover"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <CalendarHeart className="w-5 h-5 text-primary" strokeWidth={1.5} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-heading font-bold text-sm text-night capitalize">
                          {e.event_type.replace(/_/g, ' ')}
                        </h3>
                        <p className="text-xs text-muted mt-0.5">{formatDate(e.event_date)}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          {e.location?.name && (
                            <span className="inline-flex items-center gap-1 text-xs text-muted bg-sand rounded-full px-2 py-0.5">
                              <MapPin className="w-3 h-3" /> {e.location.name}
                            </span>
                          )}
                          {e.volunteer_count > 0 && (
                            <span className="inline-flex items-center gap-1 text-xs text-muted bg-sand rounded-full px-2 py-0.5">
                              <Users className="w-3 h-3" /> {e.volunteer_count}
                            </span>
                          )}
                          {e.animal_count > 0 && (
                            <span className="inline-flex items-center gap-1 text-xs text-primary font-medium bg-primary/8 rounded-full px-2 py-0.5">
                              <PawPrint className="w-3 h-3" /> {e.animal_count} animal{e.animal_count !== 1 ? 's' : ''}
                            </span>
                          )}
                          {(e.total_bags || e.total_food_lbs) && (
                            <span className="inline-flex items-center gap-1 text-xs text-muted bg-sand rounded-full px-2 py-0.5">
                              <Package className="w-3 h-3" />
                              {e.total_bags ? `${e.total_bags} bags` : ''}{e.total_bags && e.total_food_lbs ? ', ' : ''}{e.total_food_lbs ? `${e.total_food_lbs} lbs` : ''}
                            </span>
                          )}
                        </div>
                        {e.notes && (
                          <p className="text-xs text-muted mt-2 line-clamp-2">{e.notes}</p>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {showSetup && <EventSetup onCreated={handleEventCreated} onCancel={() => setShowSetup(false)} />}
    </div>
  );
}
