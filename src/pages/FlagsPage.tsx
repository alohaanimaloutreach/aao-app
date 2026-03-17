import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Flag, Check, PawPrint, User, MapPin, X, MessageSquare,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { formatDate } from '../lib/format';
import EmptyState from '../components/shared/EmptyState';

interface FlagRow {
  id: string;
  table_name: string;
  record_id: string;
  reason: string | null;
  resolved: boolean;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_action: string | null;
  resolution_note: string | null;
  created_at: string;
  record_label: string | null;
}

const TABLE_CONFIG: Record<string, { label: string; icon: any; path: string; color: string }> = {
  animals: { label: 'Animal', icon: PawPrint, path: '/animals', color: 'bg-primary/10 text-primary' },
  owners: { label: 'Person', icon: User, path: '/people', color: 'bg-gold/15 text-night' },
  locations: { label: 'Location', icon: MapPin, path: '/locations', color: 'bg-ember/10 text-ember' },
};

const RESOLUTION_ACTIONS = [
  {
    value: 'verified_correct',
    label: 'Verified, no changes needed',
    description: 'Reviewed the record and confirmed the data is correct',
  },
  {
    value: 'updated_record',
    label: 'Reviewed and updated',
    description: 'Made corrections to the record based on this flag',
  },
  {
    value: 'needs_field_followup',
    label: 'Needs follow up in the field',
    description: 'Cannot resolve from the app, needs an in person check',
  },
  {
    value: 'duplicate_handled',
    label: 'Duplicate handled',
    description: 'Merged, removed, or reassigned a duplicate record',
  },
  {
    value: 'not_applicable',
    label: 'Not applicable',
    description: 'This flag does not apply or is no longer relevant',
  },
];

type FilterTab = 'unresolved' | 'resolved' | 'all';
type TableFilter = '' | 'animals' | 'owners' | 'locations';

export default function FlagsPage() {
  const { session, user, isAdmin } = useAuth();
  const [flags, setFlags] = useState<FlagRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [selectedAction, setSelectedAction] = useState('');
  const [resolutionNote, setResolutionNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<FilterTab>('unresolved');
  const [tableFilter, setTableFilter] = useState<TableFilter>('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (session) loadFlags();
  }, [session]);

  async function loadFlags() {
    setLoading(true);

    const { data: flagData } = await supabase
      .from('flags')
      .select('*')
      .order('created_at', { ascending: false });

    if (!flagData) {
      setFlags([]);
      setLoading(false);
      return;
    }

    // Collect record IDs by table to fetch labels
    const animalIds = flagData.filter(f => f.table_name === 'animals').map(f => f.record_id);
    const ownerIds = flagData.filter(f => f.table_name === 'owners').map(f => f.record_id);
    const locationIds = flagData.filter(f => f.table_name === 'locations').map(f => f.record_id);

    const [animalRes, ownerRes, locationRes] = await Promise.all([
      animalIds.length > 0
        ? supabase.from('animals').select('id, name, aao_id').in('id', animalIds)
        : { data: [] },
      ownerIds.length > 0
        ? supabase.from('owners').select('id, name').in('id', ownerIds)
        : { data: [] },
      locationIds.length > 0
        ? supabase.from('locations').select('id, name').in('id', locationIds)
        : { data: [] },
    ]);

    const labelMap: Record<string, string> = {};
    (animalRes.data ?? []).forEach((a: any) => {
      labelMap[a.id] = a.name ?? a.aao_id ?? 'Unnamed';
    });
    (ownerRes.data ?? []).forEach((o: any) => {
      labelMap[o.id] = o.name ?? 'Unknown';
    });
    (locationRes.data ?? []).forEach((l: any) => {
      labelMap[l.id] = l.name ?? 'Unknown';
    });

    setFlags(flagData.map(f => ({
      ...f,
      record_label: labelMap[f.record_id] ?? null,
    })));
    setLoading(false);
  }

  function openResolve(flagId: string) {
    setResolvingId(flagId);
    setSelectedAction('');
    setResolutionNote('');
  }

  function cancelResolve() {
    setResolvingId(null);
    setSelectedAction('');
    setResolutionNote('');
  }

  async function submitResolve() {
    if (!user || !resolvingId || !selectedAction) return;
    setSaving(true);
    await supabase.from('flags').update({
      resolved: true,
      resolved_by: user.id,
      resolved_at: new Date().toISOString(),
      resolution_action: selectedAction,
      resolution_note: resolutionNote.trim() || null,
    }).eq('id', resolvingId);

    setFlags(prev => prev.map(f =>
      f.id === resolvingId
        ? {
            ...f,
            resolved: true,
            resolved_at: new Date().toISOString(),
            resolution_action: selectedAction,
            resolution_note: resolutionNote.trim() || null,
          }
        : f
    ));
    setSaving(false);
    cancelResolve();
  }

  const filtered = useMemo(() => {
    return flags.filter(f => {
      if (tab === 'unresolved' && f.resolved) return false;
      if (tab === 'resolved' && !f.resolved) return false;
      if (tableFilter && f.table_name !== tableFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const fields = [f.reason, f.record_label, f.table_name];
        if (!fields.some(v => v?.toLowerCase().includes(q))) return false;
      }
      return true;
    });
  }, [flags, tab, tableFilter, search]);

  const unresolvedCount = flags.filter(f => !f.resolved).length;
  const resolvedCount = flags.filter(f => f.resolved).length;

  const tableCounts = useMemo(() => {
    const counts: Record<string, { total: number; unresolved: number }> = {};
    flags.forEach(f => {
      if (!counts[f.table_name]) counts[f.table_name] = { total: 0, unresolved: 0 };
      counts[f.table_name].total++;
      if (!f.resolved) counts[f.table_name].unresolved++;
    });
    return counts;
  }, [flags]);

  function getActionLabel(value: string | null) {
    if (!value) return null;
    return RESOLUTION_ACTIONS.find(a => a.value === value)?.label ?? value;
  }

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl md:text-3xl font-bold font-heading text-night tracking-tight">
          Flagged Records
        </h1>
        <p className="text-muted mt-0.5">Review and resolve imported or volunteer flagged records</p>
      </div>

      {/* Summary cards */}
      {!loading && (
        <div className="flex gap-3 mb-5 overflow-x-auto pb-1">
          {Object.entries(tableCounts).map(([table, counts]) => {
            const config = TABLE_CONFIG[table] ?? { label: table, icon: Flag, path: '#', color: 'bg-muted/10 text-muted' };
            return (
              <button
                key={table}
                onClick={() => setTableFilter(tableFilter === table ? '' : table as TableFilter)}
                className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border transition-all shrink-0 ${
                  tableFilter === table
                    ? 'bg-primary/8 border-primary/20'
                    : 'bg-white border-night/5 hover:border-night/10'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${config.color}`}>
                  <config.icon className="w-4 h-4" strokeWidth={1.75} />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-night">{counts.unresolved}</p>
                  <p className="text-sm text-muted">{config.label} flags</p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Tabs + search */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex gap-1 bg-white rounded-xl border border-night/5 p-1">
          {([
            { key: 'unresolved', label: `Open (${unresolvedCount})` },
            { key: 'resolved', label: `Resolved (${resolvedCount})` },
            { key: 'all', label: `All (${flags.length})` },
          ] as const).map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
                tab === t.key ? 'bg-primary text-white shadow-sm' : 'text-muted hover:text-night'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search flags..."
          className="flex-1 px-3 py-2 bg-white border border-night/8 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted/40"
        />
      </div>

      {/* Flags list */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-night/5 p-4 flex gap-3">
              <div className="skeleton w-10 h-10 rounded-xl shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="skeleton h-4 w-48" />
                <div className="skeleton h-3 w-32" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Flag}
          title={tab === 'unresolved' ? 'No open flags' : 'No flags found'}
          description={tab === 'unresolved' ? 'All flagged records have been reviewed' : 'Try adjusting your filters'}
          iconColor="text-muted"
        />
      ) : (
        <div className="space-y-2">
          {filtered.map(flag => {
            const config = TABLE_CONFIG[flag.table_name] ?? { label: flag.table_name, icon: Flag, path: '#', color: 'bg-muted/10 text-muted' };
            const profilePath = `${config.path}/${flag.record_id}`;
            const isResolving = resolvingId === flag.id;

            return (
              <div
                key={flag.id}
                className={`bg-white rounded-2xl border transition-all ${
                  isResolving
                    ? 'border-primary/30 shadow-[0_2px_12px_rgba(110,168,50,0.1)]'
                    : flag.resolved
                      ? 'border-night/5'
                      : 'border-gold/20'
                }`}
              >
                {/* Flag row */}
                <div className={`p-4 flex items-start gap-3 ${flag.resolved && !isResolving ? 'opacity-50' : ''}`}>
                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    flag.resolved ? 'bg-sand' : config.color
                  }`}>
                    {flag.resolved ? (
                      <Check className="w-4 h-4 text-primary" strokeWidth={2} />
                    ) : (
                      <config.icon className="w-4 h-4" strokeWidth={1.75} />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <Link
                        to={profilePath}
                        className="text-sm font-semibold text-night hover:text-primary transition-colors"
                      >
                        {flag.record_label ?? 'Unknown record'}
                      </Link>
                      <span className={`text-xs font-medium px-1.5 py-0.5 rounded-md shrink-0 ${config.color}`}>
                        {config.label}
                      </span>
                    </div>
                    <p className="text-sm text-muted leading-relaxed">
                      {flag.reason ?? 'Flagged for review'}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1">
                      <span className="text-sm text-muted">
                        {formatDate(flag.created_at)}
                      </span>
                      {flag.resolved && flag.resolution_action && (
                        <span className="text-sm text-primary font-medium">
                          {getActionLabel(flag.resolution_action)}
                        </span>
                      )}
                      {flag.resolved && flag.resolved_at && (
                        <span className="text-sm text-muted">
                          Resolved {formatDate(flag.resolved_at)}
                        </span>
                      )}
                    </div>
                    {flag.resolved && flag.resolution_note && (
                      <div className="flex items-start gap-1.5 mt-1.5 text-sm text-muted bg-sand/60 rounded-lg px-2.5 py-1.5">
                        <MessageSquare className="w-3 h-3 shrink-0 mt-0.5" />
                        {flag.resolution_note}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      to={profilePath}
                      className="px-3 py-1.5 text-xs font-medium text-muted hover:text-night bg-sand rounded-lg transition-colors"
                    >
                      View
                    </Link>
                    {!flag.resolved && isAdmin && !isResolving && (
                      <button
                        onClick={() => openResolve(flag.id)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-medium rounded-lg transition-all"
                      >
                        <Check className="w-3 h-3" strokeWidth={2.5} />
                        Resolve
                      </button>
                    )}
                  </div>
                </div>

                {/* Resolution panel */}
                {isResolving && (
                  <div className="border-t border-night/5 p-4 bg-sand/30 rounded-b-2xl">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-semibold text-night">How was this resolved?</h4>
                      <button
                        onClick={cancelResolve}
                        className="p-1.5 rounded-lg text-muted hover:text-night hover:bg-sand transition-all"
                        aria-label="Cancel"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Action choices */}
                    <div className="space-y-1.5 mb-3">
                      {RESOLUTION_ACTIONS.map(action => (
                        <button
                          key={action.value}
                          onClick={() => setSelectedAction(action.value)}
                          className={`w-full text-left px-3.5 py-2.5 rounded-xl border transition-all ${
                            selectedAction === action.value
                              ? 'border-primary bg-primary/8 shadow-sm'
                              : 'border-night/5 bg-white hover:border-night/10'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                              selectedAction === action.value
                                ? 'border-primary bg-primary'
                                : 'border-muted/30'
                            }`}>
                              {selectedAction === action.value && (
                                <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-night">{action.label}</p>
                              <p className="text-sm text-muted">{action.description}</p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>

                    {/* Optional note */}
                    <div className="mb-3">
                      <label className="block text-xs text-muted font-medium mb-1">
                        Add a note (optional)
                      </label>
                      <input
                        type="text"
                        value={resolutionNote}
                        onChange={(e) => setResolutionNote(e.target.value)}
                        placeholder="e.g. Confirmed with owner on 3/15, birthdate is correct"
                        className="w-full px-3 py-2 bg-white border border-night/8 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted/40"
                      />
                    </div>

                    {/* Submit */}
                    <div className="flex gap-2">
                      <button
                        onClick={cancelResolve}
                        className="flex-1 py-2.5 text-sm font-medium text-muted bg-white border border-night/8 rounded-xl hover:bg-sand transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={submitResolve}
                        disabled={!selectedAction || saving}
                        className="flex-1 py-2.5 text-sm font-semibold text-white bg-primary hover:bg-primary-hover rounded-xl shadow-sm disabled:opacity-30 transition-all flex items-center justify-center gap-1.5"
                      >
                        {saving ? (
                          'Saving...'
                        ) : (
                          <>
                            <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                            Mark Resolved
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
