import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import {
  PawPrint, Users, MapPin, Flag, AlertTriangle, Clock, CalendarHeart,
  Pencil, ArrowRight, Eye, Stethoscope, ListOrdered,
  CircleStop, Play, X, StickyNote, BarChart3, ChevronDown, Scissors, ChevronUp,
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

  function dismissWelcome() {
    localStorage.setItem('aao-welcome-dismissed', '1');
    setShowWelcome(false);
  }

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
    const recentCareQ = supabase.from('care_events').select('id, animal_id, outreach_event_id, event_date, care_types, animal:animals(name, aao_id), author:users!created_by(name)').order('created_at', { ascending: false }).limit(100);
    const recentNotesQ = supabase.from('field_notes').select('id, animal_id, owner_id, location_id, note, created_at, author:users!created_by(name)').order('created_at', { ascending: false }).limit(50);

    const [
      animalsRes, peopleRes, locRes, flagsRes,
      allAnimalsRes, careRes, situationsRes,
      recentCareRes, recentNotesRes,
      activeEventRes, outreachCountRes, snCountRes, foodRes, earliestEventRes,
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
      supabase.from('care_events').select('id', { count: 'exact', head: true }).contains('care_types', ['spay_neuter']),
      supabase.from('outreach_events').select('total_food_lbs'),
      supabase.from('outreach_events').select('event_date').order('event_date', { ascending: true }).limit(1).single(),
    ]);

    // Stats
    const totalFood = (foodRes.data ?? []).reduce((sum: number, e: any) => sum + (e.total_food_lbs ?? 0), 0);
    setStats({
      animals: animalsRes.count ?? 0,
      people: peopleRes.count ?? 0,
      locations: locRes.count ?? 0,
      openFlags: flagsRes.count ?? 0,
      outreachEvents: outreachCountRes.count ?? 0,
      snCount: snCountRes.count ?? 0,
      foodLbs: Math.round(totalFood),
      sinceDate: (earliestEventRes.data as any)?.event_date ?? null,
    });

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
      const animalName = animal?.name ?? animal?.aao_id ?? 'Unknown';
      actItems.push({
        id: `care-${c.id}`,
        type: 'care',
        description: `${types || 'Care'} for ${animalName}`,
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
      .select('food_bags, food_lbs')
      .eq('outreach_event_id', activeEvent.id);
    const totalBags = (care ?? []).reduce((sum, c) => sum + ((c as any).food_bags ?? 0), 0);
    const totalLbs = (care ?? []).reduce((sum, c) => sum + ((c as any).food_lbs ?? 0), 0);
    await supabase.from('outreach_events').update({
      status: 'completed',
      total_bags: totalBags || null,
      total_food_lbs: totalLbs || null,
    }).eq('id', activeEvent.id);
    setEndingEvent(false);
    setShowEndConfirm(false);
    navigate(`/outreach/summary/${activeEvent.id}`);
  }


  const [showMore, setShowMore] = useState(false);

  const quickLinks = [
    { to: '/locations', icon: MapPin, label: 'Locations', color: 'text-muted' },
    { to: '/notes', icon: StickyNote, label: 'Notes', color: 'text-muted' },
    { to: '/flags', icon: Flag, label: 'Flags', color: 'text-muted' },
    { to: '#activity', icon: Clock, label: 'Activity', color: 'text-muted' },
    { to: '/reports', icon: BarChart3, label: 'Reports', color: 'text-muted' },
  ];

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
          <div className="flex gap-1 bg-sand/50 rounded-lg p-0.5 overflow-x-auto">
            {filterTabs.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => { setActivityFilter(key); setActivityExpanded(false); }}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  activityFilter === key ? 'bg-white text-night shadow-sm' : 'text-muted hover:text-night'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
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
          Aloha, {profile?.name?.split(' ')[0] ?? 'friend'}
        </h1>
        {isTestEnv ? (
          <p className="text-sm text-amber-600 font-medium mb-4">You are in the practice app. Tap around freely — nothing here is real.</p>
        ) : (
          <p className="text-sm text-muted mb-4">What do you want to do today?</p>
        )}

        {/* Action cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5">
          <button
            onClick={() => setShowSetup(true)}
            className="col-span-2 md:col-span-1 flex flex-col items-center gap-2 p-4 bg-primary text-white rounded-2xl hover:bg-primary-hover transition-colors shadow-sm"
          >
            <CalendarHeart className="w-6 h-6" strokeWidth={1.75} />
            <span className="text-sm font-semibold">Start Outreach</span>
          </button>
          <Link
            to="/animals"
            className="flex flex-col items-center justify-center gap-1 p-4 bg-white rounded-2xl border border-night/5 text-night hover:bg-sand/50 transition-colors"
          >
            <PawPrint className="w-5 h-5 text-primary" strokeWidth={1.75} />
            {stats.animals !== null ? (
              <span className="text-xl font-bold font-heading text-night leading-none">{stats.animals.toLocaleString()}</span>
            ) : (
              <div className="skeleton h-6 w-8" />
            )}
            <span className="text-xs text-muted">Animals</span>
          </Link>
          <Link
            to="/people"
            className="flex flex-col items-center justify-center gap-1 p-4 bg-white rounded-2xl border border-night/5 text-night hover:bg-sand/50 transition-colors"
          >
            <Users className="w-5 h-5 text-muted" strokeWidth={1.75} />
            {stats.people !== null ? (
              <span className="text-xl font-bold font-heading text-night leading-none">{stats.people.toLocaleString()}</span>
            ) : (
              <div className="skeleton h-6 w-8" />
            )}
            <span className="text-xs text-muted">People</span>
          </Link>
          <Link
            to="/locations"
            className="flex flex-col items-center justify-center gap-1 p-4 bg-white rounded-2xl border border-night/5 text-night hover:bg-sand/50 transition-colors"
          >
            <MapPin className="w-5 h-5 text-ember" strokeWidth={1.75} />
            {stats.locations !== null ? (
              <span className="text-xl font-bold font-heading text-night leading-none">{stats.locations.toLocaleString()}</span>
            ) : (
              <div className="skeleton h-6 w-8" />
            )}
            <span className="text-xs text-muted">Locations</span>
          </Link>
          <button
            onClick={() => setNotesOpen(true)}
            className="flex flex-col items-center gap-2 p-4 bg-white rounded-2xl border border-night/5 text-night hover:bg-sand/50 transition-colors"
          >
            <Pencil className="w-6 h-6 text-muted" strokeWidth={1.75} />
            <span className="text-sm font-semibold">New Field Note</span>
          </button>
        </div>

        {/* Impact stats bar */}
        {stats.outreachEvents !== null && (
          <div className="mt-3 text-center">
            {stats.sinceDate && (
              <p className="text-xs text-muted mb-1">Since {formatDate(stats.sinceDate)}</p>
            )}
            <div className="flex items-center justify-center gap-4 md:gap-6 text-sm text-muted">
              <span><strong className="text-night font-bold text-base">{stats.outreachEvents}</strong> outreach events</span>
              <span className="text-night/10">|</span>
              <span><strong className="text-night font-bold text-base">{stats.snCount?.toLocaleString()}</strong> spayed/neutered</span>
              <span className="text-night/10">|</span>
              <span><strong className="text-night font-bold text-base">{stats.foodLbs?.toLocaleString()}</strong> lbs food distributed</span>
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

      {/* Activity — full width */}
      <div className="mt-6">
        {activityFeed}
      </div>

      {/* Quick links — mobile only */}
      <div className="mt-6 mb-2 md:hidden">
        <button
          onClick={() => setShowMore(!showMore)}
          className="flex items-center justify-center gap-1.5 w-full py-2 text-xs font-medium text-muted hover:text-night transition-colors"
        >
          More
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showMore ? 'rotate-180' : ''}`} />
        </button>
        {showMore && (
          <div className="grid grid-cols-5 gap-2 mt-1">
            {quickLinks.map((ql) =>
              ql.to.startsWith('#') ? (
                <button
                  key={ql.to}
                  onClick={() => document.getElementById(ql.to.slice(1))?.scrollIntoView({ behavior: 'smooth' })}
                  className="flex flex-col items-center gap-1.5 py-3 rounded-xl bg-white border border-night/5 hover:bg-sand/50 transition-colors"
                >
                  <ql.icon className={`w-4.5 h-4.5 ${ql.color}`} strokeWidth={1.75} />
                  <span className="text-xs font-medium text-night">{ql.label}</span>
                </button>
              ) : (
                <Link
                  key={ql.to}
                  to={ql.to}
                  className="flex flex-col items-center gap-1.5 py-3 rounded-xl bg-white border border-night/5 hover:bg-sand/50 transition-colors"
                >
                  <ql.icon className={`w-4.5 h-4.5 ${ql.color}`} strokeWidth={1.75} />
                  <span className="text-xs font-medium text-night">{ql.label}</span>
                </Link>
              )
            )}
          </div>
        )}
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
