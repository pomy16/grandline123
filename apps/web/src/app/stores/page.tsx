"use client";

import { useEffect, useMemo, useState } from "react";
import { Pause, Play, Plus, RefreshCw, Save, Trash2 } from "lucide-react";
import { AuthGate } from "../../components/auth-gate";
import { PageHeader } from "../../components/page-header";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { apiFetch } from "../../lib/api-client";

type StoreRecord = {
  id: string;
  name: string;
  baseUrl: string;
  listingUrls: string[];
  apiEndpoint?: string | null;
  mode: string;
  pollingIntervalSeconds: number;
  currency: string;
  country?: string | null;
  language?: string | null;
  active: boolean;
  trusted: boolean;
  notes?: string | null;
  publicCartUrl?: string | null;
  lastScanAt?: string | null;
  nextScanAt?: string | null;
  lastError?: string | null;
  averageScanDurationMs?: number | null;
  _count?: { products: number };
};

const emptyForm = {
  name: "",
  baseUrl: "https://example.invalid",
  listingUrls: "https://example.invalid/products",
  apiEndpoint: "",
  mode: "MOCK",
  pollingIntervalSeconds: 300,
  currency: "EUR",
  country: "CZ",
  language: "en",
  active: false,
  trusted: false,
  publicCartUrl: "",
  notes: "",
  requestHeaders: "{}",
  selectorProductUrl: "",
  selectorTitle: "",
  selectorPrice: "",
  selectorImage: "",
  selectorStockStatus: "",
  selectorPreorderStatus: ""
};

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleString() : "-";
}

export default function StoresPage() {
  const [stores, setStores] = useState<StoreRecord[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const selectedStore = useMemo(() => stores.find((store) => store.id === editingId), [editingId, stores]);

  async function loadStores() {
    setLoading(true);
    const payload = await apiFetch<{ data: StoreRecord[] }>("/api/stores");
    setStores(payload.data);
    setLoading(false);
  }

  useEffect(() => {
    loadStores().catch((error) => {
      setMessage(error instanceof Error ? error.message : "Failed to load stores.");
      setLoading(false);
    });
  }, []);

  function startEdit(store: StoreRecord) {
    setEditingId(store.id);
    setForm({
      ...emptyForm,
      name: store.name,
      baseUrl: store.baseUrl,
      listingUrls: store.listingUrls.join("\n"),
      apiEndpoint: store.apiEndpoint ?? "",
      mode: store.mode,
      pollingIntervalSeconds: store.pollingIntervalSeconds,
      currency: store.currency,
      country: store.country ?? "",
      language: store.language ?? "",
      active: store.active,
      trusted: store.trusted,
      publicCartUrl: store.publicCartUrl ?? "",
      notes: store.notes ?? ""
    });
  }

  async function saveStore(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    let requestHeaders: Record<string, string> | undefined;
    try {
      requestHeaders = form.requestHeaders.trim() ? JSON.parse(form.requestHeaders) : undefined;
    } catch {
      setMessage("Request headers must be valid JSON.");
      return;
    }

    const payload = {
      ...form,
      pollingIntervalSeconds: Number(form.pollingIntervalSeconds),
      listingUrls: form.listingUrls,
      requestHeaders
    };

    await apiFetch(editingId ? `/api/stores/${editingId}` : "/api/stores", {
      method: editingId ? "PATCH" : "POST",
      body: JSON.stringify(payload)
    });
    setMessage(editingId ? "Store updated." : "Store created.");
    setEditingId(null);
    setForm(emptyForm);
    await loadStores();
  }

  async function action(path: string, success: string, method = "POST") {
    await apiFetch(path, { method });
    setMessage(success);
    await loadStores();
  }

  return (
    <>
      <PageHeader title="Stores" description="Add, edit, pause, resume, delete, and manually scan monitored stores." />
      <AuthGate>
        <div className="grid gap-4 xl:grid-cols-[420px_1fr]">
          <Card>
            <CardHeader>
              <CardTitle>{editingId ? `Edit ${selectedStore?.name ?? "store"}` : "Add store"}</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-3" onSubmit={saveStore}>
                <Input required placeholder="Store name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
                <Input required placeholder="Base URL" value={form.baseUrl} onChange={(event) => setForm({ ...form, baseUrl: event.target.value })} />
                <textarea
                  className="min-h-20 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Listing URLs, one per line"
                  value={form.listingUrls}
                  onChange={(event) => setForm({ ...form, listingUrls: event.target.value })}
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <select className="h-9 rounded-md border border-border bg-background px-3 text-sm" value={form.mode} onChange={(event) => setForm({ ...form, mode: event.target.value })}>
                    {["MOCK", "API", "SITEMAP", "RSS", "HTML", "PLAYWRIGHT"].map((mode) => (
                      <option key={mode}>{mode}</option>
                    ))}
                  </select>
                  <Input type="number" min={60} placeholder="Polling seconds" value={form.pollingIntervalSeconds} onChange={(event) => setForm({ ...form, pollingIntervalSeconds: Number(event.target.value) })} />
                  <Input placeholder="Currency" value={form.currency} onChange={(event) => setForm({ ...form, currency: event.target.value })} />
                  <Input placeholder="Country" value={form.country} onChange={(event) => setForm({ ...form, country: event.target.value })} />
                  <Input placeholder="Language" value={form.language} onChange={(event) => setForm({ ...form, language: event.target.value })} />
                  <Input placeholder="API endpoint" value={form.apiEndpoint} onChange={(event) => setForm({ ...form, apiEndpoint: event.target.value })} />
                </div>
                <Input placeholder="Public cart URL" value={form.publicCartUrl} onChange={(event) => setForm({ ...form, publicCartUrl: event.target.value })} />
                <textarea
                  className="min-h-20 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                  placeholder='Request headers JSON, for example {"accept":"application/json"}'
                  value={form.requestHeaders}
                  onChange={(event) => setForm({ ...form, requestHeaders: event.target.value })}
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input placeholder="Product URL selector" value={form.selectorProductUrl} onChange={(event) => setForm({ ...form, selectorProductUrl: event.target.value })} />
                  <Input placeholder="Title selector" value={form.selectorTitle} onChange={(event) => setForm({ ...form, selectorTitle: event.target.value })} />
                  <Input placeholder="Price selector" value={form.selectorPrice} onChange={(event) => setForm({ ...form, selectorPrice: event.target.value })} />
                  <Input placeholder="Image selector" value={form.selectorImage} onChange={(event) => setForm({ ...form, selectorImage: event.target.value })} />
                  <Input placeholder="Stock selector" value={form.selectorStockStatus} onChange={(event) => setForm({ ...form, selectorStockStatus: event.target.value })} />
                  <Input placeholder="Preorder selector" value={form.selectorPreorderStatus} onChange={(event) => setForm({ ...form, selectorPreorderStatus: event.target.value })} />
                </div>
                <textarea
                  className="min-h-20 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Custom notes"
                  value={form.notes}
                  onChange={(event) => setForm({ ...form, notes: event.target.value })}
                />
                <div className="flex flex-wrap gap-4 text-sm">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} />
                    Active
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={form.trusted} onChange={(event) => setForm({ ...form, trusted: event.target.checked })} />
                    Trusted
                  </label>
                </div>
                <div className="flex gap-2">
                  <Button>
                    <Save size={16} aria-hidden />
                    {editingId ? "Save" : "Create"}
                  </Button>
                  {editingId ? (
                    <Button type="button" variant="ghost" onClick={() => { setEditingId(null); setForm(emptyForm); }}>
                      Cancel
                    </Button>
                  ) : null}
                </div>
              </form>
              {message ? <div className="mt-4 rounded-md border border-border bg-muted p-3 text-sm text-muted-foreground">{message}</div> : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle>Configured stores</CardTitle>
                <Button type="button" variant="secondary" onClick={() => { setEditingId(null); setForm(emptyForm); }}>
                  <Plus size={16} aria-hidden />
                  New
                </Button>
              </div>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {loading ? <div className="text-sm text-muted-foreground">Loading stores...</div> : null}
              <table className="w-full min-w-[960px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="py-3 pr-4 font-medium">Store</th>
                    <th className="py-3 pr-4 font-medium">Mode</th>
                    <th className="py-3 pr-4 font-medium">Status</th>
                    <th className="py-3 pr-4 font-medium">Last scan</th>
                    <th className="py-3 pr-4 font-medium">Next scan</th>
                    <th className="py-3 pr-4 font-medium">Last error</th>
                    <th className="py-3 pr-4 font-medium">Products</th>
                    <th className="py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {stores.map((store) => (
                    <tr key={store.id} className="border-b border-border/60">
                      <td className="py-3 pr-4">
                        <button type="button" className="text-left font-medium hover:text-primary" onClick={() => startEdit(store)}>
                          {store.name}
                        </button>
                        <div className="text-xs text-muted-foreground">{store.baseUrl}</div>
                      </td>
                      <td className="py-3 pr-4">{store.mode}</td>
                      <td className="py-3 pr-4">
                        <Badge tone={store.active ? "success" : "default"}>{store.active ? "Active" : "Paused"}</Badge>
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">{formatDate(store.lastScanAt)}</td>
                      <td className="py-3 pr-4 text-muted-foreground">{formatDate(store.nextScanAt)}</td>
                      <td className="max-w-52 truncate py-3 pr-4 text-muted-foreground">{store.lastError ?? "-"}</td>
                      <td className="py-3 pr-4">{store._count?.products ?? 0}</td>
                      <td className="py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Button type="button" variant="secondary" onClick={() => action(`/api/stores/${store.id}/scan`, "Mock scan queued.")}>
                            <RefreshCw size={16} aria-hidden />
                            Scan
                          </Button>
                          <Button type="button" variant="ghost" onClick={() => action(`/api/stores/${store.id}/${store.active ? "pause" : "resume"}`, store.active ? "Store paused." : "Store resumed.")}>
                            {store.active ? <Pause size={16} aria-hidden /> : <Play size={16} aria-hidden />}
                            {store.active ? "Pause" : "Resume"}
                          </Button>
                          <Button type="button" variant="ghost" onClick={() => startEdit(store)}>Edit</Button>
                          <Button type="button" variant="destructive" onClick={() => action(`/api/stores/${store.id}`, "Store deleted.", "DELETE")}>
                            <Trash2 size={16} aria-hidden />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      </AuthGate>
    </>
  );
}
