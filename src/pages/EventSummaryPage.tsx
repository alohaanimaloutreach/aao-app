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
  UserCircle,
  ExternalLink,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { formatDate } from '../lib/format';

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
    // Build summary text and send via mailto
    const body = buildEmailBody();
    const subject = `AAO Event Summary: ${formatDate(event!.event_date)} at ${event!.location?.name ?? 'Unknown'}`;
    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
    setEmailing(false);
    setEmailSent(true);
  }

  return (
    <div>
      <Link to="/outreach" className="flex items-center gap-1 text-sm text-muted hover:text-night mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Outreach
      </Link>

      {/* Header */}
      <div className="mb-5">
        <h1 className="text-2xl font-heading font-bold text-night">Event Summary</h1>
        <div className="flex flex-wrap items-center gap-2 mt-1.5">
          <span className="inline-flex items-center gap-1 text-sm text-muted">
            <CalendarHeart className="w-3.5 h-3.5" /> {formatDate(event.event_date)}
          </span>
          {event.location?.name && (
            <span className="inline-flex items-center gap-1 text-sm text-muted">
              <MapPin className="w-3.5 h-3.5" /> {event.location.name}
            </span>
          )}
        </div>
      </div>

      {/* Location map */}
      {event.location?.latitude && event.location?.longitude && (
        <div className="bg-white rounded-xl border border-night/5 overflow-hidden mb-3">
          <iframe
            title="Event location"
            width="100%"
            height="180"
            style={{ border: 0, display: 'block' }}
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${event.location.longitude - 0.005},${event.location.latitude - 0.003},${event.location.longitude + 0.005},${event.location.latitude + 0.003}&layer=mapnik&marker=${event.location.latitude},${event.location.longitude}`}
            loading="lazy"
          />
          <div className="flex items-center justify-between px-3 py-2">
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

      {/* Volunteers */}
      {volunteerNames.length > 0 && (
        <div className="bg-white rounded-xl border border-night/5 p-3 mb-3">
          <div className="flex items-center gap-2 mb-1.5">
            <Users className="w-4 h-4 text-muted" />
            <span className="text-sm font-semibold text-night">Volunteers</span>
          </div>
          <p className="text-sm text-night">{volunteerNames.join(', ')}</p>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <StatCard icon={UserCircle} label="Owners seen" value={uniqueOwners.size} />
        <StatCard icon={PawPrint} label="Animals seen" value={uniqueAnimals.size} />
        <StatCard icon={Package} label="Food bags" value={totalFoodBags} sub={totalFoodLbs > 0 ? `${totalFoodLbs} lbs` : undefined} />
        {(typeCounts.vaccine_dapp ?? 0) + (typeCounts.vaccine_parvo ?? 0) > 0 && (
          <StatCard icon={Syringe} label="Vaccines" value={(typeCounts.vaccine_dapp ?? 0) + (typeCounts.vaccine_parvo ?? 0)} />
        )}
        {(typeCounts.preventative_oral ?? 0) + (typeCounts.preventative_topical ?? 0) > 0 && (
          <StatCard icon={Pill} label="Preventatives" value={(typeCounts.preventative_oral ?? 0) + (typeCounts.preventative_topical ?? 0)} />
        )}
        {(typeCounts.spay_neuter ?? 0) > 0 && (
          <StatCard icon={Scissors} label="Spay/Neuter" value={typeCounts.spay_neuter} />
        )}
        {(typeCounts.medical ?? 0) > 0 && (
          <StatCard icon={Stethoscope} label="Medical/Vet" value={typeCounts.medical} />
        )}
        {((typeCounts.grooming ?? 0) + (typeCounts.nail_trim ?? 0)) > 0 && (
          <StatCard icon={Sparkles} label="Grooming" value={(typeCounts.grooming ?? 0) + (typeCounts.nail_trim ?? 0)} />
        )}
      </div>

      {/* Owner details */}
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-night mb-2">Details by Owner</h2>
        <div className="space-y-2">
          {Object.entries(byOwner).map(([ownerId, { ownerName, animals }]) => (
            <div key={ownerId} className="bg-white rounded-xl border border-night/5 p-3">
              {ownerId ? (
                <Link to={`/people/${ownerId}`} className="text-sm font-medium text-primary hover:underline">{ownerName}</Link>
              ) : (
                <span className="text-sm font-medium text-muted italic">No owner linked</span>
              )}
              <div className="mt-1.5 space-y-1">
                {animals.map((c) => (
                  <div key={c.id} className="flex items-start gap-2">
                    <PawPrint className="w-3 h-3 text-muted mt-0.5 shrink-0" />
                    <div className="text-sm">
                      {c.animal_id ? (
                        <Link to={`/animals/${c.animal_id}`} className="font-medium text-night hover:text-primary">
                          {c.animal?.name || c.animal?.aao_id || 'Unnamed animal'}
                        </Link>
                      ) : (
                        <span className="text-muted italic">No animal linked</span>
                      )}
                      <span className="text-muted ml-1">
                        {c.care_types.map((t) => CARE_LABELS[t] ?? t).join(', ')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {event.notes && (
        <div className="bg-white rounded-xl border border-night/5 p-3 mb-4">
          <p className="text-sm font-semibold text-night mb-1">Notes</p>
          <p className="text-sm text-muted">{event.notes}</p>
        </div>
      )}

      {/* Email summary */}
      <button
        onClick={sendEmailSummary}
        disabled={emailing || emailSent}
        className="w-full py-3 bg-white border border-night/8 rounded-xl text-sm font-medium text-night hover:bg-sand flex items-center justify-center gap-2 transition-all disabled:opacity-50"
      >
        <Mail className="w-4 h-4" />
        {emailSent ? 'Email opened' : 'Email Summary'}
      </button>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub }: { icon: any; label: string; value: number; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border border-night/5 p-3">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4 text-primary" strokeWidth={1.5} />
        <span className="text-sm text-muted">{label}</span>
      </div>
      <p className="text-xl font-bold text-night">{value}</p>
      {sub && <p className="text-sm text-muted">{sub}</p>}
    </div>
  );
}
