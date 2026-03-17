import { useEffect, useRef } from 'react';
import { formatDate } from '../../lib/format';

interface LocationPin {
  id: string;
  type: 'home' | 'owner' | 'outreach' | 'note';
  label: string;
  detail: string | null;
  date: string | null;
  lat: number;
  lng: number;
}

const PIN_COLORS: Record<string, string> = {
  home: '#6EA832',
  owner: '#E8A317',
  outreach: '#3B82F6',
  note: '#F97316',
};

interface Props {
  pins: LocationPin[];
}

export default function DogLocationMapInner({ pins }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current || pins.length === 0) return;

    let cancelled = false;

    async function initMap() {
      // Dynamic import to avoid any module-level issues
      const L = await import('leaflet');
      await import('leaflet/dist/leaflet.css');

      if (cancelled || !mapRef.current) return;

      // Clean up previous map
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      // Fix default icon issue
      delete (L.Icon.Default.prototype as any)._getIconUrl;

      const map = L.map(mapRef.current, {
        scrollWheelZoom: false,
        attributionControl: false,
      });

      mapInstanceRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

      // Add markers
      pins.forEach((pin) => {
        const color = PIN_COLORS[pin.type] ?? '#666';
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="40" viewBox="0 0 28 40"><path d="M14 0C6.3 0 0 6.3 0 14c0 10.5 14 26 14 26s14-15.5 14-26C28 6.3 21.7 0 14 0z" fill="${color}" stroke="white" stroke-width="2"/><circle cx="14" cy="14" r="6" fill="white" opacity="0.9"/></svg>`;
        const icon = L.icon({
          iconUrl: `data:image/svg+xml;base64,${btoa(svg)}`,
          iconSize: [28, 40] as [number, number],
          iconAnchor: [14, 40] as [number, number],
          popupAnchor: [0, -36] as [number, number],
        });

        const popupContent = [
          `<div style="font-size:12px;min-width:120px">`,
          `<b>${pin.label}</b>`,
          pin.detail ? `<br/><span style="color:#888">${pin.detail}</span>` : '',
          pin.date ? `<br/><span style="color:#aaa">${formatDate(pin.date)}</span>` : '',
          `</div>`,
        ].join('');

        L.marker([pin.lat, pin.lng], { icon })
          .addTo(map)
          .bindPopup(popupContent);
      });

      // Fit bounds
      if (pins.length === 1) {
        map.setView([pins[0].lat, pins[0].lng], 15);
      } else {
        const bounds = L.latLngBounds(pins.map((p) => [p.lat, p.lng] as [number, number]));
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
      }
    }

    initMap().catch(console.error);

    return () => {
      cancelled = true;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [pins]);

  return <div ref={mapRef} className="h-full w-full" />;
}
