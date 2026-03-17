import { useState } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';

export interface PeopleFilterState {
  search: string;
  locationId: string;
  hasAnimals: string;
  showArchived: boolean;
}

export const DEFAULT_PEOPLE_FILTERS: PeopleFilterState = {
  search: '',
  locationId: '',
  hasAnimals: '',
  showArchived: false,
};

interface Props {
  filters: PeopleFilterState;
  onChange: (filters: PeopleFilterState) => void;
  locations: { id: string; name: string }[];
  resultCount: number;
}

export default function PeopleFilters({ filters, onChange, locations, resultCount }: Props) {
  const [showFilters, setShowFilters] = useState(false);

  const activeFilterCount = [filters.locationId, filters.hasAnimals, filters.showArchived].filter(Boolean).length;

  function update(partial: Partial<PeopleFilterState>) {
    onChange({ ...filters, ...partial });
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted/50" strokeWidth={2} />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => update({ search: e.target.value })}
            placeholder="Search by name, phone, location..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-night/8 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30 placeholder:text-muted/40 transition-all"
          />
          {filters.search && (
            <button onClick={() => update({ search: '' })} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted/40 hover:text-night">
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

      {showFilters && (
        <div className="bg-white rounded-2xl border border-night/5 p-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] text-muted font-medium mb-1">Location</label>
              <select
                value={filters.locationId}
                onChange={(e) => update({ locationId: e.target.value })}
                className="w-full px-3 py-2 bg-sand/60 border border-night/5 rounded-lg text-sm text-night focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
              >
                <option value="">All</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-muted font-medium mb-1">Animals</label>
              <select
                value={filters.hasAnimals}
                onChange={(e) => update({ hasAnimals: e.target.value })}
                className="w-full px-3 py-2 bg-sand/60 border border-night/5 rounded-lg text-sm text-night focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
              >
                <option value="">Any</option>
                <option value="yes">Has animals</option>
                <option value="no">No animals</option>
              </select>
            </div>
          </div>
          <div className="flex items-center justify-between mt-3 pt-1">
            <label className="flex items-center gap-2 text-sm text-night cursor-pointer">
              <input
                type="checkbox"
                checked={filters.showArchived}
                onChange={(e) => update({ showArchived: e.target.checked })}
                className="w-4 h-4 rounded border-night/20 text-muted focus:ring-muted/30 accent-muted"
              />
              Show archived
            </label>
            {activeFilterCount > 0 && (
              <button onClick={() => onChange(DEFAULT_PEOPLE_FILTERS)} className="text-sm text-primary hover:text-primary-hover font-medium">
                Clear all
              </button>
            )}
          </div>
        </div>
      )}

      <p className="text-xs text-muted">
        {resultCount} {resultCount === 1 ? 'person' : 'people'}
      </p>
    </div>
  );
}
