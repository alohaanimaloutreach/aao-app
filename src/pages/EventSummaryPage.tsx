import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarHeart,
  MapPin,
  Users,
  PawPrint,
  Package,
  Syringe,
  Pill,
  Scissors,
  Stethoscope,
  Sparkles,
  Mail,
  Loader2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { formatDate } from '../lib/format';
import FileAttachments from '../components/shared/FileAttachments';
import MapIframe from '../components/shared/MapIframe';

interface EventDetail {
  id: string;
  event_type: string;
  event_date: string;
  status: string;
  notes: string | null;
  location: { id: string; name: string; latitude: number | null; longitude: number | null } | null;
}

interface CareEvent {
  id: string;
  animal_id: string;
  owner_id: string;
  care_types: string[];
  food_bags: number | null;
  food_lbs: number | null;
  vaccine_lot_dapp: string | null;
  vaccine_lot_parvo: string | null;
  preventative_product: string | null;
  health_notes: string | null;
  other_notes: string | null;
  animal: { name: string | null; aao_id: string } | null;
  owner: { name: string } | null;
}

interface Volunteer {
  user: { name: string } | null;
}

const CARE_LABELS: Record<string, string> = {
  food: 'Food',
  vaccine_dapp: 'DAPP Vaccine',
  vaccine_parvo: 'Parvo Vaccine',
  preventative_oral: 'Preventative (Oral)',
  preventative_topical: 'Preventative (Topical)',
  spay_neuter: 'Spay/Neuter',
  medical: 'Medical/Vet',
  grooming: 'Grooming/Bath',
  nail_trim: 'Nail Trim',
  microchip: 'Microchip',
  seen: 'Seen',
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  monthly_outreach: 'Monthly Outreach',
  spay_neuter_clinic: 'Spay/Neuter Clinic',
  vaccination_clinic: 'Vaccination Clinic',
  emergency: 'Emergency',
};

export default function EventSummaryPage() {
  const { id } = useParams<{ id: string }>();
  const { session, user } = useAuth();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [careEvents, setCareEvents] = useState<CareEvent[]>([]);
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [loading, setLoading] = useState(true);
  const [emailing, setEmailing] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  useEffect(() => {
    if (session && id) loadData();
  }, [session, id]);

  async function loadData() {
    setLoading(true);
    const [eventRes, careRes, volRes] = await Promise.all([
      supabase
        .from('outreach_events')
        .select('id, event_type, event_date, status, notes, location:locations(id, name, latitude, longitude)')
        .eq('id', id!)
        .single(),
      supabase
        .from('care_events')
        .select('id, animal_id, owner_id, care_types, food_bags, food_lbs, vaccine_lot_dapp, vaccine_lot_parvo, preventative_product, health_notes, other_notes, animal:animals(name, aao_id), owner:owners(name)')
        .eq('outreach_event_id', id!),
      supabase
        .from('outreach_event_volunteers')
        .select('user:users(name)')
        .eq('outreach_event_id', id!),
    ]);

    if (eventRes.data) {
      const e = eventRes.data as any;
      setEvent({ ...e, location: Array.isArray(e.location) ? e.location[0] ?? null : e.location });
    }
    setCareEvents((careRes.data ?? []).map((c: any) => ({
      ...c,
      animal: Array.isArray(c.animal) ? c.animal[0] ?? null : c.animal,
      owner: Array.isArray(c.owner) ? c.owner[0] ?? null : c.owner,
    })));
    setVolunteers((volRes.data ?? []).map((v: any) => ({
      user: Array.isArray(v.user) ? v.user[0] ?? null : v.user,
    })));
    setLoading(false);
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

  // Compute stats
  const uniqueOwners = new Set(careEvents.map((c) => c.owner_id));
  const uniqueAnimals = new Set(careEvents.map((c) => c.animal_id));
  const totalFoodBags = careEvents.reduce((sum, c) => sum + (c.food_bags ?? 0), 0);
  const totalFoodLbs = careEvents.reduce((sum, c) => sum + (c.food_lbs ?? 0), 0);

  // Count by care type
  const typeCounts: Record<string, number> = {};
  careEvents.forEach((c) => {
    c.care_types.forEach((t) => {
      typeCounts[t] = (typeCounts[t] ?? 0) + 1;
    });
  });

  // Group care events by owner
  const byOwner: Record<string, { ownerName: string; animals: CareEvent[] }> = {};
  careEvents.forEach((c) => {
    const key = c.owner_id;
    if (!byOwner[key]) {
      byOwner[key] = { ownerName: c.owner?.name ?? 'Unknown', animals: [] };
    }
    byOwner[key].animals.push(c);
  });

  const volunteerNames = volunteers.map((v) => v.user?.name ?? 'Unknown');

  const eventTypeLabel = EVENT_TYPE_LABELS[event.event_type] || event.event_type.replace(/_/g, ' ');

  function buildEmailBody(): string {
    let body = `Event Summary\n\n`;
    body += `Date: ${formatDate(event!.event_date)}\n`;
    body += `Location: ${event!.location?.name ?? 'Unknown'}\n`;
    body += `Volunteers: ${volunteerNames.join(', ')}\n\n`;
    body += `Totals\n`;
    body += `Owners seen: ${uniqueOwners.size}\n`;
    body += `Animals seen: ${uniqueAnimals.size}\n`;
    body += `Food: ${totalFoodBags} bags (${totalFoodLbs} lbs)\n`;
    Object.entries(typeCounts).filter(([k]) => k !== 'food' && k !== 'seen').forEach(([k, v]) => {
      body += `${CARE_LABELS[k] ?? k}: ${v}\n`;
    });
    body += `\nDetails\n`;
    Object.values(byOwner).forEach(({ ownerName, animals }) => {
      body += `\n${ownerName}:\n`;
      animals.forEach((c) => {
        const name = c.animal?.name || c.animal?.aao_id || 'Unnamed animal';
        const services = c.care_types.map((t) => CARE_LABELS[t] ?? t).join(', ');
        body += `  ${name} (${c.animal?.aao_id}): ${services}\n`;
      });
    });
    return body;
  }

  async function sendEmailSummary() {
    setEmailing(true);
    const body = buildEmailBody();
    const subject = `AAO Event Summary: ${formatDate(event!.event_date)} at ${event!.location?.name ?? 'Unknown'}`;
    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
    setEmailing(false);
    setEmailSent(true);
  }

  // Build stats items array
  const statItems: { icon: any; label: string; value: number; sub?: string }[] = [
    { icon: Users, label: 'Owners', value: uniqueOwners.size },
    { icon: PawPrint, label: 'Animals', value: uniqueAnimals.size },
  ];
  if (totalFoodBags > 0) statItems.push({ icon: Package, label: 'Food bags', value: totalFoodBags, sub: totalFoodLbs > 0 ? `${totalFoodLbs} lbs` : undefined });
  const vaccineCount = (typeCounts.vaccine_dapp ?? 0) + (typeCounts.vaccine_parvo ?? 0);
  if (vaccineCount > 0) statItems.push({ icon: Syringe, label: 'Vaccines', value: vaccineCount });
  const prevCount = (typeCounts.preventative_oral ?? 0) + (typeCounts.preventative_topical ?? 0);
  if (prevCount > 0) statItems.push({ icon: Pill, label: 'Preventatives', value: prevCount });
  if ((typeCounts.spay_neuter ?? 0) > 0) statItems.push({ icon: Scissors, label: 'Spay/Neuter', value: typeCounts.spay_neuter });
  if ((typeCounts.medical ?? 0) > 0) statItems.push({ icon: Stethoscope, label: 'Medical', value: typeCounts.medical });
  const groomCount = (typeCounts.grooming ?? 0) + (typeCounts.nail_trim ?? 0);
  if (groomCount > 0) statItems.push({ icon: Sparkles, label: 'Grooming', value: groomCount });

  return (
    <div className="max-w-2xl mx-auto">
      <Link to="/outreach" className="inline-flex items-center gap-1 text-sm text-muted hover:text-night mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Outreach
      </Link>

      {/* Hero header card */}
      <div className="bg-gradient-to-br from-night to-night/90 rounded-2xl p-5 mb-4 text-white shadow-[0_4px_20px_rgba(28,23,8,0.15)]">
        <div className="flex items-start justify-between mb-3">
          <div>
            <span className="inline-flex items-center gap-1 text-xs font-medium bg-white/15 backdrop-blur-sm rounded-full px-2.5 py-1 mb-2 capitalize">
              <CalendarHeart className="w-3 h-3" /> {eventTypeLabel}
            </span>
            <h1 className="text-xl font-heading font-bold">
              {event.location?.name ?? 'Event Summary'}
            </h1>
            <p className="text-white/60 text-sm mt-0.5">{formatDate(event.event_date)}</p>
          </div>
          {event.status === 'completed' && (
            <span className="text-xs font-medium bg-primary/20 text-primary-foreground border border-primary/30 rounded-full px-2.5 py-1">
              Complete
            </span>
          )}
        </div>

        {/* Inline stats row */}
        <div className="flex items-center gap-4 mt-4 pt-3 border-t border-white/10">
          <div className="flex items-center gap-1.5">
            <Users className="w-4 h-4 text-white/50" />
            <span className="text-lg font-bold">{uniqueOwners.size}</span>
            <span className="text-xs text-white/50">owners</span>
          </div>
          <div className="flex items-center gap-1.5">
            <PawPrint className="w-4 h-4 text-white/50" />
            <span className="text-lg font-bold">{uniqueAnimals.size}</span>
            <span className="text-xs text-white/50">animals</span>
          </div>
          {totalFoodBags > 0 && (
            <div className="flex items-center gap-1.5">
              <Package className="w-4 h-4 text-white/50" />
              <span className="text-lg font-bold">{totalFoodBags}</span>
              <span className="text-xs text-white/50">bags</span>
            </div>
          )}
        </div>

        {volunteerNames.length > 0 && (
          <div className="mt-3 pt-3 border-t border-white/10">
            <p className="text-xs text-white/40 mb-1">Volunteers</p>
            <p className="text-sm text-white/80">{volunteerNames.join(', ')}</p>
          </div>
        )}
      </div>

      {/* Location map */}
      {event.location?.latitude && event.location?.longitude && (
        <div className="bg-white rounded-2xl border border-night/5 overflow-hidden mb-3 shadow-sm">
          <MapIframe
            title="Event location"
            height={160}
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${event.location.longitude - 0.005},${event.location.latitude - 0.003},${event.location.longitude + 0.005},${event.location.latitude + 0.003}&layer=mapnik&marker=${event.location.latitude},${event.location.longitude}`}
          />
          <div className="flex items-center justify-between px-4 py-2.5">
            <div className="flex items-center gap-1.5 text-sm text-night">
              <MapPin className="w-3.5 h-3.5 text-primary" />
              <span className="font-medium">{event.location.name}</span>
            </div>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${event.location.latitude},${event.location.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              Directions <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      )}

      {/* Service breakdown pills */}
      {statItems.length > 2 && (
        <div className="bg-white rounded-2xl border border-night/5 p-4 mb-3 shadow-sm">
          <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Services Provided</p>
          <div className="flex flex-wrap gap-2">
            {statItems.slice(2).map((s) => (
              <div key={s.label} className="inline-flex items-center gap-2 bg-sand/60 rounded-xl px-3 py-2">
                <s.icon className="w-4 h-4 text-primary" strokeWidth={1.75} />
                <span className="text-sm font-semibold text-night">{s.value}</span>
                <span className="text-xs text-muted">{s.label}</span>
                {s.sub && <span className="text-xs text-muted">({s.sub})</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Owner details — collapsible */}
      <OwnerDetails byOwner={byOwner} />

      {/* Notes */}
      {event.notes && (
        <div className="bg-white rounded-2xl border border-night/5 p-4 mb-3 shadow-sm">
          <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Notes</p>
          <p className="text-sm text-night leading-relaxed">{event.notes}</p>
        </div>
      )}

      {/* Attachments */}
      <div className="mb-3">
        <FileAttachments outreachEventId={event.id} />
      </div>

      {/* Email summary */}
      <button
        onClick={sendEmailSummary}
        disabled={emailing || emailSent}
        className="w-full py-3 bg-white border border-night/8 rounded-xl text-sm font-medium text-night hover:bg-sand flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-sm mb-4"
      >
        <Mail className="w-4 h-4" />
        {emailSent ? 'Email opened' : 'Email Summary'}
      </button>
    </div>
  );
}

function OwnerDetails({ byOwner }: { byOwner: Record<string, { ownerName: string; animals: CareEvent[] }> }) {
  const [expanded, setExpanded] = useState(false);
  const entries = Object.entries(byOwner);

  if (entries.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-night/5 mb-3 overflow-hidden shadow-sm">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full px-4 py-3.5 text-left"
      >
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" strokeWidth={1.75} />
          <span className="text-sm font-semibold text-night">Details by Owner</span>
          <span className="text-xs bg-sand text-muted rounded-full px-2 py-0.5 font-medium">{entries.length}</span>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-muted" /> : <ChevronDown className="w-4 h-4 text-muted" />}
      </button>

      {expanded && (
        <div className="border-t border-night/5 divide-y divide-night/5">
          {entries.map(([ownerId, { ownerName, animals }]) => (
            <div key={ownerId} className="px-4 py-3">
              <div className="flex items-center justify-between mb-1">
                {ownerId ? (
                  <Link to={`/people/${ownerId}`} className="text-sm font-semibold text-primary hover:underline">{ownerName}</Link>
                ) : (
                  <span className="text-sm font-medium text-muted italic">No owner linked</span>
                )}
                <span className="text-xs text-muted bg-sand rounded-full px-2 py-0.5">{animals.length} {animals.length === 1 ? 'animal' : 'animals'}</span>
              </div>
              <div className="space-y-1">
                {animals.map((c) => (
                  <div key={c.id} className="flex items-start gap-2 text-sm">
                    <PawPrint className="w-3 h-3 text-muted shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      {c.animal_id ? (
                        <Link to={`/animals/${c.animal_id}`} className="font-medium text-night hover:text-primary">
                          {c.animal?.name || c.animal?.aao_id || 'Unnamed'}
                        </Link>
                      ) : (
                        <span className="text-muted italic">No animal linked</span>
                      )}
                      <span className="text-muted text-xs ml-1.5">
                        {c.care_types.map((t) => CARE_LABELS[t] ?? t).join(', ')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
