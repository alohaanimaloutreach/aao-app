import { useState } from 'react';
import { Check, X, Flag } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { formatDate } from '../../lib/format';

interface FlagItem {
  id: string;
  reason: string | null;
  resolved: boolean;
  created_at?: string;
  [key: string]: any;
}

interface Props {
  flags: FlagItem[];
  onUpdate: () => void;
}

export default function FlagResolver({ flags, onUpdate }: Props) {
  const { user } = useAuth();
  const [resolving, setResolving] = useState<string | null>(null);

  async function resolve(flagId: string) {
    if (!user) return;
    setResolving(flagId);
    await supabase.from('flags').update({
      resolved: true,
      resolved_by: user.id,
      resolved_at: new Date().toISOString(),
    }).eq('id', flagId);
    setResolving(null);
    onUpdate();
  }

  const unresolved = flags.filter((f) => !f.resolved);
  const resolved = flags.filter((f) => f.resolved);

  if (flags.length === 0) return null;

  return (
    <div className="space-y-2">
      {unresolved.map((f) => (
        <div key={f.id} className="flex items-start justify-between gap-3 p-3 bg-gold/6 border border-gold/20 rounded-xl">
          <div className="flex items-start gap-2">
            <Flag className="w-3.5 h-3.5 text-gold mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-night">{f.reason ?? 'Flagged for review'}</p>
              <p className="text-[10px] text-muted mt-0.5">{formatDate(f.created_at)}</p>
            </div>
          </div>
          <button
            onClick={() => resolve(f.id)}
            disabled={resolving === f.id}
            className="flex items-center gap-1 px-2.5 py-1 bg-primary/10 hover:bg-primary/20 text-primary text-[11px] font-medium rounded-lg transition-all shrink-0"
          >
            <Check className="w-3 h-3" strokeWidth={2.5} />
            {resolving === f.id ? '...' : 'Resolve'}
          </button>
        </div>
      ))}
      {resolved.length > 0 && (
        <details className="text-xs">
          <summary className="text-muted cursor-pointer py-1">{resolved.length} resolved flag{resolved.length > 1 ? 's' : ''}</summary>
          <div className="space-y-1 mt-1">
            {resolved.map((f) => (
              <div key={f.id} className="flex items-center gap-2 p-2 bg-sand/50 rounded-lg text-muted">
                <Check className="w-3 h-3 text-primary" />
                <span className="line-through">{f.reason ?? 'Flagged for review'}</span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
