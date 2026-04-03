import { useEffect, useState } from 'react';
import { BarChart3, Download, ChevronDown, ChevronUp, CalendarHeart, Scissors, Package, FileText, Copy, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { downloadCsv } from '../lib/csv-export';
import { formatDate, daysSince } from '../lib/format';
import { SITUATION_CONFIG, HAVENT_SEEN_DAYS } from '../lib/constants';

type ReportKey = 'status' | 'not_seen' | 'unfixed' | 'food' | 'vaccines' | 'contacts' | 'full_export';

const REPORTS: { key: ReportKey; label: string; description: string }[] = [
  { key: 'status', label: 'Animals by Situation Status', description: 'Count of animals in each situation status' },
  { key: 'not_seen', label: 'Animals Not Seen (60+ Days)', description: 'Animals with no care events in the last 60 days' },
  { key: 'unfixed', label: 'Unfixed Animals (Owner Interested)', description: 'Not fixed animals whose owners are interested in spay/neuter' },
  { key: 'food', label: 'Food Distribution Summary', description: 'Total food distributed by month and location' },
  { key: 'vaccines', label: 'Vaccine Summary', description: 'Vaccines administered by type and lot number' },
  { key: 'contacts', label: 'Owner Contact List', description: 'All owner names and phone numbers' },
  { key: 'full_export', label: 'Full Animal Export', description: 'Complete animal records with all fields' },
];

const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: currentYear - 2021 + 1 }, (_, i) => 2021 + i).reverse();

export default function ReportsPage() {
  const [expanded, setExpanded] = useState<ReportKey | null>(null);
  const [impactStats, setImpactStats] = useState<{ events: number; sn: number; food: number } | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | 'all'>(currentYear);

  useEffect(() => {
    document.title = 'Reports | AAO Command Center';
    return () => { document.title = 'AAO Command Center'; };
  }, []);

  useEffect(() => {
    async function loadStats() {
      let eventsQ = supabase.from('outreach_events').select('id', { count: 'exact', head: true });
      let snQ = supabase.from('outreach_events').select('spay_neuter_count');
      let foodQ = supabase.from('outreach_events').select('total_food_lbs');
      if (selectedYear !== 'all') {
        eventsQ = eventsQ.gte('event_date', `${selectedYear}-01-01`).lt('event_date', `${selectedYear + 1}-01-01`);
        snQ = snQ.gte('event_date', `${selectedYear}-01-01`).lt('event_date', `${selectedYear + 1}-01-01`);
        foodQ = foodQ.gte('event_date', `${selectedYear}-01-01`).lt('event_date', `${selectedYear + 1}-01-01`);
      }
      const [eventsRes, snRes, foodRes] = await Promise.all([eventsQ, snQ, foodQ]);
      const totalFood = (foodRes.data ?? []).reduce((sum: number, e: any) => sum + (e.total_food_lbs ?? 0), 0);
      const totalSN = (snRes.data ?? []).reduce((sum: number, e: any) => sum + (e.spay_neuter_count ?? 0), 0);
      setImpactStats({ events: eventsRes.count ?? 0, sn: totalSN, food: Math.round(totalFood) });
    }
    loadStats();
  }, [selectedYear]);

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-heading text-night tracking-tight">Reports</h1>
          <p className="text-muted mt-0.5">Admin analytics and data exports</p>
        </div>
        <select
          value={selectedYear}
          onChange={(e) => { setExpanded(null); setSelectedYear(e.target.value === 'all' ? 'all' : Number(e.target.value)); }}
          className="px-3 py-2 bg-white border border-night/10 rounded-xl text-sm font-medium text-night focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          {YEAR_OPTIONS.map((y) => <option key={y} value={y}>{y}</option>)}
          <option value="all">All time</option>
        </select>
      </div>

      {/* Impact stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Outreach events', value: impactStats?.events, icon: CalendarHeart },
          { label: 'Spayed / neutered', value: impactStats?.sn, icon: Scissors },
          { label: 'Food distributed', value: impactStats?.food, icon: Package, suffix: ' lbs' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-night/5 p-4 text-center">
            <s.icon className="w-4 h-4 mx-auto mb-1 text-primary" strokeWidth={1.75} />
            {s.value != null ? (
              <p className="text-2xl font-bold font-heading text-night leading-none">
                {s.value.toLocaleString()}
                {'suffix' in s && s.suffix && <span className="text-sm font-semibold text-muted">{s.suffix}</span>}
              </p>
            ) : (
              <div className="skeleton h-7 w-10 mx-auto" />
            )}
            <p className="text-xs text-muted mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {REPORTS.map((r) => (
          <ReportSection
            key={r.key}
            reportKey={r.key}
            label={r.label}
            description={r.description}
            expanded={expanded === r.key}
            onToggle={() => setExpanded(expanded === r.key ? null : r.key)}
            selectedYear={selectedYear}
          />
        ))}
      </div>

      {/* Grant Report Export */}
      {selectedYear !== 'all' && (
        <div className="mt-6">
          <GrantReportExport year={selectedYear} impactStats={impactStats} />
        </div>
      )}
    </div>
  );
}

function ReportSection({ reportKey, label, description, expanded, onToggle, selectedYear }: {
  reportKey: ReportKey; label: string; description: string; expanded: boolean; onToggle: () => void; selectedYear: number | 'all';
}) {
  return (
    <div className="bg-white rounded-2xl border border-night/5 overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-center justify-between p-4 text-left">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-muted/8 flex items-center justify-center">
            <BarChart3 className="w-4 h-4 text-muted" strokeWidth={1.75} />
          </div>
          <div>
            <p className="text-sm font-semibold text-night">{label}</p>
            <p className="text-xs text-muted">{description}</p>
          </div>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-muted" /> : <ChevronDown className="w-4 h-4 text-muted" />}
      </button>
      {expanded && (
        <div className="border-t border-night/5 p-4">
          <ReportContent reportKey={reportKey} selectedYear={selectedYear} />
        </div>
      )}
    </div>
  );
}

function GrantReportExport({ year, impactStats }: { year: number; impactStats: { events: number; sn: number; food: number } | null }) {
  const [loading, setLoading] = useState(true);
  const [reportText, setReportText] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    buildReport();
  }, [year, impactStats]);

  async function buildReport() {
    setLoading(true);
    const yearStart = `${year}-01-01`;
    const yearEnd = `${year + 1}-01-01`;

    const [vaxRes, mcRes, prevRes, animalsRes, locRes] = await Promise.all([
      supabase.from('outreach_events').select('vaccinations_given').gte('event_date', yearStart).lt('event_date', yearEnd),
      supabase.from('outreach_events').select('microchips_given').gte('event_date', yearStart).lt('event_date', yearEnd),
      supabase.from('outreach_events').select('preventatives_given').gte('event_date', yearStart).lt('event_date', yearEnd),
      supabase.from('outreach_events').select('animals_seen').gte('event_date', yearStart).lt('event_date', yearEnd),
      supabase.from('outreach_events').select('location:locations(name)').gte('event_date', yearStart).lt('event_date', yearEnd),
    ]);

    const totalVax = (vaxRes.data ?? []).reduce((s: number, e: any) => s + (e.vaccinations_given ?? 0), 0);
    const totalMc = (mcRes.data ?? []).reduce((s: number, e: any) => s + (e.microchips_given ?? 0), 0);
    const totalPrev = (prevRes.data ?? []).reduce((s: number, e: any) => s + (e.preventatives_given ?? 0), 0);
    const totalAnimals = (animalsRes.data ?? []).reduce((s: number, e: any) => s + (e.animals_seen ?? 0), 0);
    const locationNames = [...new Set((locRes.data ?? []).map((e: any) => {
      const loc = Array.isArray(e.location) ? e.location[0] : e.location;
      return loc?.name;
    }).filter(Boolean))];

    const events = impactStats?.events ?? 0;
    const sn = impactStats?.sn ?? 0;
    const food = impactStats?.food ?? 0;

    let text = `ALOHA ANIMAL OUTREACH — ${year} IMPACT REPORT\n\n`;
    text += `In ${year}, Aloha Animal Outreach conducted ${events} outreach event${events !== 1 ? 's' : ''}`;
    if (locationNames.length > 0) {
      text += ` across ${locationNames.length} location${locationNames.length !== 1 ? 's' : ''} including ${locationNames.slice(0, 5).join(', ')}${locationNames.length > 5 ? `, and ${locationNames.length - 5} more` : ''}`;
    }
    text += `.\n\n`;

    text += `ANIMALS SERVED\n`;
    text += `Total animals seen: ${totalAnimals.toLocaleString()}\n`;
    if (sn > 0) text += `Spay/neuter surgeries: ${sn.toLocaleString()}\n`;
    if (totalVax > 0) text += `Vaccinations administered: ${totalVax.toLocaleString()}\n`;
    if (totalMc > 0) text += `Microchips implanted: ${totalMc.toLocaleString()}\n`;
    if (totalPrev > 0) text += `Preventative treatments: ${totalPrev.toLocaleString()}\n`;
    text += `\n`;

    text += `FOOD DISTRIBUTION\n`;
    text += `Total food distributed: ${food.toLocaleString()} lbs\n\n`;

    text += `COMMUNITY IMPACT\n`;
    text += `Through ${events} community outreach events, AAO provided free veterinary care, food, and supplies to underserved pet owners in Honolulu. `;
    text += `Our program helps keep pets with their families by removing barriers to care.\n\n`;

    if (locationNames.length > 0) {
      text += `LOCATIONS SERVED\n`;
      locationNames.forEach((name) => { text += `• ${name}\n`; });
      text += `\n`;
    }

    text += `---\nGenerated from AAO Command Center · ${new Date().toLocaleDateString()}`;

    setReportText(text);
    setLoading(false);
  }

  function handleCopy() {
    navigator.clipboard.writeText(reportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownload() {
    const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aao-grant-report-${year}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="bg-white rounded-2xl border border-night/5 overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-night/5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <FileText className="w-4 h-4 text-primary" strokeWidth={1.75} />
          </div>
          <div>
            <p className="text-sm font-semibold text-night">Grant Report Export</p>
            <p className="text-xs text-muted">Formatted impact summary for grant applications</p>
          </div>
        </div>
      </div>
      <div className="p-4">
        {loading ? (
          <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="skeleton h-4 w-full" />)}</div>
        ) : (
          <>
            <pre className="text-xs text-night bg-sand/50 rounded-xl p-4 whitespace-pre-wrap font-body leading-relaxed max-h-80 overflow-y-auto mb-3">
              {reportText}
            </pre>
            <div className="flex gap-2">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-sand border border-night/8 rounded-lg text-xs font-medium text-night hover:bg-night/5 transition-all"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
              <button
                onClick={handleDownload}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-primary-hover text-white text-xs font-semibold rounded-lg transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                Download .txt
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ReportContent({ reportKey, selectedYear }: { reportKey: ReportKey; selectedYear: number | 'all' }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{ headers: string[]; rows: any[][] }>({ headers: [], rows: [] });

  useEffect(() => { loadReport(); }, [reportKey, selectedYear]);

  const yearStart = selectedYear !== 'all' ? `${selectedYear}-01-01` : null;
  const yearEnd = selectedYear !== 'all' ? `${selectedYear + 1}-01-01` : null;

  async function loadReport() {
    setLoading(true);
    let headers: string[] = [];
    let rows: any[][] = [];

    switch (reportKey) {
      case 'status': {
        const { data: sits } = await supabase.from('situations').select('status').eq('is_active', true);
        const counts: Record<string, number> = {};
        (sits ?? []).forEach((s: any) => { counts[s.status] = (counts[s.status] ?? 0) + 1; });
        headers = ['Status', 'Count'];
        rows = Object.entries(SITUATION_CONFIG).map(([key, cfg]) => [cfg.label, counts[key] ?? 0]);
        break;
      }
      case 'not_seen': {
        const [animalsRes, careRes] = await Promise.all([
          supabase.from('animals').select('id, name, aao_id').eq('archived', false).eq('deceased', false),
          supabase.from('care_events').select('animal_id, event_date').order('event_date', { ascending: false }),
        ]);
        const lastSeen: Record<string, string> = {};
        (careRes.data ?? []).forEach((c: any) => { if (c.animal_id && !lastSeen[c.animal_id]) lastSeen[c.animal_id] = c.event_date; });
        const sitRes = await supabase.from('situations').select('animal_id, status').eq('is_active', true);
        const sitMap: Record<string, string> = {};
        (sitRes.data ?? []).forEach((s: any) => { sitMap[s.animal_id] = s.status; });

        headers = ['AAO ID', 'Name', 'Last Seen', 'Days', 'Current Status'];
        rows = (animalsRes.data ?? [])
          .filter((a: any) => daysSince(lastSeen[a.id]) > HAVENT_SEEN_DAYS)
          .sort((a: any, b: any) => daysSince(lastSeen[a.id]) - daysSince(lastSeen[b.id]))
          .reverse()
          .map((a: any) => [a.aao_id, a.name ?? 'Unnamed', lastSeen[a.id] ? formatDate(lastSeen[a.id]) : 'Never', daysSince(lastSeen[a.id]) === Infinity ? 'Never' : daysSince(lastSeen[a.id]), SITUATION_CONFIG[sitMap[a.id]]?.label ?? 'Unknown']);
        break;
      }
      case 'unfixed': {
        const { data: animals } = await supabase.from('animals')
          .select('aao_id, name, fixed_status, interested_in_fixing, owner:owners(name, phone_primary), primary_location:locations(name)')
          .eq('archived', false).eq('deceased', false).eq('fixed_status', 'not_fixed').eq('interested_in_fixing', 'interested');
        headers = ['AAO ID', 'Name', 'Owner', 'Phone', 'Location'];
        rows = (animals ?? []).map((a: any) => [a.aao_id, a.name ?? 'Unnamed', a.owner?.name ?? '', a.owner?.phone_primary ?? '', a.primary_location?.name ?? '']);
        break;
      }
      case 'food': {
        let q = supabase.from('outreach_events')
          .select('event_date, total_food_lbs, total_bags, location:locations(name)')
          .not('total_food_lbs', 'is', null)
          .order('event_date', { ascending: false });
        if (yearStart) q = q.gte('event_date', yearStart).lt('event_date', yearEnd!);
        const { data: events } = await q;
        headers = ['Date', 'Location', 'Bags', 'Lbs'];
        rows = (events ?? []).map((e: any) => [formatDate(e.event_date), e.location?.name ?? '', e.total_bags ?? 0, e.total_food_lbs ?? 0]);
        break;
      }
      case 'vaccines': {
        let q = supabase.from('care_events')
          .select('event_date, care_types, vaccine_lot_dapp, vaccine_lot_parvo, vaccine_expiry, animal:animals(name, aao_id)')
          .or('care_types.cs.{vaccine_dapp},care_types.cs.{vaccine_parvo}')
          .order('event_date', { ascending: false });
        if (yearStart) q = q.gte('event_date', yearStart).lt('event_date', yearEnd!);
        const { data: care } = await q;
        headers = ['Date', 'Animal', 'AAO ID', 'Type', 'DAPP Lot', 'Parvo Lot', 'Expiry'];
        rows = (care ?? []).map((c: any) => {
          const types = (c.care_types ?? []).filter((t: string) => t.startsWith('vaccine')).join(', ').replace(/_/g, ' ');
          return [formatDate(c.event_date), c.animal?.name ?? '', c.animal?.aao_id ?? '', types, c.vaccine_lot_dapp ?? '', c.vaccine_lot_parvo ?? '', c.vaccine_expiry ? formatDate(c.vaccine_expiry) : ''];
        });
        break;
      }
      case 'contacts': {
        const { data: owners } = await supabase.from('owners')
          .select('name, phone_primary, phone_secondary, primary_location:locations(name)')
          .eq('archived', false).order('name');
        headers = ['Name', 'Phone', 'Alt Phone', 'Location'];
        rows = (owners ?? []).map((o: any) => [o.name, o.phone_primary ?? '', o.phone_secondary ?? '', o.primary_location?.name ?? '']);
        break;
      }
      case 'full_export': {
        const { data: animals } = await supabase.from('animals')
          .select('*, owner:owners(name), primary_location:locations(name), transfer_rescue:transfer_rescues(name)')
          .eq('archived', false).order('aao_id');
        headers = ['AAO ID', 'Name', 'Type', 'Breed', 'Color', 'Sex', 'Size', 'Food Bag', 'Weight', 'Age Est', 'Fixed', 'Microchip', 'Owner', 'Location', 'Urgent Medical', 'Deceased', 'Notes'];
        rows = (animals ?? []).map((a: any) => [
          a.aao_id, a.name ?? '', a.animal_type, a.breed ?? '', a.color ?? '', a.sex, a.size_category, a.food_bag_size ?? '',
          a.weight_lbs ?? '', a.age_estimate ?? '', a.fixed_status, a.microchip_primary ?? '',
          a.owner?.name ?? '', a.primary_location?.name ?? '', a.urgent_medical ? 'Yes' : 'No', a.deceased ? 'Yes' : 'No', a.general_notes ?? '',
        ]);
        break;
      }
    }

    setData({ headers, rows });
    setLoading(false);
  }

  function handleExport() {
    const filename = `aao-${reportKey}-${new Date().toISOString().split('T')[0]}.csv`;
    downloadCsv(filename, data.headers, data.rows);
  }

  if (loading) {
    return <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="skeleton h-8 w-full" />)}</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-muted">{data.rows.length} record{data.rows.length !== 1 ? 's' : ''}</p>
        <button
          onClick={handleExport}
          disabled={data.rows.length === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-primary-hover text-white text-xs font-semibold rounded-lg transition-all disabled:opacity-30"
        >
          <Download className="w-3.5 h-3.5" />
          Export CSV
        </button>
      </div>

      {data.rows.length === 0 ? (
        <p className="text-sm text-muted text-center py-4">No data for this report</p>
      ) : (
        <div className="overflow-x-auto -mx-4 px-4">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-night/8">
                {data.headers.map((h) => (
                  <th key={h} className="text-left py-2 px-2 text-muted font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-night/5">
              {data.rows.slice(0, 50).map((row, i) => (
                <tr key={i} className="hover:bg-sand/50">
                  {row.map((cell: any, j: number) => (
                    <td key={j} className="py-2 px-2 text-night whitespace-nowrap max-w-[200px] truncate">{cell ?? ''}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {data.rows.length > 50 && (
            <p className="text-xs text-muted text-center py-2">Showing 50 of {data.rows.length}. Export CSV for full data.</p>
          )}
        </div>
      )}
    </div>
  );
}
