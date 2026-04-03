import { useEffect, useState } from 'react';
import { X, Loader2, PawPrint, Package, Syringe, Scissors, MapPin, Users, Printer } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatDate } from '../../lib/format';
import { EVENT_TYPE_CONFIG } from '../../lib/constants';

interface Props {
  dayGroupId: string;
  dayGroupLabel: string;
  eventDate: string;
  onClose: () => void;
}

interface EventSummary {
  id: string;
  event_type: string;
  location_name: string;
  animals_seen: number;
  total_bags: number;
  total_food_lbs: number;
  vaccinations: number;
  microchips: number;
  preventatives: number;
  spay_neuter: number;
  volunteer_count: number;
  volunteers: string[];
}

export default function DayReportModal({ dayGroupId, dayGroupLabel, eventDate, onClose }: Props) {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<EventSummary[]>([]);

  useEffect(() => {
    loadData();
  }, [dayGroupId]);

  async function loadData() {
    setLoading(true);
    const { data: rawEvents } = await supabase
      .from('outreach_events')
      .select('id, event_type, animals_seen, total_bags, total_food_lbs, vaccinations_given, microchips_given, preventatives_given, spay_neuter_count, location:locations(name)')
      .eq('day_group_id', dayGroupId);

    const eventIds = (rawEvents ?? []).map((e: any) => e.id);
    const [volRes, careRes] = await Promise.all([
      supabase.from('outreach_event_volunteers').select('outreach_event_id, name_override, user:users(name)').in('outreach_event_id', eventIds),
      supabase.from('care_events').select('outreach_event_id, animal_id').in('outreach_event_id', eventIds),
    ]);

    const volByEvent: Record<string, string[]> = {};
    (volRes.data ?? []).forEach((v: any) => {
      const eid = v.outreach_event_id;
      if (!volByEvent[eid]) volByEvent[eid] = [];
      const name = v.name_override || (Array.isArray(v.user) ? v.user[0]?.name : v.user?.name) || 'Unknown';
      volByEvent[eid].push(name);
    });

    const animalsByEvent: Record<string, Set<string>> = {};
    (careRes.data ?? []).forEach((c: any) => {
      if (c.outreach_event_id && c.animal_id) {
        if (!animalsByEvent[c.outreach_event_id]) animalsByEvent[c.outreach_event_id] = new Set();
        animalsByEvent[c.outreach_event_id].add(c.animal_id);
      }
    });

    setEvents((rawEvents ?? []).map((e: any) => ({
      id: e.id,
      event_type: e.event_type,
      location_name: (Array.isArray(e.location) ? e.location[0]?.name : e.location?.name) ?? 'Unknown',
      animals_seen: e.animals_seen ?? animalsByEvent[e.id]?.size ?? 0,
      total_bags: e.total_bags ?? 0,
      total_food_lbs: e.total_food_lbs ?? 0,
      vaccinations: e.vaccinations_given ?? 0,
      microchips: e.microchips_given ?? 0,
      preventatives: e.preventatives_given ?? 0,
      spay_neuter: e.spay_neuter_count ?? 0,
      volunteer_count: volByEvent[e.id]?.length ?? 0,
      volunteers: volByEvent[e.id] ?? [],
    })));
    setLoading(false);
  }

  const totals = events.reduce((acc, e) => ({
    animals: acc.animals + e.animals_seen,
    bags: acc.bags + e.total_bags,
    lbs: acc.lbs + e.total_food_lbs,
    vax: acc.vax + e.vaccinations,
    mc: acc.mc + e.microchips,
    prev: acc.prev + e.preventatives,
    sn: acc.sn + e.spay_neuter,
  }), { animals: 0, bags: 0, lbs: 0, vax: 0, mc: 0, prev: 0, sn: 0 });

  const allVolunteers = [...new Set(events.flatMap((e) => e.volunteers))];

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true">
      <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-night/5 shrink-0">
          <div>
            <h2 className="text-lg font-heading font-bold text-night">{dayGroupLabel}</h2>
            <p className="text-xs text-muted">{formatDate(eventDate)} · {events.length} stop{events.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="p-2 rounded-lg hover:bg-sand transition-colors"
              title="Print report"
            >
              <Printer className="w-4 h-4 text-muted" />
            </button>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-sand transition-colors">
              <X className="w-4 h-4 text-muted" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
          </div>
        ) : (
          <div className="overflow-y-auto flex-1 p-5 day-report-content">
            {/* Combined totals */}
            <div className="grid grid-cols-2 gap-2 mb-5">
              {totals.animals > 0 && (
                <div className="flex items-center gap-2 bg-sand/60 rounded-xl px-3 py-2">
                  <PawPrint className="w-4 h-4 text-primary" />
                  <span className="text-sm font-bold text-night">{totals.animals}</span>
                  <span className="text-xs text-muted">animals</span>
                </div>
              )}
              {(totals.bags > 0 || totals.lbs > 0) && (
                <div className="flex items-center gap-2 bg-sand/60 rounded-xl px-3 py-2">
                  <Package className="w-4 h-4 text-primary" />
                  <span className="text-sm font-bold text-night">{totals.bags > 0 ? `${totals.bags} bags` : `${totals.lbs} lbs`}</span>
                </div>
              )}
              {totals.vax > 0 && (
                <div className="flex items-center gap-2 bg-sand/60 rounded-xl px-3 py-2">
                  <Syringe className="w-4 h-4 text-primary" />
                  <span className="text-sm font-bold text-night">{totals.vax}</span>
                  <span className="text-xs text-muted">vaccines</span>
                </div>
              )}
              {totals.sn > 0 && (
                <div className="flex items-center gap-2 bg-sand/60 rounded-xl px-3 py-2">
                  <Scissors className="w-4 h-4 text-primary" />
                  <span className="text-sm font-bold text-night">{totals.sn}</span>
                  <span className="text-xs text-muted">spay/neuter</span>
                </div>
              )}
            </div>

            {/* Volunteers */}
            {allVolunteers.length > 0 && (
              <div className="mb-5">
                <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Volunteers</p>
                <div className="flex flex-wrap gap-1.5">
                  {allVolunteers.map((name) => (
                    <span key={name} className="inline-flex items-center gap-1 bg-sand rounded-full px-2.5 py-1 text-xs text-night">
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Per-event breakdown */}
            <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">By Stop</p>
            <div className="space-y-3">
              {events.map((e) => {
                const cfg = EVENT_TYPE_CONFIG[e.event_type] ?? EVENT_TYPE_CONFIG.other;
                return (
                  <div key={e.id} className="bg-sand/30 rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
                      <span className="text-xs text-muted flex items-center gap-1"><MapPin className="w-3 h-3" /> {e.location_name}</span>
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-muted">
                      {e.animals_seen > 0 && <span className="flex items-center gap-1"><PawPrint className="w-3 h-3" /> {e.animals_seen} animals</span>}
                      {e.total_bags > 0 && <span className="flex items-center gap-1"><Package className="w-3 h-3" /> {e.total_bags} bags</span>}
                      {e.total_food_lbs > 0 && !e.total_bags && <span className="flex items-center gap-1"><Package className="w-3 h-3" /> {e.total_food_lbs} lbs</span>}
                      {e.vaccinations > 0 && <span>{e.vaccinations} vaccines</span>}
                      {e.spay_neuter > 0 && <span>{e.spay_neuter} S/N</span>}
                      {e.volunteer_count > 0 && <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {e.volunteer_count}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
