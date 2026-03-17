import { supabase } from './supabase';

export interface SmartAction {
  label: string;
  value: string;
  type: 'mutation' | 'navigate' | 'dismiss';
  /** For mutation actions — executes the DB change */
  mutation?: (ctx: { recordId: string; userId: string }) => Promise<void>;
  /** For navigate actions — signals parent to open edit modal to this field */
  editField?: string;
}

interface FlagActionRule {
  /** All keywords must match (AND logic, lowercased substring) */
  keywords: string[];
  /** Scope to a specific table, or null for any */
  table: string | null;
  actions: SmartAction[];
}

// --- Mutation helpers ---

async function changeAnimalStatus(recordId: string, status: string) {
  await supabase
    .from('situations')
    .update({ is_active: false, ended_at: new Date().toISOString() })
    .eq('animal_id', recordId)
    .eq('is_active', true);
  await supabase.from('situations').insert({
    animal_id: recordId,
    status,
    is_active: true,
    started_at: new Date().toISOString(),
  });
}

async function archiveRecord(table: string, recordId: string) {
  await supabase.from(table).update({ archived: true }).eq('id', recordId);
}

// --- Shared action constants ---

const DISMISS_ACTION: SmartAction = {
  label: 'Dismiss — not applicable',
  value: 'not_applicable',
  type: 'dismiss',
};

const VERIFIED_ACTION: SmartAction = {
  label: 'Verified correct, no changes needed',
  value: 'verified_correct',
  type: 'dismiss',
};

const REVIEWED_ACTION: SmartAction = {
  label: 'Reviewed and updated',
  value: 'updated_record',
  type: 'dismiss',
};

// --- Rules ---

const FLAG_ACTION_RULES: FlagActionRule[] = [
  // Animal: surrender / abandoned
  {
    keywords: ['surrender'],
    table: 'animals',
    actions: [
      {
        label: 'Change status to In AAO Care',
        value: 'status_changed:in_aao_care',
        type: 'mutation',
        mutation: async ({ recordId }) => changeAnimalStatus(recordId, 'in_aao_care'),
      },
      {
        label: 'Change status to In Transition',
        value: 'status_changed:in_transition',
        type: 'mutation',
        mutation: async ({ recordId }) => changeAnimalStatus(recordId, 'in_transition'),
      },
      {
        label: 'Change owner',
        value: 'navigate:edit_owner',
        type: 'navigate',
        editField: 'owner',
      },
      DISMISS_ACTION,
    ],
  },
  {
    keywords: ['abandoned'],
    table: 'animals',
    actions: [
      {
        label: 'Change status to In AAO Care',
        value: 'status_changed:in_aao_care',
        type: 'mutation',
        mutation: async ({ recordId }) => changeAnimalStatus(recordId, 'in_aao_care'),
      },
      {
        label: 'Change status to In Transition',
        value: 'status_changed:in_transition',
        type: 'mutation',
        mutation: async ({ recordId }) => changeAnimalStatus(recordId, 'in_transition'),
      },
      {
        label: 'Change owner',
        value: 'navigate:edit_owner',
        type: 'navigate',
        editField: 'owner',
      },
      DISMISS_ACTION,
    ],
  },
  // Animal: microchip incomplete
  {
    keywords: ['microchip'],
    table: 'animals',
    actions: [
      {
        label: 'Edit microchip number',
        value: 'navigate:edit_microchip',
        type: 'navigate',
        editField: 'microchip_primary',
      },
      VERIFIED_ACTION,
      DISMISS_ACTION,
    ],
  },
  // Animal: birthdate may be outreach date
  {
    keywords: ['birthdate'],
    table: 'animals',
    actions: [
      {
        label: 'Edit birthdate',
        value: 'navigate:edit_birthdate',
        type: 'navigate',
        editField: 'birthdate',
      },
      VERIFIED_ACTION,
      DISMISS_ACTION,
    ],
  },
  // Animal: bulk cat record
  {
    keywords: ['bulk cat'],
    table: 'animals',
    actions: [
      REVIEWED_ACTION,
      DISMISS_ACTION,
    ],
  },
  // Animal: possible duplicate
  {
    keywords: ['possible duplicate'],
    table: 'animals',
    actions: [
      {
        label: 'Merged / handled duplicate',
        value: 'duplicate_handled',
        type: 'dismiss',
      },
      DISMISS_ACTION,
    ],
  },
  // Owner: catch-all record
  {
    keywords: ['catch-all', 'reassign'],
    table: 'owners',
    actions: [
      {
        label: 'Reviewed and reassigned animals',
        value: 'reassigned',
        type: 'dismiss',
      },
      DISMISS_ACTION,
    ],
  },
  // Owner: AAO as owner
  {
    keywords: ['aao as owner'],
    table: 'owners',
    actions: [
      VERIFIED_ACTION,
      DISMISS_ACTION,
    ],
  },
  // Owner: test record
  {
    keywords: ['test record'],
    table: 'owners',
    actions: [
      {
        label: 'Archive this record',
        value: 'archived',
        type: 'mutation',
        mutation: async ({ recordId }) => archiveRecord('owners', recordId),
      },
      VERIFIED_ACTION,
      DISMISS_ACTION,
    ],
  },
  // Owner: animal count data in notes
  {
    keywords: ['animal count'],
    table: 'owners',
    actions: [
      REVIEWED_ACTION,
      DISMISS_ACTION,
    ],
  },
  // Owner: passed away
  {
    keywords: ['passed away'],
    table: 'owners',
    actions: [
      {
        label: 'Archive owner record',
        value: 'archived',
        type: 'mutation',
        mutation: async ({ recordId }) => archiveRecord('owners', recordId),
      },
      REVIEWED_ACTION,
      DISMISS_ACTION,
    ],
  },
];

// --- Generic fallback for unmatched flags ---

export const GENERIC_ACTIONS: SmartAction[] = [
  VERIFIED_ACTION,
  REVIEWED_ACTION,
  {
    label: 'Needs follow-up in the field',
    value: 'needs_field_followup',
    type: 'dismiss',
  },
  {
    label: 'Duplicate handled',
    value: 'duplicate_handled',
    type: 'dismiss',
  },
  DISMISS_ACTION,
];

// --- Matching function ---

export function getSmartActions(reason: string | null, tableName: string): SmartAction[] {
  if (!reason) return GENERIC_ACTIONS;

  const lower = reason.toLowerCase();

  for (const rule of FLAG_ACTION_RULES) {
    if (rule.table && rule.table !== tableName) continue;
    if (rule.keywords.every((kw) => lower.includes(kw))) {
      return rule.actions;
    }
  }

  return GENERIC_ACTIONS;
}
