import { useState, useEffect } from 'react';
import { X, MapPin, Calendar, Plus, CalendarHeart, Navigation, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';


interface Props {
  onCreated: (eventId: string) => void;
  onCancel: () => void;
}

export default function EventSetup({ onCreated, onCancel }: Props) {
  const { user } = useAuth();
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Pacific/Honolulu' });

  const [locationId, setLocationId] = useState('');
  const [newLocationName, setNewLocationName] = useState('');
  const [showNewLocation, setShowNewLocation] = useState(false);
  const [eventDate, setEventDate] = useState(today);
  const [submitting, setSubmitting] = useState(false);
  const [setupError, setSetupError] = useState('');

  const [newLocLat, setNewLocLat] = useState<number | null>(null);
  const [newLocLng, setNewLocLng] = useState<number | null>(null);
  const [newLocAddress, setNewLocAddress] = useState('');
  const [gettingLocation, setGettingLocation] = useState(false);
  const [geoError, setGeoError] = useState('');

  const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);
  const [locationSearch, setLocationSearch] = useState('');

  useEffect(() => {
    supabase.from('locations').select('id, name').eq('archived', false).order('name')
      .then(({ data }) => { if (data) setLocations(data); });
  }, []);

  const filteredLocations = locationSearch.trim()
    ? locations.filter((l) => l.name.toLowerCase().includes(locationSearch.toLowerCase()))
    : locations;

  function getMyLocation() {
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser.');
      return;
    }
    setGettingLocation(true);
    setGeoError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setNewLocLat(pos.coords.latitude);
        setNewLocLng(pos.coords.longitude);
        setGettingLocation(false);
      },
      () => {
        setGeoError('Could not get your location. Please check permissions.');
        setGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function handleSubmit() {
    if (!user) return;
    setSubmitting(true);

    let finalLocationId = locationId;

    setSetupError('');

    // Create new location if needed
    if (showNewLocation && newLocationName.trim()) {
      const { data: newLoc, error: locErr } = await supabase
        .from('locations')
        .insert({
          name: newLocationName.trim(),
          address: newLocAddress.trim() || null,
          latitude: newLocLat,
          longitude: newLocLng,
        })
        .select('id')
        .single();
      if (locErr) {
        console.error('Location insert failed:', locErr);
        setSetupError(`Could not create location: ${locErr.message}`);
        setSubmitting(false);
        return;
      }
      if (newLoc) finalLocationId = newLoc.id;
    }

    if (!finalLocationId) {
      setSetupError('Please select or create a location.');
      setSubmitting(false);
      return;
    }

    // Create the outreach event
    const { data: event, error } = await supabase
      .from('outreach_events')
      .insert({
        event_type: 'monthly_outreach',
        event_date: eventDate,
        location_id: finalLocationId,
        status: 'active',
        created_by: user.id,
      })
      .select('id')
      .single();

    if (error || !event) {
      console.error('Failed to create event:', error);
      setSetupError(`Could not create event: ${error?.message ?? 'Unknown error'}`);
      setSubmitting(false);
      return;
    }

    // Auto-add the current user as a volunteer
    await supabase.from('outreach_event_volunteers').upsert(
      { outreach_event_id: event.id, user_id: user.id },
      { onConflict: 'outreach_event_id,user_id' }
    );

    setSubmitting(false);
    onCreated(event.id);
  }

  const canSubmit = (locationId || (showNewLocation && newLocationName.trim())) && eventDate;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label="Start Event">
      <div className="bg-sand w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-night/5">
          <h2 className="text-lg font-heading font-bold text-night flex items-center gap-2">
            <CalendarHeart className="w-5 h-5 text-primary" />
            Start Event
          </h2>
          <button onClick={onCancel} className="p-2 text-muted hover:text-night transition-colors" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* Location */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-night mb-2">
              <MapPin className="w-4 h-4 text-muted" />
              Location
            </label>
            {!showNewLocation ? (
              <>
                <input
                  type="text"
                  value={locationSearch}
                  onChange={(e) => setLocationSearch(e.target.value)}
                  placeholder="Search locations..."
                  className="w-full px-3 py-2.5 bg-white border border-night/8 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted/40 mb-2"
                />
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {filteredLocations.map((l) => (
                    <button
                      key={l.id}
                      onClick={() => setLocationId(l.id)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                        locationId === l.id
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'hover:bg-white text-night'
                      }`}
                    >
                      {l.name}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => { setShowNewLocation(true); setLocationId(''); }}
                  className="flex items-center gap-1.5 text-xs text-primary font-medium mt-2 hover:underline"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add new location
                </button>
              </>
            ) : (
              <div className="space-y-3">
                <input
                  type="text"
                  value={newLocationName}
                  onChange={(e) => setNewLocationName(e.target.value)}
                  placeholder="Location name..."
                  className="w-full px-3 py-2.5 bg-white border border-night/8 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted/40"
                  autoFocus
                />
                <input
                  type="text"
                  value={newLocAddress}
                  onChange={(e) => setNewLocAddress(e.target.value)}
                  placeholder="Address or description (optional)"
                  className="w-full px-3 py-2.5 bg-white border border-night/8 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted/40"
                />

                {/* Geolocation */}
                <button
                  onClick={getMyLocation}
                  disabled={gettingLocation}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-white border border-night/8 rounded-xl text-sm font-medium text-night hover:bg-sand transition-all disabled:opacity-50"
                >
                  {gettingLocation ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Getting location...</>
                  ) : (
                    <><Navigation className="w-4 h-4 text-primary" /> Use my current location</>
                  )}
                </button>
                {geoError && <p className="text-xs text-ember">{geoError}</p>}

                {/* Map preview */}
                {newLocLat !== null && newLocLng !== null && (
                  <div className="rounded-xl overflow-hidden border border-night/8">
                    <iframe
                      title="Location preview"
                      width="100%"
                      height="150"
                      style={{ border: 0, display: 'block' }}
                      src={`https://www.openstreetmap.org/export/embed.html?bbox=${newLocLng - 0.004},${newLocLat - 0.002},${newLocLng + 0.004},${newLocLat + 0.002}&layer=mapnik&marker=${newLocLat},${newLocLng}`}
                      loading="lazy"
                    />
                    <div className="flex items-center justify-between px-2.5 py-1.5 bg-sand/50">
                      <span className="text-xs font-mono text-muted">
                        {newLocLat.toFixed(5)}, {newLocLng.toFixed(5)}
                      </span>
                      <button
                        onClick={() => { setNewLocLat(null); setNewLocLng(null); }}
                        className="text-xs text-ember hover:underline"
                      >
                        Remove pin
                      </button>
                    </div>
                  </div>
                )}

                <button
                  onClick={() => { setShowNewLocation(false); setNewLocationName(''); setNewLocAddress(''); setNewLocLat(null); setNewLocLng(null); setGeoError(''); }}
                  className="text-xs text-muted hover:text-night"
                >
                  Back to list
                </button>
              </div>
            )}
          </div>

          {/* Date */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-night mb-2">
              <Calendar className="w-4 h-4 text-muted" />
              Date
            </label>
            <input
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className="w-full px-3 py-2.5 bg-white border border-night/8 rounded-xl text-sm text-night focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>

        {/* Error */}
        {setupError && (
          <div className="mx-4 mb-2 bg-ember/10 border border-ember/20 text-ember text-sm rounded-xl px-3 py-2">
            {setupError}
          </div>
        )}

        {/* Footer */}
        <div className="px-4 py-3 border-t border-night/5">
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
            className="w-full py-3 bg-primary hover:bg-primary-hover text-white font-semibold rounded-xl shadow-[0_2px_8px_rgba(110,168,50,0.25)] disabled:opacity-30 disabled:shadow-none transition-all text-sm"
          >
            {submitting ? 'Creating...' : 'Start Event'}
          </button>
        </div>
      </div>
    </div>
  );
}
