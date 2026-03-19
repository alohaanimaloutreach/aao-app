import { ChevronLeft, ChevronRight } from 'lucide-react';

const PAGE_SIZE_OPTIONS = [25, 50, 100];

interface Props {
  page: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export default function Pagination({ page, pageSize, totalItems, onPageChange, onPageSizeChange }: Props) {
  const totalPages = Math.ceil(totalItems / pageSize);
  const start = page * pageSize + 1;
  const end = Math.min((page + 1) * pageSize, totalItems);

  if (totalItems <= 0) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mt-6">
      {/* Left: record count + page size */}
      <div className="flex items-center gap-2 text-sm text-muted">
        <span>{start}–{end} of {totalItems}</span>
        <span className="text-night/10">|</span>
        <label className="flex items-center gap-1">
          <span>Show</span>
          <select
            value={pageSize}
            onChange={(e) => {
              onPageSizeChange(Number(e.target.value));
              onPageChange(0);
            }}
            className="px-1.5 py-0.5 bg-white border border-night/8 rounded-lg text-sm text-night focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            {PAGE_SIZE_OPTIONS.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </label>
      </div>

      {/* Right: prev/next */}
      {totalPages > 1 && (
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onPageChange(Math.max(0, page - 1))}
            disabled={page === 0}
            className="p-1.5 rounded-lg bg-white border border-night/8 text-muted hover:text-night disabled:opacity-30 transition-all"
            aria-label="Previous page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm text-muted px-2">{page + 1} of {totalPages}</span>
          <button
            onClick={() => onPageChange(Math.min(totalPages - 1, page + 1))}
            disabled={page >= totalPages - 1}
            className="p-1.5 rounded-lg bg-white border border-night/8 text-muted hover:text-night disabled:opacity-30 transition-all"
            aria-label="Next page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
