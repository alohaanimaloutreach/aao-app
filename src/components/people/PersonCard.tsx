import { Link } from 'react-router-dom';
import { User, MapPin, PawPrint, Phone, MessageSquare, Calendar } from 'lucide-react';
import { formatRelative, formatPhone } from '../../lib/format';

export interface PersonCardData {
  id: string;
  name: string;
  nickname: string | null;
  phone_primary: string | null;
  primary_location: { name: string } | null;
  animal_count: number;
  last_contact: string | null;
}

interface Props {
  person: PersonCardData;
}

export default function PersonCard({ person }: Props) {
  return (
    <Link
      to={`/people/${person.id}`}
      className="bg-white rounded-2xl border border-night/5 p-4 card-hover block group"
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="w-11 h-11 rounded-xl bg-gold/15 flex items-center justify-center shrink-0">
          <User className="w-5 h-5 text-night/60" strokeWidth={1.5} />
        </div>

        <div className="flex-1 min-w-0">
          {/* Name */}
          <h3 className="font-heading font-bold text-night text-sm leading-tight truncate group-hover:text-primary transition-colors">
            {person.name}{person.nickname && <span className="text-muted font-normal"> ({person.nickname})</span>}
          </h3>

          {/* Meta */}
          <div className="mt-1.5 space-y-1">
            {person.primary_location && (
              <div className="flex items-center gap-1.5 text-sm text-muted">
                <MapPin className="w-3 h-3 shrink-0" />
                <span className="truncate">{person.primary_location.name}</span>
              </div>
            )}
            {person.phone_primary && (
              <div className="flex items-center gap-1.5 text-sm">
                <Phone className="w-3 h-3 shrink-0 text-muted" />
                <a
                  href={`tel:${person.phone_primary.replace(/\D/g, '')}`}
                  onClick={(e) => e.stopPropagation()}
                  className="text-primary font-medium hover:underline"
                >
                  {formatPhone(person.phone_primary)}
                </a>
                <a
                  href={`sms:${person.phone_primary.replace(/\D/g, '')}`}
                  onClick={(e) => e.stopPropagation()}
                  className="p-0.5 text-muted hover:text-primary transition-colors"
                  aria-label="Send text message"
                >
                  <MessageSquare className="w-3.5 h-3.5" strokeWidth={1.75} />
                </a>
              </div>
            )}
          </div>

          {/* Bottom row */}
          <div className="flex items-center gap-3 mt-2">
            <span className="inline-flex items-center gap-1 text-xs text-primary font-medium bg-primary/8 px-2 py-0.5 rounded-full">
              <PawPrint className="w-3 h-3" />
              {person.animal_count} animal{person.animal_count !== 1 ? 's' : ''}
            </span>
            {person.last_contact && (
              <span className="text-sm text-muted">
                Last contact {formatRelative(person.last_contact)}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
