import { Link } from 'react-router-dom';
import { MapPin, PawPrint, Users, Calendar } from 'lucide-react';
import { LOCATION_STATUS_CONFIG } from '../../lib/constants';
import { formatRelative, looksLikeCoordinates } from '../../lib/format';

export interface LocationCardData {
  id: string;
  name: string;
  alternate_name?: string | null;
  address: string | null;
  precise_location: string | null;
  status: string;
  latitude: number | null;
  longitude: number | null;
  animal_count: number;
  owner_count: number;
  last_visited: string | null;
}

interface Props {
  location: LocationCardData;
}

export default function LocationCard({ location }: Props) {
  const statusConfig = LOCATION_STATUS_CONFIG[location.status] ?? LOCATION_STATUS_CONFIG.unknown;

  return (
    <Link
      to={`/locations/${location.id}`}
      className="bg-white rounded-2xl border border-night/5 p-4 card-hover block group"
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="w-11 h-11 rounded-xl bg-ember/10 flex items-center justify-center shrink-0">
          <MapPin className="w-5 h-5 text-ember" strokeWidth={1.5} />
        </div>

        <div className="flex-1 min-w-0">
          {/* Name + status */}
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-heading font-bold text-night text-sm leading-tight truncate group-hover:text-primary transition-colors">
              {location.name}
            </h3>
            <span className={`shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full ${statusConfig.bg} ${statusConfig.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot}`} />
              {statusConfig.label}
            </span>
          </div>

          {location.alternate_name && (
            <p className="text-xs text-muted mt-0.5 truncate">aka {location.alternate_name}</p>
          )}

          {(() => {
            const display = location.address || location.precise_location;
            return display && !looksLikeCoordinates(display) ? (
              <p className="text-sm text-muted mt-0.5 truncate">{display}</p>
            ) : null;
          })()}

          {/* Stats row */}
          <div className="flex items-center gap-3 mt-2">
            <span className="inline-flex items-center gap-1 text-xs text-primary font-medium bg-primary/8 px-2 py-0.5 rounded-full">
              <PawPrint className="w-3 h-3" />
              {location.animal_count}
            </span>
            <span className="inline-flex items-center gap-1 text-xs text-night font-medium bg-gold/12 px-2 py-0.5 rounded-full">
              <Users className="w-3 h-3" />
              {location.owner_count}
            </span>
            {location.last_visited && (
              <span className="text-sm text-muted flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Visited {formatRelative(location.last_visited)}
              </span>
            )}
          </div>


        </div>
      </div>
    </Link>
  );
}
