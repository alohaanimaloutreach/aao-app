import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
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
  Trash2,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { formatDate } from '../lib/format';
import { EVENT_TYPE_CONFIG } from '../lib/constants';
import FileAttachments from '../components/shared/FileAttachments';
import MapIframe from '../components/shared/MapIframe';

interface EventDetail {
  id: string;
  event_type: string;
  event_date: string;
  status: string;
  notes: string | null;
  location: { id: string; name: string; latitude: number | null; longitude: number | null } | null;
  animals_seen: number | null;
  vaccinations_given: number | null;
  microchips_given: number | null;
  preventatives_given: number | null;
  spay_neuter_count: number | null;
  grooming_count: number | null;
  nail_trim_count: number | null;
  total_food_lbs: number | null;
  total_bags: number | null;
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
  const { session, user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [careEvents, setCareEvents] = useState<CareEvent[]>([]);
  const [sightingEntries, setSightingEntries] = useState<any[]>([]);
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [loading, setLoading] = useState(true);
  const [emailing, setEmailing] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteText, setDeleteText] = useState('');
  const [deleteProcessing, setDeleteProcessing] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (session && id) loadData();
  }, [session, id]);

  useEffect(() => {
    if (event) {
      const loc = (Array.isArray(event.location) ? event.location[0] : event.location)?.name ?? 'Event';
      document.title = `${loc} — ${formatDate(event.event_date)} | AAO Command Center`;
    }
    return () => { document.title = 'AAO Command Center'; };
  }, [event]);

  async function loadData() {
    setLoading(true);
    const [eventRes, careRes, volRes, sightingRes] = await Promise.all([
      supabase
        .from('outreach_events')
        .select('id, event_type, event_date, status, notes, total_food_lbs, total_bags, animals_seen, vaccinations_given, microchips_given, preventatives_given, spay_neuter_count, grooming_count, nail_trim_count, location:locations(id, name, latitude, longitude)')
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
      supabase
        .from('sighting_entries')
        .select('animal_count, care_given')
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
    setSightingEntries(sightingRes.data ?? []);
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

  // Determine if this is a historical event (no care_events, uses aggregate columns)
  const isHistorical = careEvents.length === 0 && (
    event.animals_seen != null || event.vaccinations_given != null || event.spay_neuter_count != null ||
    event.microchips_given != null || event.preventatives_given != null || event.total_food_lbs != null
  );

  // Compute stats
  const uniqueOwners = new Set(careEvents.map((c) => c.owner_id));
  const uniqueAnimals = new Set(careEvents.map((c) => c.animal_id));
  const sightingAnimalTotal = sightingEntries.reduce((sum: number, s: any) => sum + (s.animal_count ?? 1), 0);
  const totalFoodBags = isHistorical ? (event.total_bags ?? 0) : careEvents.reduce((sum, c) => sum + (c.food_bags ?? 0), 0);
  const totalFoodLbs = isHistorical ? (event.total_food_lbs ?? 0) : careEvents.reduce((sum, c) => sum + (c.food_lbs ?? 0), 0);

  // Count by care type
  const typeCounts: Record<string, number> = {};
  if (isHistorical) {
    if (event.vaccinations_given) typeCounts.vaccine_dapp = event.vaccinations_given;
    if (event.preventatives_given) typeCounts.preventative_oral = event.preventatives_given;
    if (event.spay_neuter_count) typeCounts.spay_neuter = event.spay_neuter_count;
    if (event.microchips_given) typeCounts.microchip = event.microchips_given;
    if (event.grooming_count) typeCounts.grooming = event.grooming_count;
    if (event.nail_trim_count) typeCounts.nail_trim = event.nail_trim_count;
  } else {
    careEvents.forEach((c) => {
      c.care_types.forEach((t) => {
        typeCounts[t] = (typeCounts[t] ?? 0) + 1;
      });
    });
  }

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

  const eventTypeConfig = EVENT_TYPE_CONFIG[event.event_type] ?? EVENT_TYPE_CONFIG.other;
  const eventTypeLabel = eventTypeConfig.label;

  function buildEmailBody(): string {
    let body = `Event Summary\n\n`;
    body += `Date: ${formatDate(event!.event_date)}\n`;
    body += `Location: ${event!.location?.name ?? 'Unknown'}\n`;
    body += `Volunteers: ${volunteerNames.join(', ')}\n\n`;
    body += `Totals\n`;
    body += `Owners seen: ${uniqueOwners.size}\n`;
    body += `Animals seen: ${uniqueAnimals.size + sightingAnimalTotal}\n`;
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
  const statItems: { icon: any; label: string; value: number; sub?: string }[] = [];
  if (!isHistorical) statItems.push({ icon: Users, label: 'Owners', value: uniqueOwners.size });
  statItems.push({ icon: PawPrint, label: 'Animals', value: isHistorical ? (event.animals_seen ?? 0) : (uniqueAnimals.size + sightingAnimalTotal) });
  if (totalFoodBags > 0) {
    statItems.push({ icon: Package, label: 'Food bags', value: totalFoodBags, sub: totalFoodLbs > 0 ? `${totalFoodLbs} lbs` : undefined });
  } else if (isHistorical && totalFoodLbs > 0) {
    statItems.push({ icon: Package, label: 'Food (lbs)', value: totalFoodLbs });
  }
  const vaccineCount = (typeCounts.vaccine_dapp ?? 0) + (typeCounts.vaccine_dapp_l ?? 0) + (typeCounts.vaccine_parvo ?? 0);
  if (vaccineCount > 0) statItems.push({ icon: Syringe, label: 'Vaccines', value: vaccineCount });
  const prevCount = (typeCounts.preventative_oral ?? 0) + (typeCounts.preventative_topical ?? 0);
  if (prevCount > 0) statItems.push({ icon: Pill, label: 'Preventatives', value: prevCount });
  if ((typeCounts.spay_neuter ?? 0) > 0) statItems.push({ icon: Scissors, label: 'Spay/Neuter', value: typeCounts.spay_neuter });
  if ((typeCounts.medical ?? 0) > 0) statItems.push({ icon: Stethoscope, label: 'Medical', value: typeCounts.medical });
  if ((typeCounts.microchip ?? 0) > 0) statItems.push({ icon: Syringe, label: 'Microchips', value: typeCounts.microchip });
  const groomCount = (typeCounts.grooming ?? 0);
  if (groomCount > 0) statItems.push({ icon: Sparkles, label: 'Grooming', value: groomCount });
  if ((typeCounts.nail_trim ?? 0) > 0) statItems.push({ icon: Sparkles, label: 'Nail Trims', value: typeCounts.nail_trim });

  return (
    <div className="max-w-2xl mx-auto">
      <Link to="/outreach" className="inline-flex items-center gap-1 text-sm text-muted hover:text-night mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Outreach
      </Link>

      {/* Hero header card */}
      <div className="bg-gradient-to-br from-night to-night/90 rounded-2xl p-5 mb-4 text-white shadow-[0_4px_20px_rgba(28,23,8,0.15)]">
        <div className="flex items-start justify-between mb-3">
          <div>
            <span className={`inline-flex items-center gap-1 text-xs font-semibold rounded-full px-2 py-0.5 mb-2 ${eventTypeConfig.bg} ${eventTypeConfig.text}`}>
              <CalendarHeart className="w-3 h-3" /> {eventTypeLabel}
            </span>
            <h1 className="text-xl font-heading font-bold">
              {event.location?.name ?? 'Event Summary'}
            </h1>
            <p className="text-white/60 text-sm mt-0.5">{formatDate(event.event_date)}</p>
          </div>
          <div className="flex items-center gap-2">
            {event.status === 'completed' && (
              <span className="text-xs font-medium bg-primary/20 text-primary-foreground border border-primary/30 rounded-full px-2.5 py-1">
                Complete
              </span>
            )}
            {isAdmin && (
              <button
                onClick={() => { setShowDeleteConfirm(true); setDeleteText(''); setDeleteError(null); }}
                className="inline-flex items-center gap-1 text-xs font-medium bg-white/10 hover:bg-ember/30 text-white/60 hover:text-white border border-white/10 hover:border-ember/40 rounded-full px-2.5 py-1 transition-all"
              >
                <Trash2 className="w-3 h-3" />
                Delete
              </button>
            )}
          </div>
        </div>

        {/* Inline stats row */}
        <div className="flex items-center gap-4 mt-4 pt-3 border-t border-white/10">
          {!isHistorical && (
            <div className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-white/50" />
              <span className="text-lg font-bold">{uniqueOwners.size}</span>
              <span className="text-xs text-white/50">owners</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <PawPrint className="w-4 h-4 text-white/50" />
            <span className="text-lg font-bold">{isHistorical ? (event.animals_seen ?? 0) : (uniqueAnimals.size + sightingAnimalTotal)}</span>
            <span className="text-xs text-white/50">animals</span>
          </div>
          {totalFoodBags > 0 && (
            <div className="flex items-center gap-1.5">
              <Package className="w-4 h-4 text-white/50" />
              <span className="text-lg font-bold">{totalFoodBags}</span>
              <span className="text-xs text-white/50">bags</span>
            </div>
          )}
          {isHistorical && totalFoodLbs > 0 && !totalFoodBags && (
            <div className="flex items-center gap-1.5">
              <Package className="w-4 h-4 text-white/50" />
              <span className="text-lg font-bold">{totalFoodLbs}</span>
              <span className="text-xs text-white/50">lbs</span>
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

      {/* Tabbed content area */}
      <EventTabs
        statItems={statItems}
        byOwner={byOwner}
        notes={event.notes?.replace(/^Historical:\s*/i, '') ?? null}
        eventId={event.id}
        sendEmailSummary={sendEmailSummary}
        emailing={emailing}
        emailSent={emailSent}
        isHistorical={isHistorical}
      />

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true">
          <div className="bg-white w-full sm:max-w-sm sm:rounded-2xl rounded-t-2xl p-5 shadow-xl">
            <h3 className="font-heading font-bold text-ember text-base mb-2">Permanently delete this event?</h3>
            <p className="text-sm text-muted mb-4">This cannot be undone. All linked care events and check-in records will also be removed.</p>
            <div className="mb-4">
              <label className="block text-xs text-muted font-medium mb-1">Type DELETE to confirm</label>
              <input
                type="text"
                value={deleteText}
                onChange={(e) => setDeleteText(e.target.value)}
                placeholder="DELETE"
                className="w-full px-3 py-2.5 bg-sand/50 border border-ember/20 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ember/30"
                autoFocus
              />
            </div>
            {deleteError && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-3">{deleteError}</p>
            )}
            <div className="flex gap-2">
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-2.5 text-sm font-medium text-muted bg-sand rounded-xl hover:bg-muted/15 transition-all">Cancel</button>
              <button
                disabled={deleteText !== 'DELETE' || deleteProcessing}
                onClick={async () => {
                  setDeleteProcessing(true);
                  setDeleteError(null);
                  const { error } = await supabase.from('outreach_events').delete().eq('id', event!.id);
                  setDeleteProcessing(false);
                  if (error) {
                    console.error('Delete event error:', error);
                    setDeleteError(error.message);
                    return;
                  }
                  setShowDeleteConfirm(false);
                  navigate('/outreach');
                }}
                className="flex-1 py-2.5 text-sm font-semibold text-white bg-ember hover:bg-ember/90 rounded-xl transition-all disabled:opacity-30"
              >
                {deleteProcessing ? 'Deleting...' : 'Delete Forever'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

type TabId = 'overview' | 'owners' | 'files';

function EventTabs({
  statItems,
  byOwner,
  notes,
  eventId,
  sendEmailSummary,
  emailing,
  emailSent,
  isHistorical,
}: {
  statItems: { icon: any; label: string; value: number; sub?: string }[];
  byOwner: Record<string, { ownerName: string; animals: CareEvent[] }>;
  notes: string | null;
  eventId: string;
  sendEmailSummary: () => void;
  emailing: boolean;
  emailSent: boolean;
  isHistorical: boolean;
}) {
  const [tab, setTab] = useState<TabId>('overview');
  const entries = Object.entries(byOwner);
  const serviceItems = statItems.slice(2);

  const tabs: { id: TabId; label: string; count?: number }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'owners', label: 'By Owner', count: entries.length },
    { id: 'files', label: 'Files' },
  ];

  return (
    <div className="bg-white rounded-2xl border border-night/5 overflow-hidden shadow-sm mb-4">
      {/* Tab bar */}
      <div className="flex border-b border-night/5">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-3 text-sm font-medium text-center transition-colors relative ${
              tab === t.id
                ? 'text-primary'
                : 'text-muted hover:text-night'
            }`}
          >
            {t.label}
            {t.count != null && (
              <span className={`ml-1 text-xs rounded-full px-1.5 py-0.5 ${
                tab === t.id ? 'bg-primary/10 text-primary' : 'bg-sand text-muted'
              }`}>{t.count}</span>
            )}
            {tab === t.id && (
              <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="p-4">
        {tab === 'overview' && (
          <div className="space-y-4">
            {/* Services grid */}
            {serviceItems.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2.5">Services Provided</p>
                <div className="flex flex-wrap gap-2">
                  {serviceItems.map((s) => (
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

            {/* Notes */}
            {notes && (
              <div>
                <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Notes</p>
                <p className="text-sm text-night leading-relaxed">{notes}</p>
              </div>
            )}

            {/* Email action */}
            <button
              onClick={sendEmailSummary}
              disabled={emailing || emailSent}
              className="w-full py-2.5 bg-sand/50 border border-night/5 rounded-xl text-sm font-medium text-night hover:bg-sand flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              <Mail className="w-4 h-4" />
              {emailSent ? 'Email opened' : 'Email Summary'}
            </button>
          </div>
        )}

        {tab === 'owners' && (
          <div>
            {isHistorical ? (
              <p className="text-sm text-muted text-center py-4">Historical event — individual care records not available</p>
            ) : entries.length === 0 ? (
              <p className="text-sm text-muted text-center py-4">No care records for this event.</p>
            ) : (
              <div className="space-y-0.5">
                {entries.map(([ownerId, { ownerName, animals }]) => (
                  <OwnerRow key={ownerId} ownerId={ownerId} ownerName={ownerName} animals={animals} />
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'files' && (
          <FileAttachments outreachEventId={eventId} />
        )}
      </div>
    </div>
  );
}

function OwnerRow({ ownerId, ownerName, animals }: { ownerId: string; ownerName: string; animals: CareEvent[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-night/5 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full px-3.5 py-2.5 text-left hover:bg-sand/30 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          {ownerId ? (
            <span className="text-sm font-semibold text-night truncate">{ownerName}</span>
          ) : (
            <span className="text-sm font-medium text-muted italic">No owner linked</span>
          )}
          <span className="text-xs text-muted bg-sand rounded-full px-2 py-0.5 shrink-0">{animals.length}</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          <span className="text-xs text-muted hidden sm:inline">
            {[...new Set(animals.flatMap((a) => a.care_types))].slice(0, 3).map((t) => CARE_LABELS[t] ?? t).join(', ')}
          </span>
          {open ? <ChevronUp className="w-3.5 h-3.5 text-muted" /> : <ChevronDown className="w-3.5 h-3.5 text-muted" />}
        </div>
      </button>

      {open && (
        <div className="border-t border-night/5 px-3.5 py-2.5 bg-sand/20 space-y-1.5">
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
          {ownerId && (
            <Link to={`/people/${ownerId}`} className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1">
              View owner profile <ExternalLink className="w-3 h-3" />
            </Link>
          )}
        </div>
      )}

    </div>
  );
}
