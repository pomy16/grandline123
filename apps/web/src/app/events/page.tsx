"use client";

import { useEffect, useMemo, useState } from "react";
import { ExternalLink, RefreshCw, Search } from "lucide-react";
import { AuthGate } from "../../components/auth-gate";
import { PageHeader } from "../../components/page-header";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { EmptyState, ErrorState, LoadingState } from "../../components/ui/data-state";
import { Select } from "../../components/ui/form-controls";
import { Input } from "../../components/ui/input";
import { Pagination } from "../../components/ui/pagination";
import { apiFetch } from "../../lib/api-client";
import { formatDateTime, type PageMeta } from "../../lib/format";
import { wouldSkipProductNow } from "../../lib/product-quality";

type ProductEvent = {
  id: string;
  type: string;
  oldValue?: unknown;
  newValue?: unknown;
  createdAt: string;
  notificationSent: boolean;
  product: {
    title: string;
    url: string;
    game: string;
    category?: string | null;
    store: { id: string; name: string };
  };
};

type StoreRecord = { id: string; name: string };

const defaultMeta: PageMeta = { page: 1, pageSize: 25, total: 0, totalPages: 1 };
const eventTypes = ["NEW_PRODUCT", "RESTOCK", "PRICE_DROP", "PRICE_INCREASE", "SOLD_OUT", "PREORDER_OPENED", "PRODUCT_UPDATED"];

function eventTone(type: string) {
  if (type === "PRICE_DROP" || type === "RESTOCK" || type === "PREORDER_OPENED") return "success";
  if (type === "SOLD_OUT" || type === "PRICE_INCREASE") return "warning";
  return "info";
}

function summarizeValue(value: unknown) {
  if (value === null || value === undefined) return "-";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}

export default function EventsPage() {
  const [events, setEvents] = useState<ProductEvent[]>([]);
  const [stores, setStores] = useState<StoreRecord[]>([]);
  const [filters, setFilters] = useState({ q: "", type: "", storeId: "", notificationSent: "", page: 1, pageSize: 25 });
  const [meta, setMeta] = useState<PageMeta>(defaultMeta);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, String(value));
    });
    return params.toString();
  }, [filters]);

  function updateFilters(patch: Partial<typeof filters>) {
    setFilters((current) => ({ ...current, ...patch, page: patch.page ?? 1 }));
  }

  async function loadEvents() {
    setLoading(true);
    setError(null);
    try {
      const [eventPayload, storePayload] = await Promise.all([
        apiFetch<{ data: ProductEvent[]; meta?: PageMeta }>(`/api/events?${query}`),
        apiFetch<{ data: StoreRecord[] }>("/api/stores?pageSize=100&sortBy=name&sortOrder=asc")
      ]);
      setEvents(eventPayload.data);
      setMeta(eventPayload.meta ?? { ...defaultMeta, total: eventPayload.data.length });
      setStores(storePayload.data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load events.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEvents();
  }, [query]);

  return (
    <>
      <PageHeader title="Events" description="Timeline of detected product changes, old values, new values, timestamps, and notification status." />
      <AuthGate>
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle>Event timeline</CardTitle>
              <Button type="button" variant="secondary" onClick={loadEvents} disabled={loading}>
                <RefreshCw size={16} className={loading ? "animate-spin" : ""} aria-hidden />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 lg:grid-cols-5">
              <div className="relative lg:col-span-2">
                <Search className="pointer-events-none absolute left-3 top-2.5 text-muted-foreground" size={16} aria-hidden />
                <Input className="pl-9" placeholder="Search product title" value={filters.q} onChange={(event) => updateFilters({ q: event.target.value })} />
              </div>
              <Select value={filters.storeId} onChange={(event) => updateFilters({ storeId: event.target.value })}>
                <option value="">All stores</option>
                {stores.map((store) => (
                  <option key={store.id} value={store.id}>{store.name}</option>
                ))}
              </Select>
              <Select value={filters.type} onChange={(event) => updateFilters({ type: event.target.value })}>
                <option value="">All event types</option>
                {eventTypes.map((type) => (
                  <option key={type}>{type}</option>
                ))}
              </Select>
              <Select value={filters.notificationSent} onChange={(event) => updateFilters({ notificationSent: event.target.value })}>
                <option value="">All notification states</option>
                <option value="true">Notification sent</option>
                <option value="false">Notification pending</option>
              </Select>
            </div>
            {error ? <ErrorState message={error} onRetry={loadEvents} /> : null}
            {loading ? <LoadingState label="Loading events..." /> : null}
            {!loading && events.length === 0 ? <EmptyState title="No events match these filters" detail="Run a manual scan from Stores or broaden the filters." /> : null}
            {!loading && events.length > 0 ? (
              <>
                <div className="relative space-y-3 before:absolute before:bottom-0 before:left-5 before:top-0 before:w-px before:bg-border">
                  {events.map((event) => {
                    const wouldSkipNow = wouldSkipProductNow(event.product);
                    return (
                    <div key={event.id} className="relative grid gap-3 rounded-md border border-border bg-background p-4 pl-14 lg:grid-cols-[1fr_320px]">
                      <div className="absolute left-[13px] top-5 flex h-4 w-4 items-center justify-center rounded-full bg-card ring-4 ring-background">
                        <div className="h-2 w-2 rounded-full bg-primary" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge tone={eventTone(event.type)}>{event.type}</Badge>
                          <Badge tone={event.notificationSent ? "success" : "default"}>{event.notificationSent ? "Notification sent" : "Notification pending"}</Badge>
                          {wouldSkipNow ? <Badge tone="warning">Would skip now</Badge> : null}
                        </div>
                        <div className="mt-2 font-medium">{event.product.title}</div>
                        <div className="mt-1 text-sm text-muted-foreground">{event.product.store.name} · {formatDateTime(event.createdAt)}</div>
                        {wouldSkipNow ? (
                          <div className="mt-2 rounded-md border border-yellow-500/30 bg-yellow-500/10 p-2 text-xs leading-5 text-yellow-100">
                            Current relevance filtering treats this product as historical noise or a non-target product. Future scans should not create events or Discord alerts for it.
                          </div>
                        ) : null}
                        <div className="mt-3 grid gap-2 text-sm md:grid-cols-2">
                          <div className="rounded-md border border-border bg-muted/40 p-3">
                            <div className="mb-1 text-xs text-muted-foreground">Old value</div>
                            <div className="break-words">{summarizeValue(event.oldValue)}</div>
                          </div>
                          <div className="rounded-md border border-border bg-muted/40 p-3">
                            <div className="mb-1 text-xs text-muted-foreground">New value</div>
                            <div className="break-words">{summarizeValue(event.newValue)}</div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-start justify-end">
                        <Button type="button" variant="secondary" onClick={() => window.open(event.product.url, "_blank", "noopener,noreferrer")}>
                          <ExternalLink size={16} aria-hidden />
                          Product
                        </Button>
                      </div>
                    </div>
                    );
                  })}
                </div>
                <Pagination meta={meta} onPageChange={(page) => setFilters((current) => ({ ...current, page }))} />
              </>
            ) : null}
          </CardContent>
        </Card>
      </AuthGate>
    </>
  );
}
