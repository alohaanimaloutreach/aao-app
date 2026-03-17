import { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Clock,
  Loader2,
  PawPrint,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Props {
  eventId: string;
}

interface CompletedEntry {
  id: string;
  owner_id: string;
  completed_at: string | null;
  staged_care: { animal_name: string; aao_id: string; services: string[] }[];
  owner: { name: string } | null;
}

export default function CompletedList({ eventId }: Props) {
  const [entries, setEntries] = useState<CompletedEntry[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadCompleted() {
    const { data } = await supabase
      .from('checkin_queue')
      .select('id, owner_id, completed_at, staged_care, owner:owners(name)')
      .eq('outreach_event_id', eventId)
      .eq('status', 'complete')
      .order('completed_at', { ascending: false });
    setEntries((data ?? []).map((d: any) => ({
      ...d,
      owner: Array.isArray(d.owner) ? d.owner[0] ?? null : d.owner,
    })) as CompletedEntry[]);
    setLoading(false);
  }

  useEffect(() => {
    loadCompleted();

    const channel = supabase
      .channel(`completed-${eventId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'checkin_queue',
        filter: `outreach_event_id=eq.${eventId}`,
      }, () => {
        loadCompleted();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [eventId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-10">
        <CheckCircle2 className="w-10 h-10 text-muted/20 mx-auto mb-3" />
        <p className="text-sm text-muted">No completed check-ins yet</p>
        <p className="text-xs text-muted mt-1">Completed records will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-heading font-bold text-night">
        Completed
        <span className="text-sm font-normal text-muted ml-2">({entries.length})</span>
      </h3>
      <div className="space-y-1.5">
        {entries.map((entry) => {
          const animalCount = entry.staged_care.length;
          const allServices = [...new Set(entry.staged_care.flatMap((a) => a.services))];
          const label = allServices.length === 0 || (allServices.length === 1 && (allServices[0] === 'food' || allServices[0] === 'seen'))
            ? 'Food only'
            : allServices.filter((s) => s !== 'seen').map((s) => s.replace(/_/g, ' ')).join(', ');
          const time = entry.completed_at
            ? new Date(entry.completed_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
            : '';

          return (
            <div
              key={entry.id}
              className="bg-primary/4 rounded-xl border border-primary/10 px-3 py-2.5"
            >
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-night truncate">{entry.owner?.name ?? 'Unknown'}</span>
                    {time && <span className="text-xs text-muted">{time}</span>}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted flex items-center gap-1">
                      <PawPrint className="w-3 h-3" />
                      {animalCount} animal{animalCount !== 1 ? 's' : ''}
                    </span>
                    <span className="text-xs text-muted capitalize">{label}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
