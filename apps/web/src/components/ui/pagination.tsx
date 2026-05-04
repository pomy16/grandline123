import { ChevronLeft, ChevronRight } from "lucide-react";
import type { PageMeta } from "../../lib/format";
import { Button } from "./button";

export function Pagination({
  meta,
  onPageChange
}: {
  meta: PageMeta;
  onPageChange: (page: number) => void;
}) {
  const start = meta.total === 0 ? 0 : (meta.page - 1) * meta.pageSize + 1;
  const end = Math.min(meta.page * meta.pageSize, meta.total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4 text-sm text-muted-foreground">
      <div>
        {start}-{end} of {meta.total}
      </div>
      <div className="flex items-center gap-2">
        <Button type="button" variant="secondary" disabled={meta.page <= 1} onClick={() => onPageChange(meta.page - 1)} aria-label="Previous page">
          <ChevronLeft size={16} aria-hidden />
        </Button>
        <div className="min-w-24 text-center">
          Page {meta.page} / {meta.totalPages}
        </div>
        <Button type="button" variant="secondary" disabled={meta.page >= meta.totalPages} onClick={() => onPageChange(meta.page + 1)} aria-label="Next page">
          <ChevronRight size={16} aria-hidden />
        </Button>
      </div>
    </div>
  );
}

