"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDownUp, ExternalLink, RefreshCw, RotateCcw, Search, Send, ShoppingCart, XCircle } from "lucide-react";
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
import { formatDateTime, formatMoney, type PageMeta } from "../../lib/format";

type ProductRecord = {
  id: string;
  title: string;
  url: string;
  imageUrl?: string | null;
  price?: string | null;
  previousPrice?: string | null;
  currency: string;
  stockStatus: string;
  isAvailable: boolean;
  isPreorder: boolean;
  sku?: string | null;
  ean?: string | null;
  category?: string | null;
  game: string;
  firstSeenAt: string;
  lastSeenAt: string;
  ignored: boolean;
  store: { id: string; name: string; publicCartUrl?: string | null };
};

type StoreRecord = { id: string; name: string };

const defaultMeta: PageMeta = { page: 1, pageSize: 25, total: 0, totalPages: 1 };
const gameOptions = ["POKEMON", "ONE_PIECE", "BOTH", "UNKNOWN"];
const stockOptions = ["IN_STOCK", "OUT_OF_STOCK", "PREORDER", "UNKNOWN"];
const sortOptions = [
  { value: "lastSeenAt", label: "Last seen" },
  { value: "firstSeenAt", label: "First seen" },
  { value: "price", label: "Price" },
  { value: "title", label: "Title" },
  { value: "stockStatus", label: "Stock" },
  { value: "game", label: "Game" },
  { value: "category", label: "Category" }
];

function stockTone(status: string) {
  if (status === "IN_STOCK") return "success";
  if (status === "PREORDER") return "warning";
  if (status === "OUT_OF_STOCK") return "danger";
  return "default";
}

function nextSortOrder(currentSort: string, currentOrder: string, field: string) {
  if (currentSort !== field) return "desc";
  return currentOrder === "asc" ? "desc" : "asc";
}

export default function ProductsPage() {
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [stores, setStores] = useState<StoreRecord[]>([]);
  const [filters, setFilters] = useState({
    q: "",
    storeId: "",
    game: "",
    stockStatus: "",
    category: "",
    minPrice: "",
    maxPrice: "",
    foundFrom: "",
    foundTo: "",
    includeIgnored: false,
    sortBy: "lastSeenAt",
    sortOrder: "desc",
    page: 1,
    pageSize: 25
  });
  const [meta, setMeta] = useState<PageMeta>(defaultMeta);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (typeof value === "boolean") {
        if (value) params.set(key, "true");
        return;
      }
      if (value) params.set(key, String(value));
    });
    return params.toString();
  }, [filters]);

  function updateFilters(patch: Partial<typeof filters>) {
    setFilters((current) => ({ ...current, ...patch, page: patch.page ?? 1 }));
  }

  async function loadProducts() {
    setLoading(true);
    setError(null);
    try {
      const [productPayload, storePayload] = await Promise.all([
        apiFetch<{ data: ProductRecord[]; meta?: PageMeta }>(`/api/products?${query}`),
        apiFetch<{ data: StoreRecord[] }>("/api/stores?pageSize=100&sortBy=name&sortOrder=asc")
      ]);
      setProducts(productPayload.data);
      setMeta(productPayload.meta ?? { ...defaultMeta, total: productPayload.data.length });
      setStores(storePayload.data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load products.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();
  }, [query]);

  async function productAction(path: string, success: string, body: Record<string, unknown> = {}) {
    setMessage(null);
    setError(null);
    try {
      await apiFetch(path, { method: "POST", body: JSON.stringify(body) });
      setMessage(success);
      await loadProducts();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Product action failed.");
    }
  }

  function toggleSort(field: string) {
    setFilters((current) => ({
      ...current,
      sortBy: field,
      sortOrder: nextSortOrder(current.sortBy, current.sortOrder, field),
      page: 1
    }));
  }

  return (
    <>
      <PageHeader title="Products" description="Search products by store, game, category, stock status, price, and discovery date." />
      <AuthGate>
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle>Product catalog</CardTitle>
              <Button type="button" variant="secondary" onClick={loadProducts} disabled={loading}>
                <RefreshCw size={16} className={loading ? "animate-spin" : ""} aria-hidden />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 lg:grid-cols-6">
              <div className="relative lg:col-span-2">
                <Search className="pointer-events-none absolute left-3 top-2.5 text-muted-foreground" size={16} aria-hidden />
                <Input className="pl-9" placeholder="Search title, SKU, EAN, category" value={filters.q} onChange={(event) => updateFilters({ q: event.target.value })} />
              </div>
              <Select value={filters.storeId} onChange={(event) => updateFilters({ storeId: event.target.value })}>
                <option value="">All stores</option>
                {stores.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.name}
                  </option>
                ))}
              </Select>
              <Select value={filters.game} onChange={(event) => updateFilters({ game: event.target.value })}>
                <option value="">All games</option>
                {gameOptions.map((game) => (
                  <option key={game}>{game}</option>
                ))}
              </Select>
              <Select value={filters.stockStatus} onChange={(event) => updateFilters({ stockStatus: event.target.value })}>
                <option value="">All stock states</option>
                {stockOptions.map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </Select>
              <Input placeholder="Category" value={filters.category} onChange={(event) => updateFilters({ category: event.target.value })} />
              <Input type="number" min={0} placeholder="Min price" value={filters.minPrice} onChange={(event) => updateFilters({ minPrice: event.target.value })} />
              <Input type="number" min={0} placeholder="Max price" value={filters.maxPrice} onChange={(event) => updateFilters({ maxPrice: event.target.value })} />
              <Input type="date" value={filters.foundFrom} onChange={(event) => updateFilters({ foundFrom: event.target.value })} />
              <Input type="date" value={filters.foundTo} onChange={(event) => updateFilters({ foundTo: event.target.value })} />
              <Select value={filters.sortBy} onChange={(event) => updateFilters({ sortBy: event.target.value })}>
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    Sort: {option.label}
                  </option>
                ))}
              </Select>
              <Select value={filters.sortOrder} onChange={(event) => updateFilters({ sortOrder: event.target.value })}>
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </Select>
              <label className="flex h-9 items-center gap-2 rounded-md border border-border bg-background px-3 text-sm">
                <input type="checkbox" checked={filters.includeIgnored} onChange={(event) => updateFilters({ includeIgnored: event.target.checked })} />
                Include ignored
              </label>
            </div>

            {message ? <div className="rounded-md border border-border bg-muted p-3 text-sm text-muted-foreground">{message}</div> : null}
            {error ? <ErrorState message={error} onRetry={loadProducts} /> : null}
            {loading ? <LoadingState label="Loading products..." /> : null}

            {!loading && !error ? (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1120px] border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-muted-foreground">
                        {[
                          ["title", "Product"],
                          ["store", "Store"],
                          ["game", "Game"],
                          ["category", "Category"],
                          ["price", "Price"],
                          ["stockStatus", "Status"],
                          ["lastSeenAt", "Last seen"]
                        ].map(([field, label]) => (
                          <th key={field} className="py-3 pr-4 font-medium">
                            <button type="button" className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => field !== "store" && toggleSort(field)} disabled={field === "store"}>
                              {label}
                              {field !== "store" ? <ArrowDownUp size={13} aria-hidden /> : null}
                            </button>
                          </th>
                        ))}
                        <th className="py-3 text-right font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.map((product) => (
                        <tr key={product.id} className="border-b border-border/60 align-top">
                          <td className="py-3 pr-4">
                            <div className="flex items-center gap-3">
                              {product.imageUrl ? (
                                <img className="h-12 w-12 rounded-md border border-border object-cover" src={product.imageUrl} alt="" />
                              ) : (
                                <div className="h-12 w-12 rounded-md border border-border bg-muted" />
                              )}
                              <div className="min-w-0">
                                <div className="max-w-lg font-medium">{product.title}</div>
                                <div className="break-all text-xs text-muted-foreground">{product.sku ?? product.ean ?? product.url}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 pr-4 text-muted-foreground">{product.store.name}</td>
                          <td className="py-3 pr-4">
                            <Badge tone="info">{product.game}</Badge>
                          </td>
                          <td className="py-3 pr-4">{product.category ?? "-"}</td>
                          <td className="py-3 pr-4">
                            <div>{formatMoney(product.price, product.currency)}</div>
                            <div className="text-xs text-muted-foreground">Previous: {formatMoney(product.previousPrice, product.currency)}</div>
                          </td>
                          <td className="py-3 pr-4">
                            <div className="flex flex-wrap gap-1">
                              <Badge tone={stockTone(product.stockStatus)}>{product.stockStatus}</Badge>
                              {product.isPreorder ? <Badge tone="warning">PREORDER FLAG</Badge> : null}
                              {product.isAvailable ? <Badge tone="success">AVAILABLE</Badge> : null}
                              {product.ignored ? <Badge tone="default">IGNORED</Badge> : null}
                            </div>
                          </td>
                          <td className="py-3 pr-4 text-muted-foreground">
                            <div>{formatDateTime(product.lastSeenAt)}</div>
                            <div className="text-xs">First: {formatDateTime(product.firstSeenAt)}</div>
                          </td>
                          <td className="py-3 text-right">
                            <div className="flex justify-end gap-2">
                              <Button type="button" variant="secondary" onClick={() => window.open(product.url, "_blank", "noopener,noreferrer")} aria-label="Open product">
                                <ExternalLink size={16} aria-hidden />
                              </Button>
                              {product.store.publicCartUrl ? (
                                <Button type="button" variant="secondary" onClick={() => window.open(product.store.publicCartUrl!, "_blank", "noopener,noreferrer")}>
                                  <ShoppingCart size={16} aria-hidden />
                                  Cart
                                </Button>
                              ) : null}
                              <Button type="button" variant="secondary" onClick={() => productAction(`/api/products/${product.id}/test-alert`, "Test alert queued.")}>
                                <Send size={16} aria-hidden />
                                Test
                              </Button>
                              {product.ignored ? (
                                <Button type="button" variant="ghost" onClick={() => productAction(`/api/products/${product.id}/unignore`, "Product restored.")}>
                                  <RotateCcw size={16} aria-hidden />
                                  Restore
                                </Button>
                              ) : (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  onClick={() => {
                                    if (window.confirm(`Ignore "${product.title}"? It will be hidden from the default catalog view.`)) {
                                      productAction(`/api/products/${product.id}/ignore`, "Product ignored.", { reason: "Ignored from admin dashboard" });
                                    }
                                  }}
                                >
                                  <XCircle size={16} aria-hidden />
                                  Ignore
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {products.length === 0 ? <EmptyState title="No products match these filters" detail="Try broadening the filters or run a manual scan from Stores." /> : null}
                <Pagination meta={meta} onPageChange={(page) => setFilters((current) => ({ ...current, page }))} />
              </>
            ) : null}
          </CardContent>
        </Card>
      </AuthGate>
    </>
  );
}
