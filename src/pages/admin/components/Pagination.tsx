import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
  readonly onPage: (page: number) => void;
  readonly onPageSize?: (size: number) => void;
}

const PAGE_SIZES = [25, 50, 100];

export function usePagination<T>(items: T[], page: number, pageSize: number) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const sliced = items.slice(safePage * pageSize, safePage * pageSize + pageSize);
  return { page: safePage, totalPages, items: sliced };
}

export function Pagination({ total, page, pageSize, onPage, onPageSize }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : page * pageSize + 1;
  const to = Math.min((page + 1) * pageSize, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-surface-variant px-4 py-3">
      <p className="text-xs text-secondary">
        {total === 0 ? "Nenhum registro" : `${from}–${to} de ${total}`}
      </p>
      <div className="flex items-center gap-2">
        {onPageSize && (
          <select
            className="rounded-md border border-outline-variant bg-white px-2 py-1 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
            value={pageSize}
            onChange={(e) => { onPageSize(Number(e.target.value)); onPage(0); }}
          >
            {PAGE_SIZES.map((size) => (
              <option key={size} value={size}>{size} por página</option>
            ))}
          </select>
        )}
        <button
          aria-label="Página anterior"
          className="rounded-md border border-outline-variant p-1 text-secondary transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
          disabled={page === 0}
          onClick={() => onPage(page - 1)}
          type="button"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="min-w-[4rem] text-center text-xs text-secondary">
          {page + 1} / {totalPages}
        </span>
        <button
          aria-label="Próxima página"
          className="rounded-md border border-outline-variant p-1 text-secondary transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
          disabled={page >= totalPages - 1}
          onClick={() => onPage(page + 1)}
          type="button"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
