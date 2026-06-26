import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import {
  MapPin, ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
  Loader2, Plus, X, Check, Trash2, Upload, Download,
  Image, FileText, Clock, UserPlus, Package, StickyNote,
} from 'lucide-react';
import { formatDate, formatDateTime } from '../lib/format';

// ── Types ───────────────────────────────────────────────────

interface EventRecord {
  id: string;
  event_type: string;
  event_date: string;
  event_time: string | null;
  status: string;
  location_id: string | null;
  location_name: string | null;
  location_lat: number | null;
  location_lng: number | null;
  created_at: string;
}

const EVENT_TYPES = [
  { value: 'distribution', label: 'Distribution' },
  { value: 'supply', label: 'Supply' },
];

interface ProductRow {
  id: string;
  item: string;
  quantity: number | null;
  unit: string | null;
  weight_per_unit: number | null;
  source: string | null;
}

const UNIT_OPTIONS = [
  { value: 'lbs', label: 'lbs' },
  { value: 'bags', label: 'bags' },
  { value: 'doses', label: 'doses' },
  { value: 'boxes', label: 'boxes' },
  { value: 'cases', label: 'cases' },
  { value: 'cans', label: 'cans' },
  { value: 'each', label: 'each' },
];

const WEIGHT_UNITS = new Set(['bags', 'boxes', 'cases', 'cans']);

function productTotalLbs(p: { quantity: number | null; unit: string | null; weight_per_unit: number | null }): number | null {
  if (!p.quantity) return null;
  if (p.unit === 'lbs') return p.quantity;
  if (p.weight_per_unit && p.unit && WEIGHT_UNITS.has(p.unit)) return p.quantity * p.weight_per_unit;
  return null;
}

interface AttendeeRow {
  id: string;
  name: string;
}

interface NoteRow {
  id: string;
  note: string;
  is_task: boolean;
  completed: boolean;
  completed_at: string | null;
  created_by: string | null;
  created_at: string;
  author_name?: string;
}

interface FileRow {
  id: string;
  file_name: string;
  storage_path: string;
  file_type: string | null;
  file_size: number | null;
  created_at: string;
}

// ── Helpers ─────────────────────────────────────────────────

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatTime(t: string | null): string {
  if (!t) return '';
  const [h, m] = t.split(':');
  const hour = parseInt(h);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${h12}:${m} ${ampm}`;
}

function isActive(createdAt: string): boolean {
  const created = new Date(createdAt).getTime();
  const now = Date.now();
  return now - created < 48 * 60 * 60 * 1000;
}

const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2);
  const m = i % 2 === 0 ? '00' : '30';
  const value = `${String(h).padStart(2, '0')}:${m}`;
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  const ampm = h >= 12 ? 'PM' : 'AM';
  return { value, label: `${h12}:${m} ${ampm}` };
});

function nearestHalfHourHST(): string {
  const now = new Date();
  const hst = new Date(now.toLocaleString('en-US', { timeZone: 'Pacific/Honolulu' }));
  const m = hst.getMinutes();
  const rounded = m < 15 ? '00' : m < 45 ? '30' : '00';
  let h = hst.getHours();
  if (m >= 45) h = (h + 1) % 24;
  return `${String(h).padStart(2, '0')}:${rounded}`;
}

const PAGE_SIZE = 20;

// ── Main Component ──────────────────────────────────────────

export default function LaunchpadPage() {
  const { session, user } = useAuth();
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    document.title = 'Launchpad | AAO Command Center';
    // Re-render when tab becomes visible again (fixes blank screen after switching tabs)
    function onVisible() { if (document.visibilityState === 'visible') setPage((p) => p); }
    document.addEventListener('visibilitychange', onVisible);
    return () => { document.title = 'AAO Command Center'; document.removeEventListener('visibilitychange', onVisible); };
  }, []);

  useEffect(() => {
    if (session) loadEvents();
  }, [session, page]);

  async function loadEvents() {
    setLoading(true);
    const { count } = await supabase.from('events').select('id', { count: 'exact', head: true });
    setTotalCount(count ?? 0);

    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data } = await supabase
      .from('events')
      .select('id, event_type, event_date, event_time, status, created_at, location:locations(id, name, latitude, longitude)')
      .order('event_date', { ascending: false })
      .range(from, to);

    setEvents((data ?? []).map((e: any) => {
      const loc = Array.isArray(e.location) ? e.location[0] : e.location;
      return {
        id: e.id, event_type: e.event_type, event_date: e.event_date, event_time: e.event_time, status: e.status, created_at: e.created_at,
        location_id: loc?.id ?? null, location_name: loc?.name ?? null,
        location_lat: loc?.latitude ?? null, location_lng: loc?.longitude ?? null,
      };
    }));
    setExpandedId(null);
    setLoading(false);
  }

  async function createEvent(eventType: string, date: string, time: string, locationId: string | null) {
    if (!user) return;
    const { data } = await supabase.from('events').insert({
      event_type: eventType, event_date: date, event_time: time || null, location_id: locationId, created_by: user.id,
    }).select('id').single();
    if (data) {
      setShowCreate(false);
      setPage(0);
      await loadEvents();
      setExpandedId(data.id);
    }
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const fromLabel = page * PAGE_SIZE + 1;
  const toLabel = Math.min((page + 1) * PAGE_SIZE, totalCount);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl md:text-2xl font-bold font-heading text-night tracking-tight">Launchpad</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-3 py-2 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary-hover transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" /> New Event
        </button>
      </div>

      {showCreate && <CreateEventForm onCreated={createEvent} onCancel={() => setShowCreate(false)} />}

      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-base font-heading font-bold text-night">Events</h2>
          {!loading && totalCount > 0 && (
            <span className="text-xs text-muted">{fromLabel}–{toLabel} of {totalCount}</span>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
          </div>
        ) : events.length === 0 ? (
          <p className="text-sm text-muted text-center py-8">No events yet. Create one to get started.</p>
        ) : (
          <>
            <div className="space-y-2">
              {events.map((evt) => (
                <EventCard
                  key={evt.id}
                  event={evt}
                  expanded={expandedId === evt.id}
                  onToggle={() => setExpandedId(expandedId === evt.id ? null : evt.id)}
                  onDeleted={loadEvents}
                  onUpdated={loadEvents}
                />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-4">
                <button onClick={() => setPage(page - 1)} disabled={page === 0}
                  className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-night bg-white border border-night/8 rounded-lg hover:bg-sand/50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                  <ChevronLeft className="w-4 h-4" /> Newer
                </button>
                <span className="text-sm text-muted">Page {page + 1} of {totalPages}</span>
                <button onClick={() => setPage(page + 1)} disabled={page >= totalPages - 1}
                  className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-night bg-white border border-night/8 rounded-lg hover:bg-sand/50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                  Older <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Create Event Form ───────────────────────────────────────

interface DraftProduct { item: string; quantity: string; unit: string; weightPerUnit: string; source: string; }
interface DraftAttendee { name: string; }

function CreateEventForm({ onCreated, onCancel }: { onCreated: (eventType: string, date: string, time: string, locationId: string | null) => void; onCancel: () => void }) {
  const { user } = useAuth();
  const [eventType, setEventType] = useState('distribution');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(nearestHalfHourHST);
  const [locSearch, setLocSearch] = useState('');
  const [locResults, setLocResults] = useState<{ id: string; name: string }[]>([]);
  const [selectedLoc, setSelectedLoc] = useState<{ id: string; name: string } | null>(null);

  // Products
  const [products, setProducts] = useState<DraftProduct[]>([]);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [pItem, setPItem] = useState('');
  const [pQty, setPQty] = useState('');
  const [pUnit, setPUnit] = useState('');
  const [pWpu, setPWpu] = useState('');
  const [pSource, setPSource] = useState('');

  // Attendees
  const [attendees, setAttendees] = useState<DraftAttendee[]>([]);
  const [aName, setAName] = useState('');

  const [creating, setCreating] = useState(false);
  const [allLocations, setAllLocations] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('locations').select('id, name').eq('archived', false).order('name');
      setAllLocations(data ?? []);
    })();
  }, []);

  useEffect(() => {
    if (locSearch.trim().length < 1) { setLocResults([]); return; }
    const q = locSearch.trim().toLowerCase();
    setLocResults(allLocations.filter((l) => l.name.toLowerCase().includes(q)).slice(0, 8));
  }, [locSearch, allLocations]);

  function addProduct() {
    if (!pItem.trim()) return;
    setProducts([...products, { item: pItem.trim(), quantity: pQty, unit: pUnit, weightPerUnit: pWpu, source: pSource.trim() }]);
    setShowAddProduct(false); setPItem(''); setPQty(''); setPUnit(''); setPWpu(''); setPSource('');
  }

  function addAttendee() {
    if (!aName.trim()) return;
    setAttendees([...attendees, { name: aName.trim() }]);
    setAName('');
  }

  async function handleCreate() {
    if (!date || !user) return;
    setCreating(true);

    // Create event
    const { data: evt } = await supabase.from('events').insert({
      event_date: date, event_time: time || null, location_id: selectedLoc?.id ?? null, created_by: user.id,
    }).select('id').single();

    if (!evt) { setCreating(false); return; }

    // Insert products and attendees in parallel
    const inserts: Promise<any>[] = [];

    if (products.length > 0) {
      inserts.push(supabase.from('event_products').insert(
        products.map((p) => ({
          event_id: evt.id, item: p.item, quantity: p.quantity ? parseFloat(p.quantity) : null,
          unit: p.unit || null, weight_per_unit: p.weightPerUnit ? parseFloat(p.weightPerUnit) : null,
          source: p.source || null,
        }))
      ));
    }

    if (attendees.length > 0) {
      inserts.push(supabase.from('event_attendees').insert(
        attendees.map((a) => ({ event_id: evt.id, name: a.name }))
      ));
    }

    await Promise.all(inserts);
    setCreating(false);
    onCreated(eventType, date, time, selectedLoc?.id ?? null);
  }

  return (
    <div className="bg-white rounded-xl border border-night/5 p-4 mb-4 shadow-sm space-y-4">
      <h3 className="text-base font-heading font-bold text-night">New Event</h3>

      {/* Event Type */}
      <div className="flex gap-2">
        {EVENT_TYPES.map((t) => (
          <button key={t.value} onClick={() => setEventType(t.value)}
            className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all ${
              eventType === t.value
                ? 'bg-primary text-white shadow-sm'
                : 'bg-sand/50 text-night border border-night/8 hover:bg-sand'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Date & Time */}
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="block text-xs text-muted mb-1">Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="w-full px-3 py-2 bg-sand/50 border border-night/8 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <div className="flex-1">
          <label className="block text-xs text-muted mb-1">Time</label>
          <select value={time} onChange={(e) => setTime(e.target.value)}
            className="w-full px-3 py-2 bg-sand/50 border border-night/8 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
            {TIME_OPTIONS.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Location */}
      <div>
        <label className="block text-xs text-muted mb-1">Location</label>
        {selectedLoc ? (
          <div className="flex items-center gap-2 px-3 py-2 bg-primary/5 border border-primary/20 rounded-lg">
            <MapPin className="w-3.5 h-3.5 text-primary" />
            <span className="text-sm font-medium text-night flex-1">{selectedLoc.name}</span>
            <button onClick={() => { setSelectedLoc(null); setLocSearch(''); }} className="p-0.5 text-muted hover:text-night"><X className="w-3.5 h-3.5" /></button>
          </div>
        ) : (
          <div className="relative">
            <input type="text" value={locSearch} onChange={(e) => setLocSearch(e.target.value)} placeholder="Search locations..."
              className="w-full px-3 py-2 bg-sand/50 border border-night/8 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted/40" />
            {locResults.length > 0 && (
              <div className="absolute left-0 right-0 mt-1 bg-white border border-night/8 rounded-lg shadow-lg overflow-hidden z-20">
                {locResults.map((loc) => (
                  <button key={loc.id} onClick={() => { setSelectedLoc(loc); setLocSearch(''); setLocResults([]); }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-sand/50 transition-colors">{loc.name}</button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Products / Supplies */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs text-muted">Supplies</label>
          <button onClick={() => setShowAddProduct(!showAddProduct)} className="text-xs text-primary font-medium flex items-center gap-1 hover:underline">
            <Plus className="w-3 h-3" /> Add
          </button>
        </div>

        {showAddProduct && (
          <ProductFormFields
            pItem={pItem} setPItem={setPItem} pQty={pQty} setPQty={setPQty}
            pUnit={pUnit} setPUnit={setPUnit} pWpu={pWpu} setPWpu={setPWpu}
            pSource={pSource} setPSource={setPSource}
            onSubmit={addProduct} submitLabel="Add"
            onCancel={() => { setShowAddProduct(false); setPItem(''); setPQty(''); setPUnit(''); setPWpu(''); setPSource(''); }}
          />
        )}

        {products.length > 0 && (
          <div className="space-y-1">
            {products.map((p, i) => {
              const qty = p.quantity ? parseFloat(p.quantity) : null;
              const wpu = p.weightPerUnit ? parseFloat(p.weightPerUnit) : null;
              const total = productTotalLbs({ quantity: qty, unit: p.unit, weight_per_unit: wpu });
              return (
                <div key={i} className="flex items-center gap-2 px-3 py-2 bg-sand/30 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-night">{p.item}</span>
                    {(qty || p.unit) && <span className="text-xs text-muted ml-1.5">{p.quantity}{p.unit ? ` ${p.unit}` : ''}</span>}
                    {total && p.unit !== 'lbs' && <span className="text-xs text-primary font-medium ml-1">= {total} lbs</span>}
                    {p.source && <span className="text-xs text-muted ml-1.5">from {p.source}</span>}
                  </div>
                  <button onClick={() => setProducts(products.filter((_, j) => j !== i))} className="p-1 text-muted hover:text-ember" aria-label="Remove">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Attendees */}
      <div>
        <label className="block text-xs text-muted mb-1.5">Who Will Be Present</label>
        <div className="flex gap-2 mb-2">
          <input type="text" value={aName} onChange={(e) => setAName(e.target.value)} placeholder="Name"
            className="flex-1 px-3 py-2 bg-sand/50 border border-night/8 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted/40"
            onKeyDown={(e) => e.key === 'Enter' && addAttendee()} />
          <button onClick={addAttendee} disabled={!aName.trim()}
            className="px-3 py-2 bg-sand border border-night/8 text-sm font-medium text-night rounded-lg hover:bg-night/5 disabled:opacity-30 transition-all">Add</button>
        </div>
        {attendees.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {attendees.map((a, i) => (
              <span key={i} className="inline-flex items-center gap-1 text-xs bg-sand/50 border border-night/5 rounded-full px-2.5 py-1 text-night">
                {a.name}
                <button onClick={() => setAttendees(attendees.filter((_, j) => j !== i))} className="p-0.5 text-muted hover:text-ember" aria-label="Remove">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1 border-t border-night/5">
        <button onClick={onCancel} className="px-4 py-2 text-sm text-muted hover:text-night transition-colors">Cancel</button>
        <button onClick={handleCreate} disabled={!date || creating}
          className="px-4 py-2 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary-hover disabled:opacity-30 transition-all flex items-center gap-1.5">
          {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          {creating ? 'Creating...' : 'Create Event'}
        </button>
      </div>
    </div>
  );
}

// ── Event Card ──────────────────────────────────────────────

function EventCard({ event, expanded, onToggle, onDeleted, onUpdated }: {
  event: EventRecord; expanded: boolean; onToggle: () => void; onDeleted: () => void; onUpdated: () => void;
}) {

  return (
    <div className="bg-white rounded-xl border border-night/5 overflow-hidden">
      <button onClick={onToggle} className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-sand/30 transition-colors">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-sm font-semibold text-night">{formatDate(event.event_date)}</span>
            {event.event_time && <span className="text-xs text-muted">{formatTime(event.event_time)}</span>}
            <span className={`text-xs font-medium rounded-full px-2 py-0.5 ${
              event.event_type === 'supply' ? 'bg-sky-100 text-sky-700' : 'bg-primary/10 text-primary'
            }`}>
              {event.event_type === 'supply' ? 'Supply' : 'Distribution'}
            </span>
            {isActive(event.created_at) ? (
              <span className="text-xs font-medium rounded-full px-2 py-0.5 bg-primary/10 text-primary">Active</span>
            ) : (
              <span className="text-xs font-medium rounded-full px-2 py-0.5 bg-night/5 text-muted">Historical</span>
            )}
          </div>
          {event.location_name && (
            event.location_lat && event.location_lng ? (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${event.location_lat},${event.location_lng}`}
                target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                <MapPin className="w-3 h-3" /> {event.location_name}
              </a>
            ) : (
              <span className="flex items-center gap-1 text-xs text-muted">
                <MapPin className="w-3 h-3" /> {event.location_name}
              </span>
            )
          )}
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-muted shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted shrink-0" />}
      </button>


      {expanded && <ExpandedEvent event={event} onDeleted={onDeleted} onUpdated={onUpdated} />}
    </div>
  );
}

// ── Expanded Event Detail ───────────────────────────────────

function ExpandedEvent({ event, onDeleted, onUpdated }: { event: EventRecord; onDeleted: () => void; onUpdated: () => void }) {
  const { user, isAdmin } = useAuth();

  const [products, setProducts] = useState<ProductRow[]>([]);
  const [attendees, setAttendees] = useState<AttendeeRow[]>([]);
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [files, setFiles] = useState<FileRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit details
  const [editingDetails, setEditingDetails] = useState(false);
  const [editType, setEditType] = useState(event.event_type);
  const [editDate, setEditDate] = useState(event.event_date);
  const [editTime, setEditTime] = useState(event.event_time ?? '');
  const [editLocSearch, setEditLocSearch] = useState('');
  const [editLocResults, setEditLocResults] = useState<{ id: string; name: string }[]>([]);
  const [editSelectedLoc, setEditSelectedLoc] = useState<{ id: string; name: string } | null>(
    event.location_id && event.location_name ? { id: event.location_id, name: event.location_name } : null
  );
  const [allLocations, setAllLocations] = useState<{ id: string; name: string }[]>([]);
  const [savingDetails, setSavingDetails] = useState(false);

  // Product form
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [pItem, setPItem] = useState('');
  const [pQty, setPQty] = useState('');
  const [pUnit, setPUnit] = useState('');
  const [pWpu, setPWpu] = useState('');
  const [pSource, setPSource] = useState('');
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [epItem, setEpItem] = useState('');
  const [epQty, setEpQty] = useState('');
  const [epUnit, setEpUnit] = useState('');
  const [epWpu, setEpWpu] = useState('');
  const [epSource, setEpSource] = useState('');

  // Attendee form
  const [showAddAttendee, setShowAddAttendee] = useState(false);
  const [aName, setAName] = useState('');

  // Note form
  const [showAddNote, setShowAddNote] = useState(false);
  const [nText, setNText] = useState('');
  const [nIsTask, setNIsTask] = useState(false);

  // File upload
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  // Delete
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { loadDetail(); }, [event.id]);

  async function loadDetail() {
    setLoading(true);
    const [prodRes, attRes, noteRes, fileRes] = await Promise.all([
      supabase.from('event_products').select('id, item, quantity, unit, weight_per_unit, source').eq('event_id', event.id).order('created_at'),
      supabase.from('event_attendees').select('id, name').eq('event_id', event.id).order('created_at'),
      supabase.from('event_notes').select('id, note, is_task, completed, completed_at, created_by, created_at').eq('event_id', event.id).order('created_at', { ascending: false }),
      supabase.from('event_files').select('id, file_name, storage_path, file_type, file_size, created_at').eq('event_id', event.id).order('created_at', { ascending: false }),
    ]);
    setProducts(prodRes.data ?? []);
    setAttendees(attRes.data ?? []);
    setNotes(noteRes.data ?? []);
    setFiles(fileRes.data ?? []);
    setLoading(false);
  }

  // Load locations for edit
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('locations').select('id, name').eq('archived', false).order('name');
      setAllLocations(data ?? []);
    })();
  }, []);

  useEffect(() => {
    if (editLocSearch.trim().length < 1) { setEditLocResults([]); return; }
    const q = editLocSearch.trim().toLowerCase();
    setEditLocResults(allLocations.filter((l) => l.name.toLowerCase().includes(q)).slice(0, 8));
  }, [editLocSearch, allLocations]);

  async function saveDetails() {
    setSavingDetails(true);
    await supabase.from('events').update({
      event_type: editType, event_date: editDate, event_time: editTime || null, location_id: editSelectedLoc?.id ?? null,
    }).eq('id', event.id);
    setSavingDetails(false);
    setEditingDetails(false);
    onUpdated();
  }

  // ── Products ──
  async function addProduct() {
    if (!pItem.trim()) return;
    const { data } = await supabase.from('event_products').insert({
      event_id: event.id, item: pItem.trim(), quantity: pQty ? parseFloat(pQty) : null,
      unit: pUnit || null, weight_per_unit: pWpu ? parseFloat(pWpu) : null, source: pSource.trim() || null,
    }).select('id, item, quantity, unit, weight_per_unit, source').single();
    if (data) { setProducts([...products, data]); setShowAddProduct(false); setPItem(''); setPQty(''); setPUnit(''); setPWpu(''); setPSource(''); }
  }

  async function removeProduct(id: string) {
    await supabase.from('event_products').delete().eq('id', id);
    setProducts(products.filter((p) => p.id !== id));
  }

  function startEditProduct(p: ProductRow) {
    setEditingProductId(p.id);
    setEpItem(p.item);
    setEpQty(p.quantity?.toString() ?? '');
    setEpUnit(p.unit ?? '');
    setEpWpu(p.weight_per_unit?.toString() ?? '');
    setEpSource(p.source ?? '');
  }

  async function saveEditProduct() {
    if (!editingProductId || !epItem.trim()) return;
    const updates = { item: epItem.trim(), quantity: epQty ? parseFloat(epQty) : null, unit: epUnit || null, weight_per_unit: epWpu ? parseFloat(epWpu) : null, source: epSource.trim() || null };
    await supabase.from('event_products').update(updates).eq('id', editingProductId);
    setProducts(products.map((p) => p.id === editingProductId ? { ...p, ...updates } : p));
    setEditingProductId(null);
  }

  // ── Attendees ──
  async function addAttendee() {
    if (!aName.trim()) return;
    const { data } = await supabase.from('event_attendees').insert({ event_id: event.id, name: aName.trim() }).select('id, name').single();
    if (data) { setAttendees([...attendees, data]); setShowAddAttendee(false); setAName(''); }
  }

  async function removeAttendee(id: string) {
    await supabase.from('event_attendees').delete().eq('id', id);
    setAttendees(attendees.filter((a) => a.id !== id));
  }

  // ── Notes ──
  async function addNote() {
    if (!nText.trim() || !user) return;
    const { data } = await supabase.from('event_notes').insert({
      event_id: event.id, note: nText.trim(), is_task: nIsTask, created_by: user.id,
    }).select('id, note, is_task, completed, completed_at, created_by, created_at').single();
    if (data) { setNotes([data, ...notes]); setShowAddNote(false); setNText(''); setNIsTask(false); }
  }

  async function toggleNoteTask(id: string, completed: boolean) {
    await supabase.from('event_notes').update({ completed, completed_at: completed ? new Date().toISOString() : null }).eq('id', id);
    setNotes(notes.map((n) => n.id === id ? { ...n, completed, completed_at: completed ? new Date().toISOString() : null } : n));
  }

  async function removeNote(id: string) {
    await supabase.from('event_notes').delete().eq('id', id);
    setNotes(notes.filter((n) => n.id !== id));
  }

  // ── Files ──
  async function convertHeicToJpg(file: File): Promise<File> {
    // Try heic2any library first (works on most browsers)
    try {
      const heic2any = (await import('heic2any')).default;
      const blob = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.85 });
      const result = Array.isArray(blob) ? blob[0] : blob;
      const jpgName = file.name.replace(/\.heic$/i, '.jpg').replace(/\.heif$/i, '.jpg');
      return new File([result], jpgName, { type: 'image/jpeg' });
    } catch {
      // Fallback: try canvas (works in Safari which natively reads HEIC)
      return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new window.Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext('2d');
          if (!ctx) { URL.revokeObjectURL(url); reject(new Error('Canvas not supported')); return; }
          ctx.drawImage(img, 0, 0);
          canvas.toBlob((blob) => {
            URL.revokeObjectURL(url);
            if (!blob) { reject(new Error('Conversion failed')); return; }
            const jpgName = file.name.replace(/\.heic$/i, '.jpg').replace(/\.heif$/i, '.jpg');
            resolve(new File([blob], jpgName, { type: 'image/jpeg' }));
          }, 'image/jpeg', 0.85);
        };
        img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Cannot decode HEIC')); };
        img.src = url;
      });
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0 || !user) return;
    setUploading(true);
    setUploadError('');

    const newFiles: FileRow[] = [];

    for (let i = 0; i < fileList.length; i++) {
      let file = fileList[i];

      // Convert HEIC/HEIF to JPG
      const isHeic = file.type.includes('heic') || file.type.includes('heif') || file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif');
      if (isHeic) {
        try {
          file = await convertHeicToJpg(file);
        } catch (err: any) {
          setUploadError(`Could not convert ${file.name} — try using JPG/PNG instead`);
          continue;
        }
      }

      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `events/${event.id}/${Date.now()}_${i}_${safeName}`;
      const { error: storageErr } = await supabase.storage.from('attachments').upload(path, file, { upsert: false });
      if (storageErr) {
        setUploadError(`Upload failed (${file.name}): ${storageErr.message}`);
        continue;
      }
      const { data: urlData } = supabase.storage.from('attachments').getPublicUrl(path);
      const { data } = await supabase.from('event_files').insert({
        event_id: event.id, file_name: file.name, storage_path: urlData.publicUrl,
        file_type: file.type || null, file_size: file.size, created_by: user.id,
      }).select('id, file_name, storage_path, file_type, file_size, created_at').single();
      if (data) newFiles.push(data);
    }

    if (newFiles.length > 0) setFiles([...newFiles, ...files]);
    setUploading(false);
    e.target.value = '';
  }

  async function removeFile(f: FileRow) {
    const urlParts = f.storage_path.split('/storage/v1/object/public/attachments/');
    if (urlParts[1]) await supabase.storage.from('attachments').remove([decodeURIComponent(urlParts[1])]);
    await supabase.from('event_files').delete().eq('id', f.id);
    setFiles(files.filter((x) => x.id !== f.id));
  }

  async function deleteEvent() {
    setDeleting(true);
    await supabase.from('events').delete().eq('id', event.id);
    setDeleting(false);
    setShowDelete(false);
    onDeleted();
  }

  if (loading) {
    return <div className="border-t border-night/5 px-4 py-6 flex justify-center"><Loader2 className="w-4 h-4 text-primary animate-spin" /></div>;
  }

  const isImage = (type: string | null) => {
    if (!type) return false;
    // HEIC/HEIF can't render in browsers
    if (type.includes('heic') || type.includes('heif')) return false;
    return type.startsWith('image/');
  };

  return (
    <div className="border-t border-night/5 px-4 py-3 space-y-4">

      {/* ── Event Details ── */}
      <section>
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-muted" />
            <span className="text-xs font-semibold text-muted uppercase tracking-wider">Details</span>
          </div>
          {!editingDetails ? (
            <button onClick={() => setEditingDetails(true)} className="text-xs text-primary font-medium hover:underline">Edit</button>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => setEditingDetails(false)} className="text-xs text-muted hover:text-night">Cancel</button>
              <button onClick={saveDetails} disabled={savingDetails}
                className="text-xs text-primary font-medium hover:underline disabled:opacity-50">
                {savingDetails ? 'Saving...' : 'Save'}
              </button>
            </div>
          )}
        </div>

        {editingDetails ? (
          <div className="p-3 bg-sand/30 rounded-xl space-y-2">
            <div className="flex gap-2">
              {EVENT_TYPES.map((t) => (
                <button key={t.value} onClick={() => setEditType(t.value)}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                    editType === t.value ? 'bg-primary text-white' : 'bg-white text-night border border-night/8'
                  }`}>
                  {t.label}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-xs text-muted mb-1">Date</label>
                <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-night/8 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-muted mb-1">Time</label>
                <select value={editTime} onChange={(e) => setEditTime(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-night/8 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                  <option value="">No time</option>
                  {TIME_OPTIONS.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Location</label>
              {editSelectedLoc ? (
                <div className="flex items-center gap-2 px-3 py-2 bg-primary/5 border border-primary/20 rounded-lg">
                  <MapPin className="w-3.5 h-3.5 text-primary" />
                  <span className="text-sm font-medium text-night flex-1">{editSelectedLoc.name}</span>
                  <button onClick={() => { setEditSelectedLoc(null); setEditLocSearch(''); }} className="p-0.5 text-muted hover:text-night"><X className="w-3.5 h-3.5" /></button>
                </div>
              ) : (
                <div className="relative">
                  <input type="text" value={editLocSearch} onChange={(e) => setEditLocSearch(e.target.value)} placeholder="Search locations..."
                    className="w-full px-3 py-2 bg-white border border-night/8 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted/40" />
                  {editLocResults.length > 0 && (
                    <div className="absolute left-0 right-0 mt-1 bg-white border border-night/8 rounded-lg shadow-lg overflow-hidden z-20">
                      {editLocResults.map((loc) => (
                        <button key={loc.id} onClick={() => { setEditSelectedLoc(loc); setEditLocSearch(''); setEditLocResults([]); }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-sand/50 transition-colors">{loc.name}</button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 text-sm text-night">
            <span className="font-medium">{formatDate(event.event_date)}</span>
            {event.event_time && <span className="text-muted">{formatTime(event.event_time)}</span>}
            {event.location_name && (
              <span className="flex items-center gap-1 text-muted"><MapPin className="w-3.5 h-3.5" /> {event.location_name}</span>
            )}
          </div>
        )}
      </section>

      {/* ── Products ── */}
      <section>
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            <Package className="w-4 h-4 text-muted" />
            <span className="text-xs font-semibold text-muted uppercase tracking-wider">Products</span>
          </div>
          <button onClick={() => setShowAddProduct(!showAddProduct)} className="text-xs text-primary font-medium flex items-center gap-1 hover:underline">
            <Plus className="w-3 h-3" /> Add
          </button>
        </div>

        {showAddProduct && (
          <ProductFormFields
            pItem={pItem} setPItem={setPItem} pQty={pQty} setPQty={setPQty}
            pUnit={pUnit} setPUnit={setPUnit} pWpu={pWpu} setPWpu={setPWpu}
            pSource={pSource} setPSource={setPSource}
            onSubmit={addProduct} submitLabel="Add"
            onCancel={() => { setShowAddProduct(false); setPItem(''); setPQty(''); setPUnit(''); setPWpu(''); setPSource(''); }}
          />
        )}

        {products.length === 0 && !showAddProduct ? (
          <p className="text-sm text-muted/60 italic">No products recorded</p>
        ) : (
          <div className="space-y-1">
            {products.map((p) => editingProductId === p.id ? (
              <ProductFormFields key={p.id}
                pItem={epItem} setPItem={setEpItem} pQty={epQty} setPQty={setEpQty}
                pUnit={epUnit} setPUnit={setEpUnit} pWpu={epWpu} setPWpu={setEpWpu}
                pSource={epSource} setPSource={setEpSource}
                onSubmit={saveEditProduct} submitLabel="Save"
                onCancel={() => setEditingProductId(null)}
              />
            ) : (
              <div key={p.id} className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-night/5 group cursor-pointer hover:bg-sand/20" onClick={() => startEditProduct(p)}>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-night">{p.item}</span>
                  {(p.quantity || p.unit) && <span className="text-xs text-muted ml-1.5">{p.quantity}{p.unit ? ` ${p.unit}` : ''}</span>}
                  {(() => { const t = productTotalLbs(p); return t && p.unit !== 'lbs' ? <span className="text-xs text-primary font-medium ml-1">= {t} lbs</span> : null; })()}
                  {p.source && <span className="text-xs text-muted ml-1.5">from {p.source}</span>}
                </div>
                <button onClick={(e) => { e.stopPropagation(); removeProduct(p.id); }} className="p-1 text-muted hover:text-ember opacity-0 group-hover:opacity-100 transition-all" aria-label="Remove">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Attendees ── */}
      <section>
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            <UserPlus className="w-4 h-4 text-muted" />
            <span className="text-xs font-semibold text-muted uppercase tracking-wider">Who Was Present</span>
          </div>
          <button onClick={() => setShowAddAttendee(!showAddAttendee)} className="text-xs text-primary font-medium flex items-center gap-1 hover:underline">
            <Plus className="w-3 h-3" /> Add
          </button>
        </div>

        {showAddAttendee && (
          <div className="flex gap-2 mb-2">
            <input type="text" value={aName} onChange={(e) => setAName(e.target.value)} placeholder="Name"
              className="flex-1 px-3 py-2 bg-sand/50 border border-night/8 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted/40"
              autoFocus onKeyDown={(e) => e.key === 'Enter' && addAttendee()} />
            <button onClick={addAttendee} disabled={!aName.trim()}
              className="px-3 py-2 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary-hover disabled:opacity-30 transition-all">Add</button>
            <button onClick={() => { setShowAddAttendee(false); setAName(''); }} className="px-2 py-2 text-muted hover:text-night"><X className="w-4 h-4" /></button>
          </div>
        )}

        {attendees.length === 0 && !showAddAttendee ? (
          <p className="text-sm text-muted/60 italic">No attendees recorded</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {attendees.map((a) => (
              <span key={a.id} className="inline-flex items-center gap-1 text-xs bg-white border border-night/5 rounded-full px-2.5 py-1 text-night group">
                {a.name}
                <button onClick={() => removeAttendee(a.id)} className="p-0.5 text-muted hover:text-ember opacity-0 group-hover:opacity-100 transition-all" aria-label="Remove">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </section>

      {/* ── Notes & Tasks ── */}
      <section>
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            <StickyNote className="w-4 h-4 text-muted" />
            <span className="text-xs font-semibold text-muted uppercase tracking-wider">Notes</span>
          </div>
          <button onClick={() => setShowAddNote(!showAddNote)} className="text-xs text-primary font-medium flex items-center gap-1 hover:underline">
            <Plus className="w-3 h-3" /> Add
          </button>
        </div>

        {showAddNote && (
          <div className="p-3 bg-sand/30 rounded-xl space-y-2 mb-2">
            <textarea value={nText} onChange={(e) => setNText(e.target.value)} placeholder="Write a note..." rows={3}
              className="w-full px-3 py-2 bg-white border border-night/8 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted/40 resize-none" autoFocus />
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-night cursor-pointer">
                <input type="checkbox" checked={nIsTask} onChange={(e) => setNIsTask(e.target.checked)}
                  className="rounded border-night/20 text-primary focus:ring-primary/30" />
                Make this a task
              </label>
              <div className="flex gap-2">
                <button onClick={() => { setShowAddNote(false); setNText(''); setNIsTask(false); }} className="px-3 py-1.5 text-xs text-muted hover:text-night">Cancel</button>
                <button onClick={addNote} disabled={!nText.trim()}
                  className="px-4 py-1.5 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary-hover disabled:opacity-30 transition-all">Add</button>
              </div>
            </div>
          </div>
        )}

        {notes.length === 0 && !showAddNote ? (
          <p className="text-sm text-muted/60 italic">No notes yet</p>
        ) : (
          <div className="space-y-1.5">
            {notes.map((n) => (
              <div key={n.id} className={`px-3 py-2 bg-white rounded-lg border border-night/5 group ${n.is_task && n.completed ? 'opacity-60' : ''}`}>
                <div className="flex items-start gap-2">
                  {n.is_task && (
                    <button onClick={() => toggleNoteTask(n.id, !n.completed)}
                      className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                        n.completed ? 'bg-primary border-primary' : 'border-night/20 hover:border-primary/50'
                      }`}>
                      {n.completed && <Check className="w-3 h-3 text-white" />}
                    </button>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm text-night ${n.is_task && n.completed ? 'line-through text-muted' : ''}`}>{n.note}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Clock className="w-3 h-3 text-muted/50" />
                      <span className="text-xs text-muted/60">{formatDateTime(n.created_at)}</span>
                    </div>
                  </div>
                  <button onClick={() => removeNote(n.id)} className="p-1 text-muted hover:text-ember opacity-0 group-hover:opacity-100 transition-all shrink-0" aria-label="Remove">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Files & Photos ── */}
      <section>
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            <Image className="w-4 h-4 text-muted" />
            <span className="text-xs font-semibold text-muted uppercase tracking-wider">Files & Photos</span>
          </div>
        </div>

        {/* Photo gallery */}
        {files.some((f) => isImage(f.file_type)) && (
          <div className="flex flex-wrap gap-2 mb-2">
            {files.filter((f) => isImage(f.file_type)).map((f) => (
              <div key={f.id} className="relative group">
                <button onClick={() => window.open(f.storage_path, '_blank')} className="cursor-pointer">
                  <img src={f.storage_path} alt={f.file_name} className="w-28 h-28 object-cover rounded-xl border border-night/5" />
                </button>
                <button onClick={() => removeFile(f)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-white border border-night/10 rounded-full flex items-center justify-center text-muted hover:text-ember opacity-0 group-hover:opacity-100 transition-all shadow-sm"
                  aria-label="Remove">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Non-image files */}
        {files.filter((f) => !isImage(f.file_type)).map((f) => (
          <div key={f.id} className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-night/5 mb-1 group">
            <FileText className="w-4 h-4 text-muted shrink-0" />
            <div className="flex-1 min-w-0">
              <a href={f.storage_path} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-night hover:text-primary truncate block">{f.file_name}</a>
              <span className="text-xs text-muted">{f.file_size ? formatFileSize(f.file_size) : ''}{f.file_size ? ' · ' : ''}{formatDate(f.created_at)}</span>
            </div>
            <a href={f.storage_path} target="_blank" rel="noopener noreferrer" className="p-1 text-muted hover:text-primary shrink-0" aria-label="Download"><Download className="w-3.5 h-3.5" /></a>
            <button onClick={() => removeFile(f)} className="p-1 text-muted hover:text-ember opacity-0 group-hover:opacity-100 transition-all shrink-0" aria-label="Remove"><Trash2 className="w-3.5 h-3.5" /></button>
          </div>
        ))}

        {uploadError && (
          <div className="bg-ember/10 border border-ember/20 text-ember text-xs rounded-xl px-3 py-2 mt-1" role="alert">{uploadError}</div>
        )}

        <button onClick={() => { fileRef.current?.click(); setUploadError(''); }} disabled={uploading}
          className="flex items-center gap-2 w-full p-2.5 border border-dashed border-night/15 rounded-lg text-sm text-muted hover:text-night hover:border-night/30 hover:bg-sand/30 transition-all disabled:opacity-50 mt-1">
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {uploading ? 'Uploading...' : 'Upload files or photos'}
        </button>
        <input ref={fileRef} type="file" className="hidden" onChange={handleUpload} multiple
          accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.jpg,.jpeg,.png,.gif,.heic,.webp" />
      </section>

      {/* ── Delete ── */}
      {isAdmin && (
        <div className="pt-2 border-t border-night/5">
          {!showDelete ? (
            <button onClick={() => setShowDelete(true)} className="text-xs text-muted hover:text-ember transition-colors">Delete this event</button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-ember">Are you sure?</span>
              <button onClick={deleteEvent} disabled={deleting} className="px-3 py-1 bg-ember text-white text-xs font-semibold rounded-lg hover:bg-ember/90 disabled:opacity-50 transition-all">
                {deleting ? 'Deleting...' : 'Yes, delete'}
              </button>
              <button onClick={() => setShowDelete(false)} className="px-3 py-1 text-xs text-muted hover:text-night">Cancel</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Reusable Product Form ───────────────────────────────────

function ProductFormFields({
  pItem, setPItem, pQty, setPQty, pUnit, setPUnit, pWpu, setPWpu, pSource, setPSource,
  onSubmit, submitLabel, onCancel,
}: {
  pItem: string; setPItem: (v: string) => void;
  pQty: string; setPQty: (v: string) => void;
  pUnit: string; setPUnit: (v: string) => void;
  pWpu: string; setPWpu: (v: string) => void;
  pSource: string; setPSource: (v: string) => void;
  onSubmit: () => void; submitLabel: string; onCancel: () => void;
}) {
  const showWpu = WEIGHT_UNITS.has(pUnit);
  const qty = pQty ? parseFloat(pQty) : null;
  const wpu = pWpu ? parseFloat(pWpu) : null;
  const total = productTotalLbs({ quantity: qty, unit: pUnit, weight_per_unit: wpu });

  return (
    <div className="p-3 bg-sand/30 rounded-xl space-y-2 mb-2">
      <input type="text" value={pItem} onChange={(e) => setPItem(e.target.value)} placeholder="Item (e.g. Dog food, Flea meds)"
        className="w-full px-3 py-2 bg-white border border-night/8 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted/40" autoFocus />
      <div className="flex gap-2">
        <input type="text" inputMode="numeric" pattern="[0-9]*" value={pQty}
          onChange={(e) => { const v = e.target.value; if (v === '' || /^\d+\.?\d*$/.test(v)) setPQty(v); }}
          placeholder="Qty"
          className="w-20 px-3 py-2 bg-white border border-night/8 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted/40" />
        <select value={pUnit} onChange={(e) => setPUnit(e.target.value)}
          className="flex-1 px-3 py-2 bg-white border border-night/8 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
          <option value="">Unit</option>
          {UNIT_OPTIONS.map((u) => (
            <option key={u.value} value={u.value}>{u.label}</option>
          ))}
        </select>
      </div>
      {showWpu && (
        <div className="flex items-center gap-2">
          <input type="text" inputMode="numeric" pattern="[0-9]*" value={pWpu}
            onChange={(e) => { const v = e.target.value; if (v === '' || /^\d+$/.test(v)) setPWpu(v); }}
            placeholder="lbs per unit"
            className="w-32 px-3 py-2 bg-white border border-night/8 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted/40" />
          <span className="text-xs text-muted">lbs each</span>
          {total && total > 0 && <span className="text-xs text-primary font-semibold ml-1">= {total} lbs total</span>}
        </div>
      )}
      <input type="text" value={pSource} onChange={(e) => setPSource(e.target.value)} placeholder="Source / Donor (optional)"
        className="w-full px-3 py-2 bg-white border border-night/8 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted/40" />
      <div className="flex gap-2">
        <button onClick={onCancel} className="px-3 py-1.5 text-xs text-muted hover:text-night">Cancel</button>
        <button onClick={onSubmit} disabled={!pItem.trim()}
          className="px-4 py-1.5 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary-hover disabled:opacity-30 transition-all">{submitLabel}</button>
      </div>
    </div>
  );
}
