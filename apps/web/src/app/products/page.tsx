"use client";

import { useEffect, useMemo, useState } from "react";
import { ExternalLink, RefreshCw, Search, Send, XCircle } from "lucide-react";
import { AuthGate } from "../../components/auth-gate";
import { PageHeader } from "../../components/page-header";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { apiFetch } from "../../lib/api-client";

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
  store: { id: string; name: string };
};

type StoreRecord = { id: string; name: string };

const stockTone = (status: string) => {
  if (status === "IN_STOCK") return "success";
  if (status === "PREORDER") return "warning";
  if (status === "OUT_OF_STOCK") return "danger";
  return "default";
};

export default function ProductsPage() {
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [stores, setStores] = useState<StoreRecord[]>([]);
  const [filters, setFilters] = useState({ q: "", storeId: "", game: "", stockStatus: "", category: "", minPrice: "", maxPrice: "", foundFrom: "", foundTo: "" });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    return params.toString();
  }, [filters]);

  async function loadProducts() {
    setLoading(true);
    const [productPayload, storePayload] = await Promise.all([
      apiFetch<{ data: ProductRecord[] }>(`/api/products${query ? `?${query}` : ""}`),
      apiFetch<{ data: StoreRecord[] }>("/api/stores")
    ]);
    setProducts(productPayload.data);
    setStores(storePayload.data);
    setLoading(false);
  }

  useEffect(() => {
    loadProducts().catch((error) => {
      setMessage(error instanceof Error ? error.message : "Failed to load products.");
      setLoading(false);
    });
  }, [query]);

  async function productAction(path: string, success: string) {
    await apiFetch(path, { method: "POST", body: JSON.stringify({}) });
    setMessage(success);
    await loadProducts();
  }

  return (
    <>
      <PageHeader title="Products" description="Search products by store, game, category, stock status, price, and discovery date." />
      <AuthGate>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle>Product catalog</CardTitle>
              <Button type="button" variant="secondary" onClick={loadProducts}>
                <RefreshCw size={16} aria-hidden />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4 grid gap-3 lg:grid-cols-4">
              <div className="relative lg:col-span-2">
                <Search className="pointer-events-none absolute left-3 top-2.5 text-muted-foreground" size={16} aria-hidden />
                <Input className="pl-9" placeholder="Search title, SKU, EAN, category" value={filters.q} onChange={(event) => setFilters({ ...filters, q: event.target.value })} />
              </div>
              <select className="h-9 rounded-md border border-border bg-background px-3 text-sm" value={filters.storeId} onChange={(event) => setFilters({ ...filters, storeId: event.target.value })}>
                <option value="">All stores</option>
                {stores.map((store) => (
                  <option key={store.id} value={store.id}>{store.name}</option>
                ))}
              </select>
              <select className="h-9 rounded-md border border-border bg-background px-3 text-sm" value={filters.game} onChange={(event) => setFilters({ ...filters, game: event.target.value })}>
                <option value="">All games</option>
                {["POKEMON", "ONE_PIECE", "BOTH", "UNKNOWN"].map((game) => (
                  <option key={game}>{game}</option>
                ))}
              </select>
              <select className="h-9 rounded-md border border-border bg-background px-3 text-sm" value={filters.stockStatus} onChange={(event) => setFilters({ ...filters, stockStatus: event.target.value })}>
                <option value="">All stock states</option>
                {["IN_STOCK", "OUT_OF_STOCK", "PREORDER", "UNKNOWN"].map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
              <Input placeholder="Category" value={filters.category} onChange={(event) => setFilters({ ...filters, category: event.target.value })} />
              <Input type="number" placeholder="Min price" value={filters.minPrice} onChange={(event) => setFilters({ ...filters, minPrice: event.target.value })} />
              <Input type="number" placeholder="Max price" value={filters.maxPrice} onChange={(event) => setFilters({ ...filters, maxPrice: event.target.value })} />
              <Input type="date" value={filters.foundFrom} onChange={(event) => setFilters({ ...filters, foundFrom: event.target.value })} />
            </div>
            {message ? <div className="mb-4 rounded-md border border-border bg-muted p-3 text-sm text-muted-foreground">{message}</div> : null}
            {loading ? <div className="text-sm text-muted-foreground">Loading products...</div> : null}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1060px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="py-3 pr-4 font-medium">Product</th>
                    <th className="py-3 pr-4 font-medium">Store</th>
                    <th className="py-3 pr-4 font-medium">Game</th>
                    <th className="py-3 pr-4 font-medium">Category</th>
                    <th className="py-3 pr-4 font-medium">Price</th>
                    <th className="py-3 pr-4 font-medium">Previous</th>
                    <th className="py-3 pr-4 font-medium">Status</th>
                    <th className="py-3 pr-4 font-medium">Last seen</th>
                    <th className="py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product.id} className="border-b border-border/60">
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-3">
                          {product.imageUrl ? <img className="h-12 w-12 rounded-md border border-border object-cover" src={product.imageUrl} alt="" /> : <div className="h-12 w-12 rounded-md border border-border bg-muted" />}
                          <div>
                            <div className="font-medium">{product.title}</div>
                            <div className="text-xs text-muted-foreground">{product.sku ?? product.ean ?? product.url}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">{product.store.name}</td>
                      <td className="py-3 pr-4">
                        <Badge tone="info">{product.game}</Badge>
                      </td>
                      <td className="py-3 pr-4">{product.category ?? "-"}</td>
                      <td className="py-3 pr-4">{product.price ? `${product.price} ${product.currency}` : "-"}</td>
                      <td className="py-3 pr-4 text-muted-foreground">{product.previousPrice ? `${product.previousPrice} ${product.currency}` : "-"}</td>
                      <td className="py-3 pr-4">
                        <Badge tone={stockTone(product.stockStatus)}>{product.stockStatus}</Badge>
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">{new Date(product.lastSeenAt).toLocaleString()}</td>
                      <td className="py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Button type="button" variant="secondary" onClick={() => window.open(product.url, "_blank", "noopener,noreferrer")}>
                            <ExternalLink size={16} aria-hidden />
                          </Button>
                          <Button type="button" variant="secondary" onClick={() => productAction(`/api/products/${product.id}/test-alert`, "Test alert queued.")}>
                            <Send size={16} aria-hidden />
                          </Button>
                          <Button type="button" variant="ghost" onClick={() => productAction(`/api/products/${product.id}/ignore`, "Product ignored.")}>
                            <XCircle size={16} aria-hidden />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {products.length === 0 && !loading ? <div className="py-8 text-center text-sm text-muted-foreground">No products found. Run a mock scan from Stores.</div> : null}
            </div>
          </CardContent>
        </Card>
      </AuthGate>
    </>
  );
}
