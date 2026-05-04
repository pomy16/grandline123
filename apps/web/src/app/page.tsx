"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Bell, Boxes, CircleDollarSign, RotateCcw, Store, TrendingDown, Zap } from "lucide-react";
import { AuthGate } from "../components/auth-gate";
import { DemoProductTable } from "../components/data-table";
import { MetricCard } from "../components/metric-card";
import { PageHeader } from "../components/page-header";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { apiFetch } from "../lib/api-client";
import type { DashboardSummary } from "../lib/api";

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ data: DashboardSummary }>("/api/dashboard")
      .then((payload) => setSummary(payload.data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <PageHeader
        title="Monitoring dashboard"
        description="Operational overview for Pokemon TCG and One Piece Card Game product discovery, restocks, price changes, and notification delivery."
      />
      <AuthGate>
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

        <div className="mt-6 grid gap-4 xl:grid-cols-[1.5fr_1fr]">
          <Card>
            <CardHeader>
              <CardTitle>Latest products</CardTitle>
            </CardHeader>
            <CardContent>
              <DemoProductTable />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Latest events</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {summary.latestEvents.length === 0 ? <div className="text-sm text-muted-foreground">No events yet. Run a mock scan from Stores.</div> : null}
              {summary.latestEvents.map((event) => (
                <div key={event.id} className="rounded-md border border-border bg-background p-3">
                  <div className="flex items-center justify-between gap-3">
                    <Badge tone="info">{event.type}</Badge>
                    <span className="text-xs text-muted-foreground">{new Date(event.createdAt).toLocaleString()}</span>
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
