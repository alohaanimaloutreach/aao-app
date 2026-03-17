import { useState } from 'react';
import { Check, Undo2, Flag, ChevronDown, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { formatDate } from '../../lib/format';
import { getSmartActions, type SmartAction } from '../../lib/flagActions';

interface FlagItem {
  id: string;
  reason: string | null;
  resolved: boolean;
  resolved_at?: string | null;
  resolution_action?: string | null;
  resolution_note?: string | null;
  created_at?: string;
  [key: string]: any;
}

interface Props {
  flags: FlagItem[];
  onUpdate: () => void;
  /** Table name for smart action matching (e.g. 'animals', 'owners') */
  tableName?: string;
  /** Record ID for mutation actions */
  recordId?: string;
  /** Callback to open edit modal focused on a specific field */
  onEditField?: (field: string) => void;
}

export default function FlagResolver({ flags, onUpdate, tableName, recordId, onEditField }: Props) {
  const { user } = useAuth();
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleAction(flagId: string, action: SmartAction) {
    if (!user) return;
    setSaving(true);

    // Execute mutation if the action has one
    if (action.mutation && recordId) {
      await action.mutation({ recordId, userId: user.id });
    }

    // Resolve the flag
    await supabase.from('flags').update({
      resolved: true,
      resolved_by: user.id,
      resolved_at: new Date().toISOString(),
      resolution_action: action.value,
      resolution_note: action.label,
    }).eq('id', flagId);

    setSaving(false);
    setResolvingId(null);

    // If navigate action, open edit modal to field
    if (action.type === 'navigate' && action.editField && onEditField) {
      onEditField(action.editField);
    }

    onUpdate();
  }

  async function unresolve(flagId: string) {
    if (!user) return;
    setSaving(true);
    await supabase.from('flags').update({
      resolved: false,
      resolved_by: null,
      resolved_at: null,
      resolution_action: null,
      resolution_note: null,
    }).eq('id', flagId);
    setSaving(false);
    onUpdate();
  }

  const unresolved = flags.filter((f) => !f.resolved);
  const resolved = flags.filter((f) => f.resolved);

  if (flags.length === 0) return null;

  return (
    <div className="space-y-2">
      {unresolved.map((f) => {
        const actions = getSmartActions(f.reason, tableName ?? '');
        const isResolving = resolvingId === f.id;

        return (
          <div key={f.id} className="p-3 bg-gold/6 border border-gold/20 rounded-xl">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2">
                <Flag className="w-3.5 h-3.5 text-gold mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-night">{f.reason ?? 'Flagged for review'}</p>
                  <p className="text-xs text-muted mt-0.5">{formatDate(f.created_at)}</p>
                </div>
              </div>
              <button
                onClick={() => setResolvingId(isResolving ? null : f.id)}
                className="flex items-center gap-1 px-2.5 py-1 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-medium rounded-lg transition-all shrink-0"
              >
                <Check className="w-3 h-3" strokeWidth={2.5} />
                Resolve
                <ChevronDown className={`w-3 h-3 transition-transform ${isResolving ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {/* Smart resolution choices */}
            {isResolving && (
              <div className="mt-3 space-y-1.5 pl-5">
                <p className="text-xs font-medium text-muted mb-1">How was this resolved?</p>
                {actions.map((action) => (
                  <button
                    key={action.value}
                    onClick={() => handleAction(f.id, action)}
                    disabled={saving}
                    className={`w-full text-left px-3 py-2 text-xs text-night bg-white border rounded-lg transition-all disabled:opacity-40 ${
                      action.type === 'mutation'
                        ? 'border-primary/20 hover:bg-primary/5 hover:border-primary/30 font-medium'
                        : action.type === 'navigate'
                          ? 'border-sky-200 hover:bg-sky-50 hover:border-sky-300'
                          : 'border-night/8 hover:bg-sand/50 hover:border-night/12'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      {saving && <Loader2 className="w-3 h-3 animate-spin shrink-0" />}
                      {action.label}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {resolved.map((f) => (
        <div key={f.id} className="flex items-start justify-between gap-3 p-3 bg-primary/4 border border-primary/15 rounded-xl">
          <div className="flex items-start gap-2">
            <Check className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-night/60">{f.reason ?? 'Flagged for review'}</p>
              {f.resolution_note && (
                <p className="text-xs text-primary font-medium mt-0.5">{f.resolution_note}</p>
              )}
              <p className="text-xs text-muted mt-0.5">
                Resolved {f.resolved_at ? formatDate(f.resolved_at) : ''}
              </p>
            </div>
          </div>
          <button
            onClick={() => unresolve(f.id)}
            disabled={saving}
            className="flex items-center gap-1 px-2.5 py-1 bg-sand hover:bg-night/8 text-muted text-xs font-medium rounded-lg transition-all shrink-0 disabled:opacity-40"
          >
            <Undo2 className="w-3 h-3" />
            Undo
          </button>
        </div>
      ))}
    </div>
  );
}
