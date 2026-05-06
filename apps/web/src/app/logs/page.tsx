"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCw, Search } from "lucide-react";
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
import { formatDateTime, formatDuration, type PageMeta } from "../../lib/format";

type ScanLog = {
  id: string;
  severity: string;
  message: string;
  createdAt: string;
  context?: unknown;
  store?: { id: string; name: string } | null;
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
  store?: { id: string; name: string } | null;
};

type NotificationLog = {
  id: string;
  target: string;
  status: string;
  error?: string | null;
  response?: unknown;
  sentAt?: string | null;
  createdAt: string;
  product?: { title: string; store: { name: string } } | null;
  event?: { type: string } | null;
};

type StoreRecord = { id: string; name: string };

const defaultMeta: PageMeta = { page: 1, pageSize: 25, total: 0, totalPages: 1 };
const severities = ["DEBUG", "INFO", "WARN", "ERROR"];
const jobStatuses = ["QUEUED", "RUNNING", "SUCCEEDED", "FAILED", "SKIPPED"];
const notificationStatuses = ["PENDING", "SENT", "FAILED", "SKIPPED"];
const targets = ["DEFAULT", "POKEMON", "ONE_PIECE", "HIGH_PRIORITY", "ERROR_LOG", "TEST", "RESTOCK", "PRICE_DROP", "PREORDER"];

function severityTone(severity: string) {
  if (severity === "ERROR") return "danger";
  if (severity === "WARN") return "warning";
  if (severity === "DEBUG") return "default";
  return "success";
}

function statusTone(status: string) {
  if (status === "SUCCEEDED" || status === "SENT") return "success";
  if (status === "FAILED") return "danger";
  if (status === "SKIPPED") return "default";
  return "warning";
}

export default function LogsPage() {
  const [logs, setLogs] = useState<ScanLog[]>([]);
  const [jobs, setJobs] = useState<ScanJob[]>([]);
  const [notifications, setNotifications] = useState<NotificationLog[]>([]);
  const [stores, setStores] = useState<StoreRecord[]>([]);
  const [logFilters, setLogFilters] = useState({ q: "", severity: "", storeId: "", page: 1, pageSize: 25 });
  const [jobFilters, setJobFilters] = useState({ status: "", storeId: "", page: 1, pageSize: 25 });
  const [notificationFilters, setNotificationFilters] = useState({ status: "", target: "", page: 1, pageSize: 25 });
  const [logMeta, setLogMeta] = useState<PageMeta>(defaultMeta);
  const [jobMeta, setJobMeta] = useState<PageMeta>(defaultMeta);
  const [notificationMeta, setNotificationMeta] = useState<PageMeta>(defaultMeta);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const logQuery = useMemo(() => {
    const params = new URLSearchParams();
    Object.entries(logFilters).forEach(([key, value]) => {
      if (value) params.set(key, String(value));
    });
    return params.toString();
  }, [logFilters]);

  const jobQuery = useMemo(() => {
    const params = new URLSearchParams();
    Object.entries(jobFilters).forEach(([key, value]) => {
      if (value) params.set(key, String(value));
    });
    return params.toString();
  }, [jobFilters]);

  const notificationQuery = useMemo(() => {
    const params = new URLSearchParams();
    Object.entries(notificationFilters).forEach(([key, value]) => {
      if (value) params.set(key, String(value));
    });
    return params.toString();
  }, [notificationFilters]);

  function updateLogFilters(patch: Partial<typeof logFilters>) {
    setLogFilters((current) => ({ ...current, ...patch, page: patch.page ?? 1 }));
  }

  function updateJobFilters(patch: Partial<typeof jobFilters>) {
    setJobFilters((current) => ({ ...current, ...patch, page: patch.page ?? 1 }));
  }

  function updateNotificationFilters(patch: Partial<typeof notificationFilters>) {
    setNotificationFilters((current) => ({ ...current, ...patch, page: patch.page ?? 1 }));
  }

  async function loadLogs() {
    setLoading(true);
    setError(null);
    try {
      const [storePayload, logPayload, jobPayload, notificationPayload] = await Promise.all([
        apiFetch<{ data: StoreRecord[] }>("/api/stores?pageSize=100&sortBy=name&sortOrder=asc"),
        apiFetch<{ data: ScanLog[]; meta?: PageMeta }>(`/api/logs?${logQuery}`),
        apiFetch<{ data: ScanJob[]; meta?: PageMeta }>(`/api/logs/scan-jobs?${jobQuery}`),
        apiFetch<{ data: NotificationLog[]; meta?: PageMeta }>(`/api/logs/notifications?${notificationQuery}`)
      ]);
      setStores(storePayload.data);
      setLogs(logPayload.data);
      setJobs(jobPayload.data);
      setNotifications(notificationPayload.data);
      setLogMeta(logPayload.meta ?? { ...defaultMeta, total: logPayload.data.length });
      setJobMeta(jobPayload.meta ?? { ...defaultMeta, total: jobPayload.data.length });
      setNotificationMeta(notificationPayload.meta ?? { ...defaultMeta, total: notificationPayload.data.length });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load logs.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLogs();
  }, [logQuery, jobQuery, notificationQuery]);

  return (
    <>
      <PageHeader title="Logs" description="Worker logs, scraper errors, Discord delivery errors, scan history, and filters by store and severity." />
      <AuthGate>
        <div className="space-y-4">
          {error ? <ErrorState message={error} onRetry={loadLogs} /> : null}

          <div className="grid gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Scan diagnostics</CardTitle>
              </CardHeader>
              <CardContent className="text-sm leading-6 text-muted-foreground">
                Scan jobs show products, events, duration, and failure reasons. Skipped non-target products should not create events or Discord delivery rows.
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Discord delivery</CardTitle>
              </CardHeader>
              <CardContent className="text-sm leading-6 text-muted-foreground">
                Delivery history includes store-first routes, test alerts, event-type routes, skipped duplicates, and Discord rate-limit retries without exposing full webhook URLs.
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Source review</CardTitle>
              </CardHeader>
              <CardContent className="text-sm leading-6 text-muted-foreground">
                Source candidates are reviewed on Stores. A source can be valid for discovery while still producing zero persisted Products when relevance filtering skips every item.
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CardTitle>Operational logs</CardTitle>
                <Button type="button" variant="secondary" onClick={loadLogs} disabled={loading}>
                  <RefreshCw size={16} className={loading ? "animate-spin" : ""} aria-hidden />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 lg:grid-cols-4">
                <div className="relative lg:col-span-2">
                  <Search className="pointer-events-none absolute left-3 top-2.5 text-muted-foreground" size={16} aria-hidden />
                  <Input className="pl-9" placeholder="Search log message" value={logFilters.q} onChange={(event) => updateLogFilters({ q: event.target.value })} />
                </div>
                <Select value={logFilters.storeId} onChange={(event) => updateLogFilters({ storeId: event.target.value })}>
                  <option value="">All stores</option>
                  {stores.map((store) => (
                    <option key={store.id} value={store.id}>{store.name}</option>
                  ))}
                </Select>
                <Select value={logFilters.severity} onChange={(event) => updateLogFilters({ severity: event.target.value })}>
                  <option value="">All severities</option>
                  {severities.map((severity) => (
                    <option key={severity}>{severity}</option>
                  ))}
                </Select>
              </div>
              {loading ? <LoadingState label="Loading logs..." /> : null}
              {!loading && logs.length === 0 ? <EmptyState title="No logs match these filters" detail="Try changing severity, store, or search text." /> : null}
              {!loading && logs.length > 0 ? (
                <>
                  <div className="space-y-3">
                    {logs.map((log) => (
                      <div key={log.id} className="rounded-md border border-border bg-background p-3 text-sm">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge tone={severityTone(log.severity)}>{log.severity}</Badge>
                            <span className="text-muted-foreground">{log.store?.name ?? "System"}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">{formatDateTime(log.createdAt)}</span>
                        </div>
                        <div className="mt-2 leading-6">{log.message}</div>
                        {log.context ? (
                          <details className="mt-3">
                            <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">Context</summary>
                            <pre className="mt-2 max-h-52 overflow-auto rounded-md bg-muted p-3 text-xs text-muted-foreground">
                              {JSON.stringify(log.context, null, 2)}
                            </pre>
                          </details>
                        ) : null}
                      </div>
                    ))}
                  </div>
                  <Pagination meta={logMeta} onPageChange={(page) => setLogFilters((current) => ({ ...current, page }))} />
                </>
              ) : null}
            </CardContent>
          </Card>

          <div className="grid gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Scan history</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <Select value={jobFilters.storeId} onChange={(event) => updateJobFilters({ storeId: event.target.value })}>
                    <option value="">All stores</option>
                    {stores.map((store) => (
                      <option key={store.id} value={store.id}>{store.name}</option>
                    ))}
                  </Select>
                  <Select value={jobFilters.status} onChange={(event) => updateJobFilters({ status: event.target.value })}>
                    <option value="">All job statuses</option>
                    {jobStatuses.map((status) => (
                      <option key={status}>{status}</option>
                    ))}
                  </Select>
                </div>
                {loading ? <LoadingState label="Loading scan jobs..." /> : null}
                {!loading && jobs.length === 0 ? <EmptyState title="No scan jobs match these filters" detail="Manual scans from Stores will appear here." /> : null}
                {!loading && jobs.length > 0 ? (
                  <>
                    <div className="space-y-3">
                      {jobs.map((job) => (
                        <div key={job.id} className="rounded-md border border-border bg-background p-3 text-sm">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge tone={statusTone(job.status)}>{job.status}</Badge>
                              <span className="font-medium">{job.store?.name ?? "Unknown store"}</span>
                            </div>
                            <span className="text-xs text-muted-foreground">{formatDateTime(job.createdAt)}</span>
                          </div>
                          <div className="mt-3 grid gap-2 text-muted-foreground sm:grid-cols-3">
                            <div>Products: {job.productsFound}</div>
                            <div>Events: {job.eventsCreated}</div>
                            <div>Duration: {formatDuration(job.durationMs)}</div>
                          </div>
                          <div className="mt-2 text-xs text-muted-foreground">
                            Started {formatDateTime(job.startedAt)} · Finished {formatDateTime(job.finishedAt)}
                          </div>
                          {job.error ? <div className="mt-2 rounded-md border border-red-500/30 bg-red-500/10 p-2 text-red-200">{job.error}</div> : null}
                        </div>
                      ))}
                    </div>
                    <Pagination meta={jobMeta} onPageChange={(page) => setJobFilters((current) => ({ ...current, page }))} />
                  </>
                ) : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Notification delivery history</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <Select value={notificationFilters.status} onChange={(event) => updateNotificationFilters({ status: event.target.value })}>
                    <option value="">All delivery statuses</option>
                    {notificationStatuses.map((status) => (
                      <option key={status}>{status}</option>
                    ))}
                  </Select>
                  <Select value={notificationFilters.target} onChange={(event) => updateNotificationFilters({ target: event.target.value })}>
                    <option value="">All targets</option>
                    {targets.map((target) => (
                      <option key={target}>{target}</option>
                    ))}
                  </Select>
                </div>
                {loading ? <LoadingState label="Loading delivery history..." /> : null}
                {!loading && notifications.length === 0 ? <EmptyState title="No notification logs match these filters" detail="Webhook test deliveries and event alerts will appear here." /> : null}
                {!loading && notifications.length > 0 ? (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[860px] text-sm">
                        <thead>
                          <tr className="border-b border-border text-left text-muted-foreground">
                            <th className="py-3 pr-4 font-medium">Created</th>
                            <th className="py-3 pr-4 font-medium">Target</th>
                            <th className="py-3 pr-4 font-medium">Status</th>
                            <th className="py-3 pr-4 font-medium">Event</th>
                            <th className="py-3 pr-4 font-medium">Product</th>
                            <th className="py-3 pr-4 font-medium">Delivered</th>
                            <th className="py-3 pr-4 font-medium">Error</th>
                          </tr>
                        </thead>
                        <tbody>
                          {notifications.map((notification) => (
                            <tr key={notification.id} className="border-b border-border/60 align-top">
                              <td className="py-3 pr-4 text-muted-foreground">{formatDateTime(notification.createdAt)}</td>
                              <td className="py-3 pr-4">{notification.target}</td>
                              <td className="py-3 pr-4">
                                <Badge tone={statusTone(notification.status)}>{notification.status}</Badge>
                              </td>
                              <td className="py-3 pr-4">{notification.event?.type ?? "TEST"}</td>
                              <td className="py-3 pr-4">
                                <div>{notification.product?.title ?? "-"}</div>
                                <div className="text-xs text-muted-foreground">{notification.product?.store.name ?? ""}</div>
                              </td>
                              <td className="py-3 pr-4 text-muted-foreground">{formatDateTime(notification.sentAt)}</td>
                              <td className="max-w-md py-3 pr-4 text-muted-foreground">{notification.error ?? "-"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <Pagination meta={notificationMeta} onPageChange={(page) => setNotificationFilters((current) => ({ ...current, page }))} />
                  </>
                ) : null}
              </CardContent>
            </Card>
          </div>
        </div>
      </AuthGate>
    </>
  );
}
