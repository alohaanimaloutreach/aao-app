import { formatDate } from '../../lib/format';
import { EVENT_TYPE_CONFIG } from '../../lib/constants';

const CARE_LABELS: Record<string, string> = {
  food: 'Food',
  vaccine_dapp: 'DAPP Vaccine',
  vaccine_parvo: 'Parvo Vaccine',
  preventative_oral: 'Preventative (Oral)',
  preventative_topical: 'Preventative (Topical)',
  spay_neuter: 'Spay/Neuter',
  medical: 'Medical/Vet',
  grooming: 'Grooming/Bath',
  nail_trim: 'Nail Trim',
  microchip: 'Microchip',
  seen: 'Seen',
};

interface CareEvent {
  id: string;
  animal_id: string;
  owner_id: string;
  care_types: string[];
  food_bags: number | null;
  food_lbs: number | null;
  health_notes: string | null;
  other_notes: string | null;
  animal: { name: string | null; aao_id: string } | null;
  owner: { name: string } | null;
}

interface Props {
  event: {
    event_type: string;
    event_date: string;
    status: string;
    notes: string | null;
    location: { name: string } | null;
    animals_seen: number | null;
    vaccinations_given: number | null;
    microchips_given: number | null;
    preventatives_given: number | null;
    spay_neuter_count: number | null;
    grooming_count: number | null;
    nail_trim_count: number | null;
    total_food_lbs: number | null;
    total_bags: number | null;
    drive_folder_url: string | null;
  };
  careEvents: CareEvent[];
  sightingAnimalTotal: number;
  volunteerNames: string[];
  tasks: { task: string; assigned_name: string | null; completed: boolean }[];
  statItems: { label: string; value: number; sub?: string }[];
  byOwner: Record<string, { ownerName: string; animals: CareEvent[] }>;
  uniqueOwners: number;
  totalFoodBags: number;
  totalFoodLbs: number;
  isHistorical: boolean;
}

export default function PrintableEventReport({
  event, careEvents, sightingAnimalTotal, volunteerNames, tasks,
  statItems, byOwner, uniqueOwners, totalFoodBags, totalFoodLbs, isHistorical,
}: Props) {
  const eventTypeLabel = (EVENT_TYPE_CONFIG[event.event_type] ?? EVENT_TYPE_CONFIG.other).label;
  const uniqueAnimals = new Set(careEvents.map((c) => c.animal_id)).size;
  const entries = Object.entries(byOwner);

  return (
    <div className="print-report">
      {/* Header */}
      <div style={{ borderBottom: '2px solid #1a1a1a', paddingBottom: 12, marginBottom: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Aloha Animal Outreach — Event Report</h1>
        <div style={{ display: 'flex', gap: 24, marginTop: 8, fontSize: 13, color: '#555' }}>
          <span><strong>Type:</strong> {eventTypeLabel}</span>
          <span><strong>Date:</strong> {formatDate(event.event_date)}</span>
          <span><strong>Location:</strong> {event.location?.name ?? 'Unknown'}</span>
        </div>
      </div>

      {/* Volunteers */}
      {volunteerNames.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Volunteers</h2>
          <p style={{ fontSize: 12, color: '#555' }}>{volunteerNames.join(', ')}</p>
        </div>
      )}

      {/* Stats */}
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Summary</h2>
        <table style={{ borderCollapse: 'collapse', fontSize: 12, width: '100%', maxWidth: 400 }}>
          <tbody>
            {!isHistorical && (
              <tr>
                <td style={{ padding: '3px 12px 3px 0', color: '#555' }}>Owners seen</td>
                <td style={{ padding: '3px 0', fontWeight: 600 }}>{uniqueOwners}</td>
              </tr>
            )}
            <tr>
              <td style={{ padding: '3px 12px 3px 0', color: '#555' }}>Animals seen</td>
              <td style={{ padding: '3px 0', fontWeight: 600 }}>{isHistorical ? (event.animals_seen ?? 0) : (uniqueAnimals + sightingAnimalTotal)}</td>
            </tr>
            {(totalFoodBags > 0 || totalFoodLbs > 0) && (
              <tr>
                <td style={{ padding: '3px 12px 3px 0', color: '#555' }}>Food distributed</td>
                <td style={{ padding: '3px 0', fontWeight: 600 }}>
                  {totalFoodBags > 0 ? `${totalFoodBags} bags` : ''}{totalFoodBags > 0 && totalFoodLbs > 0 ? ' / ' : ''}{totalFoodLbs > 0 ? `${totalFoodLbs} lbs` : ''}
                </td>
              </tr>
            )}
            {statItems.filter((s) => !['Owners', 'Animals', 'Food bags', 'Food (lbs)'].includes(s.label)).map((s) => (
              <tr key={s.label}>
                <td style={{ padding: '3px 12px 3px 0', color: '#555' }}>{s.label}</td>
                <td style={{ padding: '3px 0', fontWeight: 600 }}>{s.value}{s.sub ? ` (${s.sub})` : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Care details by owner */}
      {entries.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Care Details by Owner</h2>
          {entries.map(([ownerId, { ownerName, animals }]) => (
            <div key={ownerId} style={{ marginBottom: 10 }}>
              <p style={{ fontSize: 12, fontWeight: 700, marginBottom: 2 }}>{ownerName}</p>
              {animals.map((c) => (
                <p key={c.id} style={{ fontSize: 11, color: '#555', paddingLeft: 12, margin: '2px 0' }}>
                  {c.animal?.name || c.animal?.aao_id || 'Unnamed'} ({c.animal?.aao_id}) — {c.care_types.map((t) => CARE_LABELS[t] ?? t).join(', ')}
                  {c.health_notes ? ` | Notes: ${c.health_notes}` : ''}
                </p>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Tasks */}
      {tasks.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Follow-up Tasks</h2>
          {tasks.map((t, i) => (
            <p key={i} style={{ fontSize: 11, margin: '2px 0', color: '#555' }}>
              {t.completed ? '✓' : '☐'} {t.task}{t.assigned_name ? ` (${t.assigned_name})` : ''}
            </p>
          ))}
        </div>
      )}

      {/* Notes */}
      {event.notes && (
        <div style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Notes</h2>
          <p style={{ fontSize: 12, color: '#555', whiteSpace: 'pre-wrap' }}>{event.notes.replace(/^Historical:\s*/i, '')}</p>
        </div>
      )}

      {/* Footer */}
      <div style={{ borderTop: '1px solid #ccc', paddingTop: 8, marginTop: 24, fontSize: 10, color: '#999' }}>
        Generated from AAO Command Center · {new Date().toLocaleDateString()}
      </div>
    </div>
  );
}
