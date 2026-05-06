"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Bell, Boxes, CircleDollarSign, RotateCcw, Store, TrendingDown, Zap } from "lucide-react";
import { AuthGate } from "../components/auth-gate";
import { DashboardProductTable, type DashboardProductRow } from "../components/data-table";
import { MetricCard } from "../components/metric-card";
import { PageHeader } from "../components/page-header";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { ErrorState, LoadingState } from "../components/ui/data-state";
import { apiFetch } from "../lib/api-client";
import type { DashboardSummary } from "../lib/api";
import { formatDateTime } from "../lib/format";

const emptySummary: DashboardSummary = {
  totalStores: 0,
  activeStores: 0,
  productsFoundToday: 0,
  alertsSentToday: 0,
  restocksDetected: 0,
  priceDropsDetected: 0,
  failedScans: 0,
  latestEvents: []
};

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary>(emptySummary);
  const [products, setProducts] = useState<DashboardProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadDashboard() {
    setLoading(true);
    setError(null);
    try {
      const [summaryPayload, productPayload] = await Promise.all([
        apiFetch<{ data: DashboardSummary }>("/api/dashboard"),
        apiFetch<{ data: DashboardProductRow[] }>("/api/products?pageSize=8&sortBy=lastSeenAt&sortOrder=desc")
      ]);
      setSummary(summaryPayload.data);
      setProducts(productPayload.data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load dashboard.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  return (
    <>
      <PageHeader
        title="Monitoring dashboard"
        description="Operational overview for Pokemon TCG and One Piece Card Game product discovery, restocks, price changes, and notification delivery."
      />
      <AuthGate>
        {error ? <div className="mb-4"><ErrorState message={error} onRetry={loadDashboard} /></div> : null}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Total monitored stores" value={loading ? "..." : summary.totalStores} icon={Store} />
          <MetricCard label="Active stores" value={loading ? "..." : summary.activeStores} icon={Zap} />
          <MetricCard label="Products found today" value={loading ? "..." : summary.productsFoundToday} icon={Boxes} />
          <MetricCard label="Alerts sent today" value={loading ? "..." : summary.alertsSentToday} icon={Bell} />
          <MetricCard label="Restocks detected" value={loading ? "..." : summary.restocksDetected} icon={RotateCcw} />
          <MetricCard label="Price drops detected" value={loading ? "..." : summary.priceDropsDetected} icon={TrendingDown} />
          <MetricCard label="Failed scans" value={loading ? "..." : summary.failedScans} icon={AlertTriangle} />
          <MetricCard label="Price signals" value="Ready" icon={CircleDollarSign} />
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Product quality</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex flex-wrap gap-2">
                <Badge tone="success">Sealed TCG only</Badge>
                <Badge tone="info">Source/Product split</Badge>
              </div>
              <p className="leading-6 text-muted-foreground">
                Discovery can keep category pages as source candidates, but Products and Discord alerts are limited to validated relevant sealed Pokemon TCG and One Piece Card Game items.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Discord routing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex flex-wrap gap-2">
                <Badge tone="success">Store-first</Badge>
                <Badge tone="default">High copy off</Badge>
              </div>
              <p className="leading-6 text-muted-foreground">
                Store-specific webhooks stay primary. High-priority copies are sent only when <span className="font-mono">DISCORD_MULTI_ROUTE_HIGH_PRIORITY</span> is enabled.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Discovery workflow</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex flex-wrap gap-2">
                <Badge tone="info">Discover</Badge>
                <Badge tone="info">Promote</Badge>
                <Badge tone="info">Scan</Badge>
              </div>
              <p className="leading-6 text-muted-foreground">
                Run discovery, promote a validated source, then scan. Blocked or empty sources stay visible with reasons so they can be reviewed without noisy alerts.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-[1.5fr_1fr]">
          <Card>
            <CardHeader>
              <CardTitle>Latest products</CardTitle>
            </CardHeader>
            <CardContent>
              <DashboardProductTable rows={products} loading={loading} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Latest events</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? <LoadingState label="Loading latest events..." /> : null}
              {summary.latestEvents.length === 0 && !loading ? <div className="text-sm text-muted-foreground">No events yet. Run a manual scan from Stores.</div> : null}
              {summary.latestEvents.map((event) => (
                <div key={event.id} className="rounded-md border border-border bg-background p-3">
                  <div className="flex items-center justify-between gap-3">
                    <Badge tone="info">{event.type}</Badge>
                    <span className="text-xs text-muted-foreground">{formatDateTime(event.createdAt)}</span>
                  </div>
                  <div className="mt-2 text-sm font-medium">{event.product.title}</div>
                  <div className="text-xs text-muted-foreground">{event.product.store.name}</div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </AuthGate>
    </>
  );
}
