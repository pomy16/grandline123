"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { AuthGate } from "../../components/auth-gate";
import { PageHeader } from "../../components/page-header";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { apiFetch } from "../../lib/api-client";

type ScanLog = {
  id: string;
  severity: string;
  message: string;
  createdAt: string;
  context?: unknown;
  store?: { name: string } | null;
};

type ScanJob = {
  id: string;
  status: string;
  productsFound: number;
  eventsCreated: number;
  durationMs?: number | null;
  error?: string | null;
  createdAt: string;
  store?: { name: string } | null;
};

type NotificationLog = {
  id: string;
  target: string;
  status: string;
  error?: string | null;
  sentAt?: string | null;
  createdAt: string;
  product?: { title: string; store: { name: string } } | null;
  event?: { type: string } | null;
};

export default function LogsPage() {
  const [logs, setLogs] = useState<ScanLog[]>([]);
  const [jobs, setJobs] = useState<ScanJob[]>([]);
  const [notifications, setNotifications] = useState<NotificationLog[]>([]);
  const [filters, setFilters] = useState({ severity: "", store: "" });
  const [loading, setLoading] = useState(true);

  async function loadLogs() {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.severity) params.set("severity", filters.severity);
    const [logPayload, jobPayload, notificationPayload] = await Promise.all([
      apiFetch<{ data: ScanLog[] }>(`/api/logs${params.toString() ? `?${params}` : ""}`),
      apiFetch<{ data: ScanJob[] }>("/api/logs/scan-jobs"),
      apiFetch<{ data: NotificationLog[] }>("/api/logs/notifications")
    ]);
    setLogs(logPayload.data.filter((log) => !filters.store || log.store?.name.toLowerCase().includes(filters.store.toLowerCase())));
    setJobs(jobPayload.data);
    setNotifications(notificationPayload.data);
    setLoading(false);
  }

  useEffect(() => {
    loadLogs().catch(() => setLoading(false));
  }, [filters.severity]);

  return (
    <>
      <PageHeader title="Logs" description="Worker logs, scraper errors, Discord delivery errors, scan history, and filters by store and severity." />
      <AuthGate>
        <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle>Scan and delivery logs</CardTitle>
                <Button type="button" variant="secondary" onClick={loadLogs}>
                  <RefreshCw size={16} aria-hidden />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4 grid gap-3 md:grid-cols-2">
                <Input placeholder="Filter by store" value={filters.store} onChange={(event) => setFilters({ ...filters, store: event.target.value })} />
                <select className="h-9 rounded-md border border-border bg-background px-3 text-sm" value={filters.severity} onChange={(event) => setFilters({ ...filters, severity: event.target.value })}>
                  <option value="">All severities</option>
                  {["DEBUG", "INFO", "WARN", "ERROR"].map((severity) => (
                    <option key={severity}>{severity}</option>
                  ))}
                </select>
              </div>
              {loading ? <div className="text-sm text-muted-foreground">Loading logs...</div> : null}
              <div className="space-y-3">
                {logs.map((log) => (
                  <div key={log.id} className="rounded-md border border-border bg-background p-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <Badge tone={log.severity === "ERROR" ? "danger" : log.severity === "WARN" ? "warning" : "success"}>{log.severity}</Badge>
                      <span className="text-xs text-muted-foreground">{new Date(log.createdAt).toLocaleString()}</span>
                    </div>
                    <div className="mt-2">{log.message}</div>
                    <div className="text-xs text-muted-foreground">{log.store?.name ?? "System"}</div>
                    {log.context ? (
                      <pre className="mt-3 max-h-40 overflow-auto rounded-md bg-muted p-2 text-xs text-muted-foreground">
                        {JSON.stringify(log.context, null, 2)}
                      </pre>
                    ) : null}
                  </div>
                ))}
                {logs.length === 0 && !loading ? <div className="text-sm text-muted-foreground">No logs found.</div> : null}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Scan history</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {jobs.map((job) => (
                <div key={job.id} className="rounded-md border border-border bg-background p-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <Badge tone={job.status === "SUCCEEDED" ? "success" : job.status === "FAILED" ? "danger" : "warning"}>{job.status}</Badge>
                    <span className="text-xs text-muted-foreground">{new Date(job.createdAt).toLocaleString()}</span>
                  </div>
                  <div className="mt-2 font-medium">{job.store?.name ?? "Unknown store"}</div>
                  <div className="text-muted-foreground">
                    Products: {job.productsFound} | Events: {job.eventsCreated} | Duration: {job.durationMs ?? "-"}ms
                  </div>
                  {job.error ? <div className="mt-2 text-red-300">{job.error}</div> : null}
                </div>
              ))}
              {jobs.length === 0 && !loading ? <div className="text-sm text-muted-foreground">No scan jobs yet.</div> : null}
            </CardContent>
          </Card>

          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle>Notification delivery</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full min-w-[920px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="py-3 pr-4 font-medium">Created</th>
                    <th className="py-3 pr-4 font-medium">Target</th>
                    <th className="py-3 pr-4 font-medium">Status</th>
                    <th className="py-3 pr-4 font-medium">Event</th>
                    <th className="py-3 pr-4 font-medium">Product</th>
                    <th className="py-3 pr-4 font-medium">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {notifications.map((notification) => (
                    <tr key={notification.id} className="border-b border-border/60">
                      <td className="py-3 pr-4 text-muted-foreground">{new Date(notification.createdAt).toLocaleString()}</td>
                      <td className="py-3 pr-4">{notification.target}</td>
                      <td className="py-3 pr-4">
                        <Badge tone={notification.status === "SENT" ? "success" : notification.status === "FAILED" ? "danger" : "warning"}>{notification.status}</Badge>
                      </td>
                      <td className="py-3 pr-4">{notification.event?.type ?? "TEST"}</td>
                      <td className="py-3 pr-4">
                        <div>{notification.product?.title ?? "-"}</div>
                        <div className="text-xs text-muted-foreground">{notification.product?.store.name ?? ""}</div>
                      </td>
                      <td className="max-w-md truncate py-3 pr-4 text-muted-foreground">{notification.error ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {notifications.length === 0 && !loading ? <div className="py-8 text-center text-sm text-muted-foreground">No notification logs yet.</div> : null}
            </CardContent>
          </Card>
        </div>
      </AuthGate>
    </>
  );
}
