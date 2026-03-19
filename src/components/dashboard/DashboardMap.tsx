import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Maximize2, Minimize2, Loader2 } from 'lucide-react';

interface AnimalPin {
  id: string;
  name: string | null;
  aao_id: string;
  breed: string | null;
  owner_name: string | null;
  owner_id: string | null;
  location_name: string | null;
  location_id: string | null;
  lat: number;
  lng: number;
  photo_url: string | null;
}

export default function DashboardMap() {
  const [animals, setAnimals] = useState<AnimalPin[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadAnimals();
  }, []);

  async function loadAnimals() {
    const { data } = await supabase
      .from('animals')
      .select('id, name, aao_id, breed, owner:owners(id, name), primary_location:locations(id, name, latitude, longitude)')
      .eq('archived', false)
      .eq('deceased', false);

    if (!data) { setLoading(false); return; }

    // Get profile photos
    const animalIds = data.map((a: any) => a.id);
    const { data: photos } = await supabase
      .from('photos')
      .select('animal_id, storage_path')
      .in('animal_id', animalIds)
      .eq('is_profile', true);

    const photoMap: Record<string, string> = {};
    (photos ?? []).forEach((p: any) => { photoMap[p.animal_id] = p.storage_path; });

    const pins: AnimalPin[] = [];
    data.forEach((a: any) => {
      const loc = Array.isArray(a.primary_location) ? a.primary_location[0] : a.primary_location;
      if (!loc?.latitude || !loc?.longitude) return;
      const owner = Array.isArray(a.owner) ? a.owner[0] : a.owner;
      pins.push({
        id: a.id,
        name: a.name,
        aao_id: a.aao_id,
        breed: a.breed,
        owner_name: owner?.name ?? null,
        owner_id: owner?.id ?? null,
        location_name: loc.name,
        location_id: loc.id,
        lat: Number(loc.latitude),
        lng: Number(loc.longitude),
        photo_url: photoMap[a.id] ?? null,
      });
    });

    setAnimals(pins);
    setLoading(false);
  }

  useEffect(() => {
    if (loading || animals.length === 0 || !mapRef.current) return;

    let cancelled = false;

    async function initMap() {
      const L = await import('leaflet');
      await import('leaflet/dist/leaflet.css');

      if (cancelled || !mapRef.current) return;

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      delete (L.Icon.Default.prototype as any)._getIconUrl;

      const map = L.map(mapRef.current, {
        scrollWheelZoom: false,
        attributionControl: false,
        zoomControl: true,
      });

      mapInstanceRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

      // Group animals by location
      const byLocation: Record<string, AnimalPin[]> = {};
      animals.forEach((a) => {
        const key = `${a.lat.toFixed(5)},${a.lng.toFixed(5)}`;
        if (!byLocation[key]) byLocation[key] = [];
        byLocation[key].push(a);
      });

      Object.values(byLocation).forEach((group) => {
        const count = group.length;
        const first = group[0];

        if (count === 1) {
          // Single pin
          const color = '#6EA832';
          const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="40" viewBox="0 0 28 40"><path d="M14 0C6.3 0 0 6.3 0 14c0 10.5 14 26 14 26s14-15.5 14-26C28 6.3 21.7 0 14 0z" fill="${color}" stroke="white" stroke-width="2"/><circle cx="14" cy="14" r="6" fill="white" opacity="0.9"/></svg>`;
          const icon = L.icon({
            iconUrl: `data:image/svg+xml;base64,${btoa(svg)}`,
            iconSize: [28, 40] as [number, number],
            iconAnchor: [14, 40] as [number, number],
            popupAnchor: [0, -36] as [number, number],
          });

          const popup = buildPopup(group);
          L.marker([first.lat, first.lng], { icon })
            .addTo(map)
            .bindPopup(popup, { maxWidth: 280, maxHeight: 300 });
        } else {
          // Cluster circle
          const radius = Math.min(24, 16 + count * 1.5);
          const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${radius * 2}" height="${radius * 2}" viewBox="0 0 ${radius * 2} ${radius * 2}"><circle cx="${radius}" cy="${radius}" r="${radius - 2}" fill="#6EA832" stroke="white" stroke-width="3" opacity="0.9"/><text x="${radius}" y="${radius}" text-anchor="middle" dy="0.35em" fill="white" font-family="sans-serif" font-weight="bold" font-size="${count > 9 ? 12 : 14}">${count}</text></svg>`;
          const icon = L.icon({
            iconUrl: `data:image/svg+xml;base64,${btoa(svg)}`,
            iconSize: [radius * 2, radius * 2] as [number, number],
            iconAnchor: [radius, radius] as [number, number],
            popupAnchor: [0, -radius] as [number, number],
          });

          const popup = buildPopup(group);
          L.marker([first.lat, first.lng], { icon })
            .addTo(map)
            .bindPopup(popup, { maxWidth: 280, maxHeight: 300 });
        }
      });

      // Fit bounds
      const allCoords = animals.map((a) => [a.lat, a.lng] as [number, number]);
      if (allCoords.length === 1) {
        map.setView(allCoords[0], 14);
      } else {
        const bounds = L.latLngBounds(allCoords);
        map.fitBounds(bounds, { padding: [30, 30], maxZoom: 14 });
      }

      // Handle popup link clicks + owner row expand/collapse
      map.on('popupopen', () => {
        const container = map.getContainer();
        container.querySelectorAll('.dash-map-link').forEach((el: any) => {
          el.addEventListener('click', (e: MouseEvent) => {
            e.preventDefault();
            const href = (e.currentTarget as HTMLAnchorElement).getAttribute('data-href');
            if (href) navigate(href);
          });
        });
        // Toggle animal list when owner row is clicked
        container.querySelectorAll('.map-popup-owner-row').forEach((el: any) => {
          el.addEventListener('click', () => {
            const key = el.getAttribute('data-owner-key');
            const animalDiv = container.querySelector(`.map-popup-animals[data-owner-key="${key}"]`) as HTMLElement;
            if (animalDiv) {
              const showing = animalDiv.style.display !== 'none';
              // Collapse all
              container.querySelectorAll('.map-popup-animals').forEach((d: any) => { d.style.display = 'none'; });
              container.querySelectorAll('.map-popup-owner-row').forEach((r: any) => { r.style.background = '#f8f5ef'; });
              // Expand clicked (if it was collapsed)
              if (!showing) {
                animalDiv.style.display = 'block';
                el.style.background = '#e8e4d9';
              }
            }
          });
        });
      });
    }

    initMap().catch(console.error);

    return () => {
      cancelled = true;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [loading, animals, expanded]);

  function buildPopup(group: AnimalPin[]): string {
    const locName = group[0].location_name ?? 'Unknown location';
    const owners = new Map<string, { name: string; id: string | null; animals: AnimalPin[] }>();

    group.forEach((a) => {
      const ownerKey = a.owner_id ?? 'no-owner';
      if (!owners.has(ownerKey)) {
        owners.set(ownerKey, { name: a.owner_name ?? 'No owner', id: a.owner_id, animals: [] });
      }
      owners.get(ownerKey)!.animals.push(a);
    });

    const popupId = `map-popup-${Date.now()}`;

    let html = `<div id="${popupId}" style="font-family:system-ui,sans-serif;min-width:180px;">`;
    html += `<div style="font-weight:700;font-size:13px;margin-bottom:4px;color:#1c1708;">${locName}</div>`;
    html += `<div style="font-size:11px;color:#7a7060;margin-bottom:8px;">${group.length} animal${group.length > 1 ? 's' : ''}</div>`;

    // Owner list view (default)
    html += `<div class="map-popup-owners">`;
    owners.forEach((owner, ownerKey) => {
      const count = owner.animals.length;
      const href = owner.id ? `/people/${owner.id}` : null;
      html += `<div style="display:flex;align-items:center;justify-content:space-between;padding:6px 8px;margin:2px 0;border-radius:8px;background:#f8f5ef;cursor:pointer;" class="map-popup-owner-row" data-owner-key="${ownerKey}">`;
      html += `<div style="display:flex;align-items:center;gap:6px;min-width:0;">`;
      if (href) {
        html += `<a class="dash-map-link" data-href="${href}" style="font-size:12px;font-weight:600;color:#6EA832;text-decoration:none;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" onclick="event.stopPropagation();">${owner.name}</a>`;
      } else {
        html += `<span style="font-size:12px;font-weight:600;color:#7a7060;">${owner.name}</span>`;
      }
      html += `</div>`;
      html += `<span style="font-size:11px;color:#7a7060;font-weight:600;white-space:nowrap;margin-left:8px;">🐾 ${count}</span>`;
      html += `</div>`;

      // Animal detail (hidden by default, shown on owner click)
      html += `<div class="map-popup-animals" data-owner-key="${ownerKey}" style="display:none;padding-left:4px;margin-bottom:4px;">`;
      owner.animals.forEach((a) => {
        const photoHtml = a.photo_url
          ? `<img src="${a.photo_url}" style="width:24px;height:24px;border-radius:5px;object-fit:cover;flex-shrink:0;" />`
          : `<div style="width:24px;height:24px;border-radius:5px;background:#f0ece1;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:9px;color:#bbb;">🐾</div>`;
        html += `<a class="dash-map-link" data-href="/animals/${a.id}" style="display:flex;align-items:center;gap:6px;padding:3px 4px;cursor:pointer;text-decoration:none;border-radius:6px;" onmouseover="this.style.background='#f0ece1'" onmouseout="this.style.background='transparent'">`;
        html += photoHtml;
        html += `<div style="min-width:0;"><div style="font-size:11px;font-weight:500;color:#1c1708;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${a.name ?? a.aao_id}</div>`;
        if (a.breed) html += `<div style="font-size:10px;color:#7a7060;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${a.breed}</div>`;
        html += `</div></a>`;
      });
      html += `</div>`;
    });
    html += `</div>`;

    html += `</div>`;
    return html;
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-night/5 overflow-hidden mb-6">
        <div className="flex items-center justify-between px-4 py-3 border-b border-night/5">
          <h2 className="text-sm font-heading font-bold text-night">Animal Map</h2>
        </div>
        <div className="h-[250px] flex items-center justify-center bg-sand/50">
          <Loader2 className="w-5 h-5 text-muted animate-spin" />
        </div>
      </div>
    );
  }

  if (animals.length === 0) return null;

  return (
    <div className={`bg-white rounded-2xl border border-night/5 overflow-hidden mb-6 relative ${expanded ? 'fixed inset-0 z-50 rounded-none' : 'z-0'}`}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-night/5 relative z-10">
        <h2 className="text-sm font-heading font-bold text-night">
          Animal Map
          <span className="text-muted font-normal ml-2">{animals.length} animals</span>
        </h2>
        <button
          onClick={() => setExpanded(!expanded)}
          className="p-1.5 rounded-lg hover:bg-sand text-muted hover:text-night transition-all"
          aria-label={expanded ? 'Minimize map' : 'Expand map'}
        >
          {expanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>
      <div ref={mapRef} style={{ isolation: 'isolate' }} className={expanded ? 'h-[calc(100vh-48px)]' : 'h-[250px] md:h-[300px]'} />
    </div>
  );
}
