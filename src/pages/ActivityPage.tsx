import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Stethoscope, Pencil, ArrowRight, ChevronDown, ChevronUp } from 'lucide-react';
import { formatRelative } from '../lib/format';

interface ActivityItem {
  id: string;
  type: string;
  description: string;
  date: string;
  author: string | null;
  link: string | null;
}

export default function ActivityPage() {
  const { session } = useAuth();
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'care' | 'note'>('all');

  useEffect(() => {
    if (session) loadActivity();
  }, [session]);

  async function loadActivity() {
    setLoading(true);

    const [careRes, notesRes] = await Promise.all([
      supabase
        .from('care_events')
        .select('id, animal_id, outreach_event_id, event_date, care_types, animal:animals(name, aao_id), author:users!created_by(name)')
        .order('created_at', { ascending: false })
        .limit(100),
      supabase
        .from('field_notes')
        .select('id, animal_id, owner_id, location_id, note, created_at, author:users!created_by(name)')
        .order('created_at', { ascending: false })
        .limit(100),
    ]);

    const items: ActivityItem[] = [];

    (careRes.data ?? []).forEach((c: any) => {
      const types = (c.care_types ?? []).join(', ').replace(/_/g, ' ');
      const animal = Array.isArray(c.animal) ? c.animal[0] : c.animal;
      const animalName = animal?.name ?? animal?.aao_id ?? 'Unknown';
      items.push({
        id: `care-${c.id}`,
        type: 'care',
        description: `${types || 'Care'} for ${animalName}`,
        date: c.event_date,
        author: (Array.isArray(c.author) ? c.author[0] : c.author)?.name ?? null,
        link: c.animal_id ? `/animals/${c.animal_id}?highlight=care-${c.id}` : c.outreach_event_id ? `/outreach/summary/${c.outreach_event_id}` : '/outreach',
      });
    });

    (notesRes.data ?? []).forEach((n: any) => {
      const noteLink = n.animal_id ? `/animals/${n.animal_id}?highlight=note-${n.id}` : n.owner_id ? `/people/${n.owner_id}?highlight=note-${n.id}` : n.location_id ? `/locations/${n.location_id}?highlight=note-${n.id}` : '/notes';
      items.push({
        id: `note-${n.id}`,
        type: 'note',
        description: (n.note ?? '').length > 80 ? n.note.slice(0, 80) + '...' : (n.note ?? 'Note'),
        date: n.created_at,
        author: (Array.isArray(n.author) ? n.author[0] : n.author)?.name ?? null,
        link: noteLink,
      });
    });

    items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setActivity(items);
    setLoading(false);
  }

  const filtered = filter === 'all' ? activity : activity.filter((a) => a.type === filter);

  // Group by date period
  const groups: { label: string; items: ActivityItem[] }[] = [];
  let currentLabel = '';
  filtered.forEach((item) => {
    const label = formatRelative(item.date);
    const groupLabel = label === 'Today' ? 'Today' : label === 'Yesterday' ? 'Yesterday' : label.includes('days ago') ? 'This Week' : 'Earlier';
    if (groupLabel !== currentLabel) {
      groups.push({ label: groupLabel, items: [] });
      currentLabel = groupLabel;
    }
    groups[groups.length - 1].items.push(item);
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl md:text-3xl font-bold font-heading text-night tracking-tight">Activity Feed</h1>
        <div className="flex gap-1 bg-sand/50 rounded-lg p-0.5">
          {([['all', 'All'], ['care', 'Care'], ['note', 'Notes']] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                filter === key ? 'bg-white text-night shadow-sm' : 'text-muted hover:text-night'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex gap-3 px-4 py-3">
              <div className="skeleton w-4 h-4 rounded shrink-0 mt-0.5" />
              <div className="flex-1 space-y-1.5"><div className="skeleton h-3.5 w-48" /><div className="skeleton h-3 w-24" /></div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-night/5 p-8 text-center">
          <p className="text-muted text-sm">No activity yet</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-night/5 overflow-hidden">
          {groups.map((group) => (
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
                        <p className="text-sm text-night leading-tight">{item.description}</p>
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
        </div>
      )}
    </div>
  );
}
