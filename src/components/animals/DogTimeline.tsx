import { useEffect, useState } from 'react';
import {
  Stethoscope,
  ArrowRightLeft,
  StickyNote,
  Camera,
  Package,
  Syringe,
  MapPin,
  User,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatDate, formatDateTime } from '../../lib/format';
import { SITUATION_CONFIG, TIMELINE_ICON_CONFIG } from '../../lib/constants';
import StatusBadge from '../shared/StatusBadge';

interface TimelineEntry {
  id: string;
  type: 'care_event' | 'situation_change' | 'field_note' | 'photo';
  date: string;
  title: string;
  description: string | null;
  meta?: Record<string, string | null>;
  created_by_name?: string;
  status?: string;
}

interface Props {
  animalId: string;
}

export default function DogTimeline({ animalId }: Props) {
  const [entries, setEntries] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTimeline();
  }, [animalId]);

  async function loadTimeline() {
    setLoading(true);

    const [careRes, sitRes, noteRes, photoRes] = await Promise.all([
      supabase
        .from('care_events')
        .select('id, event_date, care_types, food_bags, food_lbs, health_notes, other_notes, vaccine_lot_dapp, vaccine_lot_parvo, preventative_product, microchip_placed, created_by, users:created_by(name)')
        .eq('animal_id', animalId)
        .order('event_date', { ascending: false }),
      supabase
        .from('situations')
        .select('id, status, started_at, ended_at, notes, created_by, users:created_by(name)')
        .eq('animal_id', animalId)
        .order('started_at', { ascending: false }),
      supabase
        .from('field_notes')
        .select('id, content, is_flagged, created_at, created_by, users:created_by(name)')
        .eq('animal_id', animalId)
        .order('created_at', { ascending: false }),
      supabase
        .from('photos')
        .select('id, caption, taken_at, created_at, taken_by, users:taken_by(name)')
        .eq('animal_id', animalId)
        .order('created_at', { ascending: false }),
    ]);

    const timeline: TimelineEntry[] = [];

    // Care events
    (careRes.data ?? []).forEach((ce: any) => {
      const types = (ce.care_types ?? []) as string[];
      const details: string[] = [];
      if (ce.food_bags) details.push(`${ce.food_bags} food bag${ce.food_bags > 1 ? 's' : ''}`);
      if (ce.vaccine_lot_dapp) details.push('DAPP vaccine');
      if (ce.vaccine_lot_parvo) details.push('Parvo vaccine');
      if (ce.preventative_product) details.push(ce.preventative_product);
      if (ce.microchip_placed) details.push('Microchip placed');
      if (ce.health_notes) details.push(ce.health_notes);
      if (ce.other_notes) details.push(ce.other_notes);

      timeline.push({
        id: ce.id,
        type: 'care_event',
        date: ce.event_date,
        title: types.length > 0 ? types.map(formatCareType).join(', ') : 'Care event',
        description: details.join(' · ') || null,
        created_by_name: ce.users?.name,
      });
    });

    // Situations
    (sitRes.data ?? []).forEach((s: any) => {
      const config = SITUATION_CONFIG[s.status];
      timeline.push({
        id: s.id,
        type: 'situation_change',
        date: s.started_at,
        title: `Status changed to ${config?.label ?? s.status}`,
        description: s.notes,
        created_by_name: s.users?.name,
        status: s.status,
      });
    });

    // Field notes
    (noteRes.data ?? []).forEach((fn: any) => {
      timeline.push({
        id: fn.id,
        type: 'field_note',
        date: fn.created_at,
        title: fn.is_flagged ? 'Flagged note' : 'Field note',
        description: fn.content,
        created_by_name: fn.users?.name,
      });
    });

    // Photos
    (photoRes.data ?? []).forEach((p: any) => {
      timeline.push({
        id: p.id,
        type: 'photo',
        date: p.taken_at ?? p.created_at,
        title: 'Photo added',
        description: p.caption,
        created_by_name: p.users?.name,
      });
    });

    // Sort newest first
    timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    setEntries(timeline);
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex gap-3">
            <div className="skeleton w-9 h-9 rounded-xl shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="skeleton h-4 w-40" />
              <div className="skeleton h-3 w-64" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-8 text-muted text-sm">
        No timeline entries yet
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-[18px] top-5 bottom-5 w-px bg-night/8" />

      <div className="space-y-1">
        {entries.map((entry) => (
          <TimelineItem key={`${entry.type}-${entry.id}`} entry={entry} />
        ))}
      </div>
    </div>
  );
}

function TimelineItem({ entry }: { entry: TimelineEntry }) {
  const iconConfig = TIMELINE_ICON_CONFIG[entry.type];
  const Icon = {
    care_event: Stethoscope,
    situation_change: ArrowRightLeft,
    field_note: StickyNote,
    photo: Camera,
  }[entry.type];

  return (
    <div className="flex gap-3 py-3 relative">
      {/* Icon */}
      <div className={`w-9 h-9 rounded-xl ${iconConfig.bg} flex items-center justify-center shrink-0 z-10`}>
        <Icon className={`w-4 h-4 ${iconConfig.text}`} strokeWidth={1.75} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pt-0.5">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium text-night leading-tight">{entry.title}</p>
          <span className="text-xs text-muted shrink-0">{formatDate(entry.date)}</span>
        </div>

        {entry.status && (
          <div className="mt-1">
            <StatusBadge status={entry.status} />
          </div>
        )}

        {entry.description && (
          <p className="text-xs text-muted mt-1 leading-relaxed line-clamp-3">{entry.description}</p>
        )}

        {entry.created_by_name && (
          <p className="text-xs text-muted mt-1">{entry.created_by_name}</p>
        )}
      </div>
    </div>
  );
}

function formatCareType(type: string): string {
  return type
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
