import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import {
  PawPrint, Users, MapPin, Flag, AlertTriangle, Clock, CalendarHeart,
  Pencil, ArrowRight, Eye, Stethoscope, ListOrdered,
  CircleStop, Play, X, ChevronDown, Scissors, ChevronUp, HelpCircle, Bone,
} from 'lucide-react';
import { formatRelative, daysSince, formatDate } from '../lib/format';
import { HAVENT_SEEN_DAYS } from '../lib/constants';

import EventSetup from '../components/outreach/EventSetup';
import DashboardMap from '../components/dashboard/DashboardMap';
import FieldNotesDrawer from '../components/layout/FieldNotesDrawer';

const isTestEnv = import.meta.env.VITE_SUPABASE_URL?.includes('ybswvwbqweywhfjgdwro');

interface Stats {
  animals: number | null;
  people: number | null;
  locations: number | null;
  openFlags: number | null;
  outreachEvents: number | null;
  snCount: number | null;
  foodLbs: number | null;
  sinceDate: string | null;
}

interface Alert {
  id: string;
  type: 'havent_seen' | 'urgent_medical' | 'lost_contact' | 'flagged' | 'sn_ready';
  title: string;
  description: string;
  link: string;
  color: string;
  icon: any;
}

interface ActivityItem {
  id: string;
  type: string;
  description: string;
  date: string;
  author: string | null;
  link: string | null;
  careTypes?: string[];
}

export default function DashboardPage() {
  const { profile, session } = useAuth();

  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({ animals: null, people: null, locations: null, openFlags: null, outreachEvents: null, snCount: null, foodLbs: null, sinceDate: null });
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeEvent, setActiveEvent] = useState<{ id: string; location_name: string | null; queueCount: number } | null>(null);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [endingEvent, setEndingEvent] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [activityFilter, setActivityFilter] = useState<string>('all');
  const [activityExpanded, setActivityExpanded] = useState(false);
  const [showWelcome, setShowWelcome] = useState(() => !localStorage.getItem('aao-welcome-dismissed'));
  const [notesOpen, setNotesOpen] = useState(false);
  const [upcomingEvents, setUpcomingEvents] = useState<{ id: string; event_date: string; event_type: string; location_name: string | null }[]>([]);

  function dismissWelcome() {
    localStorage.setItem('aao-welcome-dismissed', '1');
    setShowWelcome(false);
  }

  useEffect(() => {
    document.title = 'Dashboard | AAO Command Center';
    return () => { document.title = 'AAO Command Center'; };
  }, []);

  useEffect(() => {
    if (session) loadDashboard();
  }, [session]);

  async function loadDashboard() {
    setLoading(true);

    // Build filtered queries
    const animalsCountQ = supabase.from('animals').select('id', { count: 'exact', head: true }).eq('archived', false);
    const ownersCountQ = supabase.from('owners').select('id', { count: 'exact', head: true }).eq('archived', false);
    const allAnimalsQ = supabase.from('animals').select('id, name, aao_id, urgent_medical, interested_in_fixing, deceased').eq('archived', false).eq('deceased', false);
    const careQ = supabase.from('care_events').select('animal_id, event_date').order('event_date', { ascending: false });
    const recentCareQ = supabase.from('care_events').select('id, animal_id, outreach_event_id, event_date, care_types, animal:animals(name, aao_id), location:locations!location_id(name), author:users!created_by(name)').order('created_at', { ascending: false }).limit(100);
    const recentNotesQ = supabase.from('field_notes').select('id, animal_id, owner_id, location_id, note, created_at, author:users!created_by(name)').order('created_at', { ascending: false }).limit(50);

    const [
      animalsRes, peopleRes, locRes, flagsRes,
      allAnimalsRes, careRes, situationsRes,
      recentCareRes, recentNotesRes,
      activeEventRes, outreachCountRes, snCountRes, foodRes, earliestEventRes,
      upcomingRes,
    ] = await Promise.all([
      animalsCountQ,
      ownersCountQ,
      supabase.from('locations').select('id', { count: 'exact', head: true }).eq('archived', false),
      supabase.from('flags').select('id', { count: 'exact', head: true }).eq('resolved', false),
      allAnimalsQ,
      careQ,
      supabase.from('situations').select('animal_id, status, started_at').eq('is_active', true),
      recentCareQ,
      recentNotesQ,
      supabase.from('outreach_events').select('id, location:locations(name)').eq('status', 'active').limit(1).single(),
      supabase.from('outreach_events').select('id', { count: 'exact', head: true }),
      supabase.from('outreach_events').select('spay_neuter_count'),
      supabase.from('outreach_events').select('total_food_lbs'),
      supabase.from('outreach_events').select('event_date').order('event_date', { ascending: true }).limit(1).single(),
      supabase.from('outreach_events').select('id, event_date, event_type, location:locations(name)').eq('status', 'planned').gte('event_date', new Date().toISOString().split('T')[0]).order('event_date', { ascending: true }).limit(10),
    ]);

    // Stats
    const totalFood = (foodRes.data ?? []).reduce((sum: number, e: any) => sum + (e.total_food_lbs ?? 0), 0);
    const totalSN = (snCountRes.data ?? []).reduce((sum: number, e: any) => sum + (e.spay_neuter_count ?? 0), 0);
    setStats({
      animals: animalsRes.count ?? 0,
      people: peopleRes.count ?? 0,
      locations: locRes.count ?? 0,
      openFlags: flagsRes.count ?? 0,
      outreachEvents: outreachCountRes.count ?? 0,
      snCount: totalSN,
      foodLbs: Math.round(totalFood),
      sinceDate: (earliestEventRes.data as any)?.event_date ?? null,
    });
    setUpcomingEvents((upcomingRes.data ?? []).map((e: any) => ({
      id: e.id, event_date: e.event_date, event_type: e.event_type,
      location_name: (e.location as any)?.name ?? null,
    })));

    // Build alerts
    const alertList: Alert[] = [];
    const lastSeenMap: Record<string, string> = {};
    (careRes.data ?? []).forEach((c: any) => {
      if (c.animal_id && !lastSeenMap[c.animal_id]) lastSeenMap[c.animal_id] = c.event_date;
    });

    const sitMap: Record<string, { status: string; started_at: string }> = {};
    (situationsRes.data ?? []).forEach((s: any) => { sitMap[s.animal_id] = { status: s.status, started_at: s.started_at }; });

    // Haven't seen alerts
    const notSeen = (allAnimalsRes.data ?? []).filter((a: any) => daysSince(lastSeenMap[a.id]) > HAVENT_SEEN_DAYS);
    if (notSeen.length > 0) {
      alertList.push({
        id: 'havent_seen',
        type: 'havent_seen',
        title: `${notSeen.length} animal${notSeen.length > 1 ? 's' : ''} not seen in 60+ days`,
        description: notSeen.slice(0, 3).map((a: any) => a.name ?? a.aao_id).join(', ') + (notSeen.length > 3 ? ` and ${notSeen.length - 3} more` : ''),
        link: '/animals?notSeen=60',
        color: 'border-gold/30 bg-gold/6',
        icon: Clock,
      });
    }

    // Urgent medical
    const urgent = (allAnimalsRes.data ?? []).filter((a: any) => a.urgent_medical);
    if (urgent.length > 0) {
      alertList.push({
        id: 'urgent',
        type: 'urgent_medical',
        title: `${urgent.length} urgent medical case${urgent.length > 1 ? 's' : ''}`,
        description: urgent.slice(0, 3).map((a: any) => a.name ?? a.aao_id).join(', '),
        link: '/animals?urgent=1',
        color: 'border-ember/30 bg-ember/6',
        icon: AlertTriangle,
      });
    }

    // Lost contact
    const lostContact = (allAnimalsRes.data ?? []).filter((a: any) => sitMap[a.id]?.status === 'lost_contact');
    if (lostContact.length > 0) {
      const over30 = lostContact.filter((a: any) => daysSince(sitMap[a.id]?.started_at) > 30);
      alertList.push({
        id: 'lost_contact',
        type: 'lost_contact',
        title: `${lostContact.length} animal${lostContact.length > 1 ? 's' : ''} with lost contact`,
        description: over30.length > 0 ? `${over30.length} over 30 days, please follow up` : lostContact.slice(0, 3).map((a: any) => a.name ?? a.aao_id).join(', '),
        link: '/animals?status=lost_contact',
        color: 'border-amber-300/30 bg-amber-50',
        icon: Eye,
      });
    }

    // Ready for spay/neuter
    const snReady = (allAnimalsRes.data ?? []).filter((a: any) => a.interested_in_fixing === 'interested');
    if (snReady.length > 0) {
      alertList.push({
        id: 'sn_ready',
        type: 'sn_ready',
        title: `${snReady.length} animal${snReady.length > 1 ? 's' : ''} ready for spay/neuter`,
        description: snReady.slice(0, 3).map((a: any) => a.name ?? a.aao_id).join(', ') + (snReady.length > 3 ? ` and ${snReady.length - 3} more` : ''),
        link: '/animals?snReady=1',
        color: 'border-primary/30 bg-primary/6',
        icon: Scissors,
      });
    }

    // Open flags
    if ((flagsRes.count ?? 0) > 0) {
      alertList.push({
        id: 'flags',
        type: 'flagged',
        title: `${flagsRes.count} record${(flagsRes.count ?? 0) > 1 ? 's' : ''} flagged for review`,
        description: 'Records imported or flagged by volunteers need coordinator attention',
        link: '/flags',
        color: 'border-muted/20 bg-muted/4',
        icon: Flag,
      });
    }

    // Order: sn_ready, urgent_medical, flagged, havent_seen, then anything else
    const alertOrder: Record<string, number> = { sn_ready: 0, urgent_medical: 1, flagged: 2, havent_seen: 3 };
    alertList.sort((a, b) => (alertOrder[a.type] ?? 99) - (alertOrder[b.type] ?? 99));
    setAlerts(alertList);

    // Active event
    if (activeEventRes.data) {
      const ae = activeEventRes.data as any;
      const loc = Array.isArray(ae.location) ? ae.location[0] : ae.location;
      const { count: qc } = await supabase
        .from('checkin_queue')
        .select('id', { count: 'exact', head: true })
        .eq('outreach_event_id', ae.id)
        .in('status', ['waiting', 'in_progress']);
      setActiveEvent({ id: ae.id, location_name: loc?.name ?? null, queueCount: qc ?? 0 });
    } else {
      setActiveEvent(null);
    }

    // Activity feed — merge care events and notes, sort by date
    const actItems: ActivityItem[] = [];
    (recentCareRes.data ?? []).forEach((c: any) => {
      const types = (c.care_types ?? []).join(', ').replace(/_/g, ' ');
      const animal = Array.isArray(c.animal) ? c.animal[0] : c.animal;
      const loc = Array.isArray(c.location) ? c.location[0] : c.location;
      let subject: string;
      if (animal?.name || animal?.aao_id) {
        subject = `for ${animal.name ?? animal.aao_id}`;
      } else if (loc?.name) {
        subject = `at ${loc.name}`;
      } else {
        subject = '— bulk distribution';
      }
      actItems.push({
        id: `care-${c.id}`,
        type: 'care',
        description: `${types || 'Care'} ${subject}`,
        date: c.event_date,
        author: (Array.isArray(c.author) ? c.author[0] : c.author)?.name ?? null,
        link: c.animal_id ? `/animals/${c.animal_id}?highlight=care-${c.id}` : c.outreach_event_id ? `/outreach/summary/${c.outreach_event_id}` : '/outreach',
        careTypes: c.care_types ?? [],
      });
    });
    (recentNotesRes.data ?? []).forEach((n: any) => {
      const noteLink = n.animal_id ? `/animals/${n.animal_id}?highlight=note-${n.id}` : n.owner_id ? `/people/${n.owner_id}?highlight=note-${n.id}` : n.location_id ? `/locations/${n.location_id}?highlight=note-${n.id}` : '/notes';
      actItems.push({
        id: `note-${n.id}`,
        type: 'note',
        description: (n.note ?? '').length > 80 ? n.note.slice(0, 80) + '...' : (n.note ?? 'Note'),
        date: n.created_at,
        author: (Array.isArray(n.author) ? n.author[0] : n.author)?.name ?? null,
        link: noteLink,
      });
    });
    actItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setActivity(actItems.slice(0, 30));

    setLoading(false);
  }

  async function endActiveEvent() {
    if (!activeEvent) return;
    setEndingEvent(true);
    const { data: care } = await supabase
      .from('care_events')
      .select('food_bags, food_lbs, care_types, animal_id')
      .eq('outreach_event_id', activeEvent.id);
    const rows = care ?? [];
    const totalBags = rows.reduce((sum, c) => sum + ((c as any).food_bags ?? 0), 0);
    const totalLbs = rows.reduce((sum, c) => sum + ((c as any).food_lbs ?? 0), 0);
    const uniqueAnimals = new Set(rows.map((c: any) => c.animal_id).filter(Boolean));
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
    await supabase.from('outreach_events').update({
      status: 'completed',
      total_bags: totalBags || null,
      total_food_lbs: totalLbs || null,
      animals_seen: uniqueAnimals.size || null,
      vaccinations_given: vaxCount || null,
      microchips_given: mcCount || null,
      preventatives_given: prevCount || null,
      spay_neuter_count: snCount || null,
      grooming_count: groomCount || null,
      nail_trim_count: nailCount || null,
    }).eq('id', activeEvent.id);
    setEndingEvent(false);
    setShowEndConfirm(false);
    navigate(`/outreach/summary/${activeEvent.id}`);
  }


  // Activity filter groups — map filter keys to matching care_types
  const FILTER_GROUPS: Record<string, string[]> = {
    vaccines: ['vaccine_dapp', 'vaccine_dapp_l', 'vaccine_parvo'],
    preventatives: ['preventative_oral', 'preventative_topical'],
  };

  const filteredActivity = activityFilter === 'all'
    ? activity
    : activityFilter === 'note'
      ? activity.filter((a) => a.type === 'note')
      : activity.filter((a) => {
          if (a.type !== 'care') return false;
          const matchTypes = FILTER_GROUPS[activityFilter] ?? [activityFilter];
          return matchTypes.some((t) => a.careTypes?.includes(t));
        });
  const COLLAPSED_COUNT = 5;
  const visibleActivity = activityExpanded ? filteredActivity : filteredActivity.slice(0, COLLAPSED_COUNT);
  const hasMoreActivity = filteredActivity.length > COLLAPSED_COUNT;
  const activityGroups: { label: string; items: ActivityItem[] }[] = [];
  let currentGroupLabel = '';
  visibleActivity.forEach((item) => {
    const label = formatRelative(item.date);
    const groupLabel = label === 'Today' ? 'Today' : label === 'Yesterday' ? 'Yesterday' : label.includes('days ago') ? 'This Week' : 'Earlier';
    if (groupLabel !== currentGroupLabel) {
      activityGroups.push({ label: groupLabel, items: [] });
      currentGroupLabel = groupLabel;
    }
    activityGroups[activityGroups.length - 1].items.push(item);
  });

  // Build dynamic filter tabs from actual activity data
  const allCareTypes = new Set(activity.filter((a) => a.type === 'care').flatMap((a) => a.careTypes ?? []));
  const hasNotes = activity.some((a) => a.type === 'note');
  // Ordered list of possible tabs — only shown if matching care_types exist
  const POSSIBLE_TABS: { key: string; label: string; match: string[] }[] = [
    { key: 'spay_neuter', label: 'Spay/Neuter', match: ['spay_neuter'] },
    { key: 'vaccines', label: 'Vaccines', match: ['vaccine_dapp', 'vaccine_dapp_l', 'vaccine_parvo'] },
    { key: 'preventatives', label: 'Preventatives', match: ['preventative_oral', 'preventative_topical'] },
    { key: 'food', label: 'Food', match: ['food'] },
    { key: 'medical', label: 'Medical', match: ['medical'] },
    { key: 'grooming', label: 'Grooming', match: ['grooming'] },
    { key: 'nail_trim', label: 'Nail Trim', match: ['nail_trim'] },
    { key: 'microchip', label: 'Microchip', match: ['microchip'] },
  ];
  const filterTabs: { key: string; label: string }[] = [{ key: 'all', label: 'All' }];
  POSSIBLE_TABS.forEach((tab) => {
    if (tab.match.some((t) => allCareTypes.has(t))) {
      filterTabs.push({ key: tab.key, label: tab.label });
    }
  });
  if (hasNotes) filterTabs.push({ key: 'note', label: 'Notes' });

  const activityFeed = (
    <div id="activity">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="text-lg font-heading font-bold text-night shrink-0">Recent Activity</h2>
        {filterTabs.length > 1 && (
          <select
            value={activityFilter}
            onChange={(e) => { setActivityFilter(e.target.value); setActivityExpanded(false); }}
            className="text-xs font-medium text-night bg-sand/50 rounded-lg px-2.5 py-1.5 border-0 outline-none cursor-pointer"
          >
            {filterTabs.map(({ key, label }) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        )}
      </div>
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex gap-3">
              <div className="skeleton w-8 h-8 rounded-lg shrink-0" />
              <div className="flex-1 space-y-1.5"><div className="skeleton h-3.5 w-48" /><div className="skeleton h-3 w-24" /></div>
            </div>
          ))}
        </div>
      ) : filteredActivity.length === 0 ? (
        <div className="bg-white rounded-2xl border border-night/5 p-8 text-center">
          <p className="text-muted text-sm">No recent activity</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-night/5 overflow-hidden">
          {activityGroups.map((group) => (
            <div key={group.label}>
              <div className="px-4 py-1.5 bg-sand/30">
                <span className="text-xs font-semibold text-muted uppercase tracking-wide">{group.label}</span>
              </div>
              <div className="divide-y divide-night/5">
                {group.items.map((item) => {
                  const content = (
                    <>
                      {item.type === 'care' ? (
                        <Stethoscope className="w-4 h-4 text-muted shrink-0 mt-0.5" strokeWidth={1.75} />
                      ) : (
                        <Pencil className="w-4 h-4 text-muted shrink-0 mt-0.5" strokeWidth={1.75} />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-night leading-tight truncate">{item.description}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-sm text-muted">{formatRelative(item.date)}</span>
                          {item.author && <span className="text-sm text-muted">{item.author}</span>}
                        </div>
                      </div>
                      {item.link && <ArrowRight className="w-3.5 h-3.5 text-muted/25 shrink-0 mt-1" />}
                    </>
                  );
                  return item.link ? (
                    <Link key={item.id} to={item.link} className="px-4 py-3 flex items-start gap-3 hover:bg-sand/50 transition-colors">
                      {content}
                    </Link>
                  ) : (
                    <div key={item.id} className="px-4 py-3 flex items-start gap-3">
                      {content}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          {hasMoreActivity && (
            <button
              onClick={() => setActivityExpanded(!activityExpanded)}
              className="w-full px-4 py-2.5 text-sm font-medium text-primary hover:bg-sand/50 transition-colors flex items-center justify-center gap-1.5 border-t border-night/5"
            >
              {activityExpanded ? (
                <>Show less <ChevronUp className="w-3.5 h-3.5" /></>
              ) : (
                <>Show more ({filteredActivity.length - COLLAPSED_COUNT} more) <ChevronDown className="w-3.5 h-3.5" /></>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );

  const alertsSection = alerts.length > 0 ? (
    <div className="space-y-2 mb-6">
      <h2 className="text-lg font-heading font-bold text-night">Needs Attention</h2>
      {alerts.map((alert) => (
        <Link
          key={alert.id}
          to={alert.link}
          className="flex items-start gap-3 p-3.5 rounded-2xl bg-white border border-night/5 card-hover block"
        >
          <alert.icon className="w-4.5 h-4.5 text-muted shrink-0 mt-0.5" strokeWidth={1.75} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-night">{alert.title}</p>
            <p className="text-xs text-muted mt-0.5">{alert.description}</p>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-muted/40 mt-0.5 shrink-0" />
        </Link>
      ))}
    </div>
  ) : null;

  return (
    <div>
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-xl md:text-3xl font-bold font-heading text-night tracking-tight mb-1">
          Aloha, {profile?.name ?? 'friend'}
        </h1>
        {isTestEnv ? (
          <p className="text-sm text-amber-600 font-medium mb-4">You are in the practice app. Tap around freely — nothing here is real.</p>
        ) : (
          <p className="text-sm text-muted mb-4">What do you want to do today?</p>
        )}

        {/* New user guide link */}
        {showWelcome && (
          <div className="flex items-center gap-3 bg-primary/6 border border-primary/15 rounded-xl px-4 py-3 mb-4">
            <HelpCircle className="w-5 h-5 text-primary shrink-0" strokeWidth={1.75} />
            <p className="flex-1 text-sm text-night">
              New here? <Link to="/guide" className="text-primary font-semibold hover:underline">Read the quick start guide</Link> to learn how outreach events and check-ins work.
            </p>
            <button onClick={dismissWelcome} className="p-1 rounded-lg hover:bg-night/5 transition-colors shrink-0" aria-label="Dismiss">
              <X className="w-4 h-4 text-muted" />
            </button>
          </div>
        )}

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            onClick={() => setShowSetup(true)}
            className="flex items-center justify-center gap-2 p-4 bg-primary text-white rounded-2xl hover:bg-primary-hover transition-colors shadow-sm"
          >
            <CalendarHeart className="w-5 h-5" strokeWidth={1.75} />
            <span className="text-sm font-semibold">Start Outreach</span>
          </button>
          <button
            onClick={() => setNotesOpen(true)}
            className="flex items-center justify-center gap-2 p-4 bg-white rounded-2xl border border-night/5 text-night hover:bg-sand/50 transition-colors"
          >
            <Pencil className="w-5 h-5 text-muted" strokeWidth={1.75} />
            <span className="text-sm font-semibold">New Field Note</span>
          </button>
        </div>

        {/* Impact stats card */}
        {stats.outreachEvents !== null && (
          <div className="mt-3 bg-white rounded-2xl p-4 border border-night/5 border-l-3 border-l-primary shadow-[0_2px_12px_rgba(28,23,8,0.06)]">
            {stats.sinceDate && (
              <p className="text-xs text-muted mb-2">Since {formatDate(stats.sinceDate)}</p>
            )}
            <div className="flex items-center justify-center gap-5 flex-wrap text-sm">
              {[
                { icon: PawPrint, value: stats.animals, label: 'animals', color: 'text-primary' },
                { icon: Users, value: stats.people, label: 'people', color: 'text-sky-500' },
                { icon: MapPin, value: stats.locations, label: 'locations', color: 'text-violet-500' },
              ].map((s) => (
                <div key={s.label} className="flex items-center gap-1.5">
                  <s.icon className={`w-4 h-4 ${s.color}`} strokeWidth={1.75} />
                  <span className="font-bold font-heading text-night">{s.value != null ? s.value.toLocaleString() : '—'}</span>
                  {' '}<span className="text-muted/70">{s.label}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-night/5 my-2.5" />
            <div className="flex items-center justify-center gap-5 flex-wrap">
              {[
                { icon: CalendarHeart, value: stats.outreachEvents, label: 'events', color: 'text-primary' },
                { icon: Scissors, value: stats.snCount, label: 'fixed', color: 'text-rose-500' },
                { icon: Bone, value: stats.foodLbs, label: 'lbs food', color: 'text-amber-600' },
              ].map((s) => (
                <div key={s.label} className="flex items-center gap-1.5">
                  <s.icon className={`w-4 h-4 ${s.color}`} strokeWidth={1.75} />
                  <span className="text-sm font-bold font-heading text-night">{s.value != null ? s.value.toLocaleString() : '—'}</span>
                  <span className="text-xs text-muted/60">{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Active Event Card */}
      {activeEvent && (
        <div className="mb-4 rounded-2xl border-2 p-4 border-primary/25 bg-primary/5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-primary/15">
              <Play className="w-5 h-5 text-primary" fill="currentColor" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-night">Outreach Event Active</p>
              {activeEvent.location_name && (
                <p className="text-sm text-muted mt-0.5">{activeEvent.location_name}</p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Link
              to={`/outreach/event/${activeEvent.id}`}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary hover:bg-primary-hover text-white text-sm font-semibold rounded-xl shadow-[0_2px_8px_rgba(110,168,50,0.25)] transition-all"
            >
              <CalendarHeart className="w-4 h-4" />
              Open Check In Desk
            </Link>
            {activeEvent.queueCount > 0 && (
              <Link
                to={`/outreach/event/${activeEvent.id}?tab=queue`}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-xl shadow-[0_2px_8px_rgba(245,158,11,0.25)] transition-all"
              >
                <ListOrdered className="w-4 h-4" />
                Outreach Queue ({activeEvent.queueCount})
              </Link>
            )}
            <button
              onClick={() => setShowEndConfirm(true)}
              className="px-3 py-2.5 bg-ember hover:bg-ember/90 rounded-xl text-sm font-semibold text-white transition-all flex items-center gap-1.5 shrink-0"
            >
              <CircleStop className="w-4 h-4" />
              End Event
            </button>
          </div>
        </div>
      )}

      {/* End Event Confirmation */}
      {showEndConfirm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-xl">
            <h3 className="text-lg font-heading font-bold text-night mb-2">End this event?</h3>
            <p className="text-sm text-muted mb-5">
              Are you sure you want to end this event? This will finalize the event summary and close the check-in desk and vet queue. Make sure all services have been logged before ending.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowEndConfirm(false)}
                className="flex-1 py-2.5 bg-sand text-night text-sm font-medium rounded-xl hover:bg-night/8 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={endActiveEvent}
                disabled={endingEvent}
                className="flex-1 py-2.5 bg-ember hover:bg-ember/90 text-white text-sm font-semibold rounded-xl transition-all disabled:opacity-50"
              >
                {endingEvent ? 'Ending...' : 'End Event'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop: two-column layout | Mobile: stacked */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left column — Map */}
        <div className="lg:col-span-3">
          <DashboardMap />
        </div>

        {/* Right column — Needs Attention */}
        <div className="lg:col-span-2">
          {alertsSection}
        </div>
      </div>

      {/* Upcoming Events */}
      {upcomingEvents.length > 0 && (
        <div className="mt-6">
          <h2 className="text-lg font-heading font-bold text-night mb-2">Upcoming</h2>
          <div className="bg-white rounded-xl border border-night/5 divide-y divide-night/5">
            {upcomingEvents.map((evt) => (
              <div key={evt.id} className="flex items-center justify-between px-3.5 py-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-semibold text-night whitespace-nowrap">{formatDate(evt.event_date)}</span>
                  <span className="text-xs text-muted truncate capitalize">{evt.event_type.replace(/_/g, ' ')}</span>
                </div>
                {evt.location_name && (
                  <span className="text-xs text-muted/70 truncate ml-3 shrink-0">{evt.location_name}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Activity — full width */}
      <div className="mt-6">
        {activityFeed}
      </div>

      {showSetup && (
        <EventSetup
          onCreated={(eventId) => { setShowSetup(false); navigate(`/outreach/event/${eventId}`); }}
          onCancel={() => setShowSetup(false)}
        />
      )}

      <FieldNotesDrawer open={notesOpen} onClose={() => setNotesOpen(false)} />
    </div>
  );
}
