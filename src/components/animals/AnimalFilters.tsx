import { useState } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';

export interface AnimalFilterState {
  search: string;
  animalType: string;
  situationStatus: string;
  locationId: string;
  fixedStatus: string;
  photoFilter: string;
  urgentOnly: boolean;
  showArchived: boolean;
}

export const DEFAULT_FILTERS: AnimalFilterState = {
  search: '',
  animalType: '',
  situationStatus: '',
  locationId: '',
  fixedStatus: '',
  photoFilter: '',
  urgentOnly: false,
  showArchived: false,
};

interface Props {
  filters: AnimalFilterState;
  onChange: (filters: AnimalFilterState) => void;
  locations: { id: string; name: string }[];
  resultCount: number;
}

export default function AnimalFilters({ filters, onChange, locations, resultCount }: Props) {
  const [showFilters, setShowFilters] = useState(false);

  const activeFilterCount = [
    filters.animalType,
    filters.situationStatus,
    filters.locationId,
    filters.fixedStatus,
    filters.photoFilter,
    filters.urgentOnly,
    filters.showArchived,
  ].filter(Boolean).length;

  function update(partial: Partial<AnimalFilterState>) {
    onChange({ ...filters, ...partial });
  }

  function clearAll() {
    onChange(DEFAULT_FILTERS);
  }

  return (
    <div className="space-y-3">
      {/* Search + filter toggle */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted/50" strokeWidth={2} />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => update({ search: e.target.value })}
            placeholder="Search by name, AAO ID, microchip, owner..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-night/8 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30 placeholder:text-muted/40 transition-all"
          />
          {filters.search && (
            <button
              onClick={() => update({ search: '' })}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted/40 hover:text-night p-1"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${
            showFilters || activeFilterCount > 0
              ? 'bg-primary/8 border-primary/20 text-primary'
              : 'bg-white border-night/8 text-muted hover:text-night'
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" strokeWidth={1.75} />
          <span className="hidden sm:inline">Filters</span>
          {activeFilterCount > 0 && (
            <span className="w-5 h-5 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="bg-white rounded-2xl border border-night/5 p-4 space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            <FilterSelect
              label="Animal type"
              value={filters.animalType}
              onChange={(v) => update({ animalType: v })}
              options={[
                { value: 'dog', label: 'Dog' },
                { value: 'cat', label: 'Cat' },
                { value: 'other', label: 'Other' },
              ]}
            />
            <FilterSelect
              label="Status"
              value={filters.situationStatus}
              onChange={(v) => update({ situationStatus: v })}
              options={[
                { value: 'supported_in_place', label: 'Supported in Place' },
                { value: 'medical_hold', label: 'Medical Hold' },
                { value: 'in_transition', label: 'In Transition' },
                { value: 'in_foster', label: 'In Foster' },
                { value: 'rehomed', label: 'Rehomed' },
                { value: 'deceased', label: 'Deceased' },
                { value: 'lost_contact', label: 'Lost Contact' },
                { value: 'transferred', label: 'Transferred' },
              ]}
            />
            <FilterSelect
              label="Location"
              value={filters.locationId}
              onChange={(v) => update({ locationId: v })}
              options={locations.map((l) => ({ value: l.id, label: l.name }))}
            />
            <FilterSelect
              label="Fixed"
              value={filters.fixedStatus}
              onChange={(v) => update({ fixedStatus: v })}
              options={[
                { value: 'fixed', label: 'Fixed' },
                { value: 'not_fixed', label: 'Not fixed' },
                { value: 'unknown', label: 'Unknown' },
              ]}
            />
            <FilterSelect
              label="Photo"
              value={filters.photoFilter}
              onChange={(v) => update({ photoFilter: v })}
              options={[
                { value: 'has_photo', label: 'Has photo' },
                { value: 'no_photo', label: 'Needs photo' },
              ]}
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm text-night cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.urgentOnly}
                  onChange={(e) => update({ urgentOnly: e.target.checked })}
                  className="w-4 h-4 rounded border-night/20 text-ember focus:ring-ember/30 accent-ember"
                />
                Urgent medical only
              </label>
              <label className="flex items-center gap-2 text-sm text-night cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.showArchived}
                  onChange={(e) => update({ showArchived: e.target.checked })}
                  className="w-4 h-4 rounded border-night/20 text-muted focus:ring-muted/30 accent-muted"
                />
                Show archived
              </label>
            </div>
            {activeFilterCount > 0 && (
              <button onClick={clearAll} className="text-sm text-primary hover:text-primary-hover font-medium">
                Clear all
              </button>
            )}
          </div>
        </div>
      )}

      {/* Result count */}
      <p className="text-xs text-muted">
        {resultCount} animal{resultCount !== 1 ? 's' : ''}
      </p>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="block text-[11px] text-muted font-medium mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 bg-sand/60 border border-night/5 rounded-lg text-sm text-night focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
      >
        <option value="">All</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}
