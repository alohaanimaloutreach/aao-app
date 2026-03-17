import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import {
  PawPrint, Users, MapPin, Flag, AlertTriangle, Clock, CalendarHeart,
  Plus, Pencil, ArrowRight, Eye, Stethoscope, Package, ListOrdered,
  CircleStop, Play, FlaskConical,
} from 'lucide-react';
import { formatRelative, daysSince, formatDate } from '../lib/format';
import { HAVENT_SEEN_DAYS } from '../lib/constants';
import { useTestMode } from '../lib/testMode';
import EventSetup from '../components/outreach/EventSetup';

interface Stats {
  animals: number | null;
  people: number | null;
  locations: number | null;
  openFlags: number | null;
  outreachThisMonth: number | null;
  foodThisMonth: number | null;
}

interface Alert {
  id: string;
  type: 'havent_seen' | 'urgent_medical' | 'lost_contact' | 'flagged';
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
}

export default function DashboardPage() {
  const { profile, session } = useAuth();
  const { testMode } = useTestMode();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({ animals: null, people: null, locations: null, openFlags: null, outreachThisMonth: null, foodThisMonth: null });
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeEvent, setActiveEvent] = useState<{ id: string; location_name: string | null; queueCount: number } | null>(null);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [endingEvent, setEndingEvent] = useState(false);
  const [showSetup, setShowSetup] = useState(false);

  useEffect(() => {
    if (session) loadDashboard();
  }, [session, testMode]);

  async function loadDashboard() {
    setLoading(true);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const noTest = !testMode;

    // Build filtered queries
    let animalsCountQ = supabase.from('animals').select('id', { count: 'exact', head: true }).eq('archived', false);
    let ownersCountQ = supabase.from('owners').select('id', { count: 'exact', head: true }).eq('archived', false);
    let outreachCountQ = supabase.from('outreach_events').select('id', { count: 'exact', head: true }).gte('event_date', monthStart);
    let foodQ = supabase.from('outreach_events').select('total_food_lbs').gte('event_date', monthStart);
    let allAnimalsQ = supabase.from('animals').select('id, name, aao_id, urgent_medical, deceased').eq('archived', false).eq('deceased', false);
    let careQ = supabase.from('care_events').select('animal_id, event_date').order('event_date', { ascending: false });
    let recentCareQ = supabase.from('care_events').select('id, animal_id, event_date, care_types, animal:animals(name, aao_id), author:users!created_by(name)').order('created_at', { ascending: false }).limit(10);
    let recentNotesQ = supabase.from('field_notes').select('id, animal_id, owner_id, location_id, note, created_at, author:users!created_by(name)').order('created_at', { ascending: false }).limit(10);

    if (noTest) {
      animalsCountQ = animalsCountQ.eq('is_test', false);
      ownersCountQ = ownersCountQ.eq('is_test', false);
      outreachCountQ = outreachCountQ.eq('is_test', false);
      foodQ = foodQ.eq('is_test', false);
      allAnimalsQ = allAnimalsQ.eq('is_test', false);
      careQ = careQ.eq('is_test', false);
      recentCareQ = recentCareQ.eq('is_test', false);
      recentNotesQ = recentNotesQ.eq('is_test', false);
    }

    const [
      animalsRes, peopleRes, locRes, flagsRes,
      outreachRes, foodRes,
      allAnimalsRes, careRes, situationsRes,
      recentCareRes, recentNotesRes,
      activeEventRes,
    ] = await Promise.all([
      animalsCountQ,
      ownersCountQ,
      supabase.from('locations').select('id', { count: 'exact', head: true }).eq('archived', false),
      supabase.from('flags').select('id', { count: 'exact', head: true }).eq('resolved', false),
      outreachCountQ,
      foodQ,
      allAnimalsQ,
      careQ,
      supabase.from('situations').select('animal_id, status, started_at').eq('is_active', true),
      recentCareQ,
      recentNotesQ,
      supabase.from('outreach_events').select('id, location:locations(name)').eq('status', 'active').limit(1).single(),
    ]);

    // Stats
    const totalFood = (foodRes.data ?? []).reduce((sum: number, e: any) => sum + (e.total_food_lbs ?? 0), 0);
    setStats({
      animals: animalsRes.count ?? 0,
      people: peopleRes.count ?? 0,
      locations: locRes.count ?? 0,
      openFlags: flagsRes.count ?? 0,
      outreachThisMonth: outreachRes.count ?? 0,
      foodThisMonth: Math.round(totalFood),
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
        link: '/animals',
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
        link: '/animals',
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
        link: '/animals',
        color: 'border-amber-300/30 bg-amber-50',
        icon: Eye,
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
        link: c.animal_id ? `/animals/${c.animal_id}` : null,
      });
    });
    (recentNotesRes.data ?? []).forEach((n: any) => {
      const noteLink = n.animal_id ? `/animals/${n.animal_id}` : n.owner_id ? `/people/${n.owner_id}` : n.location_id ? `/locations/${n.location_id}` : null;
      actItems.push({
        id: `note-${n.id}`,
        type: 'note',
        description: n.note.length > 80 ? n.note.slice(0, 80) + '...' : n.note,
        date: n.created_at,
        author: (Array.isArray(n.author) ? n.author[0] : n.author)?.name ?? null,
        link: noteLink,
      });
    });
    actItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setActivity(actItems.slice(0, 15));

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

  const statCards = [
    { label: 'Animals', value: stats.animals, icon: PawPrint, to: '/animals', color: 'from-primary/12 to-primary/5', iconColor: 'text-primary', accent: 'bg-primary' },
    { label: 'People', value: stats.people, icon: Users, to: '/people', color: 'from-gold/15 to-gold/5', iconColor: 'text-night', accent: 'bg-gold' },
    { label: 'Locations', value: stats.locations, icon: MapPin, to: '/locations', color: 'from-ember/10 to-ember/4', iconColor: 'text-ember', accent: 'bg-ember' },
    { label: 'Open Flags', value: stats.openFlags, icon: Flag, to: '/flags', color: 'from-muted/10 to-muted/4', iconColor: 'text-muted', accent: 'bg-muted' },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold font-heading text-night tracking-tight">
          Aloha, {profile?.name?.split(' ')[0] ?? 'friend'}
        </h1>
        <p className="text-muted mt-0.5">Here is what is happening at AAO today</p>
      </div>

      {/* Active Event Card */}
      {activeEvent && (
        <div className={`mb-4 rounded-2xl border-2 p-4 ${
          testMode
            ? 'border-amber-300 bg-amber-50'
            : 'border-primary/25 bg-primary/5'
        }`}>
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              testMode ? 'bg-amber-200' : 'bg-primary/15'
            }`}>
              {testMode
                ? <FlaskConical className="w-5 h-5 text-amber-700" />
                : <Play className="w-5 h-5 text-primary" fill="currentColor" />
              }
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-night">Outreach Event Active</p>
                {testMode && (
                  <span className="text-[10px] font-bold bg-amber-400 text-amber-900 px-1.5 py-0.5 rounded-full">TEST</span>
                )}
              </div>
              {activeEvent.location_name && (
                <p className="text-xs text-muted mt-0.5">{activeEvent.location_name}</p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Link
              to={`/outreach/event/${activeEvent.id}`}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary hover:bg-primary-hover text-white text-sm font-semibold rounded-xl shadow-[0_2px_8px_rgba(110,168,50,0.25)] transition-all"
            >
              <CalendarHeart className="w-4 h-4" />
              Check In Desk
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
              className="px-3 py-2.5 bg-white border border-night/10 rounded-xl text-xs font-medium text-muted hover:text-ember hover:border-ember/20 transition-all flex items-center gap-1.5 shrink-0"
              title="End Event"
            >
              <CircleStop className="w-4 h-4" />
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

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2 mb-6">
          {alerts.map((alert) => (
            <Link
              key={alert.id}
              to={alert.link}
              className={`flex items-start gap-3 p-4 rounded-2xl border ${alert.color} card-hover block`}
            >
              <div className="w-9 h-9 rounded-xl bg-white/60 flex items-center justify-center shrink-0">
                <alert.icon className="w-4.5 h-4.5 text-night/70" strokeWidth={1.75} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-night">{alert.title}</p>
                <p className="text-xs text-muted mt-0.5">{alert.description}</p>
              </div>
              <ArrowRight className="w-4 h-4 text-muted/30 mt-1 shrink-0" />
            </Link>
          ))}
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        <button
          onClick={() => setShowSetup(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-hover text-white text-sm font-semibold rounded-xl shadow-[0_2px_8px_rgba(110,168,50,0.2)] transition-all whitespace-nowrap"
        >
          <CalendarHeart className="w-4 h-4" strokeWidth={2} />
          Start Outreach
        </button>
        <button
          onClick={() => navigate('/animals')}
          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-night/8 text-night text-sm font-medium rounded-xl hover:bg-sand transition-all whitespace-nowrap"
        >
          <Plus className="w-4 h-4" strokeWidth={2} />
          Add Animal
        </button>
        <button
          onClick={() => navigate('/notes')}
          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-night/8 text-night text-sm font-medium rounded-xl hover:bg-sand transition-all whitespace-nowrap"
        >
          <Pencil className="w-4 h-4" strokeWidth={2} />
          Field Note
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
        {statCards.map((card) => (
          <Link
            key={card.label}
            to={card.to}
            className={`bg-gradient-to-br ${card.color} rounded-2xl p-4 md:p-5 card-hover relative overflow-hidden group`}
          >
            <div className={`absolute top-0 left-0 w-1 h-full ${card.accent} rounded-r-full opacity-60`} />
            <div className="flex items-start justify-between mb-3">
              <div className={`w-9 h-9 rounded-xl bg-white/60 flex items-center justify-center ${card.iconColor}`}>
                <card.icon className="w-4.5 h-4.5" strokeWidth={1.75} />
              </div>
              <ArrowRight className="w-4 h-4 text-muted/30 group-hover:text-muted/60 group-hover:translate-x-0.5 transition-all" />
            </div>
            {card.value === null ? (
              <div className="space-y-2"><div className="skeleton h-7 w-12" /><div className="skeleton h-3.5 w-16" /></div>
            ) : (
              <>
                <p className="text-2xl md:text-3xl font-bold font-heading text-night leading-none">{card.value.toLocaleString()}</p>
                <p className="text-xs md:text-sm text-muted mt-1">{card.label}</p>
              </>
            )}
          </Link>
        ))}
      </div>

      {/* This Month summary */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-white rounded-2xl border border-night/5 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <CalendarHeart className="w-5 h-5 text-primary" strokeWidth={1.5} />
          </div>
          <div>
            {stats.outreachThisMonth !== null ? (
              <p className="text-lg font-bold font-heading text-night">{stats.outreachThisMonth}</p>
            ) : (
              <div className="skeleton h-5 w-8" />
            )}
            <p className="text-[11px] text-muted">Outreach events this month</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-night/5 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gold/15 flex items-center justify-center">
            <Package className="w-5 h-5 text-night" strokeWidth={1.5} />
          </div>
          <div>
            {stats.foodThisMonth !== null ? (
              <p className="text-lg font-bold font-heading text-night">{stats.foodThisMonth} lbs</p>
            ) : (
              <div className="skeleton h-5 w-12" />
            )}
            <p className="text-[11px] text-muted">Food distributed this month</p>
          </div>
        </div>
      </div>

      {/* Activity Feed */}
      <div>
        <h2 className="text-lg font-heading font-bold text-night mb-4">Recent Activity</h2>
        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex gap-3">
                <div className="skeleton w-8 h-8 rounded-lg shrink-0" />
                <div className="flex-1 space-y-1.5"><div className="skeleton h-3.5 w-48" /><div className="skeleton h-3 w-24" /></div>
              </div>
            ))}
          </div>
        ) : activity.length === 0 ? (
          <div className="bg-white rounded-2xl border border-night/5 p-8 text-center">
            <p className="text-muted text-sm">No recent activity</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-night/5 divide-y divide-night/5">
            {activity.map((item) => {
              const content = (
                <>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    item.type === 'care' ? 'bg-primary/10' : 'bg-sky-50'
                  }`}>
                    {item.type === 'care' ? (
                      <Stethoscope className="w-3.5 h-3.5 text-primary" strokeWidth={1.75} />
                    ) : (
                      <Pencil className="w-3.5 h-3.5 text-sky-600" strokeWidth={1.75} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-night leading-tight truncate">{item.description}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-muted">{formatRelative(item.date)}</span>
                      {item.author && <span className="text-[10px] text-muted/50">{item.author}</span>}
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
        )}
      </div>

      {showSetup && (
        <EventSetup
          onCreated={(eventId) => { setShowSetup(false); navigate(`/outreach/event/${eventId}`); }}
          onCancel={() => setShowSetup(false)}
        />
      )}
    </div>
  );
}
