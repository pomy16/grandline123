"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowDownUp, CheckCircle2, Pause, Play, Plus, RefreshCw, Save, Search, Trash2, XCircle } from "lucide-react";
import { AuthGate } from "../../components/auth-gate";
import { PageHeader } from "../../components/page-header";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { EmptyState, ErrorState, FieldError, LoadingState } from "../../components/ui/data-state";
import { Select, Textarea } from "../../components/ui/form-controls";
import { Input } from "../../components/ui/input";
import { Pagination } from "../../components/ui/pagination";
import { apiFetch } from "../../lib/api-client";
import { formatDateTime, formatDuration, truncateMiddle, type PageMeta } from "../../lib/format";

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
  discordWebhookId?: string | null;
  discordWebhook?: DiscordWebhook | null;
  requestHeaders?: Record<string, string> | null;
  selectorProductUrl?: string | null;
  selectorTitle?: string | null;
  selectorPrice?: string | null;
  selectorImage?: string | null;
  selectorStockStatus?: string | null;
  selectorPreorderStatus?: string | null;
  lastScanAt?: string | null;
  nextScanAt?: string | null;
  lastError?: string | null;
  repeatedFailureCount: number;
  autoPausedAfterFailures: boolean;
  averageScanDurationMs?: number | null;
  sourceCandidates?: SourceCandidate[];
  _count?: { products: number; scanJobs?: number; sourceCandidates?: number };
};

type DiscordWebhook = {
  id: string;
  name: string;
  target: string;
  active: boolean;
};

type ScanJob = {
  id: string;
  status: string;
  productsFound: number;
  eventsCreated: number;
  durationMs?: number | null;
  error?: string | null;
  createdAt: string;
  startedAt?: string | null;
  finishedAt?: string | null;
  store?: { name: string } | null;
};

type SourceCandidate = {
  id: string;
  url: string;
  kind: string;
  monitorMode: string;
  status: string;
  productsFound: number;
  reason?: string | null;
  discoveredFrom?: string | null;
  lastCheckedAt?: string | null;
  promotedAt?: string | null;
};

type StoreDetail = StoreRecord & {
  products: Array<{ id: string; title: string; stockStatus: string; lastSeenAt: string }>;
  scanJobs: ScanJob[];
  sourceCandidates: SourceCandidate[];
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
  discordWebhookId: "",
  notes: "",
  requestHeaders: "{}",
  selectorProductUrl: "",
  selectorTitle: "",
  selectorPrice: "",
  selectorImage: "",
  selectorStockStatus: "",
  selectorPreorderStatus: ""
};

const defaultMeta: PageMeta = { page: 1, pageSize: 20, total: 0, totalPages: 1 };
const modeOptions = ["MOCK", "API", "SITEMAP", "RSS", "HTML", "PLAYWRIGHT"];
const sortOptions = [
  { value: "createdAt", label: "Created" },
  { value: "name", label: "Name" },
  { value: "mode", label: "Mode" },
  { value: "active", label: "Status" },
  { value: "lastScanAt", label: "Last scan" },
  { value: "nextScanAt", label: "Next scan" },
  { value: "repeatedFailureCount", label: "Failures" }
];

function validateUrl(value: string, label: string, required = true) {
  if (!value.trim()) return required ? `${label} is required.` : undefined;
  try {
    const parsed = new URL(value);
    if (!["http:", "https:"].includes(parsed.protocol)) return `${label} must use http or https.`;
    return undefined;
  } catch {
    return `${label} must be a valid URL.`;
  }
}

function storeStatus(store: StoreRecord) {
  if (store.lastError || store.repeatedFailureCount > 0) return { label: "Needs attention", tone: "danger" as const };
  if (store.autoPausedAfterFailures) return { label: "Auto-paused", tone: "warning" as const };
  if (store.sourceCandidates?.some((candidate) => candidate.status === "ACTIVE")) return { label: "Active", tone: "success" as const };
  if (store.sourceCandidates?.some((candidate) => candidate.status === "NEEDS_ATTENTION")) return { label: "Needs attention", tone: "warning" as const };
  if (store.sourceCandidates && store.sourceCandidates.length > 0 && store.sourceCandidates.every((candidate) => candidate.status === "EMPTY")) return { label: "Empty", tone: "default" as const };
  if (store.active) return { label: "Active", tone: "success" as const };
  return { label: "Paused", tone: "default" as const };
}

function candidateTone(status: string) {
  if (status === "ACTIVE") return "success" as const;
  if (status === "NEEDS_ATTENTION") return "warning" as const;
  if (status === "EMPTY") return "default" as const;
  return "info" as const;
}

export default function StoresPage() {
  const [stores, setStores] = useState<StoreRecord[]>([]);
  const [webhooks, setWebhooks] = useState<DiscordWebhook[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filters, setFilters] = useState({ q: "", status: "", mode: "", sortBy: "createdAt", sortOrder: "desc", page: 1, pageSize: 20 });
  const [meta, setMeta] = useState<PageMeta>(defaultMeta);
  const [selectedDetail, setSelectedDetail] = useState<StoreDetail | null>(null);
  const [scanResult, setScanResult] = useState<{ storeName: string; scanJob: ScanJob; queueJobId: string | number } | null>(null);
  const [discoveryResult, setDiscoveryResult] = useState<{ storeName: string; scanJob: ScanJob; queueJobId: string | number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const selectedStore = useMemo(() => stores.find((store) => store.id === editingId), [editingId, stores]);

  const formErrors = useMemo(() => {
    const errors: Record<string, string | undefined> = {
      name: form.name.trim() ? undefined : "Store name is required.",
      baseUrl: validateUrl(form.baseUrl, "Base URL"),
      listingUrls: form.listingUrls
        .split(/\n|,/)
        .map((url) => url.trim())
        .filter(Boolean)
        .some((url) => validateUrl(url, "Listing URL"))
        ? "Every listing URL must be a valid http(s) URL."
        : undefined,
      apiEndpoint: validateUrl(form.apiEndpoint, "API endpoint", false),
      publicCartUrl: validateUrl(form.publicCartUrl, "Public cart URL", false),
      pollingIntervalSeconds: Number(form.pollingIntervalSeconds) >= 60 ? undefined : "Polling interval must be at least 60 seconds.",
      currency: /^[A-Za-z]{3}$/.test(form.currency) ? undefined : "Currency must be a 3-letter code."
    };
    try {
      const parsed = form.requestHeaders.trim() ? JSON.parse(form.requestHeaders) : {};
      if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") errors.requestHeaders = "Request headers must be a JSON object.";
    } catch {
      errors.requestHeaders = "Request headers must be valid JSON.";
    }
    return errors;
  }, [form]);

  const hasFormErrors = Object.values(formErrors).some(Boolean);

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

  async function loadStores() {
    setLoading(true);
    setError(null);
    try {
      const [payload, settingsPayload] = await Promise.all([
        apiFetch<{ data: StoreRecord[]; meta?: PageMeta }>(`/api/stores?${query}`),
        apiFetch<{ data: { webhooks: DiscordWebhook[] } }>("/api/settings")
      ]);
      setStores(payload.data);
      setMeta(payload.meta ?? { ...defaultMeta, total: payload.data.length });
      setWebhooks(settingsPayload.data.webhooks);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load stores.");
    } finally {
      setLoading(false);
    }
  }

  async function loadStoreDetail(storeId: string) {
    setDetailLoading(true);
    setError(null);
    try {
      const payload = await apiFetch<{ data: StoreDetail }>(`/api/stores/${storeId}`);
      setSelectedDetail(payload.data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load store detail.");
    } finally {
      setDetailLoading(false);
    }
  }

  useEffect(() => {
    loadStores();
  }, [query]);

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
      discordWebhookId: store.discordWebhookId ?? "",
      notes: store.notes ?? "",
      requestHeaders: store.requestHeaders ? JSON.stringify(store.requestHeaders, null, 2) : "{}",
      selectorProductUrl: store.selectorProductUrl ?? "",
      selectorTitle: store.selectorTitle ?? "",
      selectorPrice: store.selectorPrice ?? "",
      selectorImage: store.selectorImage ?? "",
      selectorStockStatus: store.selectorStockStatus ?? "",
      selectorPreorderStatus: store.selectorPreorderStatus ?? ""
    });
    loadStoreDetail(store.id);
  }

  async function saveStore(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);
    if (hasFormErrors) {
      setError("Please fix the highlighted form fields before saving.");
      return;
    }
    setSaving(true);
    try {
      const requestHeaders = form.requestHeaders.trim() ? JSON.parse(form.requestHeaders) : undefined;
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
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Store save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function action(path: string, success: string, method = "POST") {
    setMessage(null);
    setError(null);
    try {
      await apiFetch(path, { method });
      setMessage(success);
      await loadStores();
      if (selectedDetail) await loadStoreDetail(selectedDetail.id);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Store action failed.");
    }
  }

  async function scanStore(store: StoreRecord) {
    setMessage(null);
    setError(null);
    try {
      const payload = await apiFetch<{ data: { scanJob: ScanJob; queueJobId: string | number } }>(`/api/stores/${store.id}/scan`, { method: "POST" });
      setScanResult({ storeName: store.name, ...payload.data });
      setMessage(`Manual scan queued for ${store.name}.`);
      await Promise.all([loadStores(), loadStoreDetail(store.id)]);
    } catch (scanError) {
      setError(scanError instanceof Error ? scanError.message : "Manual scan could not be queued.");
    }
  }

  async function discoverStore(store: StoreRecord) {
    setMessage(null);
    setError(null);
    try {
      const payload = await apiFetch<{ data: { scanJob: ScanJob; queueJobId: string | number } }>(`/api/stores/${store.id}/discover`, { method: "POST" });
      setDiscoveryResult({ storeName: store.name, ...payload.data });
      setMessage(`Discovery scan queued for ${store.name}.`);
      await Promise.all([loadStores(), loadStoreDetail(store.id)]);
    } catch (discoveryError) {
      setError(discoveryError instanceof Error ? discoveryError.message : "Discovery scan could not be queued.");
    }
  }

  async function promoteCandidate(storeId: string, candidateId: string) {
    setMessage(null);
    setError(null);
    try {
      await apiFetch(`/api/stores/${storeId}/source-candidates/${candidateId}/promote`, { method: "POST" });
      setMessage("Source candidate promoted to primary source.");
      await Promise.all([loadStores(), loadStoreDetail(storeId)]);
    } catch (promoteError) {
      setError(promoteError instanceof Error ? promoteError.message : "Source candidate could not be promoted.");
    }
  }

  function toggleSort(field: string) {
    setFilters((current) => ({ ...current, sortBy: field, sortOrder: current.sortBy === field && current.sortOrder === "asc" ? "desc" : "asc", page: 1 }));
  }

  return (
    <>
      <PageHeader title="Stores" description="Add, edit, pause, resume, delete, and manually scan monitored stores." />
      <AuthGate>
        <div className="grid gap-4 xl:grid-cols-[430px_1fr]">
          <Card>
            <CardHeader>
              <CardTitle>{editingId ? `Edit ${selectedStore?.name ?? "store"}` : "Add store"}</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-3" onSubmit={saveStore}>
                <div>
                  <Input required placeholder="Store name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
                  <FieldError message={formErrors.name} />
                </div>
                <div>
                  <Input required placeholder="Base URL" value={form.baseUrl} onChange={(event) => setForm({ ...form, baseUrl: event.target.value })} />
                  <FieldError message={formErrors.baseUrl} />
                </div>
                <div>
                  <Textarea
                    className="min-h-20"
                    placeholder="Listing URLs, one per line"
                    value={form.listingUrls}
                    onChange={(event) => setForm({ ...form, listingUrls: event.target.value })}
                  />
                  <FieldError message={formErrors.listingUrls} />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Select value={form.mode} onChange={(event) => setForm({ ...form, mode: event.target.value })}>
                    {modeOptions.map((mode) => (
                      <option key={mode}>{mode}</option>
                    ))}
                  </Select>
                  <div>
                    <Input type="number" min={60} placeholder="Polling seconds" value={form.pollingIntervalSeconds} onChange={(event) => setForm({ ...form, pollingIntervalSeconds: Number(event.target.value) })} />
                    <FieldError message={formErrors.pollingIntervalSeconds} />
                  </div>
                  <div>
                    <Input placeholder="Currency" value={form.currency} onChange={(event) => setForm({ ...form, currency: event.target.value.toUpperCase() })} />
                    <FieldError message={formErrors.currency} />
                  </div>
                  <Input placeholder="Country" value={form.country} onChange={(event) => setForm({ ...form, country: event.target.value })} />
                  <Input placeholder="Language" value={form.language} onChange={(event) => setForm({ ...form, language: event.target.value })} />
                  <div>
                    <Input placeholder="API endpoint" value={form.apiEndpoint} onChange={(event) => setForm({ ...form, apiEndpoint: event.target.value })} />
                    <FieldError message={formErrors.apiEndpoint} />
                  </div>
                </div>
                <div>
                  <Input placeholder="Public cart URL" value={form.publicCartUrl} onChange={(event) => setForm({ ...form, publicCartUrl: event.target.value })} />
                  <FieldError message={formErrors.publicCartUrl} />
                </div>
                <Select value={form.discordWebhookId} onChange={(event) => setForm({ ...form, discordWebhookId: event.target.value })}>
                  <option value="">No store-specific Discord webhook</option>
                  {webhooks.map((webhook) => (
                    <option key={webhook.id} value={webhook.id}>
                      {webhook.name} ({webhook.target}{webhook.active ? "" : ", paused"})
                    </option>
                  ))}
                </Select>
                <div className="text-xs text-muted-foreground">Purchase assist only: alerts can route to this store webhook, but checkout remains manual.</div>
                <div>
                  <Textarea
                    className="min-h-20 font-mono"
                    placeholder='Request headers JSON, for example {"accept":"application/json"}'
                    value={form.requestHeaders}
                    onChange={(event) => setForm({ ...form, requestHeaders: event.target.value })}
                  />
                  <FieldError message={formErrors.requestHeaders} />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input placeholder="Product URL selector" value={form.selectorProductUrl} onChange={(event) => setForm({ ...form, selectorProductUrl: event.target.value })} />
                  <Input placeholder="Title selector" value={form.selectorTitle} onChange={(event) => setForm({ ...form, selectorTitle: event.target.value })} />
                  <Input placeholder="Price selector" value={form.selectorPrice} onChange={(event) => setForm({ ...form, selectorPrice: event.target.value })} />
                  <Input placeholder="Image selector" value={form.selectorImage} onChange={(event) => setForm({ ...form, selectorImage: event.target.value })} />
                  <Input placeholder="Stock selector" value={form.selectorStockStatus} onChange={(event) => setForm({ ...form, selectorStockStatus: event.target.value })} />
                  <Input placeholder="Preorder selector" value={form.selectorPreorderStatus} onChange={(event) => setForm({ ...form, selectorPreorderStatus: event.target.value })} />
                </div>
                <Textarea className="min-h-20" placeholder="Custom notes" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
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
                  <Button disabled={saving || hasFormErrors}>
                    <Save size={16} aria-hidden />
                    {editingId ? "Save" : "Create"}
                  </Button>
                  {editingId ? (
                    <Button type="button" variant="ghost" onClick={() => { setEditingId(null); setForm(emptyForm); setSelectedDetail(null); }}>
                      Cancel
                    </Button>
                  ) : null}
                </div>
              </form>
              {message ? <div className="mt-4 rounded-md border border-border bg-muted p-3 text-sm text-muted-foreground">{message}</div> : null}
              {error ? <div className="mt-4"><ErrorState message={error} /></div> : null}
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <CardTitle>Configured stores</CardTitle>
                  <Button type="button" variant="secondary" onClick={() => { setEditingId(null); setSelectedDetail(null); setForm(emptyForm); }}>
                    <Plus size={16} aria-hidden />
                    New
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 lg:grid-cols-5">
                  <Input className="lg:col-span-2" placeholder="Search store, URL, notes" value={filters.q} onChange={(event) => updateFilters({ q: event.target.value })} />
                  <Select value={filters.status} onChange={(event) => updateFilters({ status: event.target.value })}>
                    <option value="">All statuses</option>
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                    <option value="error">Needs attention</option>
                  </Select>
                  <Select value={filters.mode} onChange={(event) => updateFilters({ mode: event.target.value })}>
                    <option value="">All modes</option>
                    {modeOptions.map((mode) => (
                      <option key={mode}>{mode}</option>
                    ))}
                  </Select>
                  <Select value={filters.sortBy} onChange={(event) => updateFilters({ sortBy: event.target.value })}>
                    {sortOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        Sort: {option.label}
                      </option>
                    ))}
                  </Select>
                </div>
                {loading ? <LoadingState label="Loading stores..." /> : null}
                {!loading ? (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[1080px] text-sm">
                        <thead>
                          <tr className="border-b border-border text-left text-muted-foreground">
                            {[
                              ["name", "Store"],
                              ["mode", "Mode"],
                              ["active", "Status"],
                              ["lastScanAt", "Last scan"],
                              ["nextScanAt", "Next scan"],
                              ["webhook", "Webhook"],
                              ["repeatedFailureCount", "Last error"],
                              ["products", "Products"]
                            ].map(([field, label]) => (
                              <th key={field} className="py-3 pr-4 font-medium">
                                <button type="button" className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => !["products", "webhook"].includes(field) && toggleSort(field)} disabled={["products", "webhook"].includes(field)}>
                                  {label}
                                  {!["products", "webhook"].includes(field) ? <ArrowDownUp size={13} aria-hidden /> : null}
                                </button>
                              </th>
                            ))}
                            <th className="py-3 text-right font-medium">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stores.map((store) => {
                            const status = storeStatus(store);
                            return (
                              <tr key={store.id} className="border-b border-border/60 align-top">
                                <td className="py-3 pr-4">
                                  <button type="button" className="text-left font-medium hover:text-primary" onClick={() => startEdit(store)}>
                                    {store.name}
                                  </button>
                                  <div className="max-w-sm break-all text-xs text-muted-foreground">{store.baseUrl}</div>
                                </td>
                                <td className="py-3 pr-4">
                                  <Badge tone="info">{store.mode}</Badge>
                                </td>
                                <td className="py-3 pr-4">
                                  <div className="flex flex-wrap gap-1">
                                    <Badge tone={status.tone}>{status.label}</Badge>
                                    {store.trusted ? <Badge tone="success">Trusted</Badge> : null}
                                  </div>
                                  {store.averageScanDurationMs ? <div className="mt-1 text-xs text-muted-foreground">Avg {formatDuration(store.averageScanDurationMs)}</div> : null}
                                  {store._count?.sourceCandidates ? <div className="mt-1 text-xs text-muted-foreground">Candidates: {store._count.sourceCandidates}</div> : null}
                                </td>
                                <td className="py-3 pr-4 text-muted-foreground">{formatDateTime(store.lastScanAt)}</td>
                                <td className="py-3 pr-4 text-muted-foreground">{formatDateTime(store.nextScanAt)}</td>
                                <td className="py-3 pr-4">
                                  {store.discordWebhook ? (
                                    <div className="space-y-1">
                                      <div className="font-medium">{store.discordWebhook.name}</div>
                                      <Badge tone={store.discordWebhook.active ? "info" : "default"}>{store.discordWebhook.active ? store.discordWebhook.target : "Paused webhook"}</Badge>
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground">Fallback routing</span>
                                  )}
                                </td>
                                <td className="max-w-72 py-3 pr-4">
                                  {store.lastError ? (
                                    <div className="space-y-2">
                                      <div className="flex items-start gap-2 text-red-300">
                                        <AlertTriangle size={15} className="mt-0.5 shrink-0" aria-hidden />
                                        <span>{truncateMiddle(store.lastError, 110)}</span>
                                      </div>
                                      <Button type="button" variant="ghost" onClick={() => action(`/api/stores/${store.id}/clear-error`, "Store error cleared.")}>
                                        <CheckCircle2 size={16} aria-hidden />
                                        Clear
                                      </Button>
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground">-</span>
                                  )}
                                </td>
                                <td className="py-3 pr-4">{store._count?.products ?? 0}</td>
                                <td className="py-3 text-right">
                                  <div className="flex justify-end gap-2">
                                    <Button type="button" variant="secondary" onClick={() => scanStore(store)}>
                                      <RefreshCw size={16} aria-hidden />
                                      Scan
                                    </Button>
                                    <Button type="button" variant="secondary" onClick={() => discoverStore(store)}>
                                      <Search size={16} aria-hidden />
                                      Discover
                                    </Button>
                                    <Button type="button" variant="ghost" onClick={() => action(`/api/stores/${store.id}/${store.active ? "pause" : "resume"}`, store.active ? "Store paused." : "Store resumed.")}>
                                      {store.active ? <Pause size={16} aria-hidden /> : <Play size={16} aria-hidden />}
                                      {store.active ? "Pause" : "Resume"}
                                    </Button>
                                    <Button type="button" variant="ghost" onClick={() => startEdit(store)}>Edit</Button>
                                    <Button
                                      type="button"
                                      variant="destructive"
                                      onClick={() => {
                                        if (window.confirm(`Delete store "${store.name}" and its products/events?`)) {
                                          action(`/api/stores/${store.id}`, "Store deleted.", "DELETE");
                                        }
                                      }}
                                    >
                                      <Trash2 size={16} aria-hidden />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    {stores.length === 0 ? <EmptyState title="No stores match these filters" detail="Create a store or clear the current filters." /> : null}
                    <Pagination meta={meta} onPageChange={(page) => setFilters((current) => ({ ...current, page }))} />
                  </>
                ) : null}
              </CardContent>
            </Card>

            {scanResult ? (
              <Card>
                <CardHeader>
                  <CardTitle>Scan result viewer</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 text-sm md:grid-cols-4">
                  <div>
                    <div className="text-muted-foreground">Store</div>
                    <div className="font-medium">{scanResult.storeName}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Status</div>
                    <Badge tone="warning">{scanResult.scanJob.status}</Badge>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Scan job</div>
                    <div className="font-mono text-xs">{scanResult.scanJob.id}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Queue job</div>
                    <div className="font-mono text-xs">{scanResult.queueJobId}</div>
                  </div>
                </CardContent>
              </Card>
            ) : null}

            {discoveryResult ? (
              <Card>
                <CardHeader>
                  <CardTitle>Discovery scan queued</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 text-sm md:grid-cols-4">
                  <div>
                    <div className="text-muted-foreground">Store</div>
                    <div className="font-medium">{discoveryResult.storeName}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Status</div>
                    <Badge tone="warning">{discoveryResult.scanJob.status}</Badge>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Discovery job</div>
                    <div className="font-mono text-xs">{discoveryResult.scanJob.id}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Queue job</div>
                    <div className="font-mono text-xs">{discoveryResult.queueJobId}</div>
                  </div>
                </CardContent>
              </Card>
            ) : null}

            {selectedDetail ? (
              <Card>
                <CardHeader>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <CardTitle>{selectedDetail.name} scan history</CardTitle>
                    <Button type="button" variant="secondary" onClick={() => loadStoreDetail(selectedDetail.id)} disabled={detailLoading}>
                      <RefreshCw size={16} className={detailLoading ? "animate-spin" : ""} aria-hidden />
                      Refresh
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {detailLoading ? <LoadingState label="Loading scan history..." /> : null}
                  {!detailLoading && selectedDetail.scanJobs.length === 0 ? <EmptyState title="No scan jobs yet" detail="Run a manual scan to create the first job." /> : null}
                  {!detailLoading ? (
                    <div className="grid gap-3 lg:grid-cols-2">
                      {selectedDetail.scanJobs.map((job) => (
                        <div key={job.id} className="rounded-md border border-border bg-background p-3 text-sm">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <Badge tone={job.status === "SUCCEEDED" ? "success" : job.status === "FAILED" ? "danger" : "warning"}>{job.status}</Badge>
                            <span className="text-xs text-muted-foreground">{formatDateTime(job.createdAt)}</span>
                          </div>
                          <div className="mt-2 grid gap-2 text-muted-foreground sm:grid-cols-3">
                            <div>Products: {job.productsFound}</div>
                            <div>Events: {job.eventsCreated}</div>
                            <div>Duration: {formatDuration(job.durationMs)}</div>
                          </div>
                          {job.error ? (
                            <div className="mt-2 flex items-start gap-2 text-red-300">
                              <XCircle size={15} className="mt-0.5 shrink-0" aria-hidden />
                              <span>{job.error}</span>
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            ) : null}

            {selectedDetail ? (
              <Card>
                <CardHeader>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <CardTitle>{selectedDetail.name} source candidates</CardTitle>
                    <Button type="button" variant="secondary" onClick={() => discoverStore(selectedDetail)}>
                      <Search size={16} aria-hidden />
                      Discovery scan
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {selectedDetail.sourceCandidates.length === 0 ? <EmptyState title="No source candidates yet" detail="Run a discovery scan to inspect public metadata, sitemaps, feeds, and rendered category pages." /> : null}
                  {selectedDetail.sourceCandidates.map((candidate) => (
                    <div key={candidate.id} className="rounded-md border border-border bg-background p-3 text-sm">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge tone={candidateTone(candidate.status)}>{candidate.status === "ACTIVE" ? "Target found" : candidate.status}</Badge>
                            <Badge tone="info">{candidate.monitorMode}</Badge>
                            <Badge tone="default">{candidate.kind}</Badge>
                            {candidate.promotedAt ? <Badge tone="success">Primary</Badge> : null}
                          </div>
                          <div className="mt-2 break-all font-mono text-xs text-muted-foreground">{candidate.url}</div>
                        </div>
                        <Button type="button" variant="secondary" disabled={candidate.status !== "ACTIVE"} onClick={() => promoteCandidate(selectedDetail.id, candidate.id)}>
                          <CheckCircle2 size={16} aria-hidden />
                          Promote
                        </Button>
                      </div>
                      <div className="mt-3 grid gap-2 text-muted-foreground sm:grid-cols-3">
                        <div>Products: {candidate.productsFound}</div>
                        <div>Checked: {formatDateTime(candidate.lastCheckedAt)}</div>
                        <div className="break-all">From: {candidate.discoveredFrom ? truncateMiddle(candidate.discoveredFrom, 80) : "-"}</div>
                      </div>
                      {candidate.reason ? <div className="mt-2 text-muted-foreground">{candidate.reason}</div> : null}
                    </div>
                  ))}
                </CardContent>
              </Card>
            ) : null}
          </div>
        </div>
      </AuthGate>
    </>
  );
}
