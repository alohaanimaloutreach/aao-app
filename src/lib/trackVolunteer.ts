import { supabase } from './supabase';

/** Auto-add the current user to an event's volunteer list (no-op if already there) */
export async function trackVolunteer(eventId: string, userId: string) {
  await supabase.from('outreach_event_volunteers').upsert(
    { outreach_event_id: eventId, user_id: userId },
    { onConflict: 'outreach_event_id,user_id' }
  );
}
