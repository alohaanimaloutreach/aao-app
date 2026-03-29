import { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Flag, Check, PawPrint, User, MapPin, X, MessageSquare, Loader2, Trash2, CheckSquare, Square,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { formatDate } from '../lib/format';
import { getSmartActions, type SmartAction } from '../lib/flagActions';
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
  created_by: string | null;
  record_label: string | null;
}

const TABLE_CONFIG: Record<string, { label: string; icon: any; path: string; color: string }> = {
  animals: { label: 'Animal', icon: PawPrint, path: '/animals', color: 'bg-primary/10 text-primary' },
  owners: { label: 'Person', icon: User, path: '/people', color: 'bg-gold/15 text-night' },
  locations: { label: 'Location', icon: MapPin, path: '/locations', color: 'bg-ember/10 text-ember' },
};

type FilterTab = 'unresolved' | 'resolved' | 'all';
type TableFilter = '' | 'animals' | 'owners' | 'locations';

export default function FlagsPage() {
  const { session, user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [flags, setFlags] = useState<FlagRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<FilterTab>('unresolved');
  const [tableFilter, setTableFilter] = useState<TableFilter>('');
  const [search, setSearch] = useState('');

  // Bulk operations
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showBulkImportConfirm, setShowBulkImportConfirm] = useState(false);
  const [bulkResolving, setBulkResolving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (session) loadFlags();
  }, [session]);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

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
    setSelected(new Set());
    setLoading(false);
  }

  function openResolve(flagId: string) {
    setResolvingId(flagId);
    setResolutionNote('');
  }

  function cancelResolve() {
    setResolvingId(null);
    setResolutionNote('');
  }

  async function handleSmartAction(flag: FlagRow, action: SmartAction) {
    if (!user) return;
    setSaving(true);

    // Execute mutation if the action has one
    if (action.mutation) {
      await action.mutation({ recordId: flag.record_id, userId: user.id });
    }

    // Resolve the flag
    const note = resolutionNote.trim() || null;
    await supabase.from('flags').update({
      resolved: true,
      resolved_by: user.id,
      resolved_at: new Date().toISOString(),
      resolution_action: action.value,
      resolution_note: note ? `${action.label} — ${note}` : action.label,
    }).eq('id', flag.id);

    setFlags(prev => prev.map(f =>
      f.id === flag.id
        ? {
            ...f,
            resolved: true,
            resolved_at: new Date().toISOString(),
            resolution_action: action.value,
            resolution_note: note ? `${action.label} — ${note}` : action.label,
          }
        : f
    ));
    setSaving(false);
    cancelResolve();

    // For navigate actions, go to the profile page
    if (action.type === 'navigate' && action.editField) {
      const config = TABLE_CONFIG[flag.table_name];
      if (config) {
        navigate(`${config.path}/${flag.record_id}`);
      }
    }
  }

  // Bulk resolve import flags (created_by is null)
  const importFlagCount = useMemo(
    () => flags.filter(f => !f.resolved && !f.created_by).length,
    [flags]
  );

  async function handleBulkResolveImport() {
    if (!user) return;
    setBulkResolving(true);

    const importIds = flags.filter(f => !f.resolved && !f.created_by).map(f => f.id);

    // Batch update in chunks of 100
    for (let i = 0; i < importIds.length; i += 100) {
      const batch = importIds.slice(i, i + 100);
      await supabase.from('flags').update({
        resolved: true,
        resolved_by: user.id,
        resolved_at: new Date().toISOString(),
        resolution_action: 'bulk_resolve',
        resolution_note: 'Bulk resolved — import flag',
      }).in('id', batch);
    }

    setFlags(prev => prev.map(f =>
      importIds.includes(f.id)
        ? { ...f, resolved: true, resolved_at: new Date().toISOString(), resolution_action: 'bulk_resolve', resolution_note: 'Bulk resolved — import flag' }
        : f
    ));

    setBulkResolving(false);
    setShowBulkImportConfirm(false);
    setToast(`${importIds.length} import flags resolved`);
  }

  // Bulk resolve selected flags
  async function handleBulkResolveSelected() {
    if (!user || selected.size === 0) return;
    setBulkResolving(true);

    const ids = Array.from(selected);
    for (let i = 0; i < ids.length; i += 100) {
      const batch = ids.slice(i, i + 100);
      await supabase.from('flags').update({
        resolved: true,
        resolved_by: user.id,
        resolved_at: new Date().toISOString(),
        resolution_action: 'bulk_resolve',
        resolution_note: 'Bulk resolved — selected',
      }).in('id', batch);
    }

    setFlags(prev => prev.map(f =>
      selected.has(f.id)
        ? { ...f, resolved: true, resolved_at: new Date().toISOString(), resolution_action: 'bulk_resolve', resolution_note: 'Bulk resolved — selected' }
        : f
    ));

    setBulkResolving(false);
    setSelected(new Set());
    setToast(`${ids.length} flags resolved`);
  }

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
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

  const unresolvedFiltered = filtered.filter(f => !f.resolved);
  const allFilteredSelected = unresolvedFiltered.length > 0 && unresolvedFiltered.every(f => selected.has(f.id));

  function toggleSelectAll() {
    if (allFilteredSelected) {
      setSelected(prev => {
        const next = new Set(prev);
        unresolvedFiltered.forEach(f => next.delete(f.id));
        return next;
      });
    } else {
      setSelected(prev => {
        const next = new Set(prev);
        unresolvedFiltered.forEach(f => next.add(f.id));
        return next;
      });
    }
  }

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


  return (
    <div>
      <div className="flex items-start justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-heading text-night tracking-tight">
            Flagged Records
          </h1>
          <p className="text-muted mt-0.5">Review and resolve imported or volunteer flagged records</p>
        </div>
        {isAdmin && importFlagCount > 0 && (
          <button
            onClick={() => setShowBulkImportConfirm(true)}
            className="shrink-0 flex items-center gap-1.5 px-3 py-2 bg-primary/10 hover:bg-primary/20 text-primary text-sm font-medium rounded-xl transition-all"
          >
            <Check className="w-4 h-4" strokeWidth={2} />
            Resolve All Import Flags
          </button>
        )}
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

      {/* Bulk selection bar */}
      {isAdmin && tab === 'unresolved' && unresolvedFiltered.length > 0 && (
        <div className="flex items-center gap-3 mb-3 px-1">
          <button
            onClick={toggleSelectAll}
            className="flex items-center gap-1.5 text-xs font-medium text-muted hover:text-night transition-colors"
          >
            {allFilteredSelected
              ? <CheckSquare className="w-4 h-4 text-primary" strokeWidth={2} />
              : <Square className="w-4 h-4" strokeWidth={1.5} />
            }
            {allFilteredSelected ? 'Deselect all' : 'Select all'}
          </button>
          {selected.size > 0 && (
            <button
              onClick={handleBulkResolveSelected}
              disabled={bulkResolving}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-primary-hover text-white text-xs font-semibold rounded-lg transition-all disabled:opacity-40"
            >
              {bulkResolving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" strokeWidth={2.5} />}
              Resolve {selected.size} selected
            </button>
          )}
        </div>
      )}

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
            const isSelected = selected.has(flag.id);

            return (
              <div
                key={flag.id}
                className={`bg-white rounded-2xl border transition-all ${
                  isResolving
                    ? 'border-primary/30 shadow-[0_2px_12px_rgba(110,168,50,0.1)]'
                    : isSelected
                      ? 'border-primary/25 bg-primary/3'
                      : flag.resolved
                        ? 'border-night/5'
                        : 'border-gold/20'
                }`}
              >
                {/* Flag row */}
                <div className={`p-4 flex items-start gap-3 ${flag.resolved && !isResolving ? 'opacity-50' : ''}`}>
                  {/* Checkbox for unresolved flags */}
                  {isAdmin && !flag.resolved && (
                    <button
                      onClick={() => toggleSelect(flag.id)}
                      className="mt-2.5 shrink-0 text-muted hover:text-primary transition-colors"
                      aria-label={isSelected ? 'Deselect' : 'Select'}
                    >
                      {isSelected
                        ? <CheckSquare className="w-4.5 h-4.5 text-primary" strokeWidth={2} />
                        : <Square className="w-4.5 h-4.5" strokeWidth={1.5} />
                      }
                    </button>
                  )}

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
                      {flag.resolved && flag.resolution_note && (
                        <span className="text-sm text-primary font-medium">
                          {flag.resolution_note}
                        </span>
                      )}
                      {flag.resolved && flag.resolved_at && (
                        <span className="text-sm text-muted">
                          Resolved {formatDate(flag.resolved_at)}
                        </span>
                      )}
                    </div>
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

                {/* Smart resolution panel */}
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

                    {/* Smart action choices */}
                    <div className="space-y-1.5 mb-3">
                      {getSmartActions(flag.reason, flag.table_name).map(action => (
                        <button
                          key={action.value}
                          onClick={() => handleSmartAction(flag, action)}
                          disabled={saving}
                          className={`w-full text-left px-3.5 py-2.5 rounded-xl border transition-all disabled:opacity-40 ${
                            action.type === 'mutation'
                              ? 'border-primary/20 bg-white hover:bg-primary/5 hover:border-primary/30'
                              : action.type === 'navigate'
                                ? 'border-sky-200 bg-white hover:bg-sky-50 hover:border-sky-300'
                                : 'border-night/5 bg-white hover:border-night/10'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            {saving ? (
                              <Loader2 className="w-4 h-4 animate-spin shrink-0 text-muted" />
                            ) : (
                              <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                action.type === 'mutation' ? 'bg-primary' : action.type === 'navigate' ? 'bg-sky-500' : 'bg-muted/40'
                              }`} />
                            )}
                            <p className={`text-sm ${action.type === 'mutation' ? 'font-medium text-night' : 'text-night'}`}>
                              {action.label}
                            </p>
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
                        placeholder="e.g. Confirmed with owner on 3/15"
                        className="w-full px-3 py-2 bg-white border border-night/8 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted/40"
                      />
                    </div>

                    <button
                      onClick={cancelResolve}
                      className="w-full py-2 text-sm font-medium text-muted hover:text-night transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Bulk import resolve confirmation modal */}
      {showBulkImportConfirm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-xl">
            <div className="p-6">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Flag className="w-6 h-6 text-primary" />
              </div>
              <h2 className="text-lg font-bold text-night text-center mb-2">Resolve All Import Flags</h2>
              <p className="text-sm text-muted text-center leading-relaxed">
                This will resolve all <strong className="text-night">{importFlagCount}</strong> import flags at once.
                Individual flags created by coordinators will not be affected.
              </p>
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button
                onClick={() => setShowBulkImportConfirm(false)}
                disabled={bulkResolving}
                className="flex-1 py-2.5 text-sm font-medium text-muted hover:text-night border border-night/8 rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkResolveImport}
                disabled={bulkResolving}
                className="flex-1 py-2.5 bg-primary hover:bg-primary-hover text-white text-sm font-semibold rounded-xl shadow-[0_2px_8px_rgba(110,168,50,0.25)] transition-all disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {bulkResolving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" strokeWidth={2.5} />}
                {bulkResolving ? 'Resolving...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-night text-white text-sm font-medium px-5 py-3 rounded-xl shadow-xl flex items-center gap-2 animate-[fadeIn_0.2s_ease]">
          <Check className="w-4 h-4 text-primary" strokeWidth={2.5} />
          {toast}
        </div>
      )}
    </div>
  );
}
