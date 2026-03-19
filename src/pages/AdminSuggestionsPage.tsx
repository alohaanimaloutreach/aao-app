import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { MessageSquarePlus, Check, Clock, Loader2 } from 'lucide-react';
import { formatDateTime } from '../lib/format';
import EmptyState from '../components/shared/EmptyState';

interface Suggestion {
  id: string;
  message: string;
  status: 'open' | 'complete';
  submitted_by_name: string | null;
  completed_at: string | null;
  created_at: string;
}

export default function AdminSuggestionsPage() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => { loadSuggestions(); }, []);

  async function loadSuggestions() {
    setLoading(true);
    const { data } = await supabase
      .from('suggestions')
      .select('*')
      .order('created_at', { ascending: false });
    setSuggestions(data ?? []);
    setLoading(false);
  }

  async function toggleStatus(s: Suggestion) {
    setToggling(s.id);
    const newStatus = s.status === 'open' ? 'complete' : 'open';
    await supabase.from('suggestions').update({
      status: newStatus,
      completed_at: newStatus === 'complete' ? new Date().toISOString() : null,
    }).eq('id', s.id);
    setSuggestions((prev) =>
      prev.map((item) => item.id === s.id ? { ...item, status: newStatus, completed_at: newStatus === 'complete' ? new Date().toISOString() : null } : item)
    );
    setToggling(null);
  }

  // Sort: open first, then complete — each group sorted by newest first
  const sorted = [...suggestions].sort((a, b) => {
    if (a.status !== b.status) return a.status === 'open' ? -1 : 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const openCount = suggestions.filter((s) => s.status === 'open').length;
  const completeCount = suggestions.filter((s) => s.status === 'complete').length;

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-heading text-night tracking-tight">Suggestions</h1>
          <p className="text-muted mt-0.5">Feedback and requests from users</p>
        </div>
        {!loading && suggestions.length > 0 && (
          <div className="flex items-center gap-3 text-sm text-muted">
            <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {openCount} open</span>
            <span className="flex items-center gap-1"><Check className="w-3.5 h-3.5 text-primary" /> {completeCount} done</span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-night/5 p-4 space-y-2">
              <div className="skeleton h-4 w-32" />
              <div className="skeleton h-3 w-full" />
            </div>
          ))}
        </div>
      ) : suggestions.length === 0 ? (
        <EmptyState
          icon={MessageSquarePlus}
          title="No suggestions yet"
          description="Suggestions submitted from the Guide page will appear here"
          iconColor="text-primary"
        />
      ) : (
        <div className="space-y-2">
          {sorted.map((s) => {
            const isComplete = s.status === 'complete';
            return (
              <div
                key={s.id}
                className={`bg-white rounded-2xl border p-4 transition-all ${isComplete ? 'border-night/5 opacity-60' : 'border-night/5'}`}
              >
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => toggleStatus(s)}
                    disabled={toggling === s.id}
                    className={`w-6 h-6 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                      isComplete ? 'border-primary bg-primary' : 'border-night/15 hover:border-primary/50'
                    }`}
                    aria-label={isComplete ? 'Mark as open' : 'Mark as complete'}
                  >
                    {toggling === s.id ? (
                      <Loader2 className="w-3.5 h-3.5 text-muted animate-spin" />
                    ) : isComplete ? (
                      <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                    ) : null}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm leading-relaxed ${isComplete ? 'text-muted line-through' : 'text-night'}`}>
                      {s.message}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-xs text-muted">{formatDateTime(s.created_at)}</span>
                      {s.submitted_by_name && (
                        <span className="text-xs text-muted">— {s.submitted_by_name}</span>
                      )}
                      {isComplete && s.completed_at && (
                        <span className="text-xs text-primary font-medium">Completed {formatDateTime(s.completed_at)}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
