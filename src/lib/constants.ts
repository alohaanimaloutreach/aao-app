// Situation status display config
export const SITUATION_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  supported_in_place: { label: 'Supported in Place', bg: 'bg-primary/12', text: 'text-primary', dot: 'bg-primary' },
  medical_hold:       { label: 'Medical Hold', bg: 'bg-ember/12', text: 'text-ember', dot: 'bg-ember' },
  in_transition:      { label: 'In Transition', bg: 'bg-gold/15', text: 'text-yellow-700', dot: 'bg-gold' },
  in_foster:          { label: 'In Foster', bg: 'bg-sky-100', text: 'text-sky-700', dot: 'bg-sky-500' },
  rehomed:            { label: 'Rehomed', bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  deceased:           { label: 'Deceased', bg: 'bg-night/8', text: 'text-muted', dot: 'bg-muted' },
  lost_contact:       { label: 'Lost Contact', bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  transferred:        { label: 'Transferred', bg: 'bg-violet-50', text: 'text-violet-700', dot: 'bg-violet-500' },
};

export const ANIMAL_TYPE_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  dog:   { label: 'Dog', bg: 'bg-primary/10', text: 'text-primary' },
  cat:   { label: 'Cat', bg: 'bg-amber-50', text: 'text-amber-700' },
  other: { label: 'Other', bg: 'bg-muted/10', text: 'text-muted' },
};

export const LOCATION_STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  active:  { label: 'Active', bg: 'bg-primary/12', text: 'text-primary', dot: 'bg-primary' },
  cleared: { label: 'Cleared', bg: 'bg-muted/10', text: 'text-muted', dot: 'bg-muted' },
  unknown: { label: 'Unknown', bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
};

export const FIXED_STATUS_LABELS: Record<string, string> = {
  fixed: 'Fixed',
  not_fixed: 'Not fixed',
  unknown: 'Unknown',
};

export const SIZE_LABELS: Record<string, string> = {
  small: 'Small',
  medium: 'Medium',
  large: 'Large',
  xlarge: 'XL',
  unknown: 'Unknown',
};

// Timeline event type config
export const TIMELINE_ICON_CONFIG: Record<string, { bg: string; text: string }> = {
  care_event:       { bg: 'bg-primary/12', text: 'text-primary' },
  situation_change: { bg: 'bg-gold/15', text: 'text-yellow-700' },
  field_note:       { bg: 'bg-sky-50', text: 'text-sky-600' },
  photo:            { bg: 'bg-violet-50', text: 'text-violet-600' },
};

// How many days before "haven't seen" alert
export const HAVENT_SEEN_DAYS = 60;
