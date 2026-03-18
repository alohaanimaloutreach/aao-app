import { Link } from 'react-router-dom';
import { PawPrint, AlertTriangle, Ruler, MapPin, User, Clock } from 'lucide-react';
import StatusBadge from '../shared/StatusBadge';
import { ANIMAL_TYPE_CONFIG, HAVENT_SEEN_DAYS } from '../../lib/constants';
import { formatRelative, daysSince } from '../../lib/format';

export interface AnimalCardData {
  id: string;
  aao_id: string;
  name: string | null;
  animal_type: string;
  breed: string | null;
  sex: string;
  size_category: string;
  food_bag_size: string | null;
  urgent_medical: boolean;
  deceased: boolean;
  owner: { name: string } | null;
  primary_location: { name: string } | null;
  current_situation: { status: string } | null;
  last_seen: string | null;
  profile_photo_url: string | null;
}

interface Props {
  animal: AnimalCardData;
}

export default function AnimalCard({ animal }: Props) {
  const typeConfig = ANIMAL_TYPE_CONFIG[animal.animal_type] ?? ANIMAL_TYPE_CONFIG.other;
  const lastSeenDays = daysSince(animal.last_seen);
  const haventSeen = lastSeenDays > HAVENT_SEEN_DAYS && lastSeenDays !== Infinity && !animal.deceased;

  return (
    <Link
      to={`/animals/${animal.id}`}
      className="bg-white rounded-2xl border border-night/5 overflow-hidden card-hover block group"
    >
      {/* Photo / Placeholder */}
      <div className="relative h-36 bg-sand overflow-hidden">
        {animal.profile_photo_url ? (
          <img
            src={animal.profile_photo_url}
            alt={animal.name ?? 'Animal'}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }}
          />
        ) : null}
        <div className={`w-full h-full flex items-center justify-center ${animal.profile_photo_url ? 'hidden' : ''}`}>
          <PawPrint className="w-10 h-10 text-muted/40" strokeWidth={1} />
        </div>

        {/* Urgent badge */}
        {animal.urgent_medical && (
          <div className="absolute top-2 left-2 bg-ember text-white text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            Urgent
          </div>
        )}

        {/* Identifying badge — location, owner, or size */}
        {(animal.primary_location || animal.owner || animal.size_category) && (
          <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm text-night text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1 max-w-[60%]">
            {animal.primary_location ? (
              <>
                <MapPin className="w-3 h-3 shrink-0" />
                <span className="truncate">{animal.primary_location.name}</span>
              </>
            ) : animal.owner ? (
              <>
                <User className="w-3 h-3 shrink-0" />
                <span className="truncate">{animal.owner.name}</span>
              </>
            ) : (
              <>
                <Ruler className="w-3 h-3 shrink-0" />
                <span className="truncate">{animal.size_category}</span>
              </>
            )}
          </div>
        )}

        {/* Haven't seen warning */}
        {haventSeen && (
          <div className="absolute bottom-2 left-2 bg-gold/90 text-night text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {lastSeenDays}d since last seen
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3.5">
        {/* Name + ID */}
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <div className="min-w-0">
            <h3 className="font-heading font-bold text-night text-sm leading-tight truncate">
              {animal.name ?? 'Unnamed'}
            </h3>
            <p className="text-xs text-muted font-mono">{animal.aao_id}</p>
          </div>
          <span className={`shrink-0 text-xs font-semibold px-1.5 py-0.5 rounded-md ${typeConfig.bg} ${typeConfig.text}`}>
            {typeConfig.label}
          </span>
        </div>

        {/* Situation status */}
        {animal.current_situation && (
          <div className="mb-2">
            <StatusBadge status={animal.current_situation.status} />
          </div>
        )}

        {/* Meta info */}
        <div className="space-y-1">
          {animal.owner && (
            <div className="flex items-center gap-1.5 text-sm text-muted">
              <User className="w-3 h-3 shrink-0" />
              <span className="truncate">{animal.owner.name}</span>
            </div>
          )}
          {animal.primary_location && (
            <div className="flex items-center gap-1.5 text-sm text-muted">
              <MapPin className="w-3 h-3 shrink-0" />
              <span className="truncate">{animal.primary_location.name}</span>
            </div>
          )}
          {animal.last_seen && (
            <div className="flex items-center gap-1.5 text-sm text-muted">
              <Clock className="w-3 h-3 shrink-0" />
              <span>Last seen {formatRelative(animal.last_seen)}</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
